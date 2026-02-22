'use client';

import { useState, useEffect } from 'react';
import { Scissors, ArrowRight, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import FileUpload from '@/components/upload/FileUpload';
import { api, JobStatus, UploadResponse } from '@/lib/api';

type SplitMode = 'pages' | 'ranges' | 'extract';
type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

export default function SplitPage() {
    const [file, setFile] = useState<UploadResponse | null>(null);
    const [mode, setMode] = useState<SplitMode>('pages');
    const [ranges, setRanges] = useState('');
    const [pages, setPages] = useState('');
    const [state, setState] = useState<ProcessingState>('idle');
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [outputFiles, setOutputFiles] = useState<any[]>([]);

    useEffect(() => {
        if (!jobId || state !== 'processing') return;

        const interval = setInterval(async () => {
            try {
                const status = await api.getJobStatus(jobId);
                setProgress(status.progress);

                if (status.status === 'COMPLETED') {
                    setState('completed');
                    setOutputFiles(status.outputFiles || []);
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

    const handleFilesUploaded = (uploadedFiles: UploadResponse[]) => {
        if (uploadedFiles.length > 0) {
            setFile(uploadedFiles[0]);
            setError(null);
            setState('idle');
        }
    };

    const handleSplit = async () => {
        if (!file) {
            setError('Please upload a PDF file');
            return;
        }

        setState('processing');
        setProgress(0);
        setError(null);

        try {
            const options: { pages?: number[]; ranges?: string } = {};

            if (mode === 'ranges' && ranges) {
                options.ranges = ranges;
            } else if (mode === 'extract' && pages) {
                options.pages = pages.split(',').map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n));
            }

            const response = await api.splitPdf(file.id, mode, options);
            setJobId(response.jobId);
        } catch (err) {
            setState('error');
            setError('Failed to start split process');
        }
    };

    const handleDownload = async (fileId: string) => {
        const { url } = await api.getDownloadUrl(fileId);
        window.open(url, '_blank');
    };

    const handleReset = () => {
        setFile(null);
        setMode('pages');
        setRanges('');
        setPages('');
        setState('idle');
        setJobId(null);
        setProgress(0);
        setError(null);
        setOutputFiles([]);
    };

    return (
        <div className="min-h-screen py-12 bg-gradient-to-b from-green-50 to-white">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
                        <Scissors className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Split PDF</h1>
                    <p className="mt-3 text-lg text-slate-600">
                        Extract pages or split your PDF into multiple documents
                    </p>
                </div>

                {/* Main Area */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                    {state === 'idle' && (
                        <>
                            <FileUpload
                                accept={{ 'application/pdf': ['.pdf'] }}
                                maxFiles={1}
                                onFilesUploaded={handleFilesUploaded}
                                multiple={false}
                            />

                            {file && (
                                <div className="mt-8 space-y-6">
                                    {/* Split Mode Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-3">
                                            Split Mode
                                        </label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { value: 'pages', label: 'All Pages', desc: 'One PDF per page' },
                                                { value: 'ranges', label: 'By Ranges', desc: 'e.g., 1-3, 5-7' },
                                                { value: 'extract', label: 'Extract', desc: 'Specific pages' },
                                            ].map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => setMode(option.value as SplitMode)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${mode === option.value
                                                        ? 'border-green-500 bg-green-50'
                                                        : 'border-slate-200 hover:border-green-200'
                                                        }`}
                                                >
                                                    <div className="font-medium text-slate-900">{option.label}</div>
                                                    <div className="text-sm text-slate-500">{option.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Options based on mode */}
                                    {mode === 'ranges' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Page Ranges
                                            </label>
                                            <input
                                                type="text"
                                                value={ranges}
                                                onChange={(e) => setRanges(e.target.value)}
                                                placeholder="e.g., 1-5, 8, 11-13 (Ranges or individual pages)"
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-slate-900 placeholder:text-slate-400"
                                            />
                                        </div>
                                    )}

                                    {mode === 'extract' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Pages to Extract
                                            </label>
                                            <input
                                                type="text"
                                                value={pages}
                                                onChange={(e) => setPages(e.target.value)}
                                                placeholder="e.g., 1, 3, 5, 7"
                                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-slate-900 placeholder:text-slate-400"
                                            />
                                        </div>
                                    )}

                                    <div className="text-center">
                                        <button
                                            onClick={handleSplit}
                                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all hover-lift shadow-lg shadow-green-500/25"
                                        >
                                            Split PDF
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {state === 'processing' && (
                        <div className="text-center py-12">
                            <Loader2 className="w-16 h-16 text-green-500 animate-spin mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-slate-900">Splitting PDF...</h3>
                            <div className="mt-4 max-w-xs mx-auto">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-slate-500">{progress}% complete</p>
                            </div>
                        </div>
                    )}

                    {state === 'completed' && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">Split Complete!</h3>
                            <p className="mt-2 text-slate-600">{outputFiles.length} files created</p>

                            <div className="mt-8 space-y-3 max-w-md mx-auto">
                                {outputFiles.map((file, index) => (
                                    <button
                                        key={file.id}
                                        onClick={() => handleDownload(file.id)}
                                        className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                                    >
                                        <span className="font-medium text-slate-700">{file.originalName}</span>
                                        <Download className="w-5 h-5 text-slate-500" />
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleReset}
                                className="mt-8 px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                            >
                                Split Another PDF
                            </button>
                        </div>
                    )}

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
            </div>
        </div>
    );
}
