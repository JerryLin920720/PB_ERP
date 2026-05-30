import React, { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import createMasterDetailSheet from '../components/erp/factory/createMasterDetailSheet';

// 共享的幣別下拉選項，當與後端同步成功後會動態變更內容，引導表格重新渲染
const currencyOptions = [];

const SheetComponent = createMasterDetailSheet({
  sheetId: 'ba061',
  title: '交叉匯率對與歷程設定',
  breadcrumb: ['基本資料管理', '交叉匯率設定'],

  master: {
    apiUrl: 'http://localhost:8001/api/ab230/',
    key: 'gkey',
    columns: [
      {
        key: 'ba060gkey1',
        label: '來源原始幣別',
        width: '220px',
        editable: (record) => record.gkey?.startsWith('temp_'),
        type: 'select',
        options: currencyOptions,
        required: true
      },
      {
        key: 'ba060gkey2',
        label: '目標兌換幣別',
        width: '220px',
        editable: (record) => record.gkey?.startsWith('temp_'),
        type: 'select',
        options: currencyOptions,
        required: true
      },
      {
        key: 'exrate',
        label: '當前匯率',
        width: '140px',
        editable: false,
        type: 'number',
        precision: 8
      }
    ],
    createDefaultRow: (tempGkey) => ({
      gkey: tempGkey,
      ba060gkey1: '',
      ba060gkey2: '',
      exrate: null
    }),
    buildPayload: (row) => {
      if (!row.ba060gkey1 || !row.ba060gkey2) {
        throw new Error('請選擇來源與目標幣別！');
      }
      if (row.ba060gkey1 === row.ba060gkey2) {
        throw new Error('來源幣別與目標幣別不可相同！');
      }
      return {
        ba060gkey1: row.ba060gkey1,
        ba060gkey2: row.ba060gkey2,
        exrate: row.exrate
      };
    },
    getDisplayText: (row) => {
      const c1 = currencyOptions.find(o => o.value === row.ba060gkey1)?.label || '新主檔';
      const c2 = currencyOptions.find(o => o.value === row.ba060gkey2)?.label || '新主檔';
      return `${c1} ➔ ${c2}`;
    },
    onFieldChange: ({ row, field, value, nextRow, selectedMaster, handleMasterFieldChange, detailRows, replaceDetailRows }) => {
      if (field === 'ba060gkey1' || field === 'ba060gkey2') {
        const { ba060gkey1, ba060gkey2 } = nextRow;
        if (ba060gkey1 && ba060gkey2 && ba060gkey1 === ba060gkey2) {
          handleMasterFieldChange(nextRow.gkey, 'exrate', 1.0);
          if (detailRows && detailRows.length > 0) {
            const nextDetailRows = detailRows.map(d => ({ ...d, exrate: 1.0 }));
            replaceDetailRows(nextDetailRows);
          }
        }
      }
    }
  },

  detail: {
    apiUrl: 'http://localhost:8001/api/ab231/',
    key: 'gkey',
    parentKey: 'ab230gkey',
    columns: [
      {
        key: 'exrate',
        label: '兌換匯率值',
        width: '180px',
        editable: true,
        type: 'number',
        precision: 8,
        required: true
      },
      {
        key: 'effectivedate',
        label: '生效時間日期',
        width: '220px',
        editable: true,
        type: 'datetime',
        required: true
      },
      {
        key: 'chk',
        label: '當前財務匯率',
        width: '120px',
        editable: true,
        type: 'switch',
        required: true,
        options: {
          checkedValue: 'Y',
          unCheckedValue: 'N'
        }
      }
    ],
    createDefaultRow: (tempGkey, parentGkey) => ({
      gkey: tempGkey,
      ab230gkey: parentGkey,
      exrate: 1,
      effectivedate: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      chk: 'N'
    }),
    buildPayload: (row) => {
      if (row.exrate === undefined || row.exrate === null || row.exrate === '') {
        throw new Error('兌換匯率值為必填項目！');
      }
      if (isNaN(Number(row.exrate)) || Number(row.exrate) <= 0) {
        throw new Error('兌換匯率值必須是大於 0 的有效數字！');
      }
      if (!row.effectivedate) {
        throw new Error('生效時間日期為必填項目！');
      }
      return {
        ab230gkey: row.ab230gkey,
        exrate: Number(row.exrate),
        effectivedate: dayjs(row.effectivedate).toISOString(),
        chk: row.chk === 'Y' ? 'Y' : 'N'
      };
    },
    getDisplayText: (row) => `匯率: ${row.exrate}`,
    onFieldChange: ({ row, field, value, nextRow, detailRows, replaceDetailRows, selectedMaster, handleMasterFieldChange }) => {
      // Robust rate checking helper
      const isValidRateForSync = (val) => {
        if (val === undefined || val === null || val === '') return false;
        const strVal = String(val).trim();
        if (strVal === '' || strVal === '.' || strVal.endsWith('.')) return false;
        const num = Number(strVal);
        return !isNaN(num) && num > 0;
      };

      // Robust date parsing helper
      const getEffectiveTimestamp = (dateVal) => {
        if (!dateVal) return 0;
        const parsed = dayjs(dateVal);
        if (!parsed.isValid()) return 0;
        const ts = parsed.valueOf();
        return isNaN(ts) ? 0 : ts;
      };

      let nextDetailRows = [...detailRows];
      let activeRate = null;

      if (field === 'chk') {
        if (value === 'Y') {
          // Uncheck all other detail rows
          nextDetailRows = detailRows.map(d => {
            if (d.gkey === nextRow.gkey) {
              return { ...d, chk: 'Y' };
            }
            return { ...d, chk: 'N' };
          });
          if (isValidRateForSync(nextRow.exrate)) {
            activeRate = Number(nextRow.exrate);
          }
        } else {
          // If value is N, we cannot have 0 active rows if other rows exist.
          // Find the row with maximum effective date
          const otherRows = detailRows.filter(d => d.gkey !== nextRow.gkey);
          if (otherRows.length > 0) {
            // Find max date row
            let maxRow = otherRows[0];
            let maxTs = getEffectiveTimestamp(maxRow.effectivedate);
            for (let i = 1; i < otherRows.length; i++) {
              const ts = getEffectiveTimestamp(otherRows[i].effectivedate);
              if (ts > maxTs) {
                maxTs = ts;
                maxRow = otherRows[i];
              }
            }
            nextDetailRows = detailRows.map(d => {
              if (d.gkey === maxRow.gkey) {
                return { ...d, chk: 'Y' };
              }
              return { ...d, chk: 'N' };
            });
            if (isValidRateForSync(maxRow.exrate)) {
              activeRate = Number(maxRow.exrate);
            }
          } else {
            // Only one row, must keep it checked
            nextDetailRows = [{ ...nextRow, chk: 'Y' }];
            if (isValidRateForSync(nextRow.exrate)) {
              activeRate = Number(nextRow.exrate);
            }
          }
        }
      } else if (field === 'effectivedate') {
        // Find row with max effective date
        if (detailRows.length > 0) {
          let maxRow = detailRows[0];
          let maxTs = getEffectiveTimestamp(maxRow.effectivedate);
          for (let i = 1; i < detailRows.length; i++) {
            const ts = getEffectiveTimestamp(detailRows[i].effectivedate);
            if (ts > maxTs) {
              maxTs = ts;
              maxRow = detailRows[i];
            }
          }
          nextDetailRows = detailRows.map(d => {
            if (d.gkey === maxRow.gkey) {
              return { ...d, chk: 'Y' };
            }
            return { ...d, chk: 'N' };
          });
          if (isValidRateForSync(maxRow.exrate)) {
            activeRate = Number(maxRow.exrate);
          }
        }
      } else if (field === 'exrate') {
        if (nextRow.chk === 'Y') {
          if (isValidRateForSync(value)) {
            activeRate = Number(value);
          }
        }
      }

      // Self-correcting: if no row has chk === 'Y', or if there's only 1 row total, enforce active state
      const hasActive = nextDetailRows.some(d => d.chk === 'Y');
      if (!hasActive && nextDetailRows.length > 0) {
        let maxRow = nextDetailRows[0];
        let maxTs = getEffectiveTimestamp(maxRow.effectivedate);
        for (let i = 1; i < nextDetailRows.length; i++) {
          const ts = getEffectiveTimestamp(nextDetailRows[i].effectivedate);
          if (ts > maxTs) {
            maxTs = ts;
            maxRow = nextDetailRows[i];
          }
        }
        nextDetailRows = nextDetailRows.map(d => {
          if (d.gkey === maxRow.gkey) {
            return { ...d, chk: 'Y' };
          }
          return { ...d, chk: 'N' };
        });
        if (isValidRateForSync(maxRow.exrate)) {
          activeRate = Number(maxRow.exrate);
        }
      }

      // Perform detail rows batch update
      replaceDetailRows(nextDetailRows);

      // If activeRate is determined and valid, update master exrate
      if (selectedMaster && activeRate !== null) {
        handleMasterFieldChange(selectedMaster.gkey, 'exrate', activeRate);
      }

      // Add developer debug logging
      if (import.meta.env.DEV) {
        console.log("[BA061 EXCHANGE] changed field:", field);
        console.log("[BA061 EXCHANGE] currency:", `${selectedMaster?.ba060gkey1 || ''} -> ${selectedMaster?.ba060gkey2 || ''}`);
        console.log("[BA061 EXCHANGE] rate:", activeRate ?? nextRow.exrate);
        console.log("[BA061 EXCHANGE] foreign amount:", null);
        console.log("[BA061 EXCHANGE] local amount:", null);
        console.log("[BA061 EXCHANGE] calculated values:", {
          masterExrate: activeRate,
          activeDetailGkey: nextDetailRows.find(d => d.chk === 'Y')?.gkey,
          totalDetailRows: nextDetailRows.length
        });
      }
    }
  },

  fieldLabels: {
    ba060gkey1: '來源原始幣別',
    ba060gkey2: '目標兌換幣別',
    exrate: '匯率',
    effectivedate: '生效時間日期',
    chk: '財務匯率啟用',
    ab230gkey: '交叉匯率對'
  },
  cascadeDeleteDetailOnMasterDelete: true,

  validateAll: ({ masterRows, detailRows, deletedMasterKeys, deletedDetailKeys }) => {
    const containsKey = (collection, key) => {
      if (!collection) return false;
      if (collection instanceof Set) return collection.has(key);
      if (Array.isArray(collection)) return collection.includes(key);
      return false;
    };

    // 1. 檢查主檔
    const activeMasters = masterRows.filter(m => !containsKey(deletedMasterKeys, m.gkey));
    for (const m of activeMasters) {
      if (!m.ba060gkey1 || !m.ba060gkey2) {
        throw new Error('請選擇完整的來源原始幣別與目標兌換幣別！');
      }
      if (m.ba060gkey1 === m.ba060gkey2) {
        throw new Error('來源原始幣別不可與目標兌換幣別相同！');
      }
    }

    // 2. 檢查明細
    const activeDetails = detailRows.filter(d => !containsKey(deletedDetailKeys, d.gkey));
    for (const d of activeDetails) {
      if (d.exrate === undefined || d.exrate === null || d.exrate === '') {
        throw new Error('兌換匯率值為必填項目！');
      }
      if (isNaN(Number(d.exrate)) || Number(d.exrate) <= 0) {
        throw new Error('兌換匯率值必須大於 0！');
      }
      if (!d.effectivedate) {
        throw new Error('生效日期為必填項目！');
      }
    }
  }
});

export default function Ba061Sheet() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:8001/api/ba060/').then(res => {
      const data = res.data || [];
      // 清空並更新共享的幣別對照選項
      currencyOptions.length = 0;
      data.forEach(c => {
        currencyOptions.push({
          value: c.gkey,
          label: `${c.currencyno} - ${c.currency}`
        });
      });
      setLoaded(true);
    }).catch(err => {
      console.error('載入全域幣別失敗:', err);
      setLoaded(true); // 即使失敗也設為 true，保證畫面不崩潰
    });
  }, []);

  return <SheetComponent />;
}
