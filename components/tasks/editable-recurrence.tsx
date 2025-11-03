"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, Pencil, Check, X } from "lucide-react"
import { useState } from "react"

interface EditableRecurrenceProps {
  taskId: number
  recurrenceInterval: number
  recurrenceDate: string | null
}

const RECURRENCE_OPTIONS = [
  { value: 0, label: "No Recurrence" },
  { value: 1, label: "Daily" },
  { value: 7, label: "Weekly" },
  { value: 30, label: "Monthly" },
]

export function EditableRecurrence({
  taskId,
  recurrenceInterval: initialInterval,
  recurrenceDate: initialDate,
}: EditableRecurrenceProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [displayInterval, setDisplayInterval] = useState<number>(initialInterval)
  const [displayDate, setDisplayDate] = useState<string | null>(initialDate)

  const [selectedInterval, setSelectedInterval] = useState<number>(initialInterval)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate ? new Date(initialDate) : undefined)

  const getRecurrenceLabel = (interval: number): string => {
    return RECURRENCE_OPTIONS.find((opt) => opt.value === interval)?.label || "Unknown"
  }

  const handleCancel = () => {
    setIsEditing(false)
    setSelectedInterval(displayInterval)
    setSelectedDate(displayDate ? new Date(displayDate) : undefined)
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    setIsLoading(true)

    try {
      if (selectedInterval > 0 && !selectedDate) {
        setError("Please select a recurrence start date")
        setIsLoading(false)
        return
      }

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateRecurrence",
          recurrenceInterval: selectedInterval,
          recurrenceDate: selectedDate ? selectedDate.toISOString() : null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update recurrence")
      }

      setDisplayInterval(selectedInterval)
      setDisplayDate(selectedDate ? selectedDate.toISOString() : null)
      setIsEditing(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update recurrence"
      setError(errorMessage)
      console.error("Failed to update recurrence:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-transparent hover:border-muted-foreground/25 transition-colors">
        <div className="flex items-center gap-3">
          {displayInterval > 0 ? (
            <>
              <Badge variant="secondary">{getRecurrenceLabel(displayInterval)}</Badge>
              {displayDate && (
                <span className="text-sm text-muted-foreground">
                  Since {format(new Date(displayDate), "MMM d, yyyy")}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No recurrence set</span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
          <Pencil className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium">Recurrence Pattern</label>
        <Select
          value={selectedInterval.toString()}
          onValueChange={(v) => {
            const interval = Number.parseInt(v)
            setSelectedInterval(interval)
            if (interval === 0) {
              setSelectedDate(undefined)
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECURRENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedInterval > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Start Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700">
          <Check className="w-4 h-4 mr-1" />
          {isLoading ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
          className="flex-1 bg-transparent"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
