import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'auto',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
});

const bucket = process.env.S3_BUCKET || 'desiconverter';

export async function downloadFile(storageKey: string): Promise<Buffer> {
    const response = await s3Client.send(
        new GetObjectCommand({
            Bucket: bucket,
            Key: storageKey,
        }),
    );

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export async function uploadFile(
    buffer: Buffer,
    mimeType: string,
    extension: string,
): Promise<{ storageKey: string; size: number }> {
    const storageKey = `outputs/${uuidv4()}.${extension}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: storageKey,
            Body: buffer,
            ContentType: mimeType,
        }),
    );

    return {
        storageKey,
        size: buffer.length,
    };
}
