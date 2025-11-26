import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format as dateFnsFormat } from 'date-fns';
import { id } from 'date-fns/locale';

export const JAKARTA_TIMEZONE = 'Asia/Jakarta';

/**
 * Get current date/time in Jakarta timezone
 */
export const getNowInJakarta = (): Date => {
  return toZonedTime(new Date(), JAKARTA_TIMEZONE);
};

/**
 * Format a date in Jakarta timezone with Indonesian locale
 * @param date - Date to format (can be Date object or ISO string)
 * @param formatStr - Format string (e.g., 'yyyy-MM-dd', 'PPP', 'HH:mm')
 */
export const formatInJakarta = (date: Date | string, formatStr: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, JAKARTA_TIMEZONE, formatStr, { locale: id });
};

/**
 * Convert any date to Jakarta timezone
 * @param date - Date to convert (can be Date object or ISO string)
 */
export const toJakartaTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, JAKARTA_TIMEZONE);
};

/**
 * Convert Jakarta time to UTC for database storage
 * @param date - Date in Jakarta timezone
 */
export const fromJakartaToUTC = (date: Date): Date => {
  return fromZonedTime(date, JAKARTA_TIMEZONE);
};

/**
 * Get date string in Jakarta timezone (YYYY-MM-DD format)
 * Useful for date comparisons and database queries
 */
export const getJakartaDateString = (date?: Date | string): string => {
  const dateObj = date 
    ? (typeof date === 'string' ? new Date(date) : date)
    : getNowInJakarta();
  return formatInJakarta(dateObj, 'yyyy-MM-dd');
};

/**
 * Get current day of month in Jakarta timezone
 */
export const getJakartaDay = (): number => {
  return getNowInJakarta().getDate();
};

/**
 * Get current month (0-11) in Jakarta timezone
 */
export const getJakartaMonth = (): number => {
  return getNowInJakarta().getMonth();
};

/**
 * Get current year in Jakarta timezone
 */
export const getJakartaYear = (): number => {
  return getNowInJakarta().getFullYear();
};
