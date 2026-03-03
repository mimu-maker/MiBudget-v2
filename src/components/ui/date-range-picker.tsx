"use client"

import * as React from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, endOfMonth } from "date-fns"
import { da } from 'date-fns/locale'
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    maxDate?: Date
}

type Step = 'from-month' | 'from-date' | 'to-month' | 'to-date';

export function DatePickerWithRange({
    className,
    date,
    setDate,
    maxDate,
    trigger,
}: DatePickerWithRangeProps & { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);

    const [step, setStep] = React.useState<Step>('from-month');
    const [tempFrom, setTempFrom] = React.useState<Date | undefined>(date?.from);
    const [tempTo, setTempTo] = React.useState<Date | undefined>(date?.to);
    const [navYear, setNavYear] = React.useState<number>(new Date().getFullYear());

    // Sync temp date with props when popover opens
    React.useEffect(() => {
        if (isOpen) {
            setTempFrom(date?.from);
            setTempTo(date?.to);
            if (date?.from && date?.to) {
                setStep('from-date');
            } else {
                setStep('from-month');
            }
            setNavYear((date?.from || new Date()).getFullYear());
        }
    }, [isOpen, date]);

    const handleApply = () => {
        if (tempFrom && tempTo && tempTo < tempFrom) {
            // Ensure valid range
            setDate({ from: tempTo, to: tempFrom });
        } else {
            setDate({ from: tempFrom, to: tempTo });
        }
        setIsOpen(false);
    };

    const handleFromMonthSelect = (monthIndex: number) => {
        const d = new Date(navYear, monthIndex, 1);
        setTempFrom(d);
        setStep('from-date');
    };

    const handleToMonthSelect = (monthIndex: number) => {
        const d = endOfMonth(new Date(navYear, monthIndex, 1));
        setTempTo(d);
        setStep('to-date');
    };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const getStepTitle = () => {
        switch (step) {
            case 'from-month': return 'Select Start Month';
            case 'from-date': return 'Select Start Date';
            case 'to-month': return 'Select End Month';
            case 'to-date': return 'Select End Date';
            default: return '';
        }
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    {trigger ? trigger : (
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[60px] md:w-[260px] justify-center md:justify-start text-left font-normal rounded-full transition-all",
                                !date && "text-muted-foreground",
                                date ? "px-4" : "px-0"
                            )}
                            title="Custom Date Range"
                        >
                            <CalendarIcon className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "dd/MM/yy")} - {format(date.to, "dd/MM/yy")}
                                        </>
                                    ) : (
                                        format(date.from, "dd/MM/yy")
                                    )
                                ) : (
                                    "Pick a date"
                                )}
                            </span>
                        </Button>
                    )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col w-[300px]">
                        {/* Header */}
                        <div className="flex justify-between items-center p-3 border-b bg-slate-50/50">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {getStepTitle()}
                            </span>
                            <div className="flex gap-2">
                                {(step === 'from-date' || step === 'to-date') && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                            if (step === 'from-date') {
                                                setStep('to-month');
                                                setNavYear(tempFrom?.getFullYear() || navYear);
                                            } else if (step === 'to-date') {
                                                handleApply();
                                            }
                                        }}
                                    >
                                        Continue
                                    </Button>
                                )}
                                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleApply}>
                                    Apply
                                </Button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-3">
                            {/* Navigation inside content if needed */}
                            {step !== 'from-month' && (
                                <div className="mb-2 flex gap-1 bg-slate-50 p-1 rounded-md border">
                                    <Button variant="ghost" size="sm" className={cn("flex-1 h-7 text-[10px] px-2", (step === 'from-date') ? "bg-white shadow-sm font-bold text-slate-900" : "text-slate-500 hover:text-slate-700")} onClick={() => setStep('from-date')}>
                                        From: {tempFrom ? format(tempFrom, "dd/MMM/yy") : 'Not set'}
                                    </Button>
                                    <Button variant="ghost" size="sm" className={cn("flex-1 h-7 text-[10px] px-2", (step === 'to-month' || step === 'to-date') ? "bg-white shadow-sm font-bold text-slate-900" : "text-slate-500 hover:text-slate-700")} onClick={() => setStep('to-date')}>
                                        To: {tempTo ? format(tempTo, "dd/MMM/yy") : 'Not set'}
                                    </Button>
                                </div>
                            )}

                            {(step === 'from-month' || step === 'to-month') && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-4">
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setNavYear(y => y - 1)}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm font-bold tracking-wider">{navYear}</span>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setNavYear(y => y + 1)}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {months.map((m, i) => {
                                            const isSelected =
                                                (step === 'from-month' && tempFrom?.getMonth() === i && tempFrom?.getFullYear() === navYear) ||
                                                (step === 'to-month' && tempTo?.getMonth() === i && tempTo?.getFullYear() === navYear);
                                            return (
                                                <Button
                                                    key={m}
                                                    variant={isSelected ? "default" : "outline"}
                                                    className={cn("h-10 text-sm", isSelected ? "bg-slate-900 text-white" : "")}
                                                    onClick={() => {
                                                        if (step === 'from-month') handleFromMonthSelect(i);
                                                        else handleToMonthSelect(i);
                                                    }}
                                                >
                                                    {m}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {(step === 'from-date') && (
                                <Calendar
                                    mode="single"
                                    month={tempFrom ? new Date(tempFrom.getFullYear(), tempFrom.getMonth()) : new Date(navYear, 0)}
                                    onMonthChange={(m) => {
                                        setNavYear(m.getFullYear());
                                        if (tempFrom) {
                                            const newDate = new Date(tempFrom);
                                            newDate.setFullYear(m.getFullYear(), m.getMonth());
                                            setTempFrom(newDate);
                                        }
                                    }}
                                    selected={tempFrom}
                                    onSelect={(d) => {
                                        if (d) {
                                            setTempFrom(d);
                                            setStep('to-month');
                                            setNavYear(d.getFullYear());
                                        }
                                    }}
                                    disabled={maxDate ? { after: maxDate } : undefined}
                                    components={{
                                        CaptionLabel: ({ displayMonth }) => (
                                            <button
                                                onClick={() => setStep('from-month')}
                                                className="text-sm font-medium hover:text-blue-600 hover:underline cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
                                                type="button"
                                            >
                                                {format(displayMonth, "MMMM yyyy")}
                                            </button>
                                        )
                                    }}
                                />
                            )}

                            {(step === 'to-date') && (
                                <Calendar
                                    mode="single"
                                    month={tempTo || new Date(navYear, 0, 1)}
                                    onMonthChange={(m) => {
                                        setNavYear(m.getFullYear());
                                        if (tempTo) {
                                            const newDate = new Date(tempTo);
                                            newDate.setFullYear(m.getFullYear(), m.getMonth());

                                            // Ensure it's the end of the new month if we're swapping months
                                            setTempTo(endOfMonth(newDate));
                                        }
                                    }}
                                    selected={tempTo}
                                    onSelect={(d) => {
                                        if (d) {
                                            setTempTo(d);
                                        }
                                    }}
                                    disabled={(date) => {
                                        if (maxDate && date > maxDate) return true;
                                        if (tempFrom && date < tempFrom) return true;
                                        return false;
                                    }}
                                    components={{
                                        CaptionLabel: ({ displayMonth }) => (
                                            <button
                                                onClick={() => setStep('to-month')}
                                                className="text-sm font-medium hover:text-blue-600 hover:underline cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
                                                type="button"
                                            >
                                                {format(displayMonth, "MMMM yyyy")}
                                            </button>
                                        )
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
