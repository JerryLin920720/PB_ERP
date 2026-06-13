import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import './Win32DataWindow.css';
import ERPImagePreview from './erp/shared/ERPImagePreview';
import ERPImageUploadField from './erp/shared/ERPImageUploadField';
import ERPLookupField from './erp/lookup/ERPLookupField';
import ReportModal from './erp/report/ReportModal';
import useAuth from '../auth/useAuth';
import { canExecuteCommand } from '../auth/permissionUtils';
import useSheetState from '../hooks/useSheetState';
import useItemChanged from '../hooks/useItemChanged';
import { getProgramConfig } from '../config/programRegistry';

/**
 * Normalize API response content to extract list rows
 */
const normalizeListResponse = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.results)) return responseData.results;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return null;
};

const buildDetailUrl = (baseUrl, gkey) => {
  let baseApiUrl = baseUrl;
  let queryParams = '';
  const qIndex = baseUrl.indexOf('?');
  if (qIndex >= 0) {
    baseApiUrl = baseUrl.substring(0, qIndex);
    queryParams = baseUrl.substring(qIndex);
  }
  const normalizedBase = baseApiUrl.endsWith('/') ? baseApiUrl : `${baseApiUrl}/`;
  return `${normalizedBase}${gkey}/${queryParams}`;
};

/**
 * Helper to construct bulk save URL safely preserving query parameters
 */
const buildBulkSaveUrl = (apiUrl) => {
  let baseApiUrl = apiUrl;
  let queryParams = '';
  const qIndex = apiUrl.indexOf('?');
  if (qIndex >= 0) {
    baseApiUrl = apiUrl.substring(0, qIndex);
    queryParams = apiUrl.substring(qIndex);
  }
  const normalizedBase = baseApiUrl.endsWith('/') ? baseApiUrl : `${baseApiUrl}/`;
  return `${normalizedBase}bulk_save/${queryParams}`;
};

const getDeleteDisplayText = (row, columns = []) => {
  if (!row) return '';

  const preferredFields = [
    'serialno',
    'code',
    'customerno',
    'custno',
    'factoryno',
    'factno',
    'bottomno',
    'lastno',
    'description',
    'name',
    'cname',
    'shortname',
    'fullname',
    'f2type'
  ];

  const parts = [];

  for (const field of preferredFields) {
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
      parts.push(`${field}: ${row[field]}`);
    }
    if (parts.length >= 3) break;
  }

  if (parts.length > 0) {
    return parts.join('，');
  }

  // 若 preferredFields 找不到，再從 columns 中找可顯示欄位
  for (const col of columns) {
    const key = col.key || col.dataIndex;
    const label = col.label || col.title || key;
    if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      parts.push(`${label}: ${row[key]}`);
    }
    if (parts.length >= 3) break;
  }

  if (parts.length > 0) {
    return parts.join('，');
  }

  // gkey 只能當最後 fallback
  return row.gkey ? `資料主鍵：${row.gkey}` : '此筆資料';
};

