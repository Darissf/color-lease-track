import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format as dateFnsFormat } from 'date-fns';
import { id } from 'date-fns/locale';

export const WITA_TIMEZONE = 'Asia/Makassar';

/**
 * Get current date/time in WITA timezone (Denpasar/Bali, UTC+8)
 */
export const getNowInWITA = (): Date => {
  return toZonedTime(new Date(), WITA_TIMEZONE);
};

/**
 * Format a date in WITA timezone with Indonesian locale
 * @param date - Date to format (can be Date object or ISO string)
 * @param formatStr - Format string (e.g., 'yyyy-MM-dd', 'PPP', 'HH:mm')
 */
export const formatInWITA = (date: Date | string, formatStr: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, WITA_TIMEZONE, formatStr, { locale: id });
};

/**
 * Convert any date to WITA timezone
 * @param date - Date to convert (can be Date object or ISO string)
 */
export const toWITATime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, WITA_TIMEZONE);
};

/**
 * Convert WITA time to UTC for database storage
 * @param date - Date in WITA timezone
 */
export const fromWITAToUTC = (date: Date): Date => {
  return fromZonedTime(date, WITA_TIMEZONE);
};

/**
 * Get date string in WITA timezone (YYYY-MM-DD format)
 * Useful for date comparisons and database queries
 */
export const getWITADateString = (date?: Date | string): string => {
  const dateObj = date 
    ? (typeof date === 'string' ? new Date(date) : date)
    : getNowInWITA();
  return formatInWITA(dateObj, 'yyyy-MM-dd');
};

/**
 * Get current day of month in WITA timezone
 */
export const getWITADay = (): number => {
  return getNowInWITA().getDate();
};

/**
 * Get current month (0-11) in WITA timezone
 */
export const getWITAMonth = (): number => {
  return getNowInWITA().getMonth();
};

/**
 * Get current year in WITA timezone
 */
export const getWITAYear = (): number => {
  return getNowInWITA().getFullYear();
};

// Backward-compatible aliases (lama: Jakarta, baru: WITA)
export const JAKARTA_TIMEZONE = WITA_TIMEZONE;
export const getNowInJakarta = getNowInWITA;
export const formatInJakarta = formatInWITA;
export const toJakartaTime = toWITATime;
export const fromJakartaToUTC = fromWITAToUTC;
export const getJakartaDateString = getWITADateString;
export const getJakartaDay = getWITADay;
export const getJakartaMonth = getWITAMonth;
export const getJakartaYear = getWITAYear;
