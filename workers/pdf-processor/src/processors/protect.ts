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

interface ProtectJobData {
    jobId: string;
    settings?: {
        password?: string;
        ownerPassword?: string;
    };
}

export async function processProtect(job: Job<ProtectJobData>) {
    const { jobId, settings } = job.data;
    const tmpDir = path.join('/tmp', jobId);

    // Fallback for flat job data
    const password = settings?.password || (job.data as any).password;
    const ownerPassword = settings?.ownerPassword || (job.data as any).ownerPassword || password;

    try {
        await updateJobStatus(jobId, 'PROCESSING');
        await fs.mkdir(tmpDir, { recursive: true });

        if (!password) {
            throw new Error('Password is required to protect PDF');
        }

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

        const outputFilename = `protected_${inputFile.originalName || inputFile.name}`;
        const outputPath = path.join(tmpDir, outputFilename);

        // QPDF command
        // qpdf --encrypt user-password owner-password 256 -- input output
        const userPwd = password;
        const ownerPwd = ownerPassword || password;
        const command = `qpdf --encrypt "${userPwd}" "${ownerPwd}" 256 -- "${inputPath}" "${outputPath}"`;

        await execAsync(command);

        await updateJobProgress(jobId, 80);

        // Verify output exists
        try {
            await fs.access(outputPath);
        } catch {
            throw new Error('Protection failed: Output file not created');
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
