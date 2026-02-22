'use client';

import { useState, useEffect, useCallback } from 'react';
import { RotateCw, RotateCcw, ArrowRight, Download, Loader2, CheckCircle, AlertCircle, FileText, Trash2, Repeat } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { api, UploadedFile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
type Rotation = 90 | 180 | 270;

export default function RotatePage() {
    const { user } = useAuth();
    const [file, setFile] = useState<UploadedFile | null>(null);
    const [state, setState] = useState<ProcessingState>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedRotation, setSelectedRotation] = useState<Rotation>(90);

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
                setError('Failed to check job status');
                setState('error');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [jobId, state]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            // Upload only the first file
            const uploadedFile = await api.uploadFile(acceptedFiles[0]);
            setFile(uploadedFile);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024, // 50MB
    });

    const handleRotate = async () => {
        if (!file) return;

        setState('processing');
        setProgress(0);
        setError(null);

        try {
            const response = await api.rotatePdf(file.id, selectedRotation);
            setJobId(response.jobId);
        } catch (err) {
            setState('error');
            setError(err instanceof Error ? err.message : 'Failed to start rotation');
        }
    };

    const handleDownload = () => {
        if (result?.url) {
            window.open(result.url, '_blank');
        }
    };

    const handleReset = () => {
        setFile(null);
        setState('idle');
        setJobId(null);
        setProgress(0);
        setError(null);
        setResult(null);
        setSelectedRotation(90);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="min-h-screen py-12 bg-gradient-to-b from-purple-50 to-white">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
                        <RotateCw className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Rotate PDF</h1>
                    <p className="mt-3 text-lg text-slate-600">
                        Rotate your PDF pages 90°, 180° or 270°
                    </p>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                    {state === 'idle' && (
                        <>
                            {!file ? (
                                /* Upload State */
                                <div
                                    {...getRootProps()}
                                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragActive
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
                                        }`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="flex flex-col items-center gap-4">
                                        {uploading ? (
                                            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                                                <RotateCw className="w-8 h-8 text-purple-600" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-lg font-medium text-slate-700">
                                                {isDragActive ? 'Drop PDF here...' : 'Drag & drop PDF here'}
                                            </p>
                                            <p className="text-slate-500 mt-1">
                                                or <span className="text-purple-600 font-medium">browse file</span>
                                            </p>
                                        </div>
                                        <p className="text-sm text-slate-400">Max 50MB</p>
                                    </div>
                                </div>
                            ) : (
                                /* Configuration State */
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm text-red-500">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{file.originalName}</p>
                                                <p className="text-sm text-slate-500">{formatSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setFile(null)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <button
                                            onClick={() => setSelectedRotation(90)}
                                            className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${selectedRotation === 90
                                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                : 'border-slate-100 hover:border-purple-200 text-slate-600'
                                                }`}
                                        >
                                            <RotateCw className="w-8 h-8" />
                                            <span className="font-medium">Right 90°</span>
                                        </button>
                                        <button
                                            onClick={() => setSelectedRotation(270)}
                                            className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${selectedRotation === 270
                                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                : 'border-slate-100 hover:border-purple-200 text-slate-600'
                                                }`}
                                        >
                                            <RotateCcw className="w-8 h-8" />
                                            <span className="font-medium">Left 90°</span>
                                        </button>
                                        <button
                                            onClick={() => setSelectedRotation(180)}
                                            className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${selectedRotation === 180
                                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                : 'border-slate-100 hover:border-purple-200 text-slate-600'
                                                }`}
                                        >
                                            <Repeat className="w-8 h-8" />
                                            <span className="font-medium">180°</span>
                                        </button>
                                    </div>

                                    <div className="text-center pt-4">
                                        <button
                                            onClick={handleRotate}
                                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-purple-600 hover:to-purple-700 transition-all hover-lift shadow-lg shadow-purple-500/25"
                                        >
                                            Rotate PDF
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            )}
                        </>
                    )}

                    {/* Processing State */}
                    {state === 'processing' && (
                        <div className="text-center py-12">
                            <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-slate-900">Rotating PDF...</h3>
                            <div className="mt-4 max-w-xs mx-auto">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"
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
                            <h3 className="text-xl font-semibold text-slate-900">Rotation Complete!</h3>
                            <p className="mt-2 text-slate-600">Your PDF is ready to download</p>

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
                                    Rotate Another
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
                        { step: '1', title: 'Upload PDF', desc: 'Drag and drop or browse to select your PDF file' },
                        { step: '2', title: 'Choose Rotation', desc: 'Select 90° Left, 90° Right, or 180° rotation' },
                        { step: '3', title: 'Download', desc: 'Click rotate and download your modified PDF' },
                    ].map((item) => (
                        <div key={item.step} className="text-center p-6">
                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center mx-auto mb-4">
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
