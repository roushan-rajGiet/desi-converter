
import { Job } from 'bullmq';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { downloadFile, uploadFile } from '../utils/storage';
import { BUCKETS } from '@desi/shared';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

interface VideoResizeJobData {
    jobId: string;
    inputFileIds: string[];
    settings: {
        resolution?: '1080p' | '720p' | '480p' | '360p';
        format?: 'mp4' | 'webm';
    };
}

const RESOLUTION_MAP = {
    '1080p': '1920x1080',
    '720p': '1280x720',
    '480p': '854x480',
    '360p': '640x360',
};

export async function processVideoResize(job: Job<VideoResizeJobData>) {
    const { jobId, settings } = job.data;
    const tempDir = path.join(os.tmpdir(), `desi-video-resize-${jobId}`);

    try {
        await updateJobStatus(jobId, 'PROCESSING');
        fs.mkdirSync(tempDir, { recursive: true });

        const inputFiles = await getInputFiles(jobId);
        if (inputFiles.length === 0 || !inputFiles[0]) {
            throw new Error('No input file provided');
        }

        const inputFile = inputFiles[0];
        await updateJobProgress(jobId, 10);

        // Download input file
        const videoBuffer = await downloadFile(inputFile.bucket, inputFile.storageKey);
        const inputPath = path.join(tempDir, inputFile.originalName);
        const outputFormat = settings.format || 'mp4';
        const outputFilename = `resized_${path.parse(inputFile.originalName).name}.${outputFormat}`;
        const outputPath = path.join(tempDir, outputFilename);

        fs.writeFileSync(inputPath, videoBuffer);

        await updateJobProgress(jobId, 30);

        // Build ffmpeg args
        const resolution = settings.resolution || '720p';
        const scale = RESOLUTION_MAP[resolution];

        const args = [
            '-i', inputPath,
            '-vf', `scale=${scale}`,
            '-c:a', 'copy',
            outputPath
        ];

        // If changing container to webm, might need specific codecs (vp9/opus)
        if (outputFormat === 'webm') {
            args.push('-c:v', 'libvpx-vp9');
            args.push('-c:a', 'libopus');
        } else {
            // standard mp4
            args.push('-c:v', 'libx264');
            args.push('-preset', 'fast');
            args.push('-crf', '23');
        }


        await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', args);

            ffmpeg.stderr.on('data', (data) => {
                // ffmpeg writes progress to stderr
                console.log(`ffmpeg: ${data}`);
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`ffmpeg exited with code ${code}`));
                }
            });

            ffmpeg.on('error', (err) => {
                reject(err);
            });
        });

        await updateJobProgress(jobId, 80);

        // Upload resized file
        const resizedBuffer = fs.readFileSync(outputPath);
        const mimeType = outputFormat === 'mp4' ? 'video/mp4' : 'video/webm';

        const { storageKey, size } = await uploadFile(
            BUCKETS.processed,
            resizedBuffer,
            mimeType,
            outputFormat
        );

        // Create output file record
        await createOutputFile(jobId, storageKey, size, outputFilename, mimeType, BUCKETS.processed);

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobStatus(jobId, 'FAILED', message);
        throw error;
    } finally {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    }
}
