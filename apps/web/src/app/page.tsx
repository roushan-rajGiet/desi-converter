import Link from 'next/link';
import {
    Combine,
    Scissors,
    FileDown,
    RotateCw,
    FileOutput,
    FileInput,
    ScanLine,
    Lock,
    Unlock,
    Stamp,
    PenTool,
    Eye,
    Trash2,
    FileImage,
    FileVideo,
} from 'lucide-react';

const tools = [
    {
        name: 'Merge PDF',
        description: 'Combine multiple PDFs into one document',
        icon: Combine,
        href: '/tools/merge',
        color: 'from-blue-500 to-blue-600',
    },
    {
        name: 'Split PDF',
        description: 'Extract pages or split PDF by ranges',
        icon: Scissors,
        href: '/tools/split',
        color: 'from-green-500 to-green-600',
    },
    {
        name: 'Compress PDF & Images',
        description: 'Reduce file size while maintaining quality',
        icon: FileDown,
        href: '/tools/compress',
        color: 'from-orange-500 to-orange-600',
    },
    {
        name: 'Rotate PDF',
        description: 'Rotate pages in any direction',
        icon: RotateCw,
        href: '/tools/rotate',
        color: 'from-purple-500 to-purple-600',
    },
    {
        name: 'PDF to Word',
        description: 'Convert PDF to editable DOCX',
        icon: FileOutput,
        href: '/tools/pdf-to-word',
        color: 'from-indigo-500 to-indigo-600',
    },
    {
        name: 'Word to PDF',
        description: 'Convert Word documents to PDF',
        icon: FileInput,
        href: '/tools/word-to-pdf',
        color: 'from-sky-500 to-sky-600',
    },
    {
        name: 'OCR',
        description: 'Convert scanned PDFs to searchable text',
        icon: ScanLine,
        href: '/tools/ocr',
        color: 'from-teal-500 to-teal-600',
    },
    {
        name: 'Protect PDF',
        description: 'Add password protection to PDF',
        icon: Lock,
        href: '/tools/protect',
        color: 'from-red-500 to-red-600',
    },
    {
        name: 'Unlock PDF',
        description: 'Remove password from PDF',
        icon: Unlock,
        href: '/tools/unlock',
        color: 'from-amber-500 to-amber-600',
    },
    {
        name: 'Watermark',
        description: 'Add text or image watermark',
        icon: Stamp,
        href: '/tools/watermark',
        color: 'from-pink-500 to-pink-600',
    },
    {
        name: 'Sign PDF',
        description: 'Add digital signature to documents',
        icon: PenTool,
        href: '/tools/sign',
        color: 'from-violet-500 to-violet-600',
    },
    {
        name: 'PDF to Image',
        description: 'Convert PDF pages to JPG or PNG',
        icon: FileImage,
        href: '/tools/pdf-to-image',
        color: 'from-cyan-500 to-cyan-600',
    },

];

export default function Home() {
    return (
        <div>
            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 lg:py-32">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 -z-10" />
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-primary-200/30 to-transparent -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-4xl mx-auto">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight animate-fade-in">
                            All Your PDF Tools in{' '}
                            <span className="gradient-text">One Place</span>
                        </h1>
                        <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto animate-slide-up">
                            Merge, split, compress, convert, and edit PDF files for free.
                            No installation, no signup required. Works on any device.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
                            <Link
                                href="#tools"
                                className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold text-lg hover:from-primary-600 hover:to-primary-700 transition-all hover-lift shadow-lg shadow-primary-500/25"
                            >
                                Start Converting
                            </Link>
                            <Link
                                href="/pricing"
                                className="px-8 py-4 bg-white text-slate-700 rounded-xl font-semibold text-lg border border-slate-200 hover:border-primary-300 hover:text-primary-600 transition-all hover-lift"
                            >
                                View Pricing
                            </Link>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                        {[
                            { value: '10+', label: 'PDF Tools' },
                            { value: '15MB', label: 'Max File Size' },
                            { value: '100%', label: 'Free to Use' },
                            { value: '256-bit', label: 'Encryption' },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                                <div className="text-slate-500 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tools Grid */}
            <section id="tools" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900">All PDF Tools</h2>
                        <p className="mt-4 text-lg text-slate-600">
                            Choose from our comprehensive suite of document processing tools
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {tools.map((tool) => (
                            <Link
                                key={tool.name}
                                href={tool.href}
                                className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-primary-100 transition-all hover-lift"
                            >
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <tool.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                                    {tool.name}
                                </h3>
                                <p className="mt-2 text-slate-500 text-sm">{tool.description}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900">Why Choose Desi Converter?</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Lock,
                                title: 'Secure & Private',
                                description: 'Files are encrypted with AES-256. Automatically deleted after 24 hours.',
                            },
                            {
                                icon: Eye,
                                title: 'No Sign-up Required',
                                description: 'Start using our tools instantly. Create an account only for extra features.',
                            },
                            {
                                icon: Trash2,
                                title: 'Auto-Delete',
                                description: 'Your files are automatically removed from our servers after processing.',
                            },
                        ].map((feature, i) => (
                            <div key={i} className="text-center p-8 rounded-2xl bg-slate-50 hover:bg-gradient-to-br hover:from-primary-50 hover:to-accent-50 transition-colors">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-6">
                                    <feature.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                                <p className="mt-3 text-slate-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
                    <p className="mt-4 text-lg text-primary-100">
                        Join thousands of users who trust Desi Converter for their document needs
                    </p>
                    <Link
                        href="/auth/login"
                        className="mt-8 inline-block px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-all hover-lift"
                    >
                        Create Free Account
                    </Link>
                </div>
            </section>
        </div>
    );
}