const formatBackendError = (errorData, columns = []) => {
  // Build field label map
  const labelMap = {};
  columns.forEach(col => {
    const key = col.key || col.dataIndex;
    const label = col.label || col.title || key;
    if (key) {
      labelMap[key] = label;
    }
  });

  // Map English validation messages to Chinese
  const translateMessage = (msg) => {
    if (!msg) return '';
    const cleanMsg = msg.trim().toLowerCase();
    if (cleanMsg.includes('may not be blank') || cleanMsg.includes('this field is required') || cleanMsg.includes('may not be null')) {
      return '此欄位為必填，不可留空。';
    }
    if (cleanMsg.includes('unique') || cleanMsg.includes('already exists') || cleanMsg.includes('must make a unique set')) {
      return '此欄位值已存在，不可重複。';
    }
    if (cleanMsg.includes('not a valid choice')) {
      return '無效的選項值。';
    }
    if (cleanMsg.includes('ensure this field has no more than') || cleanMsg.includes('ensure this value has at most')) {
      const match = msg.match(/\d+/);
      return `字元長度超出限制${match ? `（最多 ${match[0]} 個字元）` : ''}。`;
    }
    if (cleanMsg.includes('max_length') || cleanMsg.includes('too long') || cleanMsg.includes('exceeds')) {
      return '長度超出限制。';
    }
    return msg;
  };

  if (!errorData) return '未知錯誤';

  let errorObj = null;

  if (typeof errorData === 'object') {
    errorObj = errorData;
  } else if (typeof errorData === 'string') {
    try {
      const dictPattern = /['"]([^'"]+)['"]:\s*\[(?:ErrorDetail\(string=['"]([^'"]+)['"],\s*code=['"][^'"]+['"]\)|['"]([^'"]+)['"])[^\]]*\]/g;
      let match;
      const parsed = {};
      while ((match = dictPattern.exec(errorData)) !== null) {
        const field = match[1];
        const msg = match[2] || match[3];
        if (field && msg) {
          if (!parsed[field]) parsed[field] = [];
          parsed[field].push(msg);
        }
      }

      if (Object.keys(parsed).length === 0) {
        const simplePattern = /['"]([^'"]+)['"]:\s*\[\s*['"]([^'"]+)['"]\s*\]/g;
        while ((match = simplePattern.exec(errorData)) !== null) {
          const field = match[1];
          const msg = match[2];
          if (field && msg) {
            parsed[field] = [msg];
          }
        }
      }

      if (Object.keys(parsed).length > 0) {
        errorObj = parsed;
      } else {
        const singleDetailPattern = /ErrorDetail\(string=['"]([^'"]+)['"].*?\)/g;
        const messages = [];
        while ((match = singleDetailPattern.exec(errorData)) !== null) {
          messages.push(translateMessage(match[1]));
        }
        if (messages.length > 0) {
          return messages.join('；');
        }
        return errorData;
      }
    } catch (e) {
      return errorData;
    }
  }

  if (errorObj) {
    if (errorObj.detail && typeof errorObj.detail === 'string') {
      if (errorObj.detail.startsWith('{') && errorObj.detail.endsWith('}')) {
        return formatBackendError(errorObj.detail, columns);
      }
      return translateMessage(errorObj.detail);
    }

    const messages = [];
    for (const [field, val] of Object.entries(errorObj)) {
      if (field === 'success' || field === 'non_field_errors') continue;
      
      const label = labelMap[field] || field;
      let msgText = '';
      if (Array.isArray(val)) {
        msgText = val.map(item => {
          if (typeof item === 'object' && item !== null) {
            return translateMessage(item.string || JSON.stringify(item));
          }
          return translateMessage(String(item));
        }).join('；');
      } else if (typeof val === 'string') {
        msgText = translateMessage(val);
      } else {
        msgText = JSON.stringify(val);
      }
      messages.push(`【${label}】: ${msgText}`);
    }

    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  return String(errorData);
};

const getOptionLabel = (col, value) => {
  if (value === undefined || value === null) return '';
  const option = col.options?.find(opt => String(opt.value) === String(value));
  return option ? option.label : value;
};

/**
 * Win32DataWindow: 100% 物理與功能性復刻 PB DataWindow (全域頂部工具列專用版)
 * 
 * 改良特點：
 * 1. 移除內部冗餘工具列，完全由全域 Top Navbar 控制。
 * 2. 選中列之所有可編輯欄位「全自動顯化輸入格」，點擊即打字，解決雙格輸入困惑。
 * 3. 使用函數式狀態更新，杜絕全域閉包異步副作用。
 */
