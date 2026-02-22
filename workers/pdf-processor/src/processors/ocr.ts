import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

const execAsync = promisify(exec);

// Check if Tesseract is available
async function checkTesseract(): Promise<void> {
    try {
        await execAsync('tesseract --version');
    } catch (error) {
        throw new Error('Tesseract is not installed or not accessible');
    }
}

interface OcrJobData {
    jobId: string;
    settings?: {
        language?: string;
    };
}

export async function processOcr(job: Job<OcrJobData>) {
    const { jobId, settings } = job.data;
    const tmpDir = path.join('/tmp', jobId);

    // Fallback for flat job data
    const language = settings?.language || (job.data as any).language || 'eng';

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

        await updateJobProgress(jobId, 30);

        // Check if Tesseract is available
        await checkTesseract();

        // Execute Tesseract OCR
        // Output base name (without extension), Tesseract adds .pdf
        const outputBase = path.join(tmpDir, 'ocr_output');
        const command = `tesseract "${inputPath}" "${outputBase}" -l ${language} --psm 1 pdf`;
        try {
            await execAsync(command);
        } catch (execError: any) {
            const stderr = execError.stderr ? execError.stderr.toString() : '';
            throw new Error(`OCR failed: ${execError.message}${stderr ? ` (${stderr.trim()})` : ''}`);
        }

        await updateJobProgress(jobId, 80);

        const outputPath = outputBase + '.pdf';

        try {
            await fs.access(outputPath);
        } catch {
            throw new Error('OCR failed: Output file not created');
        }

        const outputBuffer = await fs.readFile(outputPath);
        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';
        const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, outputBuffer, 'application/pdf', 'pdf');

        const outputFilename = `ocr_${inputFile.originalName || inputFile.name}`;
        await createOutputFile(jobId, storageKey, size, outputFilename, 'application/pdf');

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
