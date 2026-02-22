'use client';

import { useMemo } from 'react';
import { SIGNATURE_STYLES } from './SignatureStyleSelector';

interface SignaturePreviewProps {
    text: string;
    styleId: string;
}

export default function SignaturePreview({ text, styleId }: SignaturePreviewProps) {
    const style = SIGNATURE_STYLES.find((s) => s.id === styleId) || SIGNATURE_STYLES[0];
    const displayText = text || 'Your Name';

    // Generate per-character jitter for realism
    const charEffects = useMemo(() => {
        return displayText.split('').map((_, i) => ({
            dy: (Math.sin(i * 2.7 + displayText.length) * 1.5).toFixed(1),
            rotate: (Math.cos(i * 3.1 + displayText.length) * 1.8).toFixed(1),
            dx: (Math.sin(i * 1.9 + displayText.length * 0.7) * 0.5).toFixed(1),
        }));
    }, [displayText]);

    const isUnderlineTail = styleId === 'underline-tail';
    const isInitialEmphasis = styleId === 'initial-emphasis';

    return (
        <div className="relative bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-6 overflow-hidden">
            {/* Paper lines decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="border-b border-slate-900"
                        style={{ marginTop: i === 0 ? '40px' : '24px' }}
                    />
                ))}
            </div>

            {/* Signature line */}
            <div className="absolute bottom-[52px] left-8 right-8 border-b border-slate-300" />
            <div className="absolute bottom-[38px] right-8 text-[10px] text-slate-400 tracking-wide">
                SIGNATURE
            </div>

            {/* Main signature */}
            <div className="relative flex items-center justify-center min-h-[100px] py-4">
                <svg
                    viewBox="0 0 500 80"
                    className="w-full max-w-md"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Ink texture filter */}
                    <defs>
                        <filter id="sig-ink" x="-2%" y="-2%" width="104%" height="104%">
                            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.8" />
                        </filter>
                    </defs>

                    <text
                        x="250"
                        y="55"
                        textAnchor="middle"
                        style={{
                            fontFamily: style.font,
                            fill: '#1a1a2e',
                            filter: 'url(#sig-ink)',
                        }}
                        fontSize={isInitialEmphasis ? undefined : '36'}
                    >
                        {isInitialEmphasis ? (
                            <>
                                {/* Oversized first letter */}
                                <tspan fontSize="48" dy="0">{displayText[0]}</tspan>
                                <tspan fontSize="28" dy="4">{displayText.slice(1)}</tspan>
                            </>
                        ) : (
                            displayText.split('').map((char, i) => (
                                <tspan
                                    key={i}
                                    dy={charEffects[i]?.dy || '0'}
                                    dx={charEffects[i]?.dx || '0'}
                                    rotate={charEffects[i]?.rotate || '0'}
                                >
                                    {char}
                                </tspan>
                            ))
                        )}
                    </text>

                    {/* Underline tail for that style */}
                    {isUnderlineTail && (
                        <path
                            d="M 150 62 Q 250 58, 350 62 Q 380 63, 400 58"
                            stroke="#1a1a2e"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            opacity="0.7"
                            style={{ filter: 'url(#sig-ink)' }}
                        />
                    )}
                </svg>
            </div>

            {/* Style badge */}
            <div className="absolute top-3 right-3">
                <span className="text-[10px] px-2 py-1 rounded-full bg-violet-100 text-violet-600 font-medium">
                    {style.name}
                </span>
            </div>
        </div>
    );
}
