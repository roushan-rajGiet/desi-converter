import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PDFDocument } from 'pdf-lib';
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { processSplit } from './processors/split';
import { processCompress } from './processors/compress';
import { processMerge } from './processors/merge';
import { processRotate } from './processors/rotate';
import { processReorder } from './processors/reorder';
import { processPdfToWord } from './processors/pdf-to-word';
import { processWordToPdf } from './processors/word-to-pdf';
import { processOcr } from './processors/ocr';
import { processProtect } from './processors/protect';
import { processUnlock } from './processors/unlock';
import { processWatermark } from './processors/watermark';
import { processSign } from './processors/sign';
import { processPdfToImage } from './processors/pdf-to-image';
import { processVideoResize } from './processors/video-resize';

// Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000';
const WORKER_TYPE = process.env.WORKER_TYPE || 'ALL'; // FAST, MEDIUM, HEAVY, ALL

// Initialize clients
const prisma = new PrismaClient();

const redis = new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
});

const connection = redis as any;

console.log('🔧 PDF Worker Configuration:');
console.log(`  Redis: ${REDIS_HOST}:${REDIS_PORT}`);
console.log(`  S3: ${S3_ENDPOINT}`);
console.log(`  Type: ${WORKER_TYPE}`);

// Helper function to create worker
const createWorker = (name: string, processor: (job: Job) => Promise<any>, concurrency: number) => {
    console.log(`  → Starting worker for ${name} (Concurrency: ${concurrency})`);
    const worker = new Worker(name, processor, {
        connection,
        concurrency,
    });

    worker.on('completed', (job) => {
        console.log(`✓ ${name} Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`✗ ${name} Job ${job?.id} failed:`, err.message);
    });

    return worker;
};

// Define Worker Definitions
const workers: { [key: string]: { name: string; proc: any; group: 'FAST' | 'MEDIUM' | 'HEAVY'; concurrency: number } } = {
    // Fast Jobs (Metadata, Simple Ops)
    rotate: { name: 'pdf-rotate', proc: processRotate, group: 'FAST', concurrency: 10 },
    protect: { name: 'pdf-protect', proc: processProtect, group: 'FAST', concurrency: 10 },
    unlock: { name: 'pdf-unlock', proc: processUnlock, group: 'FAST', concurrency: 10 },
    sign: { name: 'pdf-sign', proc: processSign, group: 'FAST', concurrency: 10 },
    reorder: { name: 'pdf-reorder', proc: processReorder, group: 'FAST', concurrency: 10 },

    // Medium Jobs (pdf-lib CPU/Memory intensive)
    merge: { name: 'pdf-merge', proc: processMerge, group: 'MEDIUM', concurrency: 5 },
    split: { name: 'pdf-split', proc: processSplit, group: 'MEDIUM', concurrency: 5 },
    watermark: { name: 'pdf-watermark', proc: processWatermark, group: 'MEDIUM', concurrency: 5 },

    // Heavy Jobs (External Process, High CPU)
    compress: { name: 'pdf-compress', proc: processCompress, group: 'HEAVY', concurrency: 2 },
    ocr: { name: 'pdf-ocr', proc: processOcr, group: 'HEAVY', concurrency: 2 },
    pdfToWord: { name: 'pdf-to-word', proc: processPdfToWord, group: 'HEAVY', concurrency: 2 },
    wordToPdf: { name: 'word-to-pdf', proc: processWordToPdf, group: 'HEAVY', concurrency: 2 },
    pdfToImage: { name: 'pdf-to-image', proc: processPdfToImage, group: 'HEAVY', concurrency: 2 },
    videoResize: { name: 'video-resize', proc: processVideoResize, group: 'HEAVY', concurrency: 1 },
};

const activeWorkers: Worker[] = [];

// Initialize Workers based on Type
Object.values(workers).forEach((config) => {
    if (WORKER_TYPE === 'ALL' || WORKER_TYPE === config.group) {
        activeWorkers.push(createWorker(config.name, config.proc, config.concurrency));
    }
});

console.log(`🚀 PDF Worker (${WORKER_TYPE}) started with ${activeWorkers.length} active processors`);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await Promise.all(activeWorkers.map(w => w.close()));
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
});

