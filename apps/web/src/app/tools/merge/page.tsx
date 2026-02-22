'use client';

import { useState, useEffect, useCallback } from 'react';
import { Combine, ArrowRight, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { api, UploadedFile } from '@/lib/api';
import { SortableFileItem } from '@/components/upload/SortableFileItem';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export default function MergePage() {
    const { user } = useAuth();
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [state, setState] = useState<ProcessingState>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    const [uploading, setUploading] = useState(false);

    // Poll for job status
    useEffect(() => {
        if (!jobId || state !== 'processing') return;

        const interval = setInterval(async () => {
            try {
                const status = await api.getJobStatus(jobId);
                setProgress(status.progress);

                if (status.status === 'COMPLETED') {
                    setState('completed');
                    if (status.outputFiles && status.outputFiles.length > 0) {
                        const downloadInfo = await api.getDownloadUrl(status.outputFiles[0].id);
                        setResult(downloadInfo);
                    }
                } else if (status.status === 'FAILED') {
                    setState('error');
                    setError(status.error || 'Processing failed');
                }
            } catch (err) {
                console.error('Error polling job status:', err);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [jobId, state]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            const uploadedFiles = await api.uploadMultiple(acceptedFiles);
            setFiles((prev) => [...prev, ...uploadedFiles]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 20,
        maxSize: 25 * 1024 * 1024,
    });

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFiles((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            setError('Please upload at least 2 PDF files to merge');
            return;
        }

        setState('processing');
        setProgress(0);
        setError(null);

        try {
            const response = await api.mergePdfs(files.map((f) => f.id));
            setJobId(response.jobId);
        } catch (err) {
            setState('error');
            setError(err instanceof Error ? err.message : 'Failed to start merge');
        }
    };

    const handleDownload = () => {
        if (result?.url) {
            window.open(result.url, '_blank');
        }
    };

    const handleReset = () => {
        setFiles([]);
        setState('idle');
        setJobId(null);
        setProgress(0);
        setError(null);
        setResult(null);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="min-h-screen py-12 bg-gradient-to-b from-blue-50 to-white">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                        <Combine className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Merge PDF</h1>
                    <p className="mt-3 text-lg text-slate-600">
                        Combine multiple PDF files into a single document
                    </p>
                    {!user && (
                        <p className="mt-2 text-sm text-slate-500">
                            <Link href="/auth/login" className="text-primary-600 hover:underline">Sign in</Link> to save your files
                        </p>
                    )}
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                    {state === 'idle' && (
                        <>
                            {/* Dropzone */}
                            <div
                                {...getRootProps()}
                                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragActive
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center gap-4">
                                    {uploading ? (
                                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Combine className="w-8 h-8 text-blue-600" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-lg font-medium text-slate-700">
                                            {isDragActive ? 'Drop PDFs here...' : 'Drag & drop PDFs here'}
                                        </p>
                                        <p className="text-slate-500 mt-1">
                                            or <span className="text-blue-600 font-medium">browse files</span>
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-400">Max 25MB per file • Up to 20 files</p>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            {/* File List with Reorder */}
                            {files.length > 0 && (
                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-slate-900">
                                            {files.length} file{files.length !== 1 ? 's' : ''} selected
                                        </h3>
                                        <p className="text-sm text-slate-500">Drag to reorder</p>
                                    </div>

                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={files.map(f => f.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3">
                                                {files.map((file, index) => (
                                                    <SortableFileItem
                                                        key={file.id}
                                                        file={file}
                                                        index={index}
                                                        onRemove={removeFile}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>

                                    {/* Merge Button */}
                                    <div className="mt-8 text-center">
                                        <button
                                            onClick={handleMerge}
                                            disabled={files.length < 2}
                                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-blue-700 transition-all hover-lift shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Merge {files.length} PDFs
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Processing State */}
                    {state === 'processing' && (
                        <div className="text-center py-12">
                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-slate-900">Merging PDFs...</h3>
                            <div className="mt-4 max-w-xs mx-auto">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-slate-500">{progress}% complete</p>
                            </div>
                        </div>
                    )}

                    {/* Completed State */}
                    {state === 'completed' && result && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">Merge Complete!</h3>
                            <p className="mt-2 text-slate-600">Your merged PDF is ready to download</p>

                            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all hover-lift shadow-lg shadow-green-500/25"
                                >
                                    <Download className="w-5 h-5" />
                                    Download PDF
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    Merge More Files
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {state === 'error' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">Something went wrong</h3>
                            <p className="mt-2 text-red-600">{error}</p>

                            <button
                                onClick={handleReset}
                                className="mt-8 px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="mt-12 grid md:grid-cols-3 gap-6">
                    {[
                        { step: '1', title: 'Upload PDFs', desc: 'Drag and drop or browse to select multiple PDF files' },
                        { step: '2', title: 'Reorder', desc: 'Arrange files in the order you want them merged' },
                        { step: '3', title: 'Download', desc: 'Click merge and download your combined PDF' },
                    ].map((item) => (
                        <div key={item.step} className="text-center p-6">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mx-auto mb-4">
                                {item.step}
                            </div>
                            <h4 className="font-semibold text-slate-900">{item.title}</h4>
                            <p className="mt-2 text-sm text-slate-500">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
