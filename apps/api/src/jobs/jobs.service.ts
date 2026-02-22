import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES, JOB_STATUS, JOB_TYPES } from '@desi/shared';
import axios from 'axios';

@Injectable()
export class JobsService {
    constructor(
        private prisma: PrismaService,
        @InjectQueue(QUEUE_NAMES.merge) private mergeQueue: Queue,
        @InjectQueue(QUEUE_NAMES.split) private splitQueue: Queue,
        @InjectQueue(QUEUE_NAMES.compress) private compressQueue: Queue,
        @InjectQueue(QUEUE_NAMES.rotate) private rotateQueue: Queue,
        @InjectQueue(QUEUE_NAMES.reorder) private reorderQueue: Queue,
        @InjectQueue(QUEUE_NAMES.pdfToWord) private pdfToWordQueue: Queue,
        @InjectQueue(QUEUE_NAMES.wordToPdf) private wordToPdfQueue: Queue,
        @InjectQueue(QUEUE_NAMES.ocr) private ocrQueue: Queue,
        @InjectQueue(QUEUE_NAMES.protect) private protectQueue: Queue,
        @InjectQueue(QUEUE_NAMES.unlock) private unlockQueue: Queue,
        @InjectQueue(QUEUE_NAMES.watermark) private watermarkQueue: Queue,
        @InjectQueue(QUEUE_NAMES.sign) private signQueue: Queue,
        @InjectQueue(QUEUE_NAMES.pdfToImage) private pdfToImageQueue: Queue,
    ) { }

    /**
     * Create a generic job
     */
    async createJob(
        type: string,
        fileIds: string[],
        metadata?: Record<string, any>,
        userId?: string,
        webhookUrl?: string,
    ) {
        // Create job record
        const job = await this.prisma.job.create({
            data: {
                type: type as any,
                status: JOB_STATUS.UPLOADED,
                userId,
                metadata,
                webhookUrl,
                files: {
                    create: fileIds.map((fileId, index) => ({
                        fileId,
                        isInput: true,
                        order: index,
                    })),
                },
            },
            include: {
                files: {
                    include: { file: true },
                },
            },
        });

        const jobData = {
            jobId: job.id,
            fileIds,
            userId,
            ...metadata,
            // ...
            settings: metadata, // Pass metadata as settings for backward compatibility
        };

        // Queue based on job type
        switch (type) {
            case JOB_TYPES.MERGE:
                await this.mergeQueue.add('merge', jobData);
                break;
            case JOB_TYPES.SPLIT:
                await this.splitQueue.add('split', jobData);
                break;
            case JOB_TYPES.COMPRESS:
                await this.compressQueue.add('compress', jobData);
                break;
            case JOB_TYPES.ROTATE:
                await this.rotateQueue.add('rotate', jobData);
                break;
            case JOB_TYPES.REORDER:
                await this.reorderQueue.add('reorder', jobData);
                break;
            case JOB_TYPES.PDF_TO_WORD:
                await this.pdfToWordQueue.add('pdf-to-word', jobData);
                break;
            case JOB_TYPES.WORD_TO_PDF:
                await this.wordToPdfQueue.add('word-to-pdf', jobData);
                break;
            case JOB_TYPES.OCR:
                await this.ocrQueue.add('ocr', jobData);
                break;
            case JOB_TYPES.PROTECT:
                await this.protectQueue.add('protect', jobData);
                break;
            case JOB_TYPES.UNLOCK:
                await this.unlockQueue.add('unlock', jobData);
                break;
            case JOB_TYPES.WATERMARK:
                await this.watermarkQueue.add('watermark', jobData);
                break;
            case JOB_TYPES.SIGN:
                await this.signQueue.add('sign', jobData);
                break;
            case JOB_TYPES.PDF_TO_IMAGE:
                await this.pdfToImageQueue.add('pdf-to-image', jobData);
                break;
            default:
                console.warn(`Unknown job type: ${type}`);
        }

        return job;
    }

    /**
     * Create a merge job
     */
    async createMergeJob(fileIds: string[], userId?: string) {
        // Create job record
        const job = await this.prisma.job.create({
            data: {
                type: JOB_TYPES.MERGE,
                status: JOB_STATUS.UPLOADED,
                userId,
                files: {
                    create: fileIds.map((fileId, index) => ({
                        fileId,
                        isInput: true,
                        order: index,
                    })),
                },
            },
            include: {
                files: {
                    include: { file: true },
                },
            },
        });

        // Queue the job
        await this.mergeQueue.add('merge', {
            jobId: job.id,
            fileIds,
        });

        return {
            jobId: job.id,
            status: job.status,
            message: 'Merge job queued',
        };
    }

