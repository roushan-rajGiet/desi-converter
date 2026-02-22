'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, FileText } from 'lucide-react';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 glass">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold gradient-text">Desi Converter</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="/tools" className="text-slate-600 hover:text-primary-600 transition-colors font-medium">
                            All Tools
                        </Link>
                        <Link href="/pricing" className="text-slate-600 hover:text-primary-600 transition-colors font-medium">
                            Pricing
                        </Link>
                        <Link href="/auth/login" className="text-slate-600 hover:text-primary-600 transition-colors font-medium">
                            Login
                        </Link>
                        <Link
                            href="/auth/register"
                            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 transition-all hover-lift"
                        >
                            Sign Up Free
                        </Link>
                    </nav>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 text-slate-600 hover:text-primary-600"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <nav className="md:hidden py-4 border-t border-slate-200">
                        <div className="flex flex-col gap-4">
                            <Link href="/tools" className="text-slate-600 hover:text-primary-600 font-medium">
                                All Tools
                            </Link>
                            <Link href="/pricing" className="text-slate-600 hover:text-primary-600 font-medium">
                                Pricing
                            </Link>
                            <Link href="/auth/login" className="text-slate-600 hover:text-primary-600 font-medium">
                                Login
                            </Link>
                            <Link
                                href="/auth/register"
                                className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-medium text-center"
                            >
                                Sign Up Free
                            </Link>
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
}
