/**
 * Converts a UTC date to Singapore Time (SGT/UTC+8) string format
 * @param date - Date object or ISO string
 * @returns Formatted string like "Oct 30, 2025 3:30 PM (SGT)" or null if invalid
 */
export function formatDateToSGT(date: Date | string | null): string | null {
  if (!date) return null;

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;

    // Add 8 hours for SGT offset
    const sgtDate = new Date(d.getTime() + 8 * 60 * 60 * 1000);

    // Format: "Oct 30, 2025 3:30 PM (SGT)"
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };

    const formatted = sgtDate.toLocaleDateString('en-US', options);
    return `${formatted} (SGT)`;
  } catch (error) {
    console.error('Error formatting date to SGT:', error);
    return null;
  }
}

/**
 * Converts date input (from datetime-local input) to SGT ISO string with +08:00 offset
 * @param dateString - ISO string or datetime-local value
 * @returns ISO string with SGT offset like "2025-10-30T15:30:00+08:00"
 */
export function toSGTString(dateString: string | null): string | null {
  if (!dateString) return null;

  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;

    // Replace Z with +08:00 for SGT
    return d.toISOString().replace('Z', '+08:00');
  } catch (error) {
    console.error('Error converting to SGT string:', error);
    return null;
  }
}