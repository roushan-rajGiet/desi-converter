import { Job } from 'bullmq';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import JSZip from 'jszip';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

interface CompressJobData {
    jobId: string;
    inputFileIds: string[];
    settings: {
        compressionLevel: 'low' | 'medium' | 'high';
    };
    compressionLevel?: 'low' | 'medium' | 'high'; // Handle legacy/direct payload
}

export async function processCompress(job: Job<CompressJobData>) {
    const { jobId, settings } = job.data;
    // Handle both nested settings object and direct property (backward compatibility)
    const level = settings?.compressionLevel || job.data.compressionLevel || 'medium';

    console.log(`Processing compression job ${jobId} with level: ${level}`);

    const tempDir = path.join(os.tmpdir(), `desi-compress-${jobId}`);

    try {
        await updateJobStatus(jobId, 'PROCESSING');
        fs.mkdirSync(tempDir, { recursive: true });

        const inputFiles = await getInputFiles(jobId);
        if (inputFiles.length === 0) {
            throw new Error('No input files provided');
        }

        await updateJobProgress(jobId, 10);

        const compressedFiles: { path: string; name: string }[] = [];
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;

        for (let i = 0; i < inputFiles.length; i++) {
            const inputFile = inputFiles[i];
            if (!inputFile) continue;
            totalOriginalSize += inputFile.size;

            // Determine file type
            const isPdf = inputFile.name.toLowerCase().endsWith('.pdf') || inputFile.mimeType === 'application/pdf';
            const isImage = /\.(jpg|jpeg|png|webp)$/i.test(inputFile.name) || inputFile.mimeType?.startsWith('image/');

            if (!isPdf && !isImage) {
                console.warn(`Skipping unsupported file: ${inputFile.name}`);
                continue;
            }

            let fileKey = inputFile.storageKey;
            if (inputFile.storageKey.startsWith(`${inputFile.bucket}/`)) {
                fileKey = inputFile.storageKey.split('/').pop() || inputFile.name;
            }

            const fileBuffer = await downloadFile(inputFile.bucket, fileKey);
            let outputPath = '';
            let outputName = '';

            // Update progress: 10% to 90% allocated for processing
            const progressStart = 10 + Math.floor((i / inputFiles.length) * 80);
            await updateJobProgress(jobId, progressStart);

            if (isPdf) {
                // Run Ghostscript for PDF
                const inputPath = path.join(tempDir, `input_${inputFile.id}.pdf`);
                outputPath = path.join(tempDir, `output_${inputFile.id}.pdf`);
                fs.writeFileSync(inputPath, fileBuffer);

                const qualityMap = {
                    low: { setting: '/printer', imageResolution: '300' },
                    medium: { setting: '/ebook', imageResolution: '150' },
                    high: { setting: '/screen', imageResolution: '72' },
                };
                const config = qualityMap[level];

                await new Promise<void>((resolve, reject) => {
                    const args = [
                        '-sDEVICE=pdfwrite',
                        '-dCompatibilityLevel=1.4',
                        `-dPDFSETTINGS=${config.setting}`,
                        '-dDetectDuplicateImages=true',
                        '-dFastWebView=true',
                        '-dNOPAUSE',
                        '-dQUIET',
                        '-dBATCH',
                        '-dDownsampleColorImages=true',
                        `-dColorImageResolution=${config.imageResolution}`,
                        '-dDownsampleGrayImages=true',
                        `-dGrayImageResolution=${config.imageResolution}`,
                        '-dDownsampleMonoImages=true',
                        `-dMonoImageResolution=${config.imageResolution}`,
                        `-sOutputFile=${outputPath}`,
                        inputPath,
                    ];

                    const gs = spawn('gs', args);
                    gs.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Ghostscript exited with code ${code}`)));
                    gs.on('error', reject);
                });

                outputName = inputFile.originalName.replace('.pdf', '_compressed.pdf');
            } else {
                // Process Image with Sharp
                const qualityMap = { low: 80, medium: 60, high: 40 };
                const quality = qualityMap[level];

                const image = sharp(fileBuffer);
                const metadata = await image.metadata();
                const format = metadata.format;
                let processedBuffer: Buffer;
                let outputExt = 'jpg';

                if (format === 'png') {
                    processedBuffer = await image.png({ quality: Math.max(10, quality) }).toBuffer();
                    outputExt = 'png';
                } else if (format === 'webp') {
                    processedBuffer = await image.webp({ quality }).toBuffer();
                    outputExt = 'webp';
                } else {
                    processedBuffer = await image.jpeg({ quality }).toBuffer();
                    outputExt = 'jpg';
                }

                outputPath = path.join(tempDir, `output_${inputFile.id}.${outputExt}`);
                fs.writeFileSync(outputPath, processedBuffer);

                const nameWithoutExt = path.parse(inputFile.originalName).name;
                outputName = `${nameWithoutExt}_compressed.${outputExt}`;
            }

            compressedFiles.push({ path: outputPath, name: outputName });
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                totalCompressedSize += stats.size;
            }
        }

        if (compressedFiles.length === 0) {
            throw new Error('No files were successfully compressed');
        }

        await updateJobProgress(jobId, 90);
        let jobSize = 0;

        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';

        if (compressedFiles.length === 1) {
            // Single file output
            const file = compressedFiles[0];
            const buffer = fs.readFileSync(file.path);
            const mimeType = file.name.endsWith('.pdf') ? 'application/pdf' :
                file.name.endsWith('.png') ? 'image/png' :
                    file.name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

            const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, buffer, mimeType, file.name.split('.').pop() || 'bin');
            await createOutputFile(jobId, storageKey, size, file.name, mimeType);
            jobSize = size;
        } else {
            // Zip multiple files
            const zip = new JSZip();

            for (const file of compressedFiles) {
                const content = fs.readFileSync(file.path);
                zip.file(file.name, content);
            }

            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
            const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, zipBuffer, 'application/zip', 'zip');
            await createOutputFile(jobId, storageKey, size, 'compressed_files.zip', 'application/zip');
            jobSize = size;
        }

        const compression = totalOriginalSize > 0 ? Math.round((1 - jobSize / totalOriginalSize) * 100) : 0;
        await updateJobStatus(jobId, 'COMPLETED');
        console.log(`Compression completed: ${totalOriginalSize} -> ${jobSize} bytes (${compression}% reduction)`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobStatus(jobId, 'FAILED', message);
        throw error;
    } finally {
        // Cleanup temp files
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    }
}
