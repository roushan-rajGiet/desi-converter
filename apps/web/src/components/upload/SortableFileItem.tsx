
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, FileText } from 'lucide-react';
import { UploadedFile } from '@/lib/api';

interface SortableFileItemProps {
    file: UploadedFile;
    index: number;
    onRemove: (id: string) => void;
}

export function SortableFileItem({ file, index, onRemove }: SortableFileItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: file.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-4 bg-slate-50 rounded-xl group border ${isDragging ? 'border-blue-500 shadow-lg' : 'border-transparent'}`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600"
            >
                <GripVertical className="w-5 h-5" />
            </div>

            <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                {index + 1}
            </div>

            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-600" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">
                    {file.originalName}
                </p>
                <p className="text-sm text-slate-400">{formatSize(file.size)}</p>
            </div>

            <button
                onClick={() => onRemove(file.id)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}
