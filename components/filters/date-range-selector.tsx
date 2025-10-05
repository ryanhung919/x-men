"use client";

import { useState, useRef, useEffect } from "react";
import { DateRangePicker } from "react-date-range";
import { addDays, startOfDay, endOfDay } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

export type DateRangeType = {
  startDate?: Date;
  endDate?: Date;
};

interface DateRangePickerProps {
  value: DateRangeType;
  onChange: (range: DateRangeType) => void;
  maxDate?: Date;
  loading?: boolean;
}

export const presets: { label: string; range: DateRangeType }[] = [
  { label: "Today", range: { startDate: startOfDay(new Date()), endDate: endOfDay(new Date()) } },
  { label: "Last 7 Days", range: { startDate: startOfDay(addDays(new Date(), -6)), endDate: endOfDay(new Date()) } },
  { label: "This Month", range: { startDate: startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), endDate: endOfDay(new Date()) } },
];

export function DateRangeFilter({ value, onChange, maxDate = new Date(), loading = false }: DateRangePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectPreset = (preset: DateRangeType) => onChange(preset);
  const clearRange = () => onChange({ startDate: undefined, endDate: undefined });

  const formatDisplay = (range: DateRangeType) =>
    range.startDate && range.endDate
      ? `${range.startDate.toLocaleDateString()} – ${range.endDate.toLocaleDateString()}`
      : "Select date range";

  // --- Close dropdown on outside click ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-52" ref={ref}>
      <button
        className="w-full border border-input bg-background hover:bg-muted px-3 py-2 rounded flex items-center justify-between text-sm"
        onClick={() => setShowCalendar((v) => !v)}
        disabled={loading}
      >
        {formatDisplay(value)}
        <span className="text-muted-foreground">{showCalendar ? "▲" : "▼"}</span>
      </button>

      {showCalendar && (
        <div className="absolute z-50 mt-1 w-96 bg-popover rounded-lg shadow-lg p-3">
          <div className="flex gap-2 mb-2 flex-wrap">
            {presets.map((p) => (
              <button
                key={p.label}
                className="bg-accent/10 px-2 py-1 rounded text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => selectPreset(p.range)}
              >
                {p.label}
              </button>
            ))}
            <button
              className="bg-red-100 px-2 py-1 rounded text-sm hover:bg-red-200"
              onClick={clearRange}
            >
              Clear
            </button>
          </div>

          <DateRangePicker
            ranges={[
              { startDate: value.startDate || new Date(), endDate: value.endDate || new Date(), key: "selection" },
            ]}
            onChange={(ranges: any) =>
              onChange({ startDate: ranges.selection.startDate, endDate: ranges.selection.endDate })
            }
            editableDateInputs
            moveRangeOnFirstSelection={false}
            rangeColors={["#3b82f6"]}
            maxDate={maxDate}
          />

          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-lg pointer-events-none">
              <span className="animate-pulse text-muted-foreground text-sm">Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
