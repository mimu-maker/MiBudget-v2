import { Upload, Clipboard, Check, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    importSource,
    setImportSource,
    readFile,
    parseCSV,
    pasteContent,
    setPasteContent,
    isProcessing,
    setMode
}: ImportSourceStepProps) => {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <Tabs defaultValue="upload" value={importSource} onValueChange={(v: any) => setImportSource(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-200 p-1 rounded-xl max-sm mx-auto shadow-inner">
                    <TabsTrigger value="upload" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm"><Upload className="w-4 h-4" /> Upload File</TabsTrigger>
                    <TabsTrigger value="paste" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm"><Clipboard className="w-4 h-4" /> Paste Data</TabsTrigger>
                </TabsList>

                <div className="max-w-2xl mx-auto">
                    {importSource === 'upload' ? (
                        <div
                            className={cn("bg-white border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:border-blue-400 group h-[280px] shadow-sm", isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-300")}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
                        >
                            <div className="bg-blue-50 p-5 rounded-full mb-5 group-hover:bg-blue-100 transition-colors shadow-sm animate-bounce-subtle">
                                <Upload className="w-10 h-10 text-blue-600" />
                            </div>
                            <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop CSV file here</p>
                            <p className="text-slate-500 mb-6 text-sm">Or click browse to select a file from your computer</p>
                            <input type="file" accept=".csv,.txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} className="hidden" id="file-upload" />
                            <label htmlFor="file-upload"><Button variant="outline" size="lg" className="border-blue-200 text-blue-700 hover:bg-blue-50 pointer-events-none px-10">Browse Files</Button></label>
                        </div>
                    ) : (
                        <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 h-[320px] shadow-sm flex flex-col">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-700 font-bold">Paste Data</Label>
                                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">CSV or Excel Format</span>
                            </div>
                            <Textarea
                                placeholder="Date, Description, Amount...&#10;2026-01-15, Sample Item, -100.00"
                                className="flex-1 font-mono text-xs leading-relaxed border-slate-200 focus:ring-blue-500 bg-slate-50 mt-1"
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                            />
                            <div className="flex justify-end pt-2">
                                <Button onClick={() => parseCSV(pasteContent)} disabled={!pasteContent.trim() || isProcessing} size="lg" className="px-10 bg-blue-600 hover:bg-blue-700 shadow-md">
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    Process Data
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Tabs>
            <div className="flex justify-start">
                <Button variant="ghost" onClick={() => setMode('entry')} className="text-slate-500 hover:text-blue-600"><ChevronLeft className="w-4 h-4 mr-2" /> Back to Single Entry</Button>
            </div>
        </div>
    );
};
