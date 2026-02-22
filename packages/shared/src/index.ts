// Shared types and constants for Desi Converter
// ===============================================

// Queue names
export const QUEUE_NAMES = {
    pdf: 'pdf-processing',
    merge: 'pdf-merge',
    split: 'pdf-split',
    compress: 'pdf-compress',
    rotate: 'pdf-rotate',
    reorder: 'pdf-reorder',
    pdfToWord: 'pdf-to-word',
    wordToPdf: 'word-to-pdf',
    ocr: 'pdf-ocr',
    protect: 'pdf-protect',
    unlock: 'pdf-unlock',
    watermark: 'pdf-watermark',
    sign: 'pdf-sign',
    pdfToImage: 'pdf-to-image',
    videoResize: 'video-resize',
} as const;

// File limits
export const FILE_LIMITS = {
    maxSizeMB: 1024,
    maxSizeBytes: 1024 * 1024 * 1024,
    expiryHours: 24,
} as const;

// Tier limits
export const FREE_TIER_LIMITS = {
    maxFilesPerDay: 5,
    maxFileSizeMB: 10,
    maxFilesPerJob: 5,
} as const;

export const PREMIUM_TIER_LIMITS = {
    maxFilesPerDay: 100,
    maxFileSizeMB: 50,
    maxFilesPerJob: 20,
} as const;

export const ENTERPRISE_TIER_LIMITS = {
    maxFilesPerDay: Infinity,
    maxFileSizeMB: 100,
    maxFilesPerJob: 100,
} as const;

// Storage buckets
export const BUCKETS = {
    uploads: 'uploads',
    processed: 'processed',
    temp: 'temp',
} as const;

// Job statuses
export const JOB_STATUS = {
    UPLOADED: 'UPLOADED',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
} as const;

// Job types
export const JOB_TYPES = {
    MERGE: 'MERGE',
    SPLIT: 'SPLIT',
    COMPRESS: 'COMPRESS',
    ROTATE: 'ROTATE',
    REORDER: 'REORDER',
    PDF_TO_WORD: 'PDF_TO_WORD',
    WORD_TO_PDF: 'WORD_TO_PDF',
    OCR: 'OCR',
    PROTECT: 'PROTECT',
    UNLOCK: 'UNLOCK',
    WATERMARK: 'WATERMARK',
    SIGN: 'SIGN',
    PDF_TO_IMAGE: 'PDF_TO_IMAGE',
    VIDEO_RESIZE: 'VIDEO_RESIZE',
} as const;

// API Response interfaces
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface FileUploadResponse {
    id: string;
    name: string;
    originalName: string;
    size: number;
    mimeType: string;
}

export interface JobResponse {
    id: string;
    type: string;
    status: string;
    progress: number;
    error?: string;
    inputFiles: FileUploadResponse[];
    outputFiles: FileUploadResponse[];
    createdAt: string;
    completedAt?: string;
}

export interface AuthResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        name?: string;
    };
}

// Type helpers
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
export type Bucket = typeof BUCKETS[keyof typeof BUCKETS];
export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];
export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];
