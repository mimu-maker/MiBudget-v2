import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Info, Table as TableIcon, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategorySelector } from '@/components/Budget/CategorySelector';
import { SmartSelector } from '@/components/ui/smart-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useAnnualBudget';
import { cn } from '@/lib/utils';

interface ImportCategoryMappingStepProps {
    mode: 'category' | 'sub-category';
    uniqueCsvCategories: string[];
    uniqueCsvSubCategories: Record<string, string[]>;
    categoryValueMapping: Record<string, string>;
    setCategoryValueMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    subCategoryValueMapping: Record<string, string>;
    setSubCategoryValueMapping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setStep: (step: number) => void;
    applyValueMappings: () => void;
    suggestions?: Record<string, { category: string, confidence: number }>;
}

export const ImportCategoryMappingStep = ({
    mode,
    uniqueCsvCategories,
    uniqueCsvSubCategories,
    categoryValueMapping,
    setCategoryValueMapping,
    subCategoryValueMapping,
    setSubCategoryValueMapping,
    setStep,
    applyValueMappings,
    suggestions = {}
}: ImportCategoryMappingStepProps) => {
    const { categories } = useCategories();
    const [showExactMatches, setShowExactMatches] = useState(false);

    const getSubCategoryList = (csvParentCat: string) => {
        const systemParentCat = categoryValueMapping[csvParentCat] || csvParentCat;
        const category = categories.find((c: any) => c.name === systemParentCat);
        return category ? (category.sub_categories || []).map((s: any) => s.name) : [];
    };

    const handleCategoryMappingChange = (csvCat: string, systemValue: string) => {
        setCategoryValueMapping(prev => ({ ...prev, [csvCat]: systemValue }));
    };

    const handleSubCategoryMappingChange = (csvSub: string, systemValue: string) => {
        setSubCategoryValueMapping(prev => ({ ...prev, [csvSub]: systemValue }));
    };

    const getClassification = (csvVal: string, mappedVal?: string) => {
        const suggestion = suggestions[csvVal];
        const confidence = suggestion?.confidence || 0;

        if (confidence === 1.0) return 'perfect';
        if (confidence >= 0.7) return 'possible';
        return 'none';
    };

    const categoriesWithClassification = uniqueCsvCategories.map(cat => ({
        cat,
        classification: getClassification(cat, categoryValueMapping[cat])
    }));

    const noMatchCategories = categoriesWithClassification.filter(c => c.classification === 'none');
    const possibleMatchCategories = categoriesWithClassification.filter(c => c.classification === 'possible');
    const perfectMatchCategories = categoriesWithClassification.filter(c => c.classification === 'perfect');

    // Sub-category logic: Group by parent and classify
    const subGroups = Object.entries(uniqueCsvSubCategories).map(([csvParent, subs]) => {
        const withClassification = subs.map(sub => ({
            sub,
            classification: getClassification(sub, subCategoryValueMapping[sub])
        }));
        return {
            csvParent,
            none: withClassification.filter(m => m.classification === 'none'),
            possible: withClassification.filter(m => m.classification === 'possible'),
            perfect: withClassification.filter(m => m.classification === 'perfect'),
            total: subs.length
        };
    });

    const hasAnySubAttention = subGroups.some(g => g.none.length > 0 || g.possible.length > 0);
    const totalPerfectSubs = subGroups.reduce((acc, g) => acc + g.perfect.length, 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 max-w-5xl mx-auto pb-12">
            <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden mb-8">
                <div className="relative z-10">
                    <h3 className="text-3xl font-black tracking-tight mb-2">
                        {mode === 'category' ? 'Refine Category Mapping' : 'Refine Sub-category Mapping'}
                    </h3>
                    <p className="text-blue-100 text-lg font-medium max-w-2xl">
                        {mode === 'category'
                            ? 'We found unique categories in your CSV. Map them to your MiBudget categories.'
                            : 'Now, let\'s map the sub-categories within those categories.'}
                    </p>
                </div>
                <TableIcon className="absolute -right-8 -bottom-8 w-64 h-64 text-blue-500/20 rotate-12" />
            </div>

            <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-amber-600" />
                    <AlertDescription className="font-medium">
                        Mappings will be applied to all matching rows. {mode === 'category' ? 'Sub-categories will be mapped in the next step.' : 'You can still refine individual transactions in the preview.'}
                    </AlertDescription>
                </div>
            </Alert>

            <div className="grid grid-cols-1 gap-8">
                {mode === 'category' && uniqueCsvCategories.length > 0 && (
                    <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500">Source Categories (CSV)</h4>
                            <Badge variant="outline" className="bg-white text-slate-500 font-bold">{uniqueCsvCategories.length} Unique</Badge>
                        </div>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {noMatchCategories.length > 0 && (
                                    <div className="bg-slate-50/50 px-8 py-3 border-b border-slate-100 italic text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Match Not Found
                                    </div>
                                )}
                                {noMatchCategories.map(({ cat: csvCat }) => (
                                    <MappingItem
                                        key={csvCat}
                                        csvValue={csvCat}
                                        suggestion={suggestions[csvCat]}
                                        value={categoryValueMapping[csvCat]}
                                        onChange={(v: string) => handleCategoryMappingChange(csvCat, v)}
                                        onAdd={() => handleCategoryMappingChange(csvCat, '_KEEP_')}
                                        onClear={() => handleCategoryMappingChange(csvCat, '_BLANK_')}
                                        type="category"
                                    />
                                ))}

                                {possibleMatchCategories.length > 0 && (
                                    <div className="bg-amber-50/30 px-8 py-3 border-y border-amber-100 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Possible Matches</span>
                                    </div>
                                )}
                                {possibleMatchCategories.map(({ cat: csvCat }) => (
                                    <MappingItem
                                        key={csvCat}
                                        csvValue={csvCat}
                                        suggestion={suggestions[csvCat]}
                                        value={categoryValueMapping[csvCat]}
                                        onChange={(v: string) => handleCategoryMappingChange(csvCat, v)}
                                        onAdd={() => handleCategoryMappingChange(csvCat, '_KEEP_')}
                                        onClear={() => handleCategoryMappingChange(csvCat, '_BLANK_')}
                                        type="category"
                                    />
                                ))}

                                {perfectMatchCategories.length > 0 && (
                                    <div className="bg-emerald-50/30">
                                        <button
                                            onClick={() => setShowExactMatches(!showExactMatches)}
                                            className="w-full px-8 py-4 flex items-center justify-between hover:bg-emerald-50/50 transition-colors group border-y border-emerald-100/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-emerald-100 rounded-lg">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                                    {perfectMatchCategories.length} Perfect Matches (Exact)
                                                </span>
                                            </div>
                                            {showExactMatches ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
                                        </button>
                                        {showExactMatches && (
                                            <div className="divide-y divide-emerald-50/50 animate-in slide-in-from-top-2">
                                                {perfectMatchCategories.map(({ cat: csvCat }) => (
                                                    <MappingItem
                                                        key={csvCat}
                                                        csvValue={csvCat}
                                                        suggestion={suggestions[csvCat]}
                                                        value={categoryValueMapping[csvCat]}
                                                        onChange={(v: string) => handleCategoryMappingChange(csvCat, v)}
                                                        onClear={() => handleCategoryMappingChange(csvCat, '_BLANK_')}
                                                        type="category"
                                                        isPerfectMatch
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {mode === 'sub-category' && Object.keys(uniqueCsvSubCategories).length > 0 && (
                    <div className="space-y-6">
                        {subGroups.map(({ csvParent, none, possible, perfect, total }) => {
                            const systemParentCat = categoryValueMapping[csvParent] || csvParent;
                            if (none.length === 0 && possible.length === 0 && perfect.length > 0 && !showExactMatches) return null;
                            if (total === 0) return null;

                            const subOptions = getSubCategoryList(csvParent);

                            return (
                                <Card key={csvParent} className="border-none shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
                                    <div className="px-8 py-4 bg-blue-50/40 border-b border-blue-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">Values found under:</span>
                                            <span className="text-sm font-black text-blue-800">{csvParent}</span>
                                            {systemParentCat !== csvParent && systemParentCat !== '_BLANK_' && (
                                                <>
                                                    <ChevronRight className="w-3 h-3 text-blue-300" />
                                                    <Badge className="bg-blue-600 text-white font-bold h-5 px-1.5 text-[10px] tracking-tight">{systemParentCat}</Badge>
                                                </>
                                            )}
                                        </div>
                                        {systemParentCat === '_BLANK_' && (
                                            <Badge variant="outline" className="border-red-200 text-red-500 bg-red-50 text-[9px] font-black uppercase">Cleared (Skipping)</Badge>
                                        )}
                                        <Badge variant="outline" className="bg-white text-blue-400 font-bold text-[10px]">{total} Sub-categories</Badge>
                                    </div>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-slate-50">
                                            {/* Sub-category None Section */}
                                            {none.length > 0 && (
                                                <div className="bg-slate-50/50 px-8 py-2 border-b border-slate-100 italic text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    Match Not Found
                                                </div>
                                            )}
                                            {none.map(({ sub: csvSub }) => (
                                                <MappingItem
                                                    key={csvSub}
                                                    csvValue={csvSub}
                                                    suggestion={suggestions[csvSub]}
                                                    value={subCategoryValueMapping[csvSub]}
                                                    onChange={(v: string) => handleSubCategoryMappingChange(csvSub, v)}
                                                    onAdd={() => handleSubCategoryMappingChange(csvSub, '_KEEP_')}
                                                    onClear={() => handleSubCategoryMappingChange(csvSub, '_BLANK_')}
                                                    type="sub-category"
                                                    disabled={systemParentCat === '_BLANK_'}
                                                    options={subOptions}
                                                />
                                            ))}

                                            {/* Sub-category Possible Section */}
                                            {possible.length > 0 && (
                                                <div className="bg-amber-50/30 px-8 py-2 border-y border-amber-100 flex items-center gap-2">
                                                    <div className="w-1 h-1 bg-amber-400 rounded-full" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-700">Possible Matches</span>
                                                </div>
                                            )}
                                            {possible.map(({ sub: csvSub }) => (
                                                <MappingItem
                                                    key={csvSub}
                                                    csvValue={csvSub}
                                                    suggestion={suggestions[csvSub]}
                                                    value={subCategoryValueMapping[csvSub]}
                                                    onChange={(v: string) => handleSubCategoryMappingChange(csvSub, v)}
                                                    onAdd={() => handleSubCategoryMappingChange(csvSub, '_KEEP_')}
                                                    onClear={() => handleSubCategoryMappingChange(csvSub, '_BLANK_')}
                                                    type="sub-category"
                                                    disabled={systemParentCat === '_BLANK_'}
                                                    options={subOptions}
                                                />
                                            ))}

                                            {/* Sub-category Perfect Section (standardized dropdown now) */}
                                            {perfect.length > 0 && showExactMatches && (
                                                <div className="bg-emerald-50/10">
                                                    <div className="px-8 py-2 border-y border-emerald-100/50 flex items-center gap-2">
                                                        <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Perfect Matches</span>
                                                    </div>
                                                    {perfect.map(({ sub: csvSub }) => (
                                                        <MappingItem
                                                            key={csvSub}
                                                            csvValue={csvSub}
                                                            suggestion={suggestions[csvSub]}
                                                            value={subCategoryValueMapping[csvSub]}
                                                            onChange={(v: string) => handleSubCategoryMappingChange(csvSub, v)}
                                                            onClear={() => handleSubCategoryMappingChange(csvSub, '_BLANK_')}
                                                            type="sub-category"
                                                            isPerfectMatch
                                                            disabled={systemParentCat === '_BLANK_'}
                                                            options={subOptions}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {totalPerfectSubs > 0 && !showExactMatches && (
                            <button
                                onClick={() => setShowExactMatches(true)}
                                className="w-full bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-50 transition-colors group"
                            >
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-black text-emerald-700 uppercase tracking-widest">
                                    Show {totalPerfectSubs} Hidden Perfect Sub-category Matches
                                </span>
                                <ChevronDown className="w-5 h-5 text-emerald-400" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {!hasAnySubAttention && !showExactMatches && totalPerfectSubs > 0 && (
                <div className="text-center py-12 space-y-4">
                    <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h4 className="text-xl font-black text-slate-800 tracking-tight">Everything looks perfect!</h4>
                    <p className="text-slate-500 font-medium">All sub-categories were automatically mapped.</p>
                    <Button
                        variant="outline"
                        onClick={() => setShowExactMatches(true)}
                        className="border-emerald-200 text-emerald-600 font-bold rounded-xl"
                    >
                        Review automatic matches
                    </Button>
                </div>
            )}

            <div className="flex justify-between items-center pt-8 border-t border-slate-200 mt-10">
                <Button variant="ghost" size="lg" onClick={() => setStep(mode === 'category' ? 2 : 3)} className="text-slate-500 hover:bg-slate-100 font-bold h-12 px-8 rounded-xl tracking-tight">
                    <ChevronLeft className="w-5 h-5 mr-2" /> {mode === 'category' ? 'Back to Mapping' : 'Back to Categories'}
                </Button>
                <div className="flex gap-4">
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => setStep(5)}
                        className="text-slate-400 font-bold h-12 px-6 hover:text-slate-600 tracking-tight"
                    >
                        Skip Mapping
                    </Button>
                    <Button
                        onClick={applyValueMappings}
                        size="lg"
                        className="px-10 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-black h-12 rounded-xl text-md tracking-tight"
                    >
                        {mode === 'category' ? 'Proceed to Sub-categories' : 'Preview Imports'} <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- Helper Component ---
const MappingItem = ({
    csvValue,
    suggestion,
    value,
    onChange,
    onAdd,
    onClear,
    type,
    isPerfectMatch = false,
    disabled = false,
    options = []
}: any) => {
    const hasSuggestion = suggestion && suggestion.confidence > 0.5;

    return (
        <div className={cn(
            "px-8 py-5 hover:bg-slate-50/50 transition-colors flex items-center gap-12 group",
            isPerfectMatch && "opacity-80 hover:opacity-100"
        )}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isPerfectMatch ? "bg-emerald-400" : (hasSuggestion ? "bg-amber-400" : "bg-blue-400"),
                        "group-hover:scale-125 transition-transform"
                    )} />
                    <span className="text-lg font-black text-slate-800 truncate tracking-tight">{csvValue}</span>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        Original CSV {type === 'category' ? 'Category' : 'Sub-category'}
                    </p>
                    {hasSuggestion && !isPerfectMatch && (
                        <Badge variant="secondary" className="text-[9px] bg-amber-50 text-amber-600 border-amber-100 h-4 px-1.5 font-black uppercase">
                            {Math.round(suggestion.confidence * 100)}% Match
                        </Badge>
                    )}
                </div>
            </div>

            <div className="w-[340px] shrink-0 space-y-3">
                {type === 'category' ? (
                    <CategorySelector
                        value={value}
                        onValueChange={onChange}
                        className={cn(
                            "h-11 text-sm font-bold border-slate-200 hover:border-blue-300 shadow-sm rounded-xl transition-all",
                            hasSuggestion && !value && "border-amber-300 bg-amber-50/30",
                            isPerfectMatch && "border-emerald-200 bg-emerald-50/20"
                        )}
                        placeholder={hasSuggestion ? `Suggested: ${suggestion.category}` : "Map to system category..."}
                        hideSuggestions={true}
                    />
                ) : (
                    <SmartSelector
                        value={value || ''}
                        onValueChange={onChange}
                        disabled={disabled}
                        options={[
                            ...(value && value !== '_KEEP_' && value !== '_BLANK_' && !options.includes(value) ? [{ label: `${value} (Current)`, value }] : []),
                            ...options.map((s: string) => ({ label: s, value: s })),
                            { label: `+ Add "${csvValue}"`, value: '_KEEP_' },
                            { label: 'Clear value', value: '_BLANK_' }
                        ]}
                        placeholder="Map to sub-category..."
                        className={cn(
                            "h-11",
                            hasSuggestion && !value && "border-amber-300 bg-amber-50/30",
                            isPerfectMatch && "border-emerald-200 bg-emerald-50/20"
                        )}
                        hideSuggestions={true}
                    />
                )}

                <div className="flex gap-2 justify-end">
                    {onAdd && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 h-6 rounded-md flex items-center gap-1"
                            onClick={onAdd}
                        >
                            <Plus className="w-2.5 h-2.5" /> Add "{csvValue}"
                        </Button>
                    )}
                    {onClear && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-6 rounded-md"
                            onClick={onClear}
                        >
                            Clear
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
