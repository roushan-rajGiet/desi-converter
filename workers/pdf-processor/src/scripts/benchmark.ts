
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

async function createDummyPdf(name: string, pages = 5) {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < pages; i++) {
        const page = pdfDoc.addPage([600, 400]);
        page.drawText(`Page ${i + 1} - Benchmark`, { x: 50, y: 350, size: 30 });
    }
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(name, pdfBytes);
    return name;
}

async function runBenchmark() {
    console.log('Starting Benchmark...');
    const testFile = 'benchmark_test.pdf';
    await createDummyPdf(testFile, 10);
    const stats = fs.statSync(testFile);
    console.log(`Created test file: ${testFile} (${(stats.size / 1024).toFixed(2)} KB)`);

    // Mock Process Functions or just measure basic ops
    // Since we can't easily import the worker functions without the whole BullMQ/Redis context
    // We will benchmark the underlying libraries here to verify optimization flags are valid commands.

    try {
        const start = performance.now();
        // Simulate a "load" operation which is part of Merge/Split
        const buffer = fs.readFileSync(testFile);
        const pdf = await PDFDocument.load(buffer);
        const copied = await PDFDocument.create();
        const pages = await copied.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => copied.addPage(p));
        await copied.save();
        const end = performance.now();
        console.log(`PDF-Lib Load/Copy/Save (10 pages): ${(end - start).toFixed(2)}ms`);
    } catch (e) {
        console.error('Benchmark failed:', e);
    }

    // Cleanup
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
}

runBenchmark().catch(console.error);
