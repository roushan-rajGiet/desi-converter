import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { BUCKETS, FILE_LIMITS } from '@desi/shared';
import * as fs from 'fs';
import * as util from 'util';

const unlink = util.promisify(fs.unlink);

@Injectable()
export class FilesService {
    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
    ) { }

    /**
     * Upload a file to storage and create database record
     */
    async uploadFile(
        file: Express.Multer.File,
        userId?: string,
    ) {
        // Validate file size
        if (file.size > FILE_LIMITS.maxSizeBytes) {
            // Clean up if file exists
            if (file.path) {
                await unlink(file.path).catch(() => { });
            }
            throw new BadRequestException(
                `File size exceeds maximum of ${FILE_LIMITS.maxSizeMB}MB`,
            );
        }

        // Upload to MinIO
        const { storageKey, size } = await this.storage.uploadFile(
            file.path || file.buffer,
            file.mimetype,
            file.originalname,
            BUCKETS.uploads,
        );

        // Clean up temp file if it exists
        if (file.path) {
            await unlink(file.path).catch(err => console.error('Error deleting temp file:', err));
        }

        // Set expiry time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + FILE_LIMITS.expiryHours);

        // Create database record
        const dbFile = await this.prisma.file.create({
            data: {
                name: storageKey.split('/').pop() || 'unknown',
                originalName: file.originalname,
                size,
                mimeType: file.mimetype,
                bucket: BUCKETS.uploads,
                storageKey,
                type: 'INPUT',
                expiresAt,
                userId,
            },
        });

        return {
            id: dbFile.id,
            name: dbFile.name,
            originalName: dbFile.originalName,
            size: dbFile.size,
            mimeType: dbFile.mimeType,
        };
    }

    /**
     * Upload multiple files
     */
    async uploadMultiple(
        files: Express.Multer.File[],
        userId?: string,
    ) {
        const results = [];
        for (const file of files) {
            const result = await this.uploadFile(file, userId);
            results.push(result);
        }
        return results;
    }

    /**
     * Get file by ID
     */
    async getFile(fileId: string) {
        const file = await this.prisma.file.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            throw new NotFoundException('File not found');
        }

        return file;
    }

    /**
     * Get signed download URL for a file
     */
    async getDownloadUrl(fileId: string) {
        const file = await this.getFile(fileId);

        const key = file.storageKey.split('/').pop() || file.name;
        const url = await this.storage.getSignedDownloadUrl(file.bucket, key);

        return {
            url,
            filename: file.originalName,
        };
    }

    /**
     * Download file buffer
     */
    async downloadBuffer(fileId: string): Promise<{ buffer: Buffer; file: any }> {
        const file = await this.getFile(fileId);
        const key = file.storageKey.split('/').pop() || file.name;
        const buffer = await this.storage.downloadFile(file.bucket, key);
        return { buffer, file };
    }

    /**
     * Create output file record
     */
    async createOutputFile(
        storageKey: string,
        originalName: string,
        size: number,
        mimeType: string,
        userId?: string,
    ) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + FILE_LIMITS.expiryHours);

        return this.prisma.file.create({
            data: {
                name: storageKey.split('/').pop() || 'output',
                originalName,
                size,
                mimeType,
                bucket: BUCKETS.processed,
                storageKey: `${BUCKETS.processed}/${storageKey.split('/').pop()}`,
                type: 'OUTPUT',
                expiresAt,
                userId,
            },
        });
    }

    /**
     * Delete a file
     */
    async deleteFile(fileId: string, userId?: string) {
        const file = await this.getFile(fileId);

        // Check ownership if userId provided
        if (userId && file.userId !== userId) {
            throw new BadRequestException('Not authorized to delete this file');
        }

        // Delete from storage
        const key = file.storageKey.split('/').pop() || file.name;
        await this.storage.deleteFile(file.bucket, key);

        // Delete from database
        await this.prisma.file.delete({ where: { id: fileId } });

        return { success: true };
    }

    /**
     * Get files for a user
     */
    async getUserFiles(userId: string) {
        return this.prisma.file.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
}
