/**
 * Dp004Sheet.jsx - DP004 鞋種性別與尺碼定義 V2 MasterDetailSheet
 *
 * 架構說明：
 *   - 使用 createMasterDetailSheet 工廠函數，完全 config-driven。
 *   - 不手寫 axios / 不自行監聽 mdi-global-command / 不使用局部儲存按鈕。
 *   - Detail 使用 SizeMatrixRenderer 顯示尺碼矩陣。
 *   - 當 Master 欄位（sizetype / startsize / endsize / fullhalf / maxsize）變動時，
 *     透過 master.onFieldChange → buildSizeMatrixRows → replaceDetailRows 自動重算 detail。
 *   - DP004 專屬邏輯（sizeRun / SizeMatrixRenderer）皆置於 src/v2_views/dp004/。
 */

import createMasterDetailSheet from '../components/erp/factory/createMasterDetailSheet';
import SizeMatrixRenderer from './dp004/SizeMatrixRenderer';
import {
  buildSizeMatrixRows,
  getSizeColumnBySizeType,
  validateSizeRunInput,
} from './dp004/sizeRun';

// ─────────────────────────────────────────────
// 常數：觸發 detail 重算的 master 欄位集合
// ─────────────────────────────────────────────
const SIZE_TRIGGER_FIELDS = new Set(['sizetype', 'startsize', 'endsize', 'fullhalf', 'maxsize']);

