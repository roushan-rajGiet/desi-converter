'use client';

import { Check } from 'lucide-react';

export interface SignatureStyle {
    id: string;
    name: string;
    font: string;
    useCase: string;
    description: string;
}

export const SIGNATURE_STYLES: SignatureStyle[] = [
    { id: 'natural-cursive', name: 'Natural Cursive', font: "'Great Vibes', cursive", useCase: 'General', description: 'Smooth connected cursive flow' },
    { id: 'fast-autograph', name: 'Fast Autograph', font: "'Allura', cursive", useCase: 'Personal', description: 'Quick expressive strokes' },
    { id: 'monoline-pen', name: 'Monoline Pen', font: "'Sacramento', cursive", useCase: 'Corporate', description: 'Clean uniform strokes' },
    { id: 'calligraphy', name: 'Calligraphy', font: "'Alex Brush', cursive", useCase: 'Certificates', description: 'Elegant brush contrast' },
    { id: 'underline-tail', name: 'Underline Tail', font: "'Dancing Script', cursive", useCase: 'Legal', description: 'Authority underline sweep' },
    { id: 'initial-emphasis', name: 'Initial Emphasis', font: "'Parisienne', cursive", useCase: 'Executive', description: 'Bold first letter accent' },
    { id: 'loose-handwritten', name: 'Loose Handwritten', font: "'Caveat', cursive", useCase: 'Informal', description: 'Natural pen-lift feel' },
    { id: 'compact-quicksign', name: 'Compact Quick-Sign', font: "'Satisfy', cursive", useCase: 'Mobile', description: 'Tight efficient strokes' },
    { id: 'decorative-loop', name: 'Decorative Loop', font: "'Homemade Apple', cursive", useCase: 'Creative', description: 'Playful ink loops' },
    { id: 'hybrid-realink', name: 'Hybrid Real-Ink', font: "'Kalam', cursive", useCase: 'High-Trust', description: 'Natural pen simulation' },
    { id: 'formal', name: 'Formal Signature', font: "'Pinyon Script', cursive", useCase: 'Government', description: 'Clean classic elegance' },
];

interface SignatureStyleSelectorProps {
    selectedStyle: string;
    onStyleSelect: (styleId: string) => void;
    previewText: string;
}

export default function SignatureStyleSelector({
    selectedStyle,
    onStyleSelect,
    previewText,
}: SignatureStyleSelectorProps) {
    const displayText = previewText || 'Your Name';

    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
                Choose Signature Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {SIGNATURE_STYLES.map((style) => {
                    const isSelected = selectedStyle === style.id;
                    return (
                        <button
                            key={style.id}
                            onClick={() => onStyleSelect(style.id)}
                            className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${isSelected
                                    ? 'border-violet-500 bg-violet-50 shadow-md ring-1 ring-violet-500/20'
                                    : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-slate-50'
                                }`}
                        >
                            {/* Selected check */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}

                            {/* Font preview */}
                            <div
                                className="h-10 flex items-center overflow-hidden mb-2"
                                style={{ fontFamily: style.font }}
                            >
                                <span
                                    className="text-xl text-slate-800 truncate leading-tight"
                                    style={{ fontSize: '1.25rem' }}
                                >
                                    {displayText}
                                </span>
                            </div>

                            {/* Style name & use case */}
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-medium text-slate-700 truncate">
                                    {style.name}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${isSelected
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {style.useCase}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
