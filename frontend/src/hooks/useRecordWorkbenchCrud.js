import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import useAuth from '../auth/useAuth';
import { canExecuteCommand } from '../auth/permissionUtils';
import useSheetState from './useSheetState';
import { getProgramConfig } from '../config/programRegistry';

/**
 * Helper to resolve absolute API urls.
 */
const getFullUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  let cleanPath = path.trim().replace(/^\/|\/$/g, '');
  if (cleanPath.startsWith('api/')) {
    cleanPath = cleanPath.substring(4);
  }
  return `http://localhost:8001/api/${cleanPath}/`;
};

/**
 * Helper to safely construct RESTful detail endpoints even when the URL contains query parameters.
 */
const getDetailUrl = (url, pk) => {
  const fullUrl = getFullUrl(url);
  if (!pk) return fullUrl;
  const [path, query] = fullUrl.split('?');
  const cleanPath = path.endsWith('/') ? path : `${path}/`;
  const detailPath = `${cleanPath}${pk}/`;
  return query ? `${detailPath}?${query}` : detailPath;
};

/**
 * Formats ISO datetimes in a record's fields to YYYY-MM-DD for <Input type="date" /> support.
 */
const formatRecordDates = (record) => {
  if (!record) return null;
  const formatted = { ...record };
  Object.entries(formatted).forEach(([key, val]) => {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val) && val.length > 10) {
      formatted[key] = val.substring(0, 10);
    }
  });
  return formatted;
};

/**
 * Django REST Framework (DRF) Error details parser.
 */
const parseDrfError = (err, fieldLabels = {}) => {
  if (err && err.response && err.response.data) {
    const data = err.response.data;
    if (typeof data === 'string') {
      const lower = data.toLowerCase();
      if (
        lower.includes('<!doctype html>') ||
        lower.includes('<html') ||
        lower.includes('traceback') ||
        lower.includes('integrityerror')
      ) {
        console.error('Server error page / Traceback details:', data);
        return '伺服器發生錯誤，請檢查後端日誌或聯絡系統管理員。';
      }
      return data;
    }
    if (data.detail && typeof data.detail === 'string') {
      const lower = data.detail.toLowerCase();
      if (
        lower.includes('<!doctype html>') ||
        lower.includes('<html') ||
        lower.includes('traceback') ||
        lower.includes('integrityerror')
      ) {
        console.error('Server error page / Traceback details:', data.detail);
        return '伺服器發生錯誤，請檢查後端日誌或聯絡系統管理員。';
      }
      return data.detail;
    }

    const translateMsgOnly = (msg) => {
      if (typeof msg === 'object' && msg !== null) {
        const innerMsg = msg.message || msg.detail || (msg.toString ? msg.toString() : '');
        if (innerMsg && innerMsg !== '[object Object]') {
          msg = innerMsg;
        } else {
          msg = JSON.stringify(msg);
        }
      }
      const str = String(msg);
      if (str.includes('may not be blank')) return '欄位不可空白';
      if (str.includes('is required')) return '欄位為必填';
      if (str.includes('is not a valid choice') || str.includes('not a valid choice')) return '欄位的選項不正確';
      return str;
    };

    const translateAndFormat = (field, msg) => {
      let cleanMsg = msg;
      if (typeof msg === 'object' && msg !== null) {
        const innerMsg = msg.message || msg.detail || (msg.toString ? msg.toString() : '');
        if (innerMsg && innerMsg !== '[object Object]') {
          cleanMsg = innerMsg;
        } else {
          cleanMsg = JSON.stringify(msg);
        }
      }
      const str = String(cleanMsg);
      if (field === 'non_field_errors' || field === 'detail' || field === 'message' || field === 'error') {
        return str;
      }
      const label = fieldLabels[field] || field;
      if (str.includes('may not be blank')) return `${label}不可空白`;
      if (str.includes('is required')) return `${label}為必填`;
      if (str.includes('is not a valid choice') || str.includes('not a valid choice')) return `${label}的選項不正確`;
      if (str.includes('already exists')) return `${label}已存在，請更換編號`;
      return `${label}: ${str}`;
    };

    if (Array.isArray(data)) {
      return data.map(translateMsgOnly).join(', ');
    }

    if (typeof data === 'object' && data !== null) {
      return Object.entries(data)
        .map(([field, msgs]) => {
          if (Array.isArray(msgs)) {
            return msgs.map(msg => translateAndFormat(field, msg)).join(', ');
          } else {
            return translateAndFormat(field, msgs);
          }
        })
        .join('; ');
    }
  }
  return (err && err.message) || '發生未知錯誤';
};

