/**
 * dp010Pivot.js
 * DP010 Pivot Matrix 雙向轉換工具
 *
 * Backend storage:
 *   dp011 = measurement parts (rows)
 *   dp012 = size cvalues (cells): dp011gkey × size → cvalue
 *
 * Frontend display (pivot rows):
 *   Each pivotRow = { gkey (dp011 gkey), parts, steps, unit, remark, chk, [size]: cvalue, ... }
 *
 * Functions:
 *   buildPivotRows(dp011Rows, dp012Rows) → pivotRows[]
 *   flattenPivotRows(pivotRows, sizeColumns) → { measurements: dp011Rows[], values: dp012Rows[] }
 */

/**
 * buildPivotRows
 * Merge dp011 (parts) + dp012 (cvalue per size) into pivot row format.
 *
 * @param {Object[]} dp011Rows  — from GET /api/dp011/?dp010gkey=xxx
 * @param {Object[]} dp012Rows  — from GET /api/dp012/?dp010gkey=xxx
 * @returns {Object[]}  pivot rows suitable for rendering
 */
export function buildPivotRows(dp011Rows, dp012Rows) {
  if (!Array.isArray(dp011Rows) || dp011Rows.length === 0) return [];

  // Build lookup: dp011gkey → { [size]: cvalue }
  const sizeValueMap = {};
  (dp012Rows || []).forEach((d12) => {
    const parentKey = d12.dp011gkey;
    if (!sizeValueMap[parentKey]) sizeValueMap[parentKey] = {};
    sizeValueMap[parentKey][d12.size] = d12.cvalue;
  });

  return dp011Rows.map((d11) => {
    const sizeValues = sizeValueMap[d11.gkey] || {};
    return {
      // 1. Spreading initial size values from database
      ...sizeValues,
      // 2. Spreading all fields of d11 (which contains edited fields and sizes)
      ...d11,
      chk: d11.chk !== undefined ? d11.chk : 'Y',
    };
  });
}

/**
 * isFullyEmptyRow
 * Check if a pivot row is completely blank (default values only, no real input).
 */
export function isFullyEmptyRow(row, sizeColumns) {
  const partsEmpty = !row.parts || !row.parts.trim();
  const stepsEmpty = row.steps === undefined || row.steps === null || String(row.steps).trim() === '';
  const remarkEmpty = !row.remark || !row.remark.trim();
  const unitDefaultOrEmpty = !row.unit || row.unit === 'mm';

  let sizesEmpty = true;
  if (Array.isArray(sizeColumns)) {
    for (const sz of sizeColumns) {
      const val = row[sz];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        sizesEmpty = false;
        break;
      }
    }
  }

  return partsEmpty && stepsEmpty && remarkEmpty && unitDefaultOrEmpty && sizesEmpty;
}

/**
 * flattenPivotRows
 * Convert pivot rows (with size columns) back to dp011 array + dp012 array for deep_save.
 * Skip completely empty rows.
 *
 * @param {Object[]} pivotRows   — edited pivot rows (each row has parts, steps, + [size] keys)
 * @param {string[]} sizeColumns — ordered list of size labels, e.g. ['5.0','5.5','6.0']
 * @returns {{ measurements: Object[], values: Object[] }}
 */
export function flattenPivotRows(pivotRows, sizeColumns) {
  const measurements = [];
  const values = [];
  let validRowIndex = 0;

  (pivotRows || []).forEach((row) => {
    if (isFullyEmptyRow(row, sizeColumns)) {
      return;
    }

    const dp011gkey = row.gkey;
    validRowIndex++;

    measurements.push({
      gkey: dp011gkey,
      serialno: validRowIndex,
      parts: row.parts || '',
      steps: row.steps != null ? row.steps : null,
      unit: row.unit || '',
      remark: row.remark || '',
      chk: row.chk || 'Y',
    });

    // For each size column, create a dp012 entry (even if value is null/0)
    sizeColumns.forEach((sz, colIndex) => {
      const cvalue = row[sz];
      if (cvalue !== undefined && cvalue !== null && cvalue !== '') {
        values.push({
          dp011gkey: dp011gkey,
          size: sz,
          cvalue: parseFloat(cvalue) || 0,
          serialno: (validRowIndex - 1) * sizeColumns.length + colIndex + 1,
        });
      }
    });
  });

  return { measurements, values };
}

/**
 * createDefaultPivotRow
 * Create a blank pivot row for "增加量法" button.
 * Fills size columns with null so cells appear blank.
 */
export function createDefaultPivotRow(tempKey, sizeColumns) {
  const row = {
    gkey: tempKey,
    parts: '',
    steps: null,
    unit: 'mm',
    remark: '',
    chk: 'Y',
  };
  sizeColumns.forEach((sz) => {
    row[sz] = null;
  });
  return row;
}
