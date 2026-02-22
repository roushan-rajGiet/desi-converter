import { Job } from 'bullmq';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { downloadFile, uploadFile } from '../utils/storage';
import {
    updateJobStatus,
    updateJobProgress,
    getInputFiles,
    createOutputFile,
} from '../utils/database';

interface WatermarkJobData {
    jobId: string;
    settings?: {
        text?: string;
        size?: number;
        color?: string; // Hex code
        opacity?: number;
        position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
        type?: 'text' | 'image';
        watermarkFileId?: string;
    };
}

export async function processWatermark(job: Job<WatermarkJobData>) {
    const { jobId, settings } = job.data;

    // Fallback for flat job data
    const text = settings?.text || (job.data as any).text || 'DRAFT';
    const size = settings?.size || (job.data as any).size || 50;
    const opacity = settings?.opacity || (job.data as any).opacity || 0.5;
    const type = settings?.type || (job.data as any).type || 'text';

    const position = settings?.position || (job.data as any).position || 'center';

    try {
        await updateJobStatus(jobId, 'PROCESSING');

        // ... (existing file download and setup code) ...
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

        // ... (existing image loading code) ...
        let embeddedImage: any = null;
        let imageDims: { width: number, height: number } | null = null;

        if (type === 'image' && inputFiles.length > 1) {
            const watermarkFile = inputFiles[1];
            let watermarkKey = watermarkFile.storageKey;
            if (watermarkFile.storageKey.startsWith(`${watermarkFile.bucket}/`)) {
                watermarkKey = watermarkFile.storageKey.split('/').pop() || watermarkFile.name;
            }
            const imageBuffer = await downloadFile(watermarkFile.bucket, watermarkKey);
            if (watermarkFile.mimeType === 'image/png' || watermarkFile.name.toLowerCase().endsWith('.png')) {
                embeddedImage = await pdf.embedPng(imageBuffer);
            } else {
                embeddedImage = await pdf.embedJpg(imageBuffer);
            }

            if (embeddedImage) {
                const imgScale = size / 100;
                imageDims = { width: embeddedImage.width * imgScale, height: embeddedImage.height * imgScale };
            }
        }

        const font = await pdf.embedFont(StandardFonts.HelveticaBold);
        const pages = pdf.getPages();
        const totalPages = pages.length;

        await updateJobProgress(jobId, 20);

        const padding = 20;

        for (let i = 0; i < totalPages; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();

            let x = 0;
            let y = 0;
            let contentWidth = 0;
            let contentHeight = 0;

            if (type === 'image' && embeddedImage && imageDims) {
                contentWidth = imageDims.width;
                contentHeight = imageDims.height;
            } else {
                contentWidth = font.widthOfTextAtSize(text, size);
                contentHeight = font.heightAtSize(size);
            }

            // Calculate x
            if (position.includes('left')) {
                x = padding;
            } else if (position.includes('right')) {
                x = width - contentWidth - padding;
            } else { // center
                x = width / 2 - contentWidth / 2;
            }

            // Calculate y
            if (position.includes('top')) {
                y = height - contentHeight - padding;
            } else if (position.includes('bottom')) {
                y = padding;
            } else { // center
                y = height / 2 - contentHeight / 2;
            }

            // Adjust for rotation if needed, but for now assuming strict positioning based on axes

            if (type === 'image' && embeddedImage && imageDims) {
                page.drawImage(embeddedImage, {
                    x,
                    y,
                    width: contentWidth,
                    height: contentHeight,
                    opacity: opacity,
                    // Remove rotation for better positioning control, or keep if requested? 
                    // Usually logo watermarks aren't rotated 45 degrees if they are in corners.
                    // Let's only rotate if it's 'center' position? OR just remove rotation for now to simplify.
                    // User request didn't specify rotation control.
                    rotate: position === 'center' ? degrees(45) : degrees(0),
                });
            } else {
                page.drawText(text, {
                    x,
                    y,
                    size: size,
                    font: font,
                    color: rgb(0.7, 0.7, 0.7),
                    opacity: opacity,
                    rotate: position === 'center' ? degrees(45) : degrees(0),
                });
            }

            // ... (rest of loop) ...

            // Update progress occasionally
            if (i % 5 === 0) {
                const progress = 20 + Math.floor(((i + 1) / totalPages) * 70);
                await updateJobProgress(jobId, progress);
            }
        }

        const pdfBytes = await pdf.save();
        const buffer = Buffer.from(pdfBytes);

        const BUCKET_PROCESSED = process.env.S3_BUCKET_PROCESSED || 'processed';
        const { storageKey, size: outputSize } = await uploadFile(BUCKET_PROCESSED, buffer, 'application/pdf', 'pdf');

        const outputFilename = `watermarked_${inputFile.originalName || inputFile.name}`;
        await createOutputFile(jobId, storageKey, outputSize, outputFilename, 'application/pdf');

        await updateJobProgress(jobId, 100);
        await updateJobStatus(jobId, 'COMPLETED');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await updateJobStatus(jobId, 'FAILED', message);
        throw error;
    }
}
