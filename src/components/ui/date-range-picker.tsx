"use client"

import * as React from "react"
import { CalendarIcon } from 'lucide-react'
import { format } from "date-fns"
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
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {
    const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date);
    const [isOpen, setIsOpen] = React.useState(false);

    // Sync temp date with props when popover opens
    React.useEffect(() => {
        if (isOpen) {
            setTempDate(date);
        }
    }, [isOpen, date]);

    const handleApply = () => {
        setDate(tempDate);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setTempDate(date);
        setIsOpen(false);
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "yy/MM/dd")} -{" "}
                                    {format(date.to, "yy/MM/dd")}
                                </>
                            ) : (
                                format(date.from, "yy/MM/dd")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Range</span>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={handleApply}>
                                Apply
                            </Button>
                        </div>
                    </div>
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={tempDate?.from || date?.from}
                        selected={tempDate}
                        onSelect={setTempDate}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
