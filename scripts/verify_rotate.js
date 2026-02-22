
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:4000'; // Backend is on 4000
const TEST_FILE_PATH = path.join(__dirname, 'test-pattern.pdf');

async function createDummyPdf() {
    try {
        const { PDFDocument } = require('pdf-lib'); // Try to load from project
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText('Test PDF for Rotation Verification', { x: 50, y: 500 });
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(TEST_FILE_PATH, pdfBytes);
        console.log('Created valid dummy PDF using pdf-lib.');
    } catch (e) {
        console.warn('Could not load pdf-lib, creating simple text file as PDF (worker might fail processing but upload will work). Error:', e.message);
        fs.writeFileSync(TEST_FILE_PATH, 'This is a dummy text file pretending to be a PDF.');
    }
    return TEST_FILE_PATH;
}

async function verifyRotate() {
    try {
        const filePath = await createDummyPdf();
        console.log(`Using test file: ${filePath}`);

        // 1. Upload File
        const fileContent = fs.readFileSync(filePath);
        const form = new FormData();
        const blob = new Blob([fileContent], { type: 'application/pdf' });
        form.append('file', blob, 'test-pattern.pdf');

        console.log('Uploading file...');
        const uploadRes = await fetch(`${API_URL}/api/files/upload`, {
            method: 'POST',
            body: form
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        const uploadData = await uploadRes.json();
        const fileId = uploadData.id;
        console.log(`File uploaded. ID: ${fileId}`);

        // 2. Request Rotation
        console.log('Requesting rotation (90 degrees)...');
        const rotateRes = await fetch(`${API_URL}/api/tools/rotate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: fileId, rotation: 90 })
        });

        if (!rotateRes.ok) {
            const errText = await rotateRes.text();
            throw new Error(`Rotate request failed: ${rotateRes.status} ${errText}`);
        }
        const rotateData = await rotateRes.json();
        const jobId = rotateData.jobId;
        console.log(`Rotate job started. Job ID: ${jobId}`);

        // 3. Poll for status
        let status = 'INITIALIZING';
        let retries = 0;

        console.log(`Polling status for job ${jobId}...`);

        while (true) {
            if (retries > 60) {
                console.error('Timeout waiting for job completion');
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
            try {
                // Correct endpoint: /api/jobs/:id (not /status)
                const statusRes = await fetch(`${API_URL}/api/jobs/${jobId}`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    status = statusData.status;
                    console.log(`Job Status: ${status} (Progress: ${statusData.progress}%)`);

                    if (status === 'FAILED') {
                        console.error('Job Failed with error:', statusData.error);
                        break;
                    }
                    if (status === 'COMPLETED') {
                        console.log('Job Completed! Output:', statusData.outputFiles);
                        break;
                    }
                } else {
                    console.error(`Status check failed: ${statusRes.status} ${statusRes.statusText}`);
                }
            } catch (e) { console.log("Retrying status check...", e.message); }
            retries++;
        }

        if (status === 'COMPLETED') {
            console.log('SUCCESS: Rotation job completed!');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

verifyRotate();
