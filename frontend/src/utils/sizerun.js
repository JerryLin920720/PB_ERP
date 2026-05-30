/**
 * sizerun.js
 * SizeRun 展開工具函式 — 移植自 PB w_dp010.wf_getsizerun
 *
 * fullhalf:
 *   '1' = 全號 (whole)  → step +1.0
 *   '2' = 半號 (half)   → step +0.5
 *   '3' = 連號 (pair)   → step +1.0, then pair consecutive into "x&y"
 *
 * Returns: string[] of size labels, e.g. ['5.0','5.5','6.0','6.5','7.0']
 * Max 20 sizes (PB: ii_size_maxarray = 20)
 */

const SIZE_MAX_ARRAY = 20;

/**
 * Round to 1 decimal place to avoid float precision issues.
 */
function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Format a size number as string with 1 decimal, e.g. 6 → '6.0', 6.5 → '6.5'.
 */
function formatSize(n) {
  const r = round1(n);
  return r % 1 === 0 ? r.toFixed(1) : String(r);
}

/**
 * Expand a single segment from start → end (inclusive) with given step increment.
 * @param {number} start
 * @param {number} end
 * @param {number} step  0.5 for half, 1.0 for whole/pair
 * @returns {number[]}
 */
function expandSegment(start, end, step) {
  const result = [];
  let current = round1(start);
  const target = round1(end);
  while (current <= target + 1e-9) {
    result.push(round1(current));
    if (Math.abs(current - target) < 1e-9) break;
    current = round1(current + step);
  }
  return result;
}

/**
 * normalizeFullhalf
 * Map string labels like "全號(-)", "半號(/)", "連號(&)" or integers to '1'|'2'|'3'.
 */
export function normalizeFullhalf(value) {
  if (value === '1' || value === 1) return '1';
  if (value === '2' || value === 2) return '2';
  if (value === '3' || value === 3) return '3';

  const text = String(value || '').trim();
  if (text.includes('全') || text.includes('-')) return '1';
  if (text.includes('半') || text.includes('/')) return '2';
  if (text.includes('連') || text.includes('&')) return '3';

  return '';
}

/**
 * calculateSizeRun
 * Main function. Mirror of PB wf_getsizerun.
 *
 * @param {string|number} startsize  起始碼
 * @param {string}        fullhalf   '1'|'2'|'3' or human-readable label
 * @param {string|number} endsize    終止碼
 * @param {string|number} maxsize    防呆碼（僅 start > end 時有效）
 * @returns {string[]}  size string array, max 20 elements. Returns [] on invalid input.
 */
export function calculateSizeRun(startsize, fullhalf, endsize, maxsize) {
  const start = parseFloat(startsize);
  const end = parseFloat(endsize);
  const max = parseFloat(maxsize);
  const normFullhalf = normalizeFullhalf(fullhalf);

  if (isNaN(start) || isNaN(end) || !['1', '2', '3'].includes(normFullhalf)) {
    return [];
  }

  const step = normFullhalf === '2' ? 0.5 : 1.0;

  let rawSizes = [];

  if (start <= end || isNaN(max) || max === 0) {
    // Simple single-segment: start → end
    rawSizes = expandSegment(start, end, step);
  } else {
    // Two-segment wrap: start → max, then 1 (or start fractional offset) → end
    const seg1 = expandSegment(start, max, step);
    // Second segment starts at 1 + (fractional part of start) for whole/pair, or 1 for half
    const fracPart = normFullhalf === '1'
      ? round1(1 + (start - Math.floor(start)))
      : 1;
    const seg2 = expandSegment(fracPart, end, step);
    rawSizes = [...seg1, ...seg2];
  }

  // For '3' (pair mode): group consecutive pairs as "x.x&y.y"
  if (normFullhalf === '3') {
    const paired = [];
    for (let i = 0; i < rawSizes.length; i += 2) {
      if (i + 1 < rawSizes.length) {
        paired.push(`${formatSize(rawSizes[i])}&${formatSize(rawSizes[i + 1])}`);
      } else {
        paired.push(formatSize(rawSizes[i]));
      }
    }
    return paired.slice(0, SIZE_MAX_ARRAY);
  }

  // Limit to max 20 and format
  return rawSizes.slice(0, SIZE_MAX_ARRAY).map(formatSize);
}

/**
 * getSizeColumnsFromRecord
 * Convenience wrapper: extract size columns from an activeRecord object.
 * Returns [] if any required field is missing.
 */
export function getSizeColumnsFromRecord(record) {
  if (!record) return [];
  const { startsize, fullhalf, endsize, maxsize } = record;
  if (startsize == null || fullhalf == null || endsize == null) return [];
  return calculateSizeRun(startsize, fullhalf, endsize, maxsize);
}
