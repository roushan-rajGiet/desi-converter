import { Injectable } from '@nestjs/common';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { BUCKETS } from '@desi/shared';
import * as fs from 'fs';

@Injectable()
export class StorageService {
    private s3Client: S3Client;
    private publicS3Client: S3Client;

    constructor() {
        // Internal client for uploads/downloads within Docker network
        this.s3Client = new S3Client({
            endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
            region: 'auto',
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
                secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
            },
            forcePathStyle: true, // Required for MinIO
        });

        // Public client for generating download URLs accessible from browser
        this.publicS3Client = new S3Client({
            endpoint: process.env.S3_PUBLIC_ENDPOINT || 'http://localhost:9000',
            region: 'auto',
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
                secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
            },
            forcePathStyle: true,
        });
    }

    /**
     * Upload a file to storage
     */
    async uploadFile(
        file: Buffer | string, // Buffer or file path
        mimeType: string,
        originalName: string,
        bucket: string = BUCKETS.uploads,
    ): Promise<{ storageKey: string; size: number }> {
        const ext = originalName.split('.').pop() || 'pdf';
        const filename = `${uuidv4()}.${ext}`;
        const storageKey = `${bucket}/${filename}`;

        let body: Buffer | fs.ReadStream;
        let size: number;

        if (typeof file === 'string') {
            body = fs.createReadStream(file);
            const stat = fs.statSync(file);
            size = stat.size;
        } else {
            body = file;
            size = file.length;
        }

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: filename,
                Body: body,
                ContentType: mimeType,
                ContentLength: size,
            }),
        );

        return {
            storageKey,
            size,
        };
    }

    /**
     * Download a file from storage
     */
    async downloadFile(bucket: string, key: string): Promise<Buffer> {
        const response = await this.s3Client.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
        );

        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    /**
     * Get a signed download URL (temporary access)
     * Uses public endpoint so browsers can access the URL
     */
    async getSignedDownloadUrl(bucket: string, key: string, expiresIn = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        return getSignedUrl(this.publicS3Client, command, { expiresIn });
    }

    /**
     * Get a signed upload URL
     */
    async getSignedUploadUrl(
        bucket: string,
        key: string,
        contentType: string,
        expiresIn = 3600,
    ): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    /**
     * Delete a file from storage
     */
    async deleteFile(bucket: string, key: string): Promise<void> {
        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
        );
    }

    /**
     * Get public URL for processed files
     */
    getPublicUrl(bucket: string, key: string): string {
        const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
        return `${endpoint}/${bucket}/${key}`;
    }
}