export default function Win32DataWindow({
  columns,
  apiUrl,
  title,
  sheetId,
  permissionKey,
  onRowSelect,
  onBeforeInsert,
  defaultValues,
  debugSelectedMaster,
  sequenceField,
  autoRenumber,
  sequenceScopeField,
  sequenceScopeValue,
  onDirtyStateChange,
  onFetchSuccess,
  enableSheetState
}) {
  const { user, permissions } = useAuth();
  
  // Phase 9A-3: 前端欄位權限 metadata 整合 (向下相容)
  const fieldPermissions = user?.field_permissions?.[permissionKey] || {};
  const activeColumns = columns.filter(col => {
    const perm = fieldPermissions[col.key || col.dataIndex];
    if (perm === 'hide') return false; // hide: 不顯示該欄位
    return true;
  }).map(col => {
    const perm = fieldPermissions[col.key || col.dataIndex];
    if (perm === 'readonly') {
      return { ...col, editable: false }; // readonly: 顯示但不可編輯
    }
    return col;
  });

  const [rows, setRows] = useState([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [editingRowIndex, setEditingRowIndex] = useState(-1); // 🔒 專屬編輯列索引，預設 -1 (唯讀模式)
  
  // 📝 髒資料追蹤 (Dirty States Tracker)
  const [dirtyMap, setDirtyMap] = useState({});   
  const [deleteSet, setDeleteSet] = useState(new Set()); 
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('就緒');

  // Report Modal states
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportDefaultAction, setReportDefaultAction] = useState('preview');


  // Sheet State Integration for Pilot

  // ItemChanged 邏輯
  const isDetail = sheetId && sheetId.includes('-');
  const scope = isDetail ? 'detail' : 'master';
  const detailKey = isDetail ? sheetId.split('-')[1] : null;
  const { getRules, applyRules, isApplyingRef } = useItemChanged(sheetId);
  const itemChangedRules = getRules(scope, detailKey);
  const sheetStateHook = useSheetState({
    tabId: enableSheetState ? sheetId : null,
    programId: enableSheetState ? sheetId : null,
    initialState: 'browse'
  });

  const updateSheetState = (newState) => {
    if (enableSheetState) sheetStateHook.setState(newState);
  };
  const updateSheetDirty = (isDirty) => {
    if (enableSheetState) {
      if (isDirty) sheetStateHook.markDirty(true);
      else sheetStateHook.markClean();
    }
  };
  const updateSheetSelection = (count, record) => {
    if (enableSheetState) {
      sheetStateHook.setSelection(count);
      sheetStateHook.updateSelectedRecord(record);
    }
  };

  // Trigger row selection callback backward-compatibly
  const onRowSelectRef = useRef(onRowSelect);
  useEffect(() => {
    onRowSelectRef.current = onRowSelect;
  }, [onRowSelect]);

  useEffect(() => {
    if (onRowSelectRef.current) {
      onRowSelectRef.current(rows[selectedRowIndex] || null);
    }
    updateSheetSelection(selectedRowIndex >= 0 ? 1 : 0, selectedRowIndex >= 0 ? rows[selectedRowIndex] : null);
  }, [selectedRowIndex, rows]);

  const isDirty = Object.keys(dirtyMap).length > 0 || deleteSet.size > 0;
  useEffect(() => {
    if (onDirtyStateChange) {
      onDirtyStateChange(isDirty);
    }
  }, [isDirty, onDirtyStateChange]);

  // 📥 檢索 (Retrieve)
  const fetchRows = async () => {
    setLoading(true);
    updateSheetState('browse'); // Default to browse during loading
    setStatusMsg('正在讀取資料庫...');
    try {
      const response = await axios.get(apiUrl);
      
      // Debug logs for response shape diagnostic
      console.log('[Win32DataWindow] fetchRows Response Debug:', {
        apiUrl,
        status: response.status,
        data: response.data,
        isArrayDirectly: Array.isArray(response.data)
      });

      const normalized = normalizeListResponse(response.data);
      if (!normalized) {
        throw new Error('讀取資料格式不正確，請檢查 API 回傳格式。');
      }

      console.log(`[Win32DataWindow] fetchRows resolved rows count: ${normalized.length}`);

      // 依照 sequenceField 排序 (預設為 serialno)
      const seqCol = sequenceField || 'serialno';
      const sortedData = normalized.sort((a, b) => Number(a[seqCol] || 0) - Number(b[seqCol] || 0));
      
      setRows(sortedData);
      setDirtyMap({});
      setDeleteSet(new Set());
      setSelectedRowIndex(sortedData.length > 0 ? 0 : -1);
      setEditingRowIndex(-1); // 重置為查詢模式
      setStatusMsg(`讀取完成。共 ${sortedData.length} 筆資料。`);
      updateSheetDirty(false);
      updateSheetState('browse');
      if (onFetchSuccess) {
        onFetchSuccess(sortedData);
      }
    } catch (err) {
      console.error('[Win32DataWindow] fetchRows Error:', err);
      setStatusMsg(`錯誤: ${err.response?.data?.detail || err.message}`);
      updateSheetState('error');
    } finally {
      setLoading(false);
    }
  };

  // ➕ 新增 (Insert Row)
  const renumberRows = (targetRows) => {
    if (!autoRenumber || !sequenceField) return targetRows;

    if (!sequenceScopeField || sequenceScopeValue === undefined || sequenceScopeValue === null) {
      return targetRows.map((row, index) => ({
        ...row,
        [sequenceField]: index + 1,
      }));
    }

    let scopedIndex = 1;
    return targetRows.map(row => {
      if (String(row[sequenceScopeField] || '') !== String(sequenceScopeValue)) {
        return row;
      }
      return {
        ...row,
        [sequenceField]: scopedIndex++,
      };
    });
  };

  // ➕ 新增 (Insert Row)
  const handleInsert = () => {
    if (onBeforeInsert) {
      const proceed = onBeforeInsert();
      if (!proceed) return;
    }

    const tempGkey = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Resolve default values
    const resolvedDefaultValues =
      typeof defaultValues === 'function'
        ? defaultValues()
        : (defaultValues || {});

    // Create empty row with all editable columns defaulting to ''
    const emptyRow = {
      gkey: tempGkey
    };
    activeColumns.forEach(col => {
      if (col.editable) {
        emptyRow[col.key] = '';
      }
    });

    const newRow = {
      ...emptyRow,
      ...resolvedDefaultValues,
      gkey: tempGkey, // Ensure gkey is always tempGkey
      _isNew: true
    };

    if (sequenceField) {
      const currentScopeVal = sequenceScopeValue !== undefined ? sequenceScopeValue : newRow[sequenceScopeField];
      const scopedRows = sequenceScopeField && currentScopeVal !== undefined
        ? rows.filter(row => String(row[sequenceScopeField] || '') === String(currentScopeVal))
        : rows;

      const maxSerial = scopedRows.reduce((max, row) => {
        const value = Number(row[sequenceField]);
        return Number.isFinite(value) ? Math.max(max, value) : max;
      }, 0);

      newRow[sequenceField] = maxSerial + 1;
    } else {
      newRow.serialno = '(自動)';
    }

    console.log('[MR015 DETAIL INSERT] selectedMaster:', debugSelectedMaster || null);
    console.log('[MR015 DETAIL INSERT] newRow:', newRow);

    setRows(prev => {
      const next = [...prev, newRow];
      setSelectedRowIndex(next.length - 1);
      setEditingRowIndex(next.length - 1); // 自動針對新增列解鎖編輯鎖定
      return next;
    });
    
    setDirtyMap(prev => ({
      ...prev,
      [tempGkey]: { ...newRow }
    }));

    updateSheetState('insert');
    updateSheetDirty(true);
    setStatusMsg('已插入新行。請直接點選格內鍵入資料。');
  };

  // ❌ 刪除 (Delete Row)
  const handleDelete = () => {
    if (selectedRowIndex < 0 || selectedRowIndex >= rows.length) {
      message.warning('請先選擇要刪除的資料。');
      return;
    }
    
    const selectedRow = rows[selectedRowIndex];
    if (!selectedRow) {
      message.warning('請先選擇要刪除的資料。');
      return;
    }

    const gkey = selectedRow.gkey;
    if (!gkey) {
      message.error('此筆資料缺少 gkey，無法刪除。');
      return;
    }

    // 若選到的是 temp_ 開頭的新資料，直接從前端 rows 移除，不需要打 API。
    if (typeof gkey === 'string' && gkey.startsWith('temp_')) {
      const remaining = rows.filter(row => row.gkey !== gkey);
      const renumbered = renumberRows(remaining);
      
      let nextDirty = { ...dirtyMap };
      delete nextDirty[gkey];
      
      const finalRows = renumbered.map(row => {
        const originalRow = remaining.find(r => r.gkey === row.gkey);
        if (originalRow && sequenceField && originalRow[sequenceField] !== row[sequenceField]) {
          const updatedRow = { ...row };
          nextDirty[row.gkey] = updatedRow;
          return updatedRow;
        }
        return row;
      });
      
      setRows(finalRows);
      setDirtyMap(nextDirty);
      setSelectedRowIndex(prev => (prev === 0 ? 0 : prev - 1));
      setStatusMsg('已移除未儲存的新資料列。');
      if (Object.keys(nextDirty).length === 0) {
        updateSheetDirty(false);
        updateSheetState('browse');
      }
      return;
    }

    // 若選到的是資料庫既有資料：
    Modal.confirm({
      title: '確定要刪除此筆資料嗎？',
      content: `識別資料: ${getDeleteDisplayText(selectedRow, activeColumns)}`,
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          setStatusMsg('正在從伺服器刪除資料...');
          const deleteUrl = buildDetailUrl(apiUrl, gkey);
          await axios.delete(deleteUrl);
          
          setDirtyMap(prev => {
            const next = { ...prev };
            delete next[gkey];
            return next;
          });

          // 重新排序並儲存剩餘的資料列 (如果 autoRenumber 開啟且有 sequenceField)
          let upsertList = [];
          if (autoRenumber && sequenceField) {
            const remainingRows = rows.filter(row => row.gkey !== gkey);
            const renumbered = renumberRows(remainingRows);
            
            renumbered.forEach(row => {
              const originalRow = remainingRows.find(r => r.gkey === row.gkey);
              const snChanged = originalRow && originalRow[sequenceField] !== row[sequenceField];
              
              if (snChanged) {
                // 💡 最小 Payload 化：僅傳送 gkey 與變更後的排序序號，不要發送其他髒資料或無關欄位以防 validation 失敗
                upsertList.push({
                  gkey: row.gkey,
                  [sequenceField]: row[sequenceField]
                });
              }
            });
          }
          
          if (upsertList.length > 0) {
            const bulkApiUrl = buildBulkSaveUrl(apiUrl);
            await axios.post(bulkApiUrl, {
              upsert: upsertList,
              delete: []
            });
          }
          
          message.success('刪除成功');
          await fetchRows();
        } catch (err) {
          const errorMsg = formatBackendError(err.response?.data || err.message, activeColumns);
          message.error(`刪除失敗:\n${errorMsg}`);
          setStatusMsg(`刪除失敗: ${errorMsg}`);
        } finally {
          setLoading(false);
        }
      }
    });
  };


  // 💾 儲存 (Save)
  const handleSave = async () => {
    console.log('[Win32DataWindow] handleSave called');
    setLoading(true);
    const prevState = sheetStateHook.state;
    updateSheetState('saving');
    setStatusMsg('正在寫入批次交易 (Bulk Saving)...');
    
    // 從實時 Ref 讀取狀態，徹底杜絕 Stale Closure 閉包過期問題
    const currentDirtyMap = opsRef.current.dirtyMap || {};
    const currentDeleteSet = opsRef.current.deleteSet || new Set();

    // Print save before log as requested by user
    console.log('[MR015 DETAIL SAVE BEFORE]', {
      sheetId,
      rows,
      dirtyMap: currentDirtyMap,
      selectedMaster: opsRef.current.selectedMaster || null,
    });

    // Merge actual row data as base and overwrite with dirtyMap modifications,
    // filtering out any completely empty new rows.
    const upsertList = rows
      .filter(row => row._isNew || currentDirtyMap[row.gkey])
      .filter(row => {
        if (row._isNew) {
          const actualFields = activeColumns.filter(col => !col.hidden && col.key !== 'serialno' && col.key !== 'gkey');
          const isBlank = actualFields.every(col => {
            const val = currentDirtyMap[row.gkey]?.[col.key] !== undefined
              ? currentDirtyMap[row.gkey][col.key]
              : row[col.key];
            return !val || String(val).trim() === '';
          });
          if (isBlank) {
            console.log('[Win32DataWindow] Filtering out blank new row:', row.gkey);
            return false;
          }
        }
        return true;
      })
      .map(row => {
        return {
          ...row,
          ...(currentDirtyMap[row.gkey] || {})
        };
      });

        // 🔒 欄位驗證 (Required & Range validation)
    // 優先順序: 1. columns 欄位設定, 2. programRegistry.validationConfig
    const programId = sheetId ? sheetId.split('-')[0] : null;
    const registryConfig = programId ? getProgramConfig(programId)?.validationConfig : null;
    
    // 將 validationConfig 轉化為字典加速尋找
    const reqMap = {};
    const numMap = {};
    const strMap = {};
    if (registryConfig) {
      (registryConfig.requiredFields || []).forEach(r => reqMap[r.field] = r);
      (registryConfig.numericRules || []).forEach(r => numMap[r.field] = r);
      (registryConfig.stringRules || []).forEach(r => strMap[r.field] = r);
    }

    for (let rowIndex = 0; rowIndex < upsertList.length; rowIndex++) {
      const row = upsertList[rowIndex];
      for (const col of activeColumns) {
        const val = row[col.key];
        const isRequired = col.required || (reqMap[col.key] !== undefined);
        const minVal = col.min !== undefined ? col.min : numMap[col.key]?.min;
        const maxVal = col.max !== undefined ? col.max : numMap[col.key]?.max;
        const maxLen = col.maxLength !== undefined ? col.maxLength : strMap[col.key]?.maxLength;
        const label = col.label || reqMap[col.key]?.label || col.key;
        
        // 必填檢查 (包含 lookup)
        if (isRequired) {
          if (val === undefined || val === null || String(val).trim() === '') {
            message.error(`【${title}】第 ${rowIndex + 1} 列，欄位「${label}」不可為空白！`);
            setLoading(false);
            setStatusMsg('驗證失敗');
            return;
          }
        }
        
        // 數值範圍與字串長度檢查
        if (val !== undefined && val !== null && val !== '') {
          // 若是字串長度檢查
          if (maxLen !== undefined) {
             if (String(val).length > maxLen) {
                message.error(`【${title}】第 ${rowIndex + 1} 列，欄位「${label}」長度不可超過 ${maxLen}！`);
                setLoading(false);
                updateSheetState(prevState === 'insert' ? 'insert' : 'edit');
                setStatusMsg('驗證失敗');
                return;
             }
          }

          if (minVal !== undefined || maxVal !== undefined || col.type === 'number') {
            const numVal = Number(val);
            if (isNaN(numVal)) {
              message.error(`【${title}】第 ${rowIndex + 1} 列，欄位「${label}」必須為有效數字！`);
              setLoading(false);
              setStatusMsg('驗證失敗');
              return;
            }
            if (minVal !== undefined && numVal < minVal) {
              message.error(`【${title}】第 ${rowIndex + 1} 列，欄位「${label}」值不能小於 ${minVal}！`);
              setLoading(false);
              setStatusMsg('驗證失敗');
              return;
            }
            if (maxVal !== undefined && numVal > maxVal) {
              message.error(`【${title}】第 ${rowIndex + 1} 列，欄位「${label}」值不能大於 ${maxVal}！`);
              setLoading(false);
              updateSheetState(prevState === 'insert' ? 'insert' : 'edit');
              setStatusMsg('驗證失敗');
              return;
            }
          }
        }
      }
    }

    let deleteList = Array.from(currentDeleteSet);

    const bulkApiUrl = buildBulkSaveUrl(apiUrl);
    const payload = {
      upsert: upsertList,
      delete: deleteList
    };

    console.log(`[SAVE PAYLOAD DEBUG] sheetId: ${sheetId}, url: ${bulkApiUrl}`);
    console.log('[SAVE PAYLOAD DEBUG] payload:', JSON.stringify(payload, null, 2));
    console.log('[MR015 DETAIL SAVE PAYLOAD]', JSON.stringify(payload, null, 2));
    console.log('[Win32DataWindow] saving to:', bulkApiUrl);
    console.log('[Win32DataWindow] payload:', payload);
    console.log('[Win32DataWindow] upsertList.length:', upsertList.length);
    console.log('[Win32DataWindow] deleteList.length:', deleteList.length);

    if (upsertList.length === 0 && deleteList.length === 0) {
      setStatusMsg('無任何資料異動，無須存檔。');
      setLoading(false);
      updateSheetState('browse');
      updateSheetDirty(false);
      return;
    }

    try {
      const res = await axios.post(bulkApiUrl, payload);
      
      console.log('[Win32DataWindow] save success. status:', res.status, 'data:', res.data);
      if (res.data.success) {
        setStatusMsg('存檔成功！正在重載最新資料...');
        setEditingRowIndex(-1); // 存檔成功後回歸唯讀檢視
        updateSheetState('browse');
        updateSheetDirty(false);
        await fetchRows();
      } else {
        throw new Error(res.data.detail || '存檔失敗');
      }
    } catch (err) {
      console.log('[Win32DataWindow] save failed. status:', err.response?.status, 'data:', err.response?.data, 'message:', err.message);
      const errorMsg = formatBackendError(err.response?.data || err.message, activeColumns);
      message.error(`存檔失敗:\n${errorMsg}`);
      setStatusMsg(`存檔失敗: ${errorMsg}`);
      updateSheetState(prevState === 'insert' ? 'insert' : 'edit');
      setLoading(false);
    }
  };

  // 🔄 放棄變更 (Cancel)
  const handleCancel = () => {
    // 過濾掉未存檔的新增列 (temp_ 開頭)
    const remainingRows = rows.filter(row => !(typeof row.gkey === 'string' && row.gkey.startsWith('temp_')));
    // 還原髒資料追蹤
    setDirtyMap({});
    setDeleteSet(new Set());
    setRows(remainingRows);
    setEditingRowIndex(-1);
    updateSheetState('browse');
    updateSheetDirty(false);
    setStatusMsg('已放棄變更並還原資料。');
    message.info('已放棄未存檔的變更');
  };

  // ⚙️ 即時儲存格變更 (Immediate Inline Value Committer)
  const handleCellChange = (rIndex, colKey, newVal, fullRecord = null) => {
    setRows(prevRows => {
      if (rIndex < 0 || rIndex >= prevRows.length) return prevRows;
      const nextRows = [...prevRows];
      const targetRow = nextRows[rIndex];
      let updatedRow = { ...targetRow, [colKey]: newVal };
      
      // 處理 Lookup returnFields 多欄回填
      if (fullRecord) {
        const colDef = activeColumns.find(c => c.key === colKey);
        if (colDef && colDef.returnFields) {
          for (const [targetField, sourceField] of Object.entries(colDef.returnFields)) {
            if (fullRecord[sourceField] !== undefined) {
              updatedRow[targetField] = fullRecord[sourceField];
            }
          }
        }
      }

      nextRows[rIndex] = updatedRow;
      
      // Update dirtyMap with the fully updated row in a single pass
      setDirtyMap(prevDirty => ({
        ...prevDirty,
        [targetRow.gkey]: updatedRow
      }));
      
      updateSheetDirty(true);
      if (sheetStateHook.state !== 'insert') {
        updateSheetState('edit');
      }

      // Print cell change log for debugging as requested by the user
      console.log('[MR015 DETAIL CELL CHANGE]', {
        sheetId,
        rowKey: targetRow.gkey,
        columnKey: colKey,
        value: newVal,
        beforeRow: targetRow,
        afterRow: updatedRow,
      });

      return nextRows;
    });
  };

  // 透過 Ref 封裝實時的方法與狀態，避免事件監聽器發生過期閉包
  const opsRef = useRef({});
  useEffect(() => {
    opsRef.current = {
      handleSave,
      handleDelete,
      handleInsert,
      fetchRows,
      handleCancel,
      selectedRowIndex,
      dirtyMap,
      deleteSet,
      selectedMaster: debugSelectedMaster
    };
  });

  // ⚡ 全域 MDI 廣播指令接收器 (精準綁定實時 Ref)
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      
      if (targetSheet === sheetId) {
        console.log(`⚡ [${sheetId}] Intercepted command: ${action}`);
        
        // 🔒 權限二次檢查 (Win32DataWindow Global Command Guard)
        const checkKey = permissionKey || sheetId;
        if (!canExecuteCommand(permissions, checkKey, action, user)) {
          message.error(`您無權在此作業執行 [${action}] 操作！`);
          return;
        }
        
        const ops = opsRef.current;
        if (action === 'retrieve') ops.fetchRows();
        else if (action === 'edit') setEditingRowIndex(ops.selectedRowIndex); // 解開目前選取列編輯鎖
        else if (action === 'insert') ops.handleInsert();
        else if (action === 'delete') ops.handleDelete();
        else if (action === 'save') {
          console.log('[Win32DataWindow] save command received');
          ops.handleSave();
        }
        else if (action === 'cancel') ops.handleCancel();
        else if (action === 'print') {
          setReportDefaultAction('preview');
          setReportModalVisible(true);
        }
      }
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => {
      window.removeEventListener('mdi-global-command', handleGlobalCommand);
    };
  }, [sheetId, permissionKey, permissions, user]);

  useEffect(() => {
    fetchRows();
  }, [apiUrl]);

  return (
    <div className="dw-container">
      
      {/* 🌟 Main Viewport */}
      <div className="dw-viewport">
        <table className="dw-table">
          <thead>
            <tr>
              <th className="dw-th" style={{ width: '30px', textAlign: 'center' }}></th>
              {activeColumns.filter(col => !col.hidden).map(col => (
                <th key={col.key} className="dw-th" style={{ width: col.width || 'auto' }}>
                  {col.required && <span style={{ color: '#ff4d4f', marginRight: '4px' }}>*</span>}
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIndex) => {
              const isSelected = rIndex === selectedRowIndex;
              const isDeleted = deleteSet.has(row.gkey);
              const isRowDirty = !!dirtyMap[row.gkey];

              return (
                <tr 
                  key={row.gkey} 
                  className={`dw-row ${isSelected ? 'selected' : ''} ${isDeleted ? 'deleted' : ''} ${rIndex === editingRowIndex ? 'in-editing' : ''}`}
                  onClick={() => setSelectedRowIndex(rIndex)}
                  onDoubleClick={() => {
                    const approved = row.is_approved === 'Y' || row.is_approved === true || row.approve === 'Y' || row.approve === true || row.capprove === 'Y' || row.capprove === true;
                    if (approved) return; // 已審核禁止雙擊進入編輯模式
                    setEditingRowIndex(rIndex);
                  }}
                >
                  {/* 狀態指示符：當前列標為黑箭頭，有髒資料標為 * */}
                  <td className="dw-indicator-col">
                    {isSelected ? '▶' : (isRowDirty ? '*' : '')}
                  </td>

                  {activeColumns.filter(col => !col.hidden).map(col => {
                    // 核心唯讀控制邏輯：僅在點擊編輯或雙擊解鎖時，才顯化輸入格，其餘欄位純文字渲染防誤改
                    const showInput = rIndex === editingRowIndex && col.editable && !isDeleted;

                    return (
                      <td 
                        key={col.key} 
                        className={`dw-td ${showInput ? 'dw-td-editing' : ''}`}
                        style={{ textAlign: col.type === 'number' ? 'right' : 'left' }}
                      >
                        {showInput ? (
                          col.type === 'select' ? (
                            <select
                              className="dw-cell-select-modern"
                              value={row[col.key] === undefined || row[col.key] === null ? '' : row[col.key]}
                              onChange={(e) => handleCellChange(rIndex, col.key, e.target.value)}
                            >
                              <option value="">-- 請選擇 --</option>
                              {(col.options || []).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : col.type === 'image' ? (
                            <ERPImageUploadField
                              value={row[col.key] === undefined || row[col.key] === null ? '' : row[col.key]}
                              onChange={(newVal) => handleCellChange(rIndex, col.key, newVal)}
                            />
                          ) : col.type === 'lookup' ? (
                            <ERPLookupField
                              type={col.lookupType}
                              lookupConfig={col.lookupConfig}
                              contextValues={row}
                              value={row[col.key] === undefined || row[col.key] === null ? '' : row[col.key]}
                              onChange={(val, record) => handleCellChange(rIndex, col.key, val, record)}
                              disabled={false}
                              style={{ border: 'none', height: '24px' }}
                            />
                          ) : (
                            <input
                              className="dw-cell-input-modern"
                              value={row[col.key] === undefined || row[col.key] === null ? '' : row[col.key]}
                              onChange={(e) => handleCellChange(rIndex, col.key, e.target.value)}
                              maxLength={col.maxLength}
                            />
                          )
                        ) : (
                          <span style={{ opacity: isDeleted ? 0.4 : 1 }}>
                            {col.type === 'image' ? (
                              <ERPImagePreview src={row[col.key]} />
                            ) : col.displayKey && row[col.displayKey] !== undefined && row[col.displayKey] !== null
                              ? String(row[col.displayKey])
                              : (col.options 
                                  ? getOptionLabel(col, row[col.key]) 
                                  : (row[col.key] === undefined || row[col.key] === null ? '' : String(row[col.key])))}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={activeColumns.filter(col => !col.hidden).length + 1} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  目前尚無資料。請點擊頂部工具列「查詢」載入，或點擊「增行」開始新增。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🌟 Statusbar */}
      <div className="dw-statusbar">
        <span>💡 提示：按最上方【編輯】或【雙擊】該列進行修改；其餘均為查詢唯讀模式</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontWeight: 600 }}>狀態: {statusMsg}</span>
        {Object.keys(dirtyMap).length > 0 && (
          <span style={{ color: '#ef4444', marginLeft: '15px', fontWeight: 'bold' }}>
            * 有 {Object.keys(dirtyMap).length} 筆未儲存變更
          </span>
        )}
      </div>
      <ReportModal 
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        reportConfig={sheetId ? getProgramConfig(sheetId.split('-')[0])?.reportConfig : null}
        activeRecord={rows[selectedRowIndex]}
        queryParams={{}}
        isDirty={Object.keys(dirtyMap).length > 0 || deleteSet.size > 0}
        defaultAction={reportDefaultAction}
      />
    </div>
  );
}