/**
 * useRecordWorkbenchCrud
 * Generic Hook for managing RecordWorkbench layouts and state.
 */
export default function useRecordWorkbenchCrud({
  sheetId,
  api = {},
  masterKey = 'gkey',
  fieldLabels = {},
  createDefaultMasterRow,
  detailTabsConfig = [], // Array of { key, readOnly, parentKey, apiUrl }
  validateMasterRow,
  validateAll,
  buildDeepSavePayload,
  afterSave,
  form, // AntD form instance passed from UI
  enableSheetState = false,
}) {
  const { user, permissions } = useAuth();
  const [mode, setMode] = useState('list'); // 'list' | 'edit'
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);

  // List queries
  const [queryParams, setQueryParams] = useState({});
  const [listRows, setListRows] = useState([]);
  const [selectedListRow, setSelectedListRow] = useState(null);

  // Master records
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isMasterDirty, setIsMasterDirty] = useState(false);
  
  // 報表列印狀態
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportDefaultAction, setReportDefaultAction] = useState('preview');

  // Detail tabs state map
  const [detailStates, setDetailStates] = useState(() => {
    const states = {};
    detailTabsConfig.forEach((tab) => {
      states[tab.key] = {
        rows: [],
        dirtyRows: {},
        deletedKeys: [],
        loading: false,
        readOnly: !!tab.readOnly,
      };
    });
    return states;
  });

  const detailStatesRef = useRef(detailStates);
  useEffect(() => {
    detailStatesRef.current = detailStates;
  }, [detailStates]);

  const activeRecordRef = useRef(activeRecord);
  useEffect(() => {
    activeRecordRef.current = activeRecord;
  }, [activeRecord]);

  // Check if anything is dirty
  const isDirty = useMemo(() => {
    if (isMasterDirty) return true;
    return Object.values(detailStates).some(
      (t) => Object.keys(t.dirtyRows).length > 0 || t.deletedKeys.length > 0
    );
  }, [isMasterDirty, detailStates]);

  useEffect(() => {
    if (isDirty) {
      setIsError(false);
    }
  }, [isDirty]);

  // Opt-in 狀態機整合
  const sheetStateOps = useSheetState(enableSheetState ? { tabId: sheetId, programId: sheetId } : null);
  const opsRef = useRef(sheetStateOps);
  useEffect(() => {
    opsRef.current = sheetStateOps;
  }, [sheetStateOps]);

  useEffect(() => {
    if (!enableSheetState || !opsRef.current) return;

    let currentState = 'browse';
    const isTemp = activeRecord && String(activeRecord[masterKey]).startsWith('temp_');

    if (isSaving || (loading && mode === 'edit' && isEditing && !isTemp && Object.keys(queryParams).length === 0 /* fallback guess if saving flag not precise */ && isSaving)) {
      currentState = 'saving';
    } else if (isError) {
      currentState = 'error';
    } else if (isTemp || (mode === 'edit' && isEditing && isTemp)) {
      currentState = 'insert';
    } else if (mode === 'edit' && isEditing && !isTemp) {
      currentState = 'edit';
    } else {
      // list mode or edit mode without editing
      currentState = 'browse';
    }

    let selectedCount = 0;
    if (mode === 'list') {
      selectedCount = selectedListRow ? 1 : 0;
    } else if (mode === 'edit') {
      selectedCount = activeRecord ? 1 : 0;
    }

    // 從目前資料列取值
    const currentRecord = mode === 'edit' ? activeRecord : selectedListRow;
    
    const isApproved = currentRecord ? (
      currentRecord.is_approved === true || currentRecord.is_approved === 'Y' ||
      currentRecord.approve === true || currentRecord.approve === 'Y' ||
      currentRecord.capprove === true || currentRecord.capprove === 'Y'
    ) : false;
    
    const isReadOnly = currentRecord ? (currentRecord.readonly === true || currentRecord.readonly === 'Y') : false;
    const isLocked = currentRecord ? (currentRecord.locked === true || currentRecord.locked === 'Y') : false;

    opsRef.current.setState(currentState);
    if (opsRef.current.setFlags) {
      opsRef.current.setFlags({
        dirty: isDirty,
        selectedCount,
        approved: isApproved,
        readonly: isReadOnly,
        locked: isLocked
      });
    } else {
      // fallback
      opsRef.current.markDirty(isDirty);
      opsRef.current.setSelection(selectedCount);
    }
  }, [
    enableSheetState,
    mode,
    isEditing,
    isDirty,
    isSaving,
    isError,
    activeRecord,
    selectedListRow,
    masterKey,
    loading
  ]);

  // Query/Fetch query list
  const fetchList = useCallback(async (params = queryParams) => {
    if (!api.listUrl) return;
    setIsError(false);
    setLoading(true);
    try {
      const res = await axios.get(getFullUrl(api.listUrl), { params });
      setListRows(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedListRow(res.data[0]);
      } else {
        setSelectedListRow(null);
      }
    } catch (e) {
      setIsError(true);
      console.error(e);
      message.error('讀取清單失敗：' + parseDrfError(e, fieldLabels));
    } finally {
      setLoading(false);
    }
  }, [api.listUrl, queryParams, fieldLabels]);

  // Load active record details
  const loadDetails = useCallback(async (mKey) => {
    if (!mKey || String(mKey).startsWith('temp_')) {
      // Clear detail rows for new record
      setDetailStates((prev) => {
        const next = { ...prev };
        detailTabsConfig.forEach((tab) => {
          next[tab.key] = {
            ...next[tab.key],
            rows: [],
            dirtyRows: {},
            deletedKeys: [],
            loading: false,
          };
        });
        return next;
      });
      return;
    }

    const promises = detailTabsConfig.map(async (tab) => {
      if (!tab.apiUrl) return;

      setDetailStates((prev) => ({
        ...prev,
        [tab.key]: {
          ...prev[tab.key],
          rows: [],
          dirtyRows: {},
          deletedKeys: [],
          loading: true,
        },
      }));

      try {
        const url = `${getFullUrl(tab.apiUrl)}?${tab.parentKey || 'dp010gkey'}=${mKey}`;
        const res = await axios.get(url);

        setDetailStates((prev) => ({
          ...prev,
          [tab.key]: {
            ...prev[tab.key],
            rows: res.data || [],
            dirtyRows: {},
            deletedKeys: [],
            loading: false,
          },
        }));
      } catch (e) {
        console.error(e);
        setDetailStates((prev) => ({
          ...prev,
          [tab.key]: { ...prev[tab.key], loading: false },
        }));
        message.error(`載入 [${tab.title || tab.key}] 明細失敗`);
      }
    });

    await Promise.all(promises);
  }, [detailTabsConfig]);

  // Open a record into Edit mode
  const handleOpenRecord = useCallback(async (record) => {
    if (!record) return;

    const doOpen = async () => {
      setIsError(false);
      setLoading(true);
      try {
        const gkeyVal = record[masterKey];
        // Retrieve the full master detail row from database
        const fullMasterRes = await axios.get(getDetailUrl(api.listUrl, gkeyVal));
        const fullRecord = fullMasterRes.data || record;
        const cloned = formatRecordDates(JSON.parse(JSON.stringify(fullRecord)));

        setSelectedRecord(cloned);
        setActiveRecord(cloned);
        setIsEditing(false);
        setIsMasterDirty(false);
        setMode('edit');
        if (form) {
          form.setFieldsValue(cloned);
        }
        await loadDetails(gkeyVal);
      } catch (e) {
        setIsError(true);
        console.warn('Failed to retrieve full master details:', e);
        // Fallback
        const cloned = formatRecordDates(JSON.parse(JSON.stringify(record)));
        setSelectedRecord(cloned);
        setActiveRecord(cloned);
        setIsEditing(false);
        setIsMasterDirty(false);
        setMode('edit');
        if (form) {
          form.setFieldsValue(cloned);
        }
        await loadDetails(record[masterKey]);
      } finally {
        setLoading(false);
      }
    };

    if (isEditing && isDirty) {
      Modal.confirm({
        title: '放棄修改確認',
        content: '目前資料尚未儲存，是否放棄修改並切換資料？',
        okText: '確定',
        cancelText: '取消',
        onOk: () => {
          doOpen();
        },
      });
    } else {
      await doOpen();
    }
  }, [masterKey, api.listUrl, loadDetails, form, isEditing, isDirty]);

  const handleSelectListRow = useCallback((row) => {
    setSelectedListRow(row);
  }, []);

  const createDefaultMaster = useCallback(async () => {
    const tempKey = `temp_${Date.now()}`;
    const newRecord = typeof createDefaultMasterRow === 'function'
      ? createDefaultMasterRow(tempKey)
      : { [masterKey]: tempKey };
    let cloned = JSON.parse(JSON.stringify(newRecord));

    // Try to auto-generate bill number if configured
    const programId = sheetId ? sheetId.split('-')[0] : null; // e.g. dp030-wb -> dp030
    const config = programId ? getProgramConfig(programId) : null;
    const billNoConfig = config?.billNoConfig;

    if (billNoConfig && billNoConfig.enabled && billNoConfig.endpoint) {
      try {
        setLoading(true);
        // We use today's date if no date field is specified, or wait for the user to pick one
        // Usually, default creation might not have the date yet. The API will default to today.
        const res = await axios.post(billNoConfig.endpoint, {
          date: cloned[billNoConfig.dateField] || new Date().toISOString().split('T')[0]
        });
        if (res.data && res.data.success) {
          cloned[billNoConfig.field] = res.data.bill_no;
        } else {
          message.warning('取號失敗：' + (res.data?.detail || '未知錯誤'));
        }
      } catch (err) {
        console.warn('Bill No API failed:', err);
        message.warning('取號失敗，請稍後手動填寫單號');
      } finally {
        setLoading(false);
      }
    }

    if (form) {
      form.resetFields();
      if (billNoConfig && billNoConfig.enabled && cloned[billNoConfig.field]) {
         form.setFieldsValue({ [billNoConfig.field]: cloned[billNoConfig.field] });
      }
    }
    setSelectedRecord(cloned);
    setActiveRecord(cloned);
    setIsEditing(true);
    setIsMasterDirty(true);
    setMode('edit');
    if (form) {
      form.setFieldsValue(cloned);
    }

    // Reset all tabs
    setDetailStates((prev) => {
      const next = { ...prev };
      detailTabsConfig.forEach((tab) => {
        next[tab.key] = {
          ...next[tab.key],
          rows: [],
          dirtyRows: {},
          deletedKeys: [],
          loading: false,
        };
      });
      return next;
    });
  }, [masterKey, createDefaultMasterRow, detailTabsConfig, form]);

  const updateMasterField = useCallback((field, value) => {
    setActiveRecord((prev) => {
      if (!prev) return null;
      const next = { ...prev, [field]: value };
      setIsMasterDirty(true);
      return next;
    });
  }, []);

  // Update Detail Row Field value
  const updateDetailRow = useCallback((tabKey, rowKey, field, value) => {
    setDetailStates((prev) => {
      const tabState = prev[tabKey];
      if (!tabState || tabState.readOnly) return prev;

      const rows = tabState.rows.map((row) => {
        const pk = row.gkey || row.id || row.serialno;
        if (pk === rowKey) {
          const nextRow = { ...row, [field]: value };
          return nextRow;
        }
        return row;
      });

      const targetRow = rows.find((row) => (row.gkey || row.id || row.serialno) === rowKey);
      const dirtyRows = { ...tabState.dirtyRows };
      if (targetRow) {
        dirtyRows[rowKey] = targetRow;
      }

      return {
        ...prev,
        [tabKey]: {
          ...tabState,
          rows,
          dirtyRows,
        },
      };
    });
  }, []);

  // Mark detail dirty manually
  const markDetailDirty = useCallback((tabKey, rowsToDirty) => {
    setDetailStates((prev) => {
      const tabState = prev[tabKey];
      if (!tabState) return prev;
      const dirtyRows = { ...tabState.dirtyRows };
      rowsToDirty.forEach((r) => {
        const pk = r.gkey || r.id || r.serialno;
        dirtyRows[pk] = r;
      });
      return {
        ...prev,
        [tabKey]: { ...tabState, dirtyRows },
      };
    });
  }, []);

  // Add Detail Row
  const addDetailRow = useCallback((tabKey, defaultRow = {}) => {
    setDetailStates((prev) => {
      const tabState = prev[tabKey];
      if (!tabState || tabState.readOnly) return prev;

      const tempKey = `temp_d_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newRow = {
        gkey: tempKey,
        ...defaultRow,
      };

      const rows = [...tabState.rows, newRow];
      const dirtyRows = { ...tabState.dirtyRows, [tempKey]: newRow };

      return {
        ...prev,
        [tabKey]: {
          ...tabState,
          rows,
          dirtyRows,
        },
      };
    });
  }, []);

  // Delete Detail Row
  const deleteDetailRow = useCallback((tabKey, rowKey) => {
    setDetailStates((prev) => {
      const tabState = prev[tabKey];
      if (!tabState || tabState.readOnly) return prev;

      const isTemp = typeof rowKey === 'string' && rowKey.startsWith('temp_');
      const deletedKeys = [...tabState.deletedKeys];
      if (!isTemp && !deletedKeys.includes(rowKey)) {
        deletedKeys.push(rowKey);
      }

      const rows = tabState.rows.filter((row) => (row.gkey || row.id || row.serialno) !== rowKey);
      const dirtyRows = { ...tabState.dirtyRows };
      delete dirtyRows[rowKey];

      return {
        ...prev,
        [tabKey]: {
          ...tabState,
          rows,
          deletedKeys,
          dirtyRows,
        },
      };
    });
  }, []);

  // Replace all rows on a tab
  const replaceDetailRows = useCallback((tabKey, newRows, options = {}) => {
    setDetailStates((prev) => {
      const tabState = prev[tabKey];
      if (!tabState) return prev;

      const dirtyRows = options.markAllDirty
        ? newRows.reduce((acc, row) => {
          const pk = row.gkey || row.id || row.serialno || `temp_${Math.random()}`;
          acc[pk] = row;
          return acc;
        }, {})
        : {};

      return {
        ...prev,
        [tabKey]: {
          ...tabState,
          rows: newRows,
          dirtyRows,
          deletedKeys: [],
        },
      };
    });
  }, []);

  // atomic deep save
  const handleSaveAll = useCallback(async () => {
    if (!isEditing) return;

    let formValues = {};
    if (form) {
      try {
        formValues = await form.validateFields();
      } catch (err) {
        console.warn('Form validation failed:', err);
        return; // Halt if form validations on UI side fail
      }
    }

    const latestMaster = {
      ...activeRecord,
      ...formValues,
    };


    // Validate master
    try {
      if (typeof validateMasterRow === 'function') {
        validateMasterRow(latestMaster);
      }

      if (typeof validateAll === 'function') {
        validateAll(latestMaster, detailStates);
      }
      
      // Auto process validationConfig detailRules
      const programId = sheetId ? sheetId.split('-')[0] : null;
      if (programId) {
        const config = getProgramConfig(programId);
        if (config && config.validationConfig && config.validationConfig.detailRules) {
          config.validationConfig.detailRules.forEach(rule => {
            const detailKey = rule.detailKey;
            const rows = detailStates[detailKey]?.rows || [];
            if (rule.minRows && rows.length < rule.minRows) {
              throw new Error(rule.message || `[${detailKey}] 至少需要 ${rule.minRows} 筆資料`);
            }
          });
        }
      }

    } catch (err) {
      message.error(err.message || '驗證欄位失敗');
      return;
    }

    setIsSaving(true);
    setLoading(true);
    try {
      let payload;
      if (typeof buildDeepSavePayload === 'function') {
        payload = buildDeepSavePayload(latestMaster, detailStates);
      } else {
        // Fallback default format
        payload = {
          master: latestMaster,
        };
        detailTabsConfig.forEach((tab) => {
          payload[tab.key] = detailStates[tab.key].rows;
        });
      }

      const url = getFullUrl(api.deepSaveUrl || api.listUrl);
      const res = await axios.post(url, payload);

      message.success('儲存成功');

      setIsMasterDirty(false);
      setIsEditing(false);

      // Refresh list and reload details
      const savedKey = res.data[masterKey] || res.data.gkey || latestMaster[masterKey];
      await fetchList();

      if (typeof afterSave === 'function') {
        await afterSave(res.data);
      }

      // Reload detail
      if (savedKey) {
        const fullRecordRes = await axios.get(getDetailUrl(api.listUrl, savedKey));
        const cloned = formatRecordDates(JSON.parse(JSON.stringify(fullRecordRes.data)));
        setSelectedRecord(cloned);
        setActiveRecord(cloned);
        if (form) {
          form.setFieldsValue(cloned);
        }
        await loadDetails(savedKey);
      }
    } catch (error) {
      console.log("[DP020 SAVE] url:", getFullUrl(api.deepSaveUrl || api.listUrl));
      console.log("[DP020 SAVE] payload:", typeof buildDeepSavePayload === 'function' ? buildDeepSavePayload(latestMaster, detailStates) : latestMaster);
      console.log("[DP020 SAVE] error:", error);
      console.log("[DP020 SAVE] error.response:", error.response);
      console.log("[DP020 SAVE] error.request:", error.request);
      console.log("[DP020 SAVE] error.message:", error.message);

      let customMsg = "";
      if (error.response) {
        if (error.response.data && typeof error.response.data.detail === 'string') {
          customMsg = error.response.data.detail;
        } else {
          const status = error.response.status;
          if (status === 400) {
            customMsg = "欄位驗證錯誤: " + parseDrfError(error, fieldLabels);
          } else if (status === 500) {
            customMsg = "後端伺服器錯誤，請查看 Django terminal";
          } else {
            customMsg = `伺服器回應錯誤 (Status ${status}): ` + parseDrfError(error, fieldLabels);
          }
        }
      } else if (error.request) {
        const targetUrl = getFullUrl(api.deepSaveUrl || api.listUrl);
        customMsg = `無法連接伺服器 (Network Error)，請確認後端服務是否啟動於 ${targetUrl} 或存在跨網域 (CORS) 限制。`;
      } else {
        customMsg = "發送請求失敗: " + error.message;
      }

      setIsError(true);
      message.error('存檔失敗：' + customMsg);
    } finally {
      setIsSaving(false);
      setLoading(false);
    }
  }, [
    isEditing,
    selectedRecord,
    activeRecord,
    detailStates,
    detailTabsConfig,
    validateMasterRow,
    validateAll,
    buildDeepSavePayload,
    api.deepSaveUrl,
    api.listUrl,
    masterKey,
    fetchList,
    afterSave,
    loadDetails,
    fieldLabels,
    form,
  ]);

  const handleCancel = useCallback(() => {
    setIsMasterDirty(false);
    setIsEditing(false);
    setIsError(false);

    const isTemp = activeRecord && String(activeRecord[masterKey]).startsWith('temp_');
    if (isTemp) {
      setSelectedRecord(null);
      setActiveRecord(null);
      if (form) {
        form.resetFields();
      }
      setMode('list');
    } else if (selectedRecord) {
      const cloned = JSON.parse(JSON.stringify(selectedRecord));
      setActiveRecord(cloned);
      if (form) {
        form.setFieldsValue(cloned);
      }
      loadDetails(selectedRecord[masterKey]);
    } else {
      setMode('list');
    }
  }, [activeRecord, selectedRecord, masterKey, loadDetails, form]);

  // Master deletion
  const handleDeleteMaster = useCallback(() => {
    const recordToDelete = activeRecord || selectedRecord;
    if (!recordToDelete) return;
    const keyVal = recordToDelete[masterKey];
    if (typeof keyVal === 'string' && keyVal.startsWith('temp_')) {
      setMode('list');
      return;
    }

    Modal.confirm({
      title: '刪除確認',
      content: `確定要刪除此筆資料及其關聯明細嗎？`,
      okText: '確定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const url = getDetailUrl(api.deleteUrl || api.listUrl, keyVal);
          await axios.delete(url);
          message.success('刪除成功');
          setMode('list');
          setSelectedRecord(null);
          setActiveRecord(null);
          if (form) {
            form.resetFields();
          }
          setDetailStates((prev) => {
            const next = { ...prev };
            detailTabsConfig.forEach((tab) => {
              next[tab.key] = {
                rows: [],
                dirtyRows: {},
                deletedKeys: [],
                loading: false,
              };
            });
            return next;
          });
          await fetchList();
        } catch (e) {
          console.error(e);
          message.error('刪除失敗：' + parseDrfError(e, fieldLabels));
        } finally {
          setLoading(false);
        }
      },
    });
  }, [activeRecord, selectedRecord, masterKey, api.deleteUrl, api.listUrl, fetchList, fieldLabels, form, detailTabsConfig]);

  const handleApprove = useCallback(async () => {
    if (!activeRecord) return;
    const keyVal = activeRecord[masterKey];
    if (!keyVal || (typeof keyVal === 'string' && keyVal.startsWith('temp_'))) {
      message.warning('請先儲存資料後再進行審核。');
      return;
    }
    const approved = activeRecord.is_approved === true || activeRecord.is_approved === 'Y' || activeRecord.approve === true || activeRecord.approve === 'Y' || activeRecord.capprove === true || activeRecord.capprove === 'Y';
    if (approved) {
      message.warning('此單據已處於審核狀態。');
      return;
    }
    
    setLoading(true);
    try {
      const url = `${api.listUrl}${keyVal}/check/`;
      const res = await axios.post(url);
      if (res.data?.success) {
        message.success('審核成功');
        await fetchList(queryParams);
      } else {
        message.error(res.data?.detail || '審核失敗');
      }
    } catch (e) {
      console.error(e);
      message.error('審核失敗：' + parseDrfError(e, fieldLabels));
    } finally {
      setLoading(false);
    }
  }, [activeRecord, masterKey, api.listUrl, fetchList, queryParams, fieldLabels]);

  const handleUnapprove = useCallback(() => {
    if (!activeRecord) return;
    const keyVal = activeRecord[masterKey];
    if (!keyVal || (typeof keyVal === 'string' && keyVal.startsWith('temp_'))) {
      return;
    }
    const approved = activeRecord.is_approved === true || activeRecord.is_approved === 'Y' || activeRecord.approve === true || activeRecord.approve === 'Y' || activeRecord.capprove === true || activeRecord.capprove === 'Y';
    if (!approved) {
      message.warning('此單據尚未審核，無法反審。');
      return;
    }

    Modal.confirm({
      title: '反審核確認',
      content: '確定要取消審核此單據嗎？',
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        setLoading(true);
        try {
          const url = `${api.listUrl}${keyVal}/uncheck/`;
          const res = await axios.post(url);
          if (res.data?.success) {
            message.success('反審核成功');
            await fetchList(queryParams);
          } else {
            message.error(res.data?.detail || '反審核失敗');
          }
        } catch (e) {
          console.error(e);
          message.error('反審核失敗：' + parseDrfError(e, fieldLabels));
        } finally {
          setLoading(false);
        }
      }
    });
  }, [activeRecord, masterKey, api.listUrl, fetchList, queryParams, fieldLabels]);

  // Listen to Global Toolbar Command
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === sheetId) {
        // Map approve/unapprove to check/recheck for permission checks
        let permAction = action;
        if (action === 'approve') permAction = 'check';
        if (action === 'unapprove') permAction = 'recheck';

        // 二次權限防呆
        if (!canExecuteCommand(permissions, sheetId, permAction, user)) {
          message.error(`您無權在此作業執行 [${action}] 操作！`);
          return;
        }
        
        // 防呆: dirty / saving / no-selection
        const hasSelection = mode === 'edit' ? !!activeRecord : !!selectedListRow;
        if (['approve', 'unapprove', 'edit', 'delete'].includes(action) && !hasSelection) {
          return;
        }
        if (['approve', 'unapprove'].includes(action)) {
          if (isDirty) {
            message.warning('目前資料尚未儲存，無法執行此操作！');
            return;
          }
          if (isSaving || loading) return;
        }

        if (action === 'retrieve') {
          console.debug('[RecordWorkbench] command: retrieve');
          console.debug('[RecordWorkbench] retrieve triggered');
          console.debug('[RecordWorkbench] current mode:', mode);
          console.debug('[RecordWorkbench] queryParams:', queryParams);

          if (mode === 'edit') {
            const doRetrieve = () => {
              setIsEditing(false);
              setIsMasterDirty(false);
              setMode('list');
              fetchList(queryParams);
            };

            if (isEditing && isDirty) {
              Modal.confirm({
                title: '放棄修改確認',
                content: '目前資料尚未儲存，是否放棄修改並重新查詢？',
                okText: '確定',
                cancelText: '取消',
                onOk: () => {
                  doRetrieve();
                },
              });
            } else {
              doRetrieve();
            }
          } else {
            fetchList(queryParams);
          }
        } else if (action === 'insert') {
          if (isEditing && isDirty) {
            Modal.confirm({
              title: '放棄修改確認',
              content: '目前資料尚未儲存，是否放棄修改並新增一筆資料？',
              okText: '確定',
              cancelText: '取消',
              onOk: () => {
                createDefaultMaster();
              },
            });
          } else {
            createDefaultMaster();
          }
        } else if (action === 'edit') {
          const isApproved = activeRecord && (activeRecord.is_approved === 'Y' || activeRecord.is_approved === true || activeRecord.approve === 'Y' || activeRecord.approve === true || activeRecord.capprove === 'Y' || activeRecord.capprove === true);
          if (isApproved) {
            message.warning('此資料已審核，請先反審核後再修改。');
          } else {
            setIsEditing(true);
          }
        } else if (action === 'save') {
          const isApproved = activeRecord && (activeRecord.is_approved === 'Y' || activeRecord.is_approved === true || activeRecord.approve === 'Y' || activeRecord.approve === true || activeRecord.capprove === 'Y' || activeRecord.capprove === true);
          if (isApproved) {
            message.warning('此資料已審核，請先反審核後再修改。');
          } else {
            handleSaveAll();
          }
        } else if (action === 'delete') {
          const isApproved = activeRecord && (activeRecord.is_approved === 'Y' || activeRecord.is_approved === true || activeRecord.approve === 'Y' || activeRecord.approve === true || activeRecord.capprove === 'Y' || activeRecord.capprove === true);
          if (isApproved) {
            message.warning('此資料已審核，請先反審核後再修改。');
          } else {
            handleDeleteMaster();
          }
        } else if (action === 'cancel') {
          handleCancel();
        } else if (action === 'approve') {
          handleApprove();
        } else if (action === 'unapprove') {
          handleUnapprove();
        } else if (action === 'print' || action === 'preview' || action === 'export') {
          const programId = sheetId ? sheetId.split('-')[0] : null;
          const config = programId ? getProgramConfig(programId) : null;
          if (!config || !config.reportConfig || !config.reportConfig.enabled) {
            import('antd').then(antd => antd.message.warning('此作業尚未設定報表列印功能'));
            return;
          }
          setReportDefaultAction(action === 'export' ? 'export' : 'preview');
          setReportModalVisible(true);
        }
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [sheetId, mode, fetchList, createDefaultMaster,
    handleSaveAll, handleDeleteMaster, handleCancel, isEditing, isDirty, queryParams]);

  return {
    mode,
    setMode,
    loading,
    setLoading,
    queryParams,
    setQueryParams,
    listRows,
    selectedListRow,
    handleSelectListRow,
    handleOpenRecord,
    fetchList,

    selectedRecord,
    activeRecord,
    isEditing,
    isDirty,
    setIsEditing,
    updateMasterField,
    createDefaultMaster,

    detailStates,
    loadDetails,
    updateDetailRow,
    
    reportModalVisible,
    setReportModalVisible,
    reportDefaultAction,
    addDetailRow,
    deleteDetailRow,
    replaceDetailRows,
    markDetailDirty,
  };
}

