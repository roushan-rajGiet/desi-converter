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

// Check if QPDF is available
async function checkQpdf(): Promise<void> {
    try {
        await execAsync('qpdf --version');
    } catch (error) {
        throw new Error('QPDF is not installed or not accessible');
    }
}

interface UnlockJobData {
    jobId: string;
    settings?: {
        password?: string;
    };
}

export async function processUnlock(job: Job<UnlockJobData>) {
    const { jobId, settings } = job.data;
    const tmpDir = path.join('/tmp', jobId);

    // Fallback for flat job data
    const password = settings?.password || (job.data as any).password;

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

        await updateJobProgress(jobId, 40);

        // Check if QPDF is available
        await checkQpdf();

        const outputFilename = `unlocked_${inputFile.originalName || inputFile.name}`;
        const outputPath = path.join(tmpDir, outputFilename);

        // QPDF command to decrypt
        // qpdf --password=password --decrypt input output
        const pwdArg = password ? `--password="${password}"` : '';
        const command = `qpdf ${pwdArg} --decrypt "${inputPath}" "${outputPath}"`;

        try {
            await execAsync(command);
        } catch (execError: any) {
            const stderr = execError.stderr ? execError.stderr.toString() : '';
            if (stderr.includes('password') || stderr.includes('authentication')) {
                throw new Error('Unlock failed: Incorrect password or PDF is not password-protected');
            }
            throw new Error(`Unlock failed: ${execError.message}${stderr ? ` (${stderr.trim()})` : ''}`);
        }

        await updateJobProgress(jobId, 80);

        // Verify output exists
        try {
            await fs.access(outputPath);
        } catch {
            throw new Error('Unlock failed: Incorrect password or file corrupt');
        }

        const outputBuffer = await fs.readFile(outputPath);
        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';
        const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, outputBuffer, 'application/pdf', 'pdf');

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
