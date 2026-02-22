const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export interface UploadedFile {
    id: string;
    name: string;
    originalName: string;
    size: number;
    mimeType: string;
}

export interface JobStatus {
    id: string;
    type: string;
    status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    error?: string;
    inputFiles: UploadedFile[];
    outputFiles: UploadedFile[];
    createdAt: string;
    completedAt?: string;
}

class ApiClient {
    // ==================
    // File Operations
    // ==================

    async uploadFile(file: File): Promise<UploadedFile> {
        const formData = new FormData();
        formData.append('file', file);

        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api/files/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Upload failed');
        }

        return response.json();
    }

    async uploadMultiple(files: File[]): Promise<UploadedFile[]> {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));

        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api/files/upload-multiple`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Upload failed');
        }

        return response.json();
    }

    async getDownloadUrl(fileId: string): Promise<{ url: string; filename: string }> {
        const response = await fetch(`${API_URL}/api/files/${fileId}/download`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to get download URL');
        }

        return response.json();
    }

    // ==================
    // Job Operations
    // ==================

    async getJobStatus(jobId: string): Promise<JobStatus> {
        const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to get job status');
        }

        return response.json();
    }

    // ==================
    // Tool Operations
    // ==================

    async mergePdfs(fileIds: string[]): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/merge`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileIds }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Merge request failed');
        }

        return response.json();
    }

    async splitPdf(
        fileId: string,
        mode: 'pages' | 'ranges' | 'extract',
        options: { pages?: number[]; ranges?: string } = {}
    ): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/split`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                fileId,
                mode,
                ...options,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Split request failed');
        }

        return response.json();
    }

    async compressPdf(
        fileIds: string[],
        level: 'low' | 'medium' | 'high'
    ): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/compress`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileIds, level }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Compress request failed');
        }

        return response.json();
    }

    async rotatePdf(
        fileId: string,
        rotation: 90 | 180 | 270,
        pageNumbers?: number[]
    ): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/rotate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId, rotation, pageNumbers }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Rotate request failed');
        }

        return response.json();
    }

    async reorderPdf(
        fileId: string,
        order: number[]
    ): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/reorder`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId, limit_order: order }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Reorder request failed');
        }

        return response.json();
    }

    async pdfToWord(fileId: string): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/pdf-to-word`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId }),
        });

        if (!response.ok) { throw new Error('Conversion failed'); }
        return response.json();
    }

    async wordToPdf(fileId: string): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/word-to-pdf`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId }),
        });

        if (!response.ok) { throw new Error('Conversion failed'); }
        return response.json();
    }

    async ocr(fileId: string, language?: string): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/ocr`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId, language }),
        });

        if (!response.ok) { throw new Error('OCR failed'); }
        return response.json();
    }

    async pdfToImage(fileId: string, format?: 'png' | 'jpg', dpi?: number): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/pdf-to-image`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId, format, dpi }),
        });

        if (!response.ok) { throw new Error('Conversion failed'); }
        return response.json();
    }

    async protectPdf(fileId: string, password: string, ownerPassword?: string): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/protect`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId, password, ownerPassword }),
        });

        if (!response.ok) { throw new Error('Protection failed'); }
        return response.json();
    }

    async unlockPdf(fileId: string, password: string): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/unlock`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId, password }),
        });

        if (!response.ok) { throw new Error('Unlock failed'); }
        return response.json();
    }

    async watermarkPdf(
        fileId: string,
        text: string,
        options?: {
            size?: number,
            color?: string,
            opacity?: number,
            type?: 'text' | 'image',
            watermarkFileId?: string,
            position?: string
        }
    ): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/watermark`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                fileId,
                text,
                ...options
            }),
        }); if (!response.ok) { throw new Error('Watermark failed'); }
        return response.json();
    }

    async signPdf(fileId: string, text: string, style: 'handwritten' | 'clean' | 'typewriter' = 'handwritten'): Promise<{ jobId: string; status: string; message: string }> {
        const response = await fetch(`${API_URL}/api/tools/sign`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ fileId, text, style }),
        });

        if (!response.ok) { throw new Error('Signing failed'); }
        return response.json();
    }


}

// Type alias for upload responses used by components
export type UploadResponse = UploadedFile;

export const api = new ApiClient();
