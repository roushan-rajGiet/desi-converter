'use client';

import { useState, useEffect, useCallback } from 'react';
import { Stamp, ArrowRight, Download, Loader2, CheckCircle, AlertCircle, FileText, Trash2, RefreshCw, Image as ImageIcon, Type } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { api, UploadedFile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export default function WatermarkPage() {
    const { user } = useAuth();
    const [file, setFile] = useState<UploadedFile | null>(null);
    const [state, setState] = useState<ProcessingState>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [watermarkText, setWatermarkText] = useState('');
    const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
    const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
    const [watermarkPosition, setWatermarkPosition] = useState('center');

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

    const handleWatermark = async () => {
        if (!file) return;
        if (watermarkType === 'text' && !watermarkText) return;
        if (watermarkType === 'image' && !watermarkImage) return;

        setState('processing');
        setProgress(0);
        setError(null);

        try {
            let watermarkFileId: string | undefined;

            if (watermarkType === 'image' && watermarkImage) {
                // Upload watermark image first
                const uploadedImage = await api.uploadFile(watermarkImage);
                watermarkFileId = uploadedImage.id;
            }

            const response = await api.watermarkPdf(file.id, watermarkText || ' ', {
                type: watermarkType,
                watermarkFileId,
                position: watermarkPosition
            });
            setJobId(response.jobId);
        } catch (err) {
            setState('error');
            setError(err instanceof Error ? err.message : 'Failed to apply watermark');
        }
    };

    // Dropzone for watermark image
    const onWatermarkImageDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setWatermarkImage(acceptedFiles[0]);
        }
    }, []);

    const { getRootProps: getWatermarkRootProps, getInputProps: getWatermarkInputProps, isDragActive: isWatermarkDragActive } = useDropzone({
        onDrop: onWatermarkImageDrop,
        accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024, // 5MB
    });

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
        setWatermarkText('');
        setWatermarkType('text');
        setWatermarkImage(null);
        setWatermarkPosition('center');
    };

    const positions = [
        { id: 'top-left', label: 'TL' },
        { id: 'top-center', label: 'TC' },
        { id: 'top-right', label: 'TR' },
        { id: 'center-left', label: 'CL' },
        { id: 'center', label: 'C' },
        { id: 'center-right', label: 'CR' },
        { id: 'bottom-left', label: 'BL' },
        { id: 'bottom-center', label: 'BC' },
        { id: 'bottom-right', label: 'BR' },
    ];

    return (
        <div className="min-h-screen py-12 bg-gradient-to-b from-blue-50 to-white">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                        <Stamp className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Watermark PDF</h1>
                    <p className="mt-3 text-lg text-slate-600">
                        Add text watermark to your PDF documents
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="p-8">
                        {state === 'idle' && !file && (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-500 hover:bg-slate-50'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-blue-600" />
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
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                <p className="text-lg font-medium text-slate-900">Uploading...</p>
                            </div>
                        )}

                        {file && state === 'idle' && !uploading && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                        <FileText className="w-6 h-6 text-blue-600" />
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

                                {/* Watermark Settings */}
                                <div className="max-w-md mx-auto space-y-6">
                                    {/* Type Toggle */}
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <button
                                            onClick={() => setWatermarkType('text')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${watermarkType === 'text'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <Type className="w-4 h-4" />
                                            Text
                                        </button>
                                        <button
                                            onClick={() => setWatermarkType('image')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${watermarkType === 'image'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                            Image
                                        </button>
                                    </div>

                                    {/* Text Input */}
                                    {watermarkType === 'text' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Watermark Text
                                            </label>
                                            <input
                                                type="text"
                                                value={watermarkText}
                                                onChange={(e) => setWatermarkText(e.target.value)}
                                                placeholder="e.g., CONFIDENTIAL, DRAFT"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                            />
                                        </div>
                                    )}

                                    {/* Image Upload */}
                                    {watermarkType === 'image' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Upload Watermark Image
                                            </label>
                                            {!watermarkImage ? (
                                                <div
                                                    {...getWatermarkRootProps()}
                                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${isWatermarkDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-500 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <input {...getWatermarkInputProps()} />
                                                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-slate-700">
                                                        Drop image here or click to browse
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                                                        <img
                                                            src={URL.createObjectURL(watermarkImage)}
                                                            alt="Watermark preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{watermarkImage.name}</p>
                                                        <p className="text-xs text-slate-500">{(watermarkImage.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setWatermarkImage(null);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Position Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Position
                                        </label>
                                        <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                                            {positions.map((pos) => (
                                                <button
                                                    key={pos.id}
                                                    onClick={() => setWatermarkPosition(pos.id)}
                                                    className={`aspect-square rounded-lg border flex items-center justify-center text-xs font-medium transition-all ${watermarkPosition === pos.id
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-500'
                                                        }`}
                                                >
                                                    {pos.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={handleWatermark}
                                        disabled={watermarkType === 'text' ? !watermarkText : !watermarkImage}
                                        className={`flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25 ${(watermarkType === 'text' ? !watermarkText : !watermarkImage) ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        Apply Watermark
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {state === 'processing' && (
                            <div className="text-center py-10">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Adding Watermark...</h3>
                                <p className="text-slate-500 mb-6">Processing your document</p>
                                <div className="w-full max-w-md mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-300 rounded-full"
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
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Watermark Added!</h3>
                                <p className="text-slate-500 mb-8">Your document is ready</p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download PDF
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                        Watermark Another
                                    </button>
                                </div>
                            </div>
                        )}

                        {state === 'error' && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to Watermark</h3>
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
                    <Link href="/" className="text-slate-500 hover:text-blue-600 font-medium transition-colors">
                        ← Back to all tools
                    </Link>
                </div>
            </div>
        </div>
    );
}
