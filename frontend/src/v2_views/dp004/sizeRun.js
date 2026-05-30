/**
 * sizeRun.js - DP004 尺碼展開 Domain Helper
 *
 * 本模組為純函數庫（純 JavaScript，無 React/UI 依賴），
 * 負責 DP004 尺碼主檔的尺碼展開邏輯。
 *
 * 包含：
 *   - formatSize         : 數值格式化（一位小數）
 *   - generateSizeRun    : 依 startsize/endsize/fullhalf/maxsize 產生尺碼列表
 *   - getSizeColumnBySizeType : sizetype 代碼對應 detail 欄位名稱
 *   - buildSizeMatrixRows    : 從 masterRow 與既有 detail rows 建立完整矩陣列
 *   - validateSizeRunInput   : 尺碼輸入校驗（不合法時拋出 Error）
 *
 * 設計原則：
 *   - 所有函數為純函數（pure functions），不修改傳入物件。
 *   - 不依賴 React state / antd / axios。
 *   - 可在 Sheet 的 onFieldChange callback 或測試中直接呼叫。
 *
 * 此檔案屬於 DP004 專屬邏輯，放置於 src/v2_views/dp004/。
 */

// ─────────────────────────────────────────────
// 1. formatSize(value)
// ─────────────────────────────────────────────
/**
 * 將數值格式化為一位小數字串。
 * - null / undefined / '' → ''
 * - 10   → '10.0'
 * - 10.5 → '10.5'
 *
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatSize(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toFixed(1);
}

// ─────────────────────────────────────────────
// 2. generateSizeRun({ startsize, endsize, fullhalf, maxsize, limit })
// ─────────────────────────────────────────────
/**
 * 依主檔參數展開尺碼列表（數值陣列）。
 *
 * fullhalf 規則：
 *   '1' → 全號，step = 1
 *   '2' → 半號，step = 0.5
 *   '3' → 兩碼一組 (兩碼 one group)，step = 1，顯示格式 N & N+0.5，
 *          但本函數只負責產生「起始值」，格式化由呼叫端決定。
 *
 * maxsize 分段規則：
 *   若 maxsize > 0（且有效），將展開分成兩段：
 *     第一段：startsize → maxsize（step 同 fullhalf）
 *     第二段：1          → endsize（step 同 fullhalf）
 *   否則（maxsize === 0 / null / undefined / ''）：
 *     一段：startsize → endsize
 *
 * 最大產生筆數受 limit（預設 20）限制，超過時截斷並 console.warn。
 *
 * @param {Object} params
 * @param {number|string} params.startsize - 起始尺碼
 * @param {number|string} params.endsize   - 結束尺碼
 * @param {string}        params.fullhalf  - '1'全號 / '2'半號 / '3'兩碼一組
 * @param {number|string} [params.maxsize] - 分段點，0 或空白表示不分段
 * @param {number}        [params.limit=20]- 最大行數限制
 * @returns {number[]} 尺碼數值陣列
 */
export function generateSizeRun({ startsize, endsize, fullhalf, maxsize, limit = 20 }) {
  const start = Number(startsize);
  const end   = Number(endsize);
  const fh    = String(fullhalf || '1');
  const max   = maxsize !== undefined && maxsize !== null && maxsize !== '' ? Number(maxsize) : 0;

  const isCombo = fh === '3';          // 兩碼一組
  const step    = fh === '2' ? 0.5 : 1; // 全號 or 兩碼一組 step=1；半號 step=0.5

  // 防護：不合法的數值直接回傳空陣列
  if (isNaN(start) || isNaN(end)) return [];
  if (start === 0 && end === 0) return [];

  /**
   * 從 from 展開到 to，每格加 step（combo 模式加 1.0），
   * 回傳數值陣列（combo 時回傳每組起始值）。
   * 上限由外層 limit 控制。
   */
  const generate = (from, to, buf) => {
    let cur = from;
    const limitNum = to + 0.001; // 浮點容差
    while (cur <= limitNum) {
      if (buf.length >= limit) break;
      buf.push(Math.round(cur * 10) / 10);
      cur = Math.round((cur + (isCombo ? 1.0 : step)) * 10) / 10;
    }
  };

  const rawBuf = [];
  if (max > 0 && !isNaN(max)) {
    // 兩段展開
    generate(start, max, rawBuf);
    if (rawBuf.length < limit) {
      // 第二段起始：fullhalf='1' 時加上 start 的小數部分（與舊版一致）
      const decPart = fh === '1' ? (start - Math.floor(start)) : 0;
      const seg2Start = Math.round((1.0 + decPart) * 10) / 10;
      generate(seg2Start, end, rawBuf);
    }
  } else {
    generate(start, end, rawBuf);
  }

  if (rawBuf.length > limit) {
    console.warn(
      `[sizeRun] generateSizeRun: 展開結果 ${rawBuf.length} 筆超出 limit=${limit}，已截斷。`
    );
  }

  const sizes = rawBuf.slice(0, limit);

  // combo 模式：將數值轉為 "N.0&N.5" 字串格式（與舊版及後端資料一致）
  if (isCombo) {
    return sizes.map(v => `${formatSize(v)}&${formatSize(Math.round((v + 0.5) * 10) / 10)}`);
  }

  return sizes; // 全號/半號回傳數值陣列
}

