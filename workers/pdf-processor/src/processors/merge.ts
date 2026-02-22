import { Job } from 'bullmq';
import { PDFDocument } from 'pdf-lib';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

interface MergeJobData {
    jobId: string;
    inputFileIds: string[];
    settings: {
        mergeOrder?: string[];
    };
}

export async function processMerge(job: Job<MergeJobData>) {
    const { jobId } = job.data;

    try {
        await updateJobStatus(jobId, 'PROCESSING');

        // Get input files in order
        const inputFiles = await getInputFiles(jobId);

        if (inputFiles.length < 2) {
            throw new Error('At least 2 PDF files required for merge');
        }

        await updateJobProgress(jobId, 10);

        // Create merged PDF
        const mergedPdf = await PDFDocument.create();
        const totalFiles = inputFiles.length;

        for (let i = 0; i < inputFiles.length; i++) {
            const file = inputFiles[i];
            if (!file) continue;

            // Download PDF
            let key = file.storageKey;
            if (file.storageKey.startsWith(`${file.bucket}/`)) {
                key = file.storageKey.split('/').pop() || file.name;
            }
            const pdfBuffer = await downloadFile(file.bucket, key);
            const pdf = await PDFDocument.load(pdfBuffer);

            // Copy all pages
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach((page) => mergedPdf.addPage(page));

            // Update progress
            const progress = 10 + Math.floor(((i + 1) / totalFiles) * 80);
            await updateJobProgress(jobId, progress);
        }

        await updateJobProgress(jobId, 90);

        // Save merged PDF
        const mergedBytes = await mergedPdf.save();
        const buffer = Buffer.from(mergedBytes);

        // Upload to storage
        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';
        const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, buffer, 'application/pdf', 'pdf');

        // Create output file record
        await createOutputFile(
            jobId,
            storageKey,
            size,
            'merged.pdf',
            'application/pdf',
        );

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');

        console.log(`Merge completed: ${inputFiles.length} files -> ${size} bytes`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobStatus(jobId, 'FAILED', message);
        throw error;
    }
}
