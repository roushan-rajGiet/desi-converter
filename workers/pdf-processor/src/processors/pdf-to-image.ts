import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import JSZip from 'jszip';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

const execAsync = promisify(exec);

// Check if Ghostscript is available
async function checkGhostscript(): Promise<void> {
    try {
        await execAsync('gs --version');
    } catch (error) {
        throw new Error('Ghostscript is not installed or not accessible');
    }
}

interface PdfToImageJobData {
    jobId: string;
    settings?: {
        format?: 'png' | 'jpg';
        dpi?: number;
    };
}

export async function processPdfToImage(job: Job<PdfToImageJobData>) {
    const { jobId, settings } = job.data;
    const tmpDir = path.join('/tmp', jobId);

    // Fallback for flat job data
    const format = settings?.format || (job.data as any).format || 'png';
    const dpi = settings?.dpi || (job.data as any).dpi || 300;

    try {
        await updateJobStatus(jobId, 'PROCESSING');
        await fs.mkdir(tmpDir, { recursive: true });

        const inputFiles = await getInputFiles(jobId);
        if (inputFiles.length === 0 || !inputFiles[0]) {
            throw new Error('No input file provided');
        }

        const inputFile = inputFiles[0];

        let key = inputFile.storageKey;
        if (inputFile.storageKey.startsWith(`${inputFile.bucket}/`)) {
            key = inputFile.storageKey.split('/').pop() || inputFile.name;
        }

        const inputBuffer = await downloadFile(inputFile.bucket, key);
        const inputPath = path.join(tmpDir, inputFile.name);
        await fs.writeFile(inputPath, inputBuffer);

        await updateJobProgress(jobId, 20);

        // Ghostscript command
        // sDEVICE: png16m (24-bit PNG), jpeg (JPEG)
        const device = format === 'png' ? 'png16m' : 'jpeg';
        const ext = format;
        const outputPattern = path.join(tmpDir, `page-%03d.${ext}`);

        const command = `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=${device} -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r${dpi} -sOutputFile="${outputPattern}" "${inputPath}"`;
        await execAsync(command);

        await updateJobProgress(jobId, 60);

        // Read generated images
        const files = await fs.readdir(tmpDir);
        const imageFiles = files.filter(f => f.startsWith('page-') && f.endsWith(`.${ext}`));

        if (imageFiles.length === 0) {
            throw new Error('No images generated');
        }

        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';

        // Upload all generated images
        for (const [index, file] of imageFiles.entries()) {
            const imagePath = path.join(tmpDir, file);
            const imageBuffer = await fs.readFile(imagePath);
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

            const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, imageBuffer, mimeType, format);

            // Create formatted filename (e.g., file-page-001.png)
            const pageNum = file.match(/page-(\d+)/)?.[1] || (index + 1).toString().padStart(3, '0');
            const outputFilename = `${path.parse(inputFile.originalName || 'file').name}-page-${pageNum}.${format}`;

            await createOutputFile(jobId, storageKey, size, outputFilename, mimeType);
        }

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobStatus(jobId, 'FAILED', message);
        throw error;
    } finally {
        try {
            await fs.rm(tmpDir, { recursive: true, force: true });
        } catch (e) {
            console.error(`Failed to cleanup temp dir ${tmpDir}:`, e);
        }
    }
}
