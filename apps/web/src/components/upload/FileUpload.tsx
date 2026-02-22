'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { UploadedFile, api } from '@/lib/api';

interface FileUploadProps {
    accept?: Record<string, string[]>;
    maxFiles?: number;
    maxSize?: number; // in bytes
    onFilesUploaded: (files: UploadedFile[]) => void;
    multiple?: boolean;
}

export default function FileUpload({
    accept = { 'application/pdf': ['.pdf'] },
    maxFiles = 10,
    maxSize = 15 * 1024 * 1024, // 15MB
    onFilesUploaded,
    multiple = true,
}: FileUploadProps) {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;

            setUploading(true);
            setError(null);

            try {
                if (multiple) {
                    const uploadedFiles = await api.uploadMultiple(acceptedFiles);
                    setFiles((prev) => [...prev, ...uploadedFiles]);
                    onFilesUploaded([...files, ...uploadedFiles]);
                } else {
                    const uploadedFile = await api.uploadFile(acceptedFiles[0]);
                    setFiles([uploadedFile]);
                    onFilesUploaded([uploadedFile]);
                }
            } catch (err: any) {
                console.error('Upload error:', err);
                const errorMessage = err?.message || 'Failed to upload files. Please try again.';
                setError(errorMessage);
            } finally {
                setUploading(false);
            }
        },
        [files, multiple, onFilesUploaded]
    );

    const removeFile = (id: string) => {
        const newFiles = files.filter((f) => f.id !== id);
        setFiles(newFiles);
        onFilesUploaded(newFiles);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxFiles,
        maxSize,
        multiple,
    });

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="w-full">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={clsx(
                    'dropzone relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
                    isDragActive
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                )}
            >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-4">
                    {uploading ? (
                        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-primary-600" />
                        </div>
                    )}

                    <div>
                        <p className="text-lg font-medium text-slate-700">
                            {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                        </p>
                        <p className="text-slate-500 mt-1">
                            or <span className="text-primary-600 font-medium">browse files</span>
                        </p>
                    </div>

                    <p className="text-sm text-slate-400">
                        Max {formatSize(maxSize)} per file • {maxFiles} files max
                    </p>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* File list */}
            {files.length > 0 && (
                <div className="mt-6 space-y-3">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-none">
                                        {file.name}
                                    </p>
                                    <p className="text-sm text-slate-400">{formatSize(file.size)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => removeFile(file.id)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