// ─────────────────────────────────────────────
// 3. getSizeColumnBySizeType(sizetype)
// ─────────────────────────────────────────────
/**
 * 將 sizetype 代碼對應至 dp004a detail row 的尺碼欄位名稱。
 *
 * 對應表：
 *   '1' → 'tszus'  (US 美碼)
 *   '2' → 'tszeu'  (EU 歐碼)
 *   '3' → 'tszuk'  (UK 英碼)
 *   '4' → 'tszjp'  (JP 日碼)
 *   '5' → 'tszot'  (其他碼)
 *
 * @param {string|number} sizetype
 * @returns {string|null} 欄位名稱，無對應時回傳 null
 */
export function getSizeColumnBySizeType(sizetype) {
  const map = {
    '1': 'tszus',
    '2': 'tszeu',
    '3': 'tszuk',
    '4': 'tszjp',
    '5': 'tszot',
  };
  return map[String(sizetype)] || null;
}

// ─────────────────────────────────────────────
// 4. buildSizeMatrixRows({ existingRows, masterRow, parentKey, tempKeyPrefix })
// ─────────────────────────────────────────────
/**
 * 根據 masterRow 的尺碼參數，建立完整的 detail rows 矩陣。
 *
 * 邏輯：
 *   1. 呼叫 generateSizeRun 展開尺碼列表。
 *   2. 對展開出的每個尺碼，找出 existingRows 中是否已有對應值：
 *      - 對應欄位 = getSizeColumnBySizeType(masterRow.sizetype)
 *      - 若找到，保留 row 的所有欄位，只更新該尺碼欄位值（不覆蓋其他 tsz* 欄位）。
 *      - 若找不到，建立新 row（temp key 格式 `${tempKeyPrefix}_${i}`）。
 *   3. 新產生的 row 只填入：
 *      - gkey       = temp key
 *      - [parentKey] = masterRow 主鍵
 *      - [sizeCol]  = 對應尺碼值（數值）
 *      - serialno   = 序號（i + 1）
 *
 * 注意：
 *   - existingRows 中超出展開範圍的 rows 會被丟棄。
 *   - 保留 existingRows 的其他欄位（如其他 tsz* 欄位），避免覆蓋使用者輸入。
 *   - 若 sizetype 無對應欄位，直接回傳空陣列。
 *
 * @param {Object}   params
 * @param {Array}    params.existingRows   - 目前的 detail rows（可為空陣列）
 * @param {Object}   params.masterRow      - 主檔資料（含 sizetype, startsize, endsize, fullhalf, maxsize, gkey 等）
 * @param {string}   params.parentKey      - detail 關聯主檔的外鍵欄位名，例如 'dp004gkey'
 * @param {string}   [params.tempKeyPrefix='temp'] - 新 row 的 temp key 前綴
 * @returns {Array} 新的 detail rows 陣列（已合併既有資料）
 */
