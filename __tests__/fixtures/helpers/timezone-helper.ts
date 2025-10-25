/**
 * Get current date in Singapore timezone (without time)
 * @returns Date object representing today's date at midnight SGT (as UTC timestamp)
 */
export function getSGTToday(): Date {
  const now = new Date();
  
  // SGT is UTC+8, so add 8 hours to get SGT time
  const sgtOffsetMs = 8 * 60 * 60 * 1000;
  const sgtMs = now.getTime() + sgtOffsetMs;
  const sgtDate = new Date(sgtMs);
  
  // Get SGT date components
  const sgtYear = sgtDate.getUTCFullYear();
  const sgtMonth = sgtDate.getUTCMonth();
  const sgtDay = sgtDate.getUTCDate();
  
  // Midnight SGT = UTC midnight for that same calendar date
  // Then subtract 8 hours to get the UTC time that equals SGT midnight
  // Example: SGT Oct 25 00:00:00 = UTC Oct 24 16:00:00
  const midnightSGTasUTC = Date.UTC(sgtYear, sgtMonth, sgtDay, 0, 0, 0) - sgtOffsetMs;
  
  return new Date(midnightSGTasUTC);
}

/**
 * Create a date relative to today in Singapore timezone
 * @param daysOffset - Number of days from today (negative = past, 0 = today, positive = future)
 * @param hour - Hour of day (0-23), defaults to 17 (5 PM)
 * @param minute - Minute of hour (0-59), defaults to 0
 * @returns Date object in SGT
 */
export function createSGTDate(daysOffset: number, hour: number = 17, minute: number = 0): Date {
  const today = getSGTToday();
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + daysOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

/**
 * Create multiple dates for testing deadline ranges
 * Useful for testing task categorization (overdue, today, tomorrow, etc.)
 */
export function createSGTDateRange() {
  return {
    yesterday: createSGTDate(-1, 17),
    today: createSGTDate(0, 17),
    tomorrow: createSGTDate(1, 17),
    in2Days: createSGTDate(2, 17),
    in7Days: createSGTDate(7, 17),
    in14Days: createSGTDate(14, 17),
    in15Days: createSGTDate(15, 17),
  };
}