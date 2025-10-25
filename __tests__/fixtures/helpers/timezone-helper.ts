/**
 * Timezone helper utilities for consistent date handling across tests
 * All dates are calculated relative to "now" but in Singapore timezone (Asia/Singapore)
 */

/**
 * Get current date in Singapore timezone (without time)
 * @returns Date object representing today's date at 00:00:00 in SGT
 */
export function getSGTToday(): Date {
  const now = new Date();
  const sgtTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  sgtTime.setHours(0, 0, 0, 0);
  return sgtTime;
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
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
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
    in15Days: createSGTDate(15, 17), // Beyond 14 day digest window
  };
}