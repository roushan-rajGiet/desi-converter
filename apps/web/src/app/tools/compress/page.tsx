'use client';

import { useState, useEffect } from 'react';
import { FileDown, ArrowRight, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import FileUpload from '@/components/upload/FileUpload';
import { api, UploadResponse } from '@/lib/api';

type CompressionLevel = 'low' | 'medium' | 'high';
type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

const levels = [
    {
        value: 'low' as CompressionLevel,
        label: 'Low Compression',
        desc: 'Best quality, larger file',
        reduction: '~20%',
    },
    {
        value: 'medium' as CompressionLevel,
        label: 'Recommended',
        desc: 'Good balance',
        reduction: '~50%',
    },
    {
        value: 'high' as CompressionLevel,
        label: 'High Compression',
        desc: 'Smallest size',
        reduction: '~75%',
    },
];

export default function CompressPage() {
    const [files, setFiles] = useState<UploadResponse[]>([]);
    const [level, setLevel] = useState<CompressionLevel>('medium');
    const [state, setState] = useState<ProcessingState>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string; originalSize: number; newSize: number } | null>(null);

    useEffect(() => {
        if (!jobId || state !== 'processing') return;

        const interval = setInterval(async () => {
            try {
                const status = await api.getJobStatus(jobId);
                setProgress(status.progress);

                if (status.status === 'COMPLETED' && status.outputFiles?.[0]) {
                    setState('completed');
                    const downloadInfo = await api.getDownloadUrl(status.outputFiles[0].id);
                    setResult({
                        ...downloadInfo,
                        originalSize: files.reduce((acc, f) => acc + f.size, 0),
                        newSize: status.outputFiles[0].size,
                    });
                } else if (status.status === 'FAILED') {
                    setState('error');
                    setError(status.error || 'Compression failed');
                }
            } catch (err) {
                console.error('Error polling:', err);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [jobId, state, files]);

    const handleFilesUploaded = (uploadedFiles: UploadResponse[]) => {
        if (uploadedFiles.length > 0) {
            setFiles(uploadedFiles);
            setError(null);
            setState('idle');
        }
    };

    const handleCompress = async () => {
        if (files.length === 0) return;

        setState('processing');
        setProgress(0);

        try {
            const fileIds = files.map(f => f.id);
            const response = await api.compressPdf(fileIds, level);
            setJobId(response.jobId);
        } catch (err) {
            setState('error');
            setError('Failed to start compression');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleReset = () => {
        setFiles([]);
        setLevel('medium');
        setState('idle');
        setJobId(null);
        setProgress(0);
        setError(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen py-12 bg-gradient-to-b from-orange-50 to-white">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/25">
                        <FileDown className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Compress PDF & Images</h1>
                    <p className="mt-3 text-lg text-slate-600">Reduce file size of PDFs and images while maintaining quality</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                    {state === 'idle' && (
                        <>
                            <FileUpload
                                accept={{
                                    'application/pdf': ['.pdf'],
                                    'image/jpeg': ['.jpg', '.jpeg'],
                                    'image/png': ['.png'],
                                    'image/webp': ['.webp'],
                                }}
                                maxFiles={10}
                                onFilesUploaded={handleFilesUploaded}
                                multiple={true}
                            />

                            {files.length > 0 && (
                                <div className="mt-8 space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-3">
                                            Compression Level
                                        </label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {levels.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => setLevel(option.value)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${level === option.value
                                                        ? 'border-orange-500 bg-orange-50'
                                                        : 'border-slate-200 hover:border-orange-200'
                                                        }`}
                                                >
                                                    <div className="font-medium text-slate-900">{option.label}</div>
                                                    <div className="text-sm text-slate-500">{option.desc}</div>
                                                    <div className="text-xs text-orange-600 mt-1">Size reduction: {option.reduction}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <button
                                            onClick={handleCompress}
                                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all hover-lift shadow-lg shadow-orange-500/25"
                                        >
                                            Compress {files.length > 1 ? 'Files' : 'File'}
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {state === 'processing' && (
                        <div className="text-center py-12">
                            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-slate-900">Compressing files...</h3>
                            <div className="mt-4 max-w-xs mx-auto">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="mt-2 text-slate-500">{progress}% complete</p>
                            </div>
                        </div>
                    )}

                    {state === 'completed' && result && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">Compression Complete!</h3>

                            <div className="mt-6 p-6 bg-slate-50 rounded-2xl max-w-sm mx-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-slate-500">Original</div>
                                    <div className="font-semibold text-slate-900">{formatSize(result.originalSize)}</div>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-slate-500">Compressed</div>
                                    <div className="font-semibold text-green-600">{formatSize(result.newSize)}</div>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                    <div className="text-slate-500">Saved</div>
                                    <div className="font-bold text-orange-600">
                                        {Math.round((1 - result.newSize / result.originalSize) * 100)}%
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => window.open(result.url, '_blank')}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all hover-lift shadow-lg shadow-green-500/25"
                                >
                                    <Download className="w-5 h-5" />
                                    Download
                                </button>
                                <button onClick={handleReset} className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                                    Compress Another
                                </button>
                            </div>
                        </div>
                    )}

                    {state === 'error' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">Something went wrong</h3>
                            <p className="mt-2 text-red-600">{error}</p>
                            <button onClick={handleReset} className="mt-8 px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
