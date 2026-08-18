/**
 * Arabic Date, Time, and Number Formatting Utilities
 * Follows El Awal Design System Formatting Principles
 */

/**
 * Formats a decimal/number as a clean percentage string (e.g. 92.4%)
 */
export function formatPercentage(val: number | undefined | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return `${val.toFixed(decimals)}%`;
}

/**
 * Formats integer or float counts cleanly with thousand separators (e.g. 1,284)
 */
export function formatNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return new Intl.NumberFormat('en-US').format(val);
}

/**
 * Formats a date string (ISO) into Arabic locale date (e.g. الأحد، ١٦ أغسطس ٢٠٢٦)
 */
export function formatArabicDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Formats a time string or Date into 12-hour Arabic time (e.g. 05:00 م)
 */
export function formatArabicTime(timeInput: string | Date | undefined | null): string {
  if (!timeInput) return '—';
  
  if (typeof timeInput === 'string' && timeInput.includes(':') && !timeInput.includes('T')) {
    // String like "17:00"
    const [hoursStr, minutesStr] = timeInput.split(':');
    const hours = parseInt(hoursStr, 10);
    const suffix = hours >= 12 ? 'م' : 'ص';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${minutesStr} ${suffix}`;
  }

  const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats a phone number for WhatsApp (prepends country code +20 if it's an Egyptian number)
 */
export function formatWhatsAppNumber(phone: string | undefined | null, defaultCountryCode: string = '20'): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  
  // If the number starts with 0 and is an Egyptian mobile (e.g., 01xxxxxxxxx), prepend country code (e.g., 20)
  if (digits.startsWith('01') && digits.length === 11) {
    return `2${digits}`;
  }
  
  // If it's already an Egyptian number starting with 201
  if (digits.startsWith('201') && digits.length === 12) {
    return digits;
  }
  
  // Fallback
  return digits;
}
