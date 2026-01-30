
import { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Transaction } from './hooks/useTransactionTable';
import { cn } from '@/lib/utils';

interface TransactionNoteProps {
    transaction: Transaction;
    onSave: (id: string, note: string) => void;
}

export const TransactionNote = ({ transaction, onSave }: TransactionNoteProps) => {
    const [note, setNote] = useState(transaction.notes || '');
    const [open, setOpen] = useState(false);

    // Consider a note existing if it has non-whitespace content
    const hasNote = !!transaction.notes && transaction.notes.trim().length > 0;

    const handleSave = () => {
        onSave(transaction.id, note);
        setOpen(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            setNote(transaction.notes || '');
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-6 w-6 p-0 transition-all ml-1",
                                    hasNote
                                        ? "text-yellow-500 hover:text-yellow-600 opacity-100"
                                        : "text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover/merchant:opacity-100"
                                )}
                            >
                                <StickyNote
                                    className={cn(
                                        "w-3.5 h-3.5",
                                        hasNote && "fill-yellow-200"
                                    )}
                                />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] bg-foreground text-background">
                        <p className="text-xs whitespace-pre-wrap">
                            {hasNote ? transaction.notes : "Add a note"}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <PopoverContent className="w-80 p-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium leading-none text-sm text-foreground">Transaction Note</h4>
                        {hasNote && (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Editing</span>
                        )}
                    </div>
                    <Textarea
                        placeholder="Add details about this transaction..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-[100px] text-sm resize-none focus-visible:ring-1"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                        }}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={(e) => {
                            e.stopPropagation();
                            handleSave();
                        }}>
                            Save Note
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};
