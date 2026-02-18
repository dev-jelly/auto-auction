/**
 * Parse Korean date formats to ISO 8601
 * Supports:
 * - "MM/DD (HH:mm)" - current year inferred, handles 24:00 edge case
 * - "YYYY.MM.DD HH:mm" - full date with time
 * - "YYYY-MM-DD" or "YYYY.MM.DD" - date only
 */
export function parseKoreanDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Format: "MM/DD (HH:mm)" or "MM/DD(HH:mm)" — no year, infer current
  const shortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*\((\d{2}):(\d{2})\)/);
  if (shortMatch) {
    const [, mm, dd, hh, mi] = shortMatch;
    const year = new Date().getFullYear();
    // Handle "24:00" as next day "00:00"
    if (hh === '24') {
      const date = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10) + 1);
      const m2 = String(date.getMonth() + 1).padStart(2, '0');
      const d2 = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${m2}-${d2}T00:${mi}:00+09:00`;
    }
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh}:${mi}:00+09:00`;
  }

  // Format: "YYYY.MM.DD HH:mm" or "YYYY-MM-DD" or "YYYY.MM.DD"
  const normalized = trimmed.replace(/\./g, '-');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    const h = hour || '00';
    const m = minute || '00';
    return `${year}-${month}-${day}T${h}:${m}:00+09:00`;
  }

  // Return empty string for unparseable dates to avoid backend errors
  return '';
}
