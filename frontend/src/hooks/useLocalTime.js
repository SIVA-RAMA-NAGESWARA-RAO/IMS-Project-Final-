/**
 * useLocalTime — React hook for UTC → local timezone conversion.
 *
 * All dates from the API are ISO 8601 UTC strings. This hook converts them
 * to the user's browser timezone using the Intl.DateTimeFormat API.
 *
 * Usage:
 *   const { formatted, relative, date } = useLocalTime('2026-06-25T13:00:00.000Z');
 *   // formatted → "Jun 25, 2026, 6:30 PM"    (if browser is IST)
 *   // relative  → "in 2 hours"  or "3 days ago"
 *   // date      → Date object
 */
import { useMemo } from 'react';

const FORMATTERS = {
  full: new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }),
  short: new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
  dateOnly: new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
  timeOnly: new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }),
};

/**
 * Compute a human-readable relative time string.
 */
const getRelativeTime = (date) => {
  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);
  const isFuture = diff > 0;

  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  let label;
  if (minutes < 1) label = 'just now';
  else if (minutes < 60) label = `${minutes}m`;
  else if (hours < 24) label = `${hours}h`;
  else if (days < 30) label = `${days}d`;
  else label = `${Math.floor(days / 30)}mo`;

  if (label === 'just now') return label;
  return isFuture ? `in ${label}` : `${label} ago`;
};

const useLocalTime = (utcDateString, format = 'full') => {
  return useMemo(() => {
    if (!utcDateString) {
      return { formatted: '—', relative: '—', date: null };
    }

    const date = new Date(utcDateString);
    if (isNaN(date.getTime())) {
      return { formatted: 'Invalid date', relative: '—', date: null };
    }

    const formatter = FORMATTERS[format] || FORMATTERS.full;

    return {
      formatted: formatter.format(date),
      relative: getRelativeTime(date),
      date,
    };
  }, [utcDateString, format]);
};

export default useLocalTime;

/**
 * Standalone formatting function (for use outside React components).
 */
export const formatLocalTime = (utcDateString, format = 'full') => {
  if (!utcDateString) return '—';
  const date = new Date(utcDateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  const formatter = FORMATTERS[format] || FORMATTERS.full;
  return formatter.format(date);
};
