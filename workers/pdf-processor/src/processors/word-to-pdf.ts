import { Job } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

const execAsync = promisify(exec);

interface WordToPdfJobData {
    jobId: string;
}

export async function processWordToPdf(job: Job<WordToPdfJobData>) {
    const { jobId } = job.data;
    const tmpDir = path.join(os.tmpdir(), jobId);
    const userProfileDir = path.join(tmpDir, 'libreoffice_profile');

    try {
        await updateJobStatus(jobId, 'PROCESSING');
        await fs.mkdir(tmpDir, { recursive: true });
        await fs.mkdir(userProfileDir, { recursive: true });

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

        await updateJobProgress(jobId, 30);

        // Execute LibreOffice conversion
        // Added -env:UserInstallation to avoid permission/concurrency issues
        const command = `soffice --headless "-env:UserInstallation=file://${userProfileDir}" --convert-to pdf "${inputPath}" --outdir "${tmpDir}"`;

        console.log(`Executing command: ${command}`);

        try {
            const { stdout, stderr } = await execAsync(command);
            if (stdout) console.log('LibreOffice stdout:', stdout);
            if (stderr) console.warn('LibreOffice stderr:', stderr);
        } catch (execError: any) {
            const stderr = execError.stderr ? execError.stderr.toString() : '';
            const stdout = execError.stdout ? execError.stdout.toString() : '';
            console.error('LibreOffice execution failed:', { message: execError.message, stdout, stderr });
            throw new Error(`LibreOffice conversion failed: ${execError.message}${stderr ? ` (${stderr.trim()})` : ''}`);
        }

        await updateJobProgress(jobId, 70);

        const outputFilename = path.parse(inputFile.name).name + '.pdf';
        const outputPath = path.join(tmpDir, outputFilename);

        try {
            await fs.access(outputPath);
        } catch {
            console.error(`Output file not found: ${outputPath}`);
            console.error(`Command executed: ${command}`);
            const dirFiles = await fs.readdir(tmpDir);
            console.error(`Contents of ${tmpDir}:`, dirFiles);
            throw new Error('Conversion failed: Output file not created');
        }

        const outputBuffer = await fs.readFile(outputPath);
        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';
        const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, outputBuffer, 'application/pdf', 'pdf');

        await createOutputFile(jobId, storageKey, size, outputFilename, 'application/pdf');

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Job ${jobId} failed:`, message);
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