    /**
     * Get job status
     */
    async getJobStatus(jobId: string) {
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
            include: {
                files: {
                    include: {
                        file: true,
                    },
                },
            },
        });

        if (!job) {
            throw new NotFoundException('Job not found');
        }

        const inputFiles = job.files
            .filter((f) => f.isInput && f.file)
            .map((f) => ({
                id: f.file!.id,
                name: f.file!.name,
                originalName: f.file!.originalName,
                size: f.file!.size,
            }));

        const outputFiles = job.files
            .filter((f) => !f.isInput && f.file)
            .map((f) => ({
                id: f.file!.id,
                name: f.file!.name,
                originalName: f.file!.originalName,
                size: f.file!.size,
            }));

        return {
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            error: job.error,
            inputFiles,
            outputFiles,
            createdAt: job.createdAt.toISOString(),
            completedAt: job.completedAt?.toISOString(),
        };
    }

    /**
     * Get jobs for a user
     */
    async getUserJobs(userId: string) {
        const jobs = await this.prisma.job.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                files: {
                    include: {
                        file: true,
                    },
                },
            },
        });

        return jobs.map((job) => ({
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt.toISOString(),
            completedAt: job.completedAt?.toISOString(),
            inputCount: job.files.filter((f) => f.isInput).length,
            outputCount: job.files.filter((f) => !f.isInput).length,
        }));
    }

    /**
     * Update job status (called by worker)
     */
    /**
     * Update job status (called by worker)
     */
    async updateJobStatus(
        jobId: string,
        status: string,
        progress?: number,
        error?: string,
    ) {
        const data: any = { status };

        if (progress !== undefined) {
            data.progress = progress;
        }

        if (status === 'PROCESSING' && !error) {
            data.startedAt = new Date();
        }

        if (status === 'COMPLETED' || status === 'FAILED') {
            data.completedAt = new Date();
        }

        if (error) {
            data.error = error;
        }

        const job = await this.prisma.job.update({
            where: { id: jobId },
            data,
            include: {
                files: {
                    include: { file: true }
                }
            }
        });

        // Trigger Webhook if present
        if ((status === 'COMPLETED' || status === 'FAILED') && job.webhookUrl) {
            this.triggerWebhook(job);
        }

        return job;
    }

    private async triggerWebhook(job: any) {
        try {
            const payload = {
                jobId: job.id,
                status: job.status,
                type: job.type,
                progress: job.progress,
                error: job.error,
                metadata: job.metadata,
                completedAt: job.completedAt,
                files: job.files.map((f: any) => ({
                    id: f.fileId,
                    isInput: f.isInput,
                    url: f.file ? `/api/files/download/${f.fileId}` : null // Simplified URL
                }))
            };

            await axios.post(job.webhookUrl, payload, { timeout: 5000 });
        } catch (err: any) {
            console.error(`Failed to trigger webhook for job ${job.id}:`, err.message);
        }
    }

    /**
     * Add output file to job
     */
    async addOutputFile(jobId: string, fileId: string) {
        return this.prisma.jobFile.create({
            data: {
                jobId,
                fileId,
                isInput: false,
                order: 0,
            },
        });
    }

    /**
     * Get system stats
     */
    async getSystemStats() {
        // Queue stats
        const queues = [
            { name: 'merge', queue: this.mergeQueue },
            { name: 'split', queue: this.splitQueue },
            { name: 'compress', queue: this.compressQueue },
            { name: 'rotate', queue: this.rotateQueue },
            { name: 'reorder', queue: this.reorderQueue },
            { name: 'pdf-to-word', queue: this.pdfToWordQueue },
            { name: 'word-to-pdf', queue: this.wordToPdfQueue },
            { name: 'ocr', queue: this.ocrQueue },
            { name: 'protect', queue: this.protectQueue },
            { name: 'unlock', queue: this.unlockQueue },
            { name: 'watermark', queue: this.watermarkQueue },
            { name: 'sign', queue: this.signQueue },
            { name: 'pdf-to-image', queue: this.pdfToImageQueue },
        ];

        const queueStats = await Promise.all(
            queues.map(async ({ name, queue }) => {
                const [waiting, active, delayed, failed, completed] = await Promise.all([
                    queue.getWaitingCount(),
                    queue.getActiveCount(),
                    queue.getDelayedCount(),
                    queue.getFailedCount(),
                    queue.getCompletedCount(),
                ]);
                return { name, waiting, active, delayed, failed, completed };
            })
        );

        // DB Stats (last 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalJobs, failedJobs, completedJobs] = await Promise.all([
            this.prisma.job.count({ where: { createdAt: { gte: yesterday } } }),
            this.prisma.job.count({ where: { createdAt: { gte: yesterday }, status: 'FAILED' } }),
            this.prisma.job.count({ where: { createdAt: { gte: yesterday }, status: 'COMPLETED' } }),
        ]);

        return {
            timestamp: new Date(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            jobsLast24h: {
                total: totalJobs,
                failed: failedJobs,
                completed: completedJobs,
            },
            queues: queueStats,
        };
    }

    /**
     * Check Redis Health
     */
    async isRedisHealthy(): Promise<boolean> {
        try {
            // Check if queue client is connected
            const client = await this.mergeQueue.client;
            const pong = await client.ping();
            return pong === 'PONG';
        } catch (e) {
            return false;
        }
    }
}
