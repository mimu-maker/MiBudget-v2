import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ImportSourceStepProps {
    importSource: 'upload' | 'paste';
    setImportSource: (source: 'upload' | 'paste') => void;
    readFile: (file: File) => void;
    parseCSV: (text: string) => void;
    pasteContent: string;
    setPasteContent: (content: string) => void;
    isProcessing: boolean;
    setMode: (mode: 'entry' | 'import') => void;
}

export const ImportSourceStep = ({
    readFile,
    isProcessing,
}: ImportSourceStepProps) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) readFile(file);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="max-w-2xl mx-auto">
                <div
                    className={cn(
                        "bg-white border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:border-blue-400 group h-[280px] shadow-sm",
                        isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-300",
                        isProcessing && "opacity-50 pointer-events-none"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    <div className="bg-blue-50 p-5 rounded-full mb-5 group-hover:bg-blue-100 transition-colors shadow-sm animate-bounce-subtle">
                        <Upload className="w-10 h-10 text-blue-600" />
                    </div>
                    <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop your file here</p>
                    <p className="text-slate-500 mb-6 text-sm">Supports CSV and Excel (.xlsx, .xls)</p>
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls,.txt"
                        onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload">
                        <Button variant="outline" size="lg" className="border-blue-200 text-blue-700 hover:bg-blue-50 pointer-events-none px-10">
                            Browse Files
                        </Button>
                    </label>
                </div>
            </div>
        </div>
    );
};
