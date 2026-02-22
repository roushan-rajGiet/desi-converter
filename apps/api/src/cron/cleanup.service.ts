
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly config: ConfigService,
    ) { }

    @Cron(CronExpression.EVERY_HOUR)
    async handleCron() {
        this.logger.debug('Running scheduled cleanup...');

        const retentionHours = this.config.get<number>('FILE_RETENTION_HOURS', 24);
        const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

        try {
            // Find old jobs
            const oldJobs = await this.prisma.job.findMany({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                },
                include: {
                    files: {
                        include: {
                            file: true,
                        },
                    },
                },
            });

            if (oldJobs.length === 0) {
                this.logger.debug('No old jobs found to cleanup.');
                return;
            }

            this.logger.log(`Found ${oldJobs.length} jobs to cleanup.`);

            for (const job of oldJobs) {
                // Delete files from storage
                for (const jobFile of job.files) {
                    if (jobFile.file) {
                        try {
                            // Only delete if no other jobs are using this file (not implemented for simplicity, assuming 1-1 mostly)
                            // A better approach is to check if file.expiresAt < now, but we are basing on Job age here.
                            await this.storage.deleteFile(jobFile.file.bucket, jobFile.file.storageKey);
                        } catch (e: any) {
                            this.logger.warn(`Failed to delete file ${jobFile.file.storageKey} from S3: ${e.message}`);
                        }
                    }
                }

                // Delete Job (cascade deletes JobFile)
                // We might want to keep the Job record but mark as expired, but for now we delete to save DB space
                await this.prisma.job.delete({
                    where: { id: job.id },
                });
            }

            this.logger.log(`Cleanup complete. processed ${oldJobs.length} jobs.`);

            // Also cleanup orphaned files that have expired
            const expiredFiles = await this.prisma.file.findMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            });

            if (expiredFiles.length > 0) {
                this.logger.log(`Found ${expiredFiles.length} expired files to cleanup.`);
                for (const file of expiredFiles) {
                    try {
                        await this.storage.deleteFile(file.bucket, file.storageKey);
                        await this.prisma.file.delete({ where: { id: file.id } });
                    } catch (e: any) {
                        this.logger.warn(`Failed to delete expired file ${file.id}: ${e.message}`);
                    }
                }
            }

        } catch (e) {
            this.logger.error('Error during cleanup:', e);
        }
    }
}
