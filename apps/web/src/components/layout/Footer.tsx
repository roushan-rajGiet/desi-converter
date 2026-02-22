import Link from 'next/link';
import { FileText, Github, Twitter } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Desi Converter</span>
                        </Link>
                        <p className="text-slate-400 max-w-md">
                            All-in-one document processing platform. Convert, merge, split, compress, and edit PDF files for free.
                        </p>
                    </div>

                    {/* Tools */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Popular Tools</h3>
                        <ul className="space-y-2">
                            <li><Link href="/tools/merge" className="hover:text-primary-400 transition-colors">Merge PDF</Link></li>
                            <li><Link href="/tools/split" className="hover:text-primary-400 transition-colors">Split PDF</Link></li>
                            <li><Link href="/tools/compress" className="hover:text-primary-400 transition-colors">Compress PDF & Images</Link></li>
                            <li><Link href="/tools/convert" className="hover:text-primary-400 transition-colors">Convert PDF</Link></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Company</h3>
                        <ul className="space-y-2">
                            <li><Link href="/about" className="hover:text-primary-400 transition-colors">About Us</Link></li>
                            <li><Link href="/privacy" className="hover:text-primary-400 transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-primary-400 transition-colors">Terms of Service</Link></li>
                            <li><Link href="/contact" className="hover:text-primary-400 transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} Desi Converter. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <a href="#" className="text-slate-400 hover:text-primary-400 transition-colors">
                            <Twitter className="w-5 h-5" />
                        </a>
                        <a href="#" className="text-slate-400 hover:text-primary-400 transition-colors">
                            <Github className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
