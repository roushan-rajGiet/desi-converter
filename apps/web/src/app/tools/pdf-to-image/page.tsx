'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileImage, ArrowRight, Download, Loader2, CheckCircle, AlertCircle, FileText, Trash2, RefreshCw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { api, UploadedFile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
type ImageFormat = 'png' | 'jpg';

export default function PdfToImagePage() {
    const { user } = useAuth();
    const [file, setFile] = useState<UploadedFile | null>(null);
    const [state, setState] = useState<ProcessingState>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<{ url: string; filename: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [format, setFormat] = useState<ImageFormat>('png');

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
                        const downloadInfos = await Promise.all(
                            status.outputFiles.map(file => api.getDownloadUrl(file.id))
                        );
                        setResults(downloadInfos);
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

    const handleConvert = async () => {
        if (!file) return;

        setState('processing');
        setProgress(0);
        setError(null);

        try {
            // Default 300 DPI for high quality
            const response = await api.pdfToImage(file.id, format, 300);
            setJobId(response.jobId);
        } catch (err) {
            setState('error');
            setError(err instanceof Error ? err.message : 'Failed to start conversion');
        }
    };

    const handleDownload = (url: string) => {
        window.open(url, '_blank');
    };

    const handleReset = () => {
        setFile(null);
        setState('idle');
        setJobId(null);
        setProgress(0);
        setError(null);
        setResults([]);
    };

    return (
        <div className="min-h-screen py-12 bg-gradient-to-b from-cyan-50 to-white">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/25">
                        <FileImage className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">PDF to Image</h1>
                    <p className="mt-3 text-lg text-slate-600">
                        Convert PDF pages to JPG or PNG images
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="p-8">
                        {state === 'idle' && !file && (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-cyan-500 hover:bg-slate-50'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-cyan-600" />
                                </div>
                                <p className="text-lg font-medium text-slate-900">
                                    {isDragActive ? 'Drop PDF here' : 'Drop PDF file here'}
                                </p>
                                <p className="mt-2 text-slate-500">or click to browse</p>
                                <p className="mt-4 text-xs text-slate-400">Up to 50MB</p>
                            </div>
                        )}

                        {uploading && (
                            <div className="text-center py-10">
                                <Loader2 className="w-10 h-10 text-cyan-600 animate-spin mx-auto mb-4" />
                                <p className="text-lg font-medium text-slate-900">Uploading...</p>
                            </div>
                        )}

                        {file && state === 'idle' && !uploading && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                                        <FileText className="w-6 h-6 text-cyan-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">{file.originalName}</p>
                                        <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button
                                        onClick={handleReset}
                                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-red-500"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Format Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'png', label: 'PNG Image' },
                                        { id: 'jpg', label: 'JPG Image' },
                                    ].map((fmt) => (
                                        <button
                                            key={fmt.id}
                                            onClick={() => setFormat(fmt.id as ImageFormat)}
                                            className={`p-4 rounded-xl border-2 transition-all ${format === fmt.id
                                                ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                                                : 'border-slate-200 hover:border-cyan-200'
                                                }`}
                                        >
                                            <span className="block font-medium">{fmt.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={handleConvert}
                                        className="flex items-center gap-2 px-8 py-4 bg-cyan-600 text-white rounded-xl font-semibold hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-500/25"
                                    >
                                        Convert PDF
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {state === 'processing' && (
                            <div className="text-center py-10">
                                <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Converting...</h3>
                                <p className="text-slate-500 mb-6">This usually takes a few seconds</p>
                                <div className="w-full max-w-md mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-600 transition-all duration-300 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-sm text-slate-500">{progress}%</p>
                            </div>
                        )}

                        {state === 'completed' && results.length > 0 && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Conversion Complete!</h3>
                                <p className="text-slate-500 mb-8">Your images are ready</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto mb-8 p-2">
                                    {results.map((res, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleDownload(res.url)}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-cyan-500 hover:text-cyan-700 transition-all shadow-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="truncate max-w-[200px]">{res.filename}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={handleReset}
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                        Convert Another
                                    </button>
                                </div>
                            </div>
                        )}

                        {state === 'error' && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Conversion Failed</h3>
                                <p className="text-red-600 mb-8">{error}</p>
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link href="/" className="text-slate-500 hover:text-cyan-600 font-medium transition-colors">
                        ← Back to all tools
                    </Link>
                </div>
            </div>
        </div>
    );
}
