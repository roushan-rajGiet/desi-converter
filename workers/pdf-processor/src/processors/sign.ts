import { Job } from 'bullmq';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

interface SignJobData {
    jobId: string;
    settings?: {
        text?: string; // Text signature
        style?: 'handwritten' | 'clean' | 'typewriter';
        // In future: imageId for image signature
    };
}

export async function processSign(job: Job<SignJobData>) {
    const { jobId, settings } = job.data;
    const text = settings?.text || (job.data as any).text;

    try {
        await updateJobStatus(jobId, 'PROCESSING');

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
        const pdf = await PDFDocument.load(inputBuffer);

        // Map style to font
        let fontToUse;
        const style = settings?.style || 'handwritten';

        if (style === 'clean') {
            fontToUse = await pdf.embedFont(StandardFonts.Helvetica);
        } else if (style === 'typewriter') {
            fontToUse = await pdf.embedFont(StandardFonts.Courier);
        } else {
            // Handwritten - using TimesRomanItalic as a proxy for "classy" text
            // Real handwritten requires custom font files, keeping it simple with standard fonts for now
            fontToUse = await pdf.embedFont(StandardFonts.TimesRomanItalic);
        }

        const pages = pdf.getPages();
        const lastPage = pages[pages.length - 1];
        const { width } = lastPage.getSize();

        await updateJobProgress(jobId, 50);

        // Simple text signature at bottom right of last page
        if (text) {
            lastPage.drawText(text, {
                x: width - 200,
                y: 50,
                size: 24,
                font: fontToUse,
                color: rgb(0, 0, 0),
            });
        }

        const pdfBytes = await pdf.save();
        const buffer = Buffer.from(pdfBytes);

        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';
        const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, buffer, 'application/pdf', 'pdf');

        const outputFilename = `signed_${inputFile.originalName || inputFile.name}`;
        await createOutputFile(jobId, storageKey, size, outputFilename, 'application/pdf');

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobStatus(jobId, 'FAILED', message);
        throw error;
    }
}
