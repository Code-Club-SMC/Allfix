"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function getCurrentMonthRange(): DateRange {
	const now = new Date();
	// Use noon local time to prevent UTC timezone shift from changing the calendar date
	return {
		from: new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0),
		to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 12, 0, 0),
	};
}

export function fmtDateForAPI(d: Date | undefined): string | undefined {
	if (!d) return undefined;
	// en-CA formats as YYYY-MM-DD in the local timezone (no UTC shift)
	return d.toLocaleDateString("en-CA");
}

// ─── Single date picker ────────────────────────────────────────────────────────

interface DatePickerProps {
	value?: Date;
	onChange?: (date: Date | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function DatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
	className,
	disabled,
}: DatePickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled}
					className={cn(
						"w-full justify-start text-left font-normal transition-colors",
						!value && "text-muted-foreground",
						className,
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{value ? format(value, "PPP") : <span>{placeholder}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value}
					onSelect={onChange}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}

// ─── Date range picker ─────────────────────────────────────────────────────────

interface DateRangePickerProps {
	value?: DateRange;
	onChange?: (range: DateRange | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function DateRangePicker({
	value,
	onChange,
	placeholder = "Pick a date range",
	className,
	disabled,
}: DateRangePickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled}
					className={cn(
						"min-w-[240px] justify-start text-left font-normal transition-colors",
						!value?.from && "text-muted-foreground",
						className,
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
					{value?.from ? (
						value.to ? (
							<>
								{format(value.from, "LLL dd, y")} –{" "}
								{format(value.to, "LLL dd, y")}
							</>
						) : (
							format(value.from, "LLL dd, y")
						)
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="range"
					selected={value}
					onSelect={onChange}
					numberOfMonths={2}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
