import { Job } from 'bullmq';
import { PDFDocument } from 'pdf-lib';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

interface ReorderJobData {
    jobId: string;
    inputFileIds: string[];
    settings: {
        pageOrder: number[]; // New order of pages (1-indexed)
    };
}

export async function processReorder(job: Job<ReorderJobData>) {
    const { jobId, settings } = job.data;

    // Handle both nested settings object and direct properties (backward compatibility)
    const pageOrder = settings?.pageOrder || (job.data as any).pageOrder;

    try {
        await updateJobStatus(jobId, 'PROCESSING');

        const inputFiles = await getInputFiles(jobId);
        if (inputFiles.length === 0 || !inputFiles[0]) {
            throw new Error('No input file provided');
        }

        if (!pageOrder || pageOrder.length === 0) {
            throw new Error('Page order array required');
        }

        const inputFile = inputFiles[0];

        let key = inputFile.storageKey;
        if (inputFile.storageKey.startsWith(`${inputFile.bucket}/`)) {
            key = inputFile.storageKey.split('/').pop() || inputFile.name;
        }

        const pdfBuffer = await downloadFile(inputFile.bucket, key);
        const pdf = await PDFDocument.load(pdfBuffer);
        const totalPages = pdf.getPageCount();

        await updateJobProgress(jobId, 30);

        // Validate page order
        const validOrder = (pageOrder as number[])
            .filter((p) => p >= 1 && p <= totalPages)
            .map((p) => p - 1);

        if (validOrder.length === 0) {
            throw new Error('No valid page numbers in order array');
        }

        // Create new PDF with reordered pages
        const newPdf = await PDFDocument.create();
        const pages = await newPdf.copyPages(pdf, validOrder);
        pages.forEach((page) => newPdf.addPage(page));

        await updateJobProgress(jobId, 70);

        // Save PDF
        const pdfBytes = await newPdf.save();
        const buffer = Buffer.from(pdfBytes);

        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';
        const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, buffer, 'application/pdf', 'pdf');

        const originalName = inputFile.originalName.replace('.pdf', '_reordered.pdf');
        await createOutputFile(jobId, storageKey, size, originalName, 'application/pdf');

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');

        console.log(`Reorder completed: ${validOrder.length} pages in new order`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobStatus(jobId, 'FAILED', message);
        throw error;
    }
}
