'use client';

import { useState, useEffect, useCallback } from 'react';
import { PenTool, ArrowRight, Download, Loader2, CheckCircle, AlertCircle, FileText, Trash2, RefreshCw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { api, UploadedFile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export default function SignPage() {
    const { user } = useAuth();
    const [file, setFile] = useState<UploadedFile | null>(null);
    const [state, setState] = useState<ProcessingState>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [signatureText, setSignatureText] = useState('');
    const [signatureStyle, setSignatureStyle] = useState<'handwritten' | 'clean' | 'typewriter'>('handwritten');

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

    const handleSign = async () => {
        if (!file || !signatureText) return;

        setState('processing');
        setProgress(0);
        setError(null);

        try {
            const response = await api.signPdf(file.id, signatureText, signatureStyle);
            setJobId(response.jobId);
        } catch (err) {
            setState('error');
            setError(err instanceof Error ? err.message : 'Failed to sign PDF');
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
        setSignatureText('');
    };

    return (
        <div className="min-h-screen py-12 bg-gradient-to-b from-violet-50 to-white">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/25">
                        <PenTool className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Sign PDF</h1>
                    <p className="mt-3 text-lg text-slate-600">
                        Add digital signature to your documents
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="p-8">
                        {state === 'idle' && !file && (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-violet-500 hover:bg-slate-50'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-violet-600" />
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
                                <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto mb-4" />
                                <p className="text-lg font-medium text-slate-900">Uploading...</p>
                            </div>
                        )}

                        {file && state === 'idle' && !uploading && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                        <FileText className="w-6 h-6 text-violet-600" />
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

                                {/* Signature Input */}
                                <div className="max-w-md mx-auto">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Signature Text
                                    </label>
                                    <input
                                        type="text"
                                        value={signatureText}
                                        onChange={(e) => setSignatureText(e.target.value)}
                                        placeholder="Type your name or initials"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all font-handwriting text-xl text-slate-900 placeholder:text-slate-400"
                                        style={{ fontFamily: 'cursive' }}
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        Currently only text signatures are supported.
                                    </p>
                                </div>

                                {/* Signature Style Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">
                                        Signature Style
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {[
                                            { id: 'handwritten', label: 'Handwritten', font: 'cursive', desc: 'Cursive style' },
                                            { id: 'clean', label: 'Clean', font: 'sans-serif', desc: 'Modern look' },
                                            { id: 'typewriter', label: 'Typewriter', font: 'monospace', desc: 'Classic mono' },
                                        ].map((style) => (
                                            <button
                                                key={style.id}
                                                onClick={() => setSignatureStyle(style.id as any)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${signatureStyle === style.id
                                                    ? 'border-violet-500 bg-violet-50'
                                                    : 'border-slate-200 hover:border-violet-200'
                                                    }`}
                                            >
                                                <div className="font-medium text-slate-900" style={{ fontFamily: style.font }}>
                                                    {style.label}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">{style.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={handleSign}
                                        disabled={!signatureText}
                                        className={`flex items-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/25 ${!signatureText ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        Sign PDF
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {state === 'processing' && (
                            <div className="text-center py-10">
                                <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Signing PDF...</h3>
                                <p className="text-slate-500 mb-6">Applying your signature</p>
                                <div className="w-full max-w-md mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-600 transition-all duration-300 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-sm text-slate-500">{progress}%</p>
                            </div>
                        )}

                        {state === 'completed' && result && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Signed Successfully!</h3>
                                <p className="text-slate-500 mb-8">Your document is ready</p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/25"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download Signed PDF
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                        Sign Another
                                    </button>
                                </div>
                            </div>
                        )}

                        {state === 'error' && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Signing Failed</h3>
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
                    <Link href="/" className="text-slate-500 hover:text-violet-600 font-medium transition-colors">
                        ← Back to all tools
                    </Link>
                </div>
            </div>
        </div>
    );
}