// ─────────────────────────────────────────────
// DP004 Sheet 匯出
// ─────────────────────────────────────────────
export default createMasterDetailSheet({
  sheetId: 'dp004',
  title: '鞋種性別與尺碼定義',
  breadcrumb: ['開發管理', '鞋種性別與尺碼定義'],

  // ────────────────────────────────────────
  // Master config（dp004）
  // ────────────────────────────────────────
  master: {
    apiUrl: 'http://localhost:8001/api/dp004/',
    key: 'gkey',

    columns: [
      {
        key: 'serialno',
        label: '序號',
        width: '60px',
        editable: false,
        type: 'number',
      },
      {
        key: 'gender',
        label: '性別',
        width: '120px',
        editable: true,
        type: 'text',
        maxLength: 20,
        required: true,
      },
      {
        key: 'sizetype',
        label: '碼別',
        width: '90px',
        editable: true,
        type: 'select',
        required: true,
        options: [
          { value: '1', label: 'US' },
          { value: '2', label: 'EU' },
          { value: '3', label: 'UK' },
          { value: '4', label: 'JP' },
          { value: '5', label: 'OT' },
        ],
      },
      {
        key: 'startsize',
        label: '起始尺碼',
        width: '100px',
        editable: true,
        type: 'number',
        precision: 1,
        required: true,
      },
      {
        key: 'fullhalf',
        label: '全/半',
        width: '90px',
        editable: true,
        type: 'select',
        required: true,
        options: [
          { value: '1', label: '-' },
          { value: '2', label: '/' },
          { value: '3', label: '&' },
        ],
      },
      {
        key: 'endsize',
        label: '結束尺碼',
        width: '100px',
        editable: true,
        type: 'number',
        precision: 1,
        required: true,
      },
      {
        key: 'maxsize',
        label: '最高尺碼',
        width: '100px',
        editable: true,
        type: 'number',
        precision: 1,
        required: false,
      },
    ],

    createDefaultRow: (tempGkey) => ({
      gkey: tempGkey,
      serialno: null,
      gender: '',
      sizetype: '1',
      startsize: 0,
      fullhalf: '1',
      endsize: 0,
      maxsize: 0,
    }),

    buildPayload: (row) => ({
      gender: row.gender,
      sizetype: row.sizetype,
      startsize: row.startsize,
      fullhalf: row.fullhalf,
      endsize: row.endsize,
      maxsize: row.maxsize !== null && row.maxsize !== undefined ? row.maxsize : 0,
    }),

    validateRow: (row) => {
      if (!row.gender || String(row.gender).trim() === '') {
        throw new Error('性別（gender）為必填');
      }
      // 使用 sizeRun helper 統一校驗尺碼輸入
      validateSizeRunInput({
        startsize: row.startsize,
        endsize: row.endsize,
        fullhalf: row.fullhalf,
        maxsize: row.maxsize,
      });
    },

    getDisplayText: (row) => {
      const gender = row.gender || '';
      const sizeTypeMap = {
        '1': 'US',
        '2': 'EU',
        '3': 'UK',
        '4': 'JP',
        '5': 'OT',
      };
      const sizeLabel = sizeTypeMap[String(row.sizetype || '')] || row.sizetype || '';
      if (!gender && !sizeLabel) return '';
      if (!gender) return `(${sizeLabel})`;
      if (!sizeLabel) return gender;
      return `${gender} (${sizeLabel})`;
    },

    /**
     * onFieldChange - 當 Master 欄位變動時呼叫（通用擴充點）
     * DP004 核心：sizetype / startsize / endsize / fullhalf / maxsize 變動時，
     * 自動重算 detail rows（尺碼矩陣）。
     */
    onFieldChange: ({ field, nextRow, detailRows, replaceDetailRows }) => {
      // 只對觸發欄位作用
      if (!SIZE_TRIGGER_FIELDS.has(field)) return;

      // 嘗試校驗輸入，若不合法則不重算（不 crash，靜默跳過）
      try {
        validateSizeRunInput({
          startsize: nextRow.startsize,
          endsize: nextRow.endsize,
          fullhalf: nextRow.fullhalf,
          maxsize: nextRow.maxsize,
        });
      } catch {
        // 輸入尚未完整，暫不重算
        return;
      }

      // 展開新尺碼矩陣，保留既有使用者輸入的其他尺碼欄位
      const newRows = buildSizeMatrixRows({
        existingRows: detailRows,
        masterRow: nextRow,
        parentKey: 'dp004gkey',
        tempKeyPrefix: 'temp_dp004a',
      });

      // 以通用方法更新 detail rows，markDirty=true 確保存檔時送出
      replaceDetailRows(newRows, { markDirty: true });
    },
  },

  // ────────────────────────────────────────
  // Detail config（dp004a）
  // ────────────────────────────────────────
  detail: {
    apiUrl: 'http://localhost:8001/api/dp004a/',
    key: 'gkey',
    parentKey: 'dp004gkey',

    columns: [
      {
        key: 'serialno',
        label: '序號',
        width: '60px',
        editable: false,
        type: 'number',
      },
      {
        key: 'tszus',
        label: 'US Size',
        width: '100px',
        editable: true,
        type: 'text',
        maxLength: 10,
      },
      {
        key: 'tszeu',
        label: 'EU Size',
        width: '100px',
        editable: true,
        type: 'text',
        maxLength: 10,
      },
      {
        key: 'tszuk',
        label: 'UK Size',
        width: '100px',
        editable: true,
        type: 'text',
        maxLength: 20,
      },
      {
        key: 'tszjp',
        label: 'JP Size',
        width: '100px',
        editable: true,
        type: 'text',
        maxLength: 10,
      },
      {
        key: 'tszot',
        label: 'OT Size',
        width: '100px',
        editable: true,
        type: 'text',
        maxLength: 10,
      },
    ],

    // DP004 detail rows 由 sizeRun 自動產生，不鼓勵手動新增
    // 但 createDefaultRow 仍需存在以保持 hook 相容性
    createDefaultRow: (tempGkey, parentGkey) => ({
      gkey: tempGkey,
      dp004gkey: parentGkey,
      serialno: null,
      tszus: '',
      tszeu: '',
      tszuk: '',
      tszjp: '',
      tszot: '',
    }),

    buildPayload: (row, tempParentKeyMap = {}) => {
      let parentGkey = row.dp004gkey;
      // 解析 temp parent key（通用 saveAll 機制）
      if (parentGkey && typeof parentGkey === 'string' && parentGkey.startsWith('temp_')) {
        parentGkey = tempParentKeyMap[parentGkey] || parentGkey;
      }
      return {
        dp004gkey: parentGkey,
        serialno: row.serialno,
        tszus: row.tszus || '',
        tszeu: row.tszeu || '',
        tszuk: row.tszuk || '',
        tszjp: row.tszjp || '',
        tszot: row.tszot || '',
      };
    },

    validateRow: (row) => {
      const parentKey = row.dp004gkey;
      const isTemp = typeof parentKey === 'string' && parentKey.startsWith('temp_');
      if (!parentKey && !isTemp) {
        throw new Error('明細缺少主檔關聯（dp004gkey）');
      }
      const sizeFields = ['tszus', 'tszeu', 'tszuk', 'tszjp', 'tszot'];
      const limits = { tszus: 10, tszeu: 10, tszuk: 20, tszjp: 10, tszot: 10 };
      for (const f of sizeFields) {
        const val = row[f];
        if (val && String(val).length > limits[f]) {
          throw new Error(`${f} 長度不可超過 ${limits[f]} 字元`);
        }
      }
    },

    getDisplayText: (row) => `#${row.serialno || '?'}`,

    // 使用 DP004 專屬尺碼矩陣 Renderer
    renderer: SizeMatrixRenderer,

    // 禁用「新增明細」按鈕（detail rows 由 sizeRun 自動產生）
    disableAddAction: true,
  },

  // ────────────────────────────────────────
  // 欄位中文標籤（DRF 錯誤翻譯用）
  // ────────────────────────────────────────
  fieldLabels: {
    gender: '性別',
    sizetype: '碼別',
    startsize: '起始尺碼',
    fullhalf: '全/半',
    endsize: '結束尺碼',
    maxsize: '最高尺碼',
    tszus: 'US Size',
    tszeu: 'EU Size',
    tszuk: 'UK Size',
    tszjp: 'JP Size',
    tszot: 'OT Size',
    dp004gkey: '鞋種性別設定',
  },

  // 後端 cascade delete dp004a when dp004 deleted
  cascadeDeleteDetailOnMasterDelete: true,

  // ────────────────────────────────────────
  // 全域校驗
  // ────────────────────────────────────────
  validateAll: ({ masterRows, detailRows, editedMasters, editedDetails, deletedMasterKeys }) => {
    // 1. 校驗每個已編輯的 master row
    for (const mRow of Object.values(editedMasters)) {
      if (deletedMasterKeys.includes(mRow.gkey)) continue;
      if (!mRow.gender || String(mRow.gender).trim() === '') {
        throw new Error(`性別（gender）為必填，請確認資料`);
      }
      validateSizeRunInput({
        startsize: mRow.startsize,
        endsize: mRow.endsize,
        fullhalf: mRow.fullhalf,
        maxsize: mRow.maxsize,
      });
    }

    // 2. 確認 detail rows 數量不超過 20
    if (detailRows.length > 20) {
      throw new Error(`明細尺碼列數（${detailRows.length} 筆）超過上限 20 筆，請重新設定尺碼範圍`);
    }

    // 3. 校驗每個已編輯的 detail row 的欄位長度
    const limits = { tszus: 10, tszeu: 10, tszuk: 20, tszjp: 10, tszot: 10 };
    for (const dRow of Object.values(editedDetails)) {
      for (const [f, limit] of Object.entries(limits)) {
        const val = dRow[f];
        if (val && String(val).length > limit) {
          throw new Error(`明細欄位 ${f} 長度不可超過 ${limit} 字元（目前 ${String(val).length} 字元）`);
        }
      }
    }
  },

  // ────────────────────────────────────────
  // 自訂儲存策略（原子事務 deep_save）
  // ────────────────────────────────────────
  saveAllOverride: async ({
    masterRows,
    detailRows,
    editedMasters,
    editedDetails,
    deletedMasterKeys,
    deletedDetailKeys,
    selectedMaster,
    axios,
    getFullUrl
  }) => {
    const activeEditedMasters = Object.values(editedMasters).filter(
      m => !deletedMasterKeys.includes(m.gkey)
    );

    const deleteKeysToSend = [...deletedMasterKeys];

    // Case 1: 只有刪除項目
    if (activeEditedMasters.length === 0) {
      if (deleteKeysToSend.length > 0) {
        await axios.post(getFullUrl('dp004/deep_save'), {
          master: null,
          details: [],
          delete_masters: deleteKeysToSend
        });
      }
      return;
    }

    // Case 2: 依序呼叫 deep_save 處理新增或修改的主從項目
    for (let i = 0; i < activeEditedMasters.length; i++) {
      const masterRow = activeEditedMasters[i];
      
      const masterPayload = {
        gkey: masterRow.gkey,
        gender: masterRow.gender,
        sizetype: masterRow.sizetype,
        startsize: masterRow.startsize,
        fullhalf: masterRow.fullhalf,
        endsize: masterRow.endsize,
        maxsize: masterRow.maxsize !== null && masterRow.maxsize !== undefined ? masterRow.maxsize : 0,
      };

      // 找出此主檔的明細列
      const isSelected = selectedMaster && selectedMaster.gkey === masterRow.gkey;
      const mDetails = isSelected
        ? detailRows
        : Object.values(editedDetails).filter(d => d.dp004gkey === masterRow.gkey);

      const detailsPayload = mDetails.map(dRow => ({
        gkey: dRow.gkey,
        dp004gkey: dRow.dp004gkey,
        serialno: dRow.serialno,
        tszus: dRow.tszus || '',
        tszeu: dRow.tszeu || '',
        tszuk: dRow.tszuk || '',
        tszjp: dRow.tszjp || '',
        tszot: dRow.tszot || '',
      }));

      // 只在第一個請求帶上 delete_masters，避免重複處理刪除
      const payload = {
        master: masterPayload,
        details: detailsPayload,
        delete_masters: i === 0 ? deleteKeysToSend : []
      };

      await axios.post(getFullUrl('dp004/deep_save'), payload);
    }
  },
});