export function buildSizeMatrixRows({ existingRows, masterRow, parentKey, tempKeyPrefix = 'temp' }) {
  const { sizetype, startsize, endsize, fullhalf, maxsize } = masterRow || {};
  const masterGkey = masterRow?.gkey;

  const sizeCol = getSizeColumnBySizeType(sizetype);
  if (!sizeCol) {
    console.warn(`[sizeRun] buildSizeMatrixRows: 無法識別 sizetype='${sizetype}'，回傳空陣列。`);
    return [];
  }

  const sizes = generateSizeRun({ startsize, endsize, fullhalf, maxsize });
  if (sizes.length === 0) return [];

  // 只保留屬於當前主檔 (parentKey) 的明細資料，過濾掉其它主檔或空的資料
  const scopedRows = (existingRows || []).filter(row => {
    return parentKey && masterGkey && String(row[parentKey]) === String(masterGkey);
  });

  const existingArr = scopedRows;

  return sizes.map((sizeVal, i) => {
    // 嘗試在 existingRows 中找出對應尺碼的 row（依 sizeCol 欄位值比對）
    // sizeVal 可能是數值（fullhalf 1/2）或字串（fullhalf 3，如 "10.0&10.5"）
    const matched = existingArr.find(r => {
      const existing = r[sizeCol];
      if (typeof sizeVal === 'string') {
        // combo 格式：字串比對
        return String(existing) === sizeVal;
      }
      // 全號/半號：數值比對
      return Number(existing) === sizeVal;
    });

    if (matched) {
      // 保留既有 row，確保 sizeCol 欄位值正確，並更新序號
      return {
        ...matched,
        [sizeCol]: sizeVal,
        [parentKey]: matched[parentKey] || masterGkey,
        serialno: i + 1,
      };
    }

    // 新建 row
    const tempKey = `${tempKeyPrefix}_${Date.now()}_${i}`;
    return {
      gkey: tempKey,
      [parentKey]: masterGkey,
      tszus: null,
      tszeu: null,
      tszuk: null,
      tszjp: null,
      tszot: null,
      // 使用 sizeCol 覆蓋上方預設 null（同名屬性後者覆蓋前者）
      [sizeCol]: sizeVal,
      serialno: i + 1,
    };
  });
}

// ─────────────────────────────────────────────
// 5. validateSizeRunInput({ startsize, endsize, fullhalf, maxsize })
// ─────────────────────────────────────────────
/**
 * 校驗尺碼展開的輸入參數。
 * 若參數不合法，拋出 Error（message 為繁體中文）。
 * 若合法，不回傳值（return undefined）。
 *
 * 校驗規則：
 *   1. startsize 必填且必須為正數。
 *   2. endsize 必填且必須為正數。
 *   3. fullhalf 必須為 '1' / '2' / '3' 之一。
 *   4. startsize 必須 <= endsize。
 *   5. 若 maxsize 有值，必須在 startsize 到 endsize 之間（含）。
 *
 * @param {Object} params
 * @param {number|string} params.startsize
 * @param {number|string} params.endsize
 * @param {string}        params.fullhalf
 * @param {number|string} [params.maxsize]
 * @throws {Error}
 */
export function validateSizeRunInput({ startsize, endsize, fullhalf, maxsize }) {
  const start = Number(startsize);
  const end   = Number(endsize);
  const fh    = String(fullhalf || '');
  const max   = maxsize !== undefined && maxsize !== null && maxsize !== '' ? Number(maxsize) : null;

  if (!startsize && startsize !== 0) throw new Error('起始尺碼 (startsize) 為必填');
  if (isNaN(start) || start <= 0)    throw new Error('起始尺碼 (startsize) 必須為正數');

  if (!endsize && endsize !== 0)  throw new Error('結束尺碼 (endsize) 為必填');
  if (isNaN(end) || end <= 0)    throw new Error('結束尺碼 (endsize) 必須為正數');

  if (!['1', '2', '3'].includes(fh)) throw new Error('全半號設定 (fullhalf) 必須為 1（全號）、2（半號）或 3（兩碼一組）');

  if (start > end) throw new Error(`起始尺碼 (${start}) 不可大於結束尺碼 (${end})`);

  if (max !== null) {
    if (isNaN(max) || max < 0) throw new Error('分段點 (maxsize) 必須為非負數');
    if (max > 0 && (max < start || max > end)) {
      throw new Error(`分段點 (maxsize=${max}) 必須介於起始尺碼 (${start}) 到結束尺碼 (${end}) 之間`);
    }
  }
}
