import { config } from 'dotenv';
config();

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { QUEUE_NAMES } from '@desi/shared';
import { downloadFile, uploadFile } from './utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from './utils/database';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

console.log('🗜️ Starting Compressor Worker...');

interface CompressJobData {
    jobId: string;
    inputFileIds: string[];
    settings: {
        compressionLevel: 'low' | 'medium' | 'high';
    };
}

// Ghostscript quality settings
const gsSettings = {
    low: '/printer', // Highest quality
    medium: '/ebook', // Balanced
    high: '/screen', // Maximum compression
};

async function processCompress(job: Job<CompressJobData>) {
    const { jobId, settings } = job.data;
    const tempDir = path.join(os.tmpdir(), `desi-compress-${jobId}`);

    try {
        await updateJobStatus(jobId, 'PROCESSING');
        fs.mkdirSync(tempDir, { recursive: true });

        const inputFiles = await getInputFiles(jobId);
        if (inputFiles.length === 0 || !inputFiles[0]) {
            throw new Error('No input file provided');
        }

        const inputFile = inputFiles[0];
        await updateJobProgress(jobId, 20);

        // Download input file
        const pdfBuffer = await downloadFile(inputFile.storageKey);
        const inputPath = path.join(tempDir, 'input.pdf');
        const outputPath = path.join(tempDir, 'output.pdf');
        fs.writeFileSync(inputPath, pdfBuffer);

        await updateJobProgress(jobId, 40);

        // Run Ghostscript compression
        const qualityMap = {
            low: {
                setting: '/printer',
                imageResolution: '300',
            },
            medium: {
                setting: '/ebook',
                imageResolution: '150',
            },
            high: {
                setting: '/screen',
                imageResolution: '72',
            },
        };

        const level = settings.compressionLevel || 'medium';
        const config = qualityMap[level];

        await new Promise<void>((resolve, reject) => {
            const args = [
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4',
                `-dPDFSETTINGS=${config.setting}`,
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

            gs.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Ghostscript exited with code ${code}`));
                }
            });

            gs.on('error', (err) => {
                reject(err);
            });
        });

        await updateJobProgress(jobId, 80);

        // Upload compressed file
        const compressedBuffer = fs.readFileSync(outputPath);
        const { storageKey, size } = await uploadFile(
            compressedBuffer,
            'application/pdf',
            'pdf'
        );

        // Create output file record
        const originalName = inputFile.originalName.replace('.pdf', '_compressed.pdf');
        await createOutputFile(jobId, storageKey, size, originalName, 'application/pdf');

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');

        const originalSize = inputFile.size;
        const compression = Math.round((1 - size / originalSize) * 100);
        console.log(`Compression completed: ${originalSize} -> ${size} bytes (${compression}% reduction)`);
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

const worker = new Worker(
    QUEUE_NAMES.compressor,
    async (job) => {
        console.log(`Processing compression job ${job.id}`);
        await processCompress(job);
    },
    {
        connection,
        concurrency: 3,
    }
);

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await worker.close();
    process.exit(0);
});
