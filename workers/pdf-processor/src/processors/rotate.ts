import { Job } from 'bullmq';
import { PDFDocument, degrees } from 'pdf-lib';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

interface RotateJobData {
    jobId: string;
    inputFileIds: string[];
    settings: {
        rotation: 90 | 180 | 270;
        pageNumbers?: number[];
    };
}

export async function processRotate(job: Job<RotateJobData>) {
    const { jobId, settings } = job.data;

    // Handle both nested settings object and direct properties (backward compatibility)
    const rotation = settings?.rotation || (job.data as any).rotation;
    const pageNumbers = settings?.pageNumbers || (job.data as any).pageNumbers;

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

        const pdfBuffer = await downloadFile(inputFile.bucket, key);
        const pdf = await PDFDocument.load(pdfBuffer);
        const totalPages = pdf.getPageCount();

        await updateJobProgress(jobId, 30);

        // Determine which pages to rotate
        const pagesToRotate = pageNumbers
            ? (pageNumbers as number[]).filter((p) => p >= 1 && p <= totalPages).map((p) => p - 1)
            : Array.from({ length: totalPages }, (_, i) => i);

        // Rotate pages
        for (const pageIndex of pagesToRotate) {
            const page = pdf.getPage(pageIndex);
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees(currentRotation + Number(rotation))); // Ensure number
        }

        await updateJobProgress(jobId, 70);

        // Save PDF
        const pdfBytes = await pdf.save();
        const buffer = Buffer.from(pdfBytes);

        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';
        const { storageKey, size } = await uploadFile(BUCKET_PROCESSED, buffer, 'application/pdf', 'pdf');

        const originalName = inputFile.originalName.replace('.pdf', '_rotated.pdf');
        await createOutputFile(jobId, storageKey, size, originalName, 'application/pdf');

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');

        console.log(`Rotate completed: ${pagesToRotate.length}/${totalPages} pages rotated ${rotation}°`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobStatus(jobId, 'FAILED', message);
        throw error;
    }
}
