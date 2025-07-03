import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a date/time string to the user's local timezone
 * @param dateString - ISO date string or any valid date string
 * @param options - Optional Intl.DateTimeFormatOptions for customization
 * @param use24Hour - Whether to use 24-hour format (default: false for 12-hour with AM/PM)
 * @returns Formatted date string in user's local timezone
 */
export function formatToUserTimezone(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  use24Hour: boolean = false
): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if invalid
    }
    
    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Default formatting options
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: userTimezone,
      hour12: !use24Hour, // Use 12-hour format by default (shows AM/PM)
    };
    
    // Merge with provided options
    const formatOptions = { ...defaultOptions, ...options };
    
    return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original string on error
  }
}
