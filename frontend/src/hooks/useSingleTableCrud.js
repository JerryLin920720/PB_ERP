import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';

/**
 * Django REST Framework (DRF) 錯誤細節解析器
 * 將後端傳回的 JSON 錯誤格式化為適合使用者閱讀的中文訊息
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
      const label = fieldLabels[field] || field;
      
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
      if (str.includes('may not be blank')) {
        return `${label}不可空白`;
      }
      if (str.includes('is required')) {
        return `${label}為必填`;
      }
      if (str.includes('is not a valid choice') || str.includes('not a valid choice')) {
        return `${label}的選項不正確`;
      }
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
  return err.message || '未知錯誤';
};

/**
 * useSingleTableCrud - Pattern A3 (SingleTable GridForm) 專用共用 CRUD Hook
 * 
 * @param {Object} config
 * @param {string} config.sheetId - 當前視窗 ID，例如 'ba005'
 * @param {string} config.apiUrl - 資料庫 API Endpoint 連接網址
 * @param {string} [config.rowKey='gkey'] - 資料主鍵欄位，預設 'gkey'
 * @param {Object} [config.fieldLabels={}] - 欄位英文與中文對照，用於 DRF 錯誤解析
 * @param {Function} [config.createDefaultRow] - 新增時的預設列產生器
 * @param {Function} [config.buildPayload] - 儲存前整理 Payload 的函數
 * @param {Function} [config.validateRow] - 儲存前的驗證函數
 * @param {Function} [config.onValuesChange] - Form 值變更時的聯動防呆處理
 * @param {Function} [config.afterSave] - 儲存成功後的回呼函數
 * @param {FormInstance} config.form - Ant Design Form 實例，用於資料載入與同步
 */
export default function useSingleTableCrud({
  sheetId,
  apiUrl,
  rowKey = 'gkey',
  fieldLabels = {},
  createDefaultRow,
  buildPayload,
  validateRow,
  afterSave,
  prepareFormValues,
  sequenceField,
  autoRenumber = false,
  deleteConfirmTitle,
  deleteConfirmMessage,
  form
}) {
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 用於在非同步操作中獲取最新選中行
  const selectedRowRef = useRef(selectedRow);
  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);

  // 1. 取得 API 完整 URL
  const getFullUrl = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = 'http://localhost:8001/api';
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${base}${cleanUrl}`;
  };

  // 1.5 建立並使用唯一的通用 URL helper
  const buildRecordUrl = (baseUrl, key) => {
    const fullBase = getFullUrl(baseUrl);
    const normalized = fullBase.endsWith('/') ? fullBase : `${fullBase}/`;
    return `${normalized}${encodeURIComponent(key)}/`;
  };

  // 2. 檢索資料列表 (Retrieve)
  const fetchData = async (preferSelectKey) => {
    setLoading(true);
    try {
      const res = await axios.get(getFullUrl(apiUrl));
      let data = res.data || [];
      
      if (sequenceField && autoRenumber) {
        data = data.sort((a, b) => Number(a[sequenceField] || 0) - Number(b[sequenceField] || 0));
      }

      setRows(data);
      setIsEditing(false);

      if (data.length > 0) {
        // 若已有選中項，嘗試重新尋找或定位至第一筆
        const prevKey = preferSelectKey || selectedRowRef.current?.[rowKey];
        const found = prevKey ? data.find(r => r[rowKey] === prevKey) : null;
        handleSelectRow(found || data[0]);
      } else {
        handleSelectRow(null);
      }
    } catch (err) {
      console.error(err);
      message.error('載入資料失敗：' + parseDrfError(err, fieldLabels));
    } finally {
      setLoading(false);
    }
  };

  // 3. 點選/選取行聯動 Form
  const handleSelectRow = (record) => {
    setSelectedRow(record);
    if (record) {
      const formValues = prepareFormValues ? prepareFormValues(record) : record;
      form?.setFieldsValue(formValues);
    } else {
      form?.resetFields();
    }
  };

  // 4. 新增資料 (Insert)
  const handleAdd = () => {
    const defaultData = createDefaultRow ? createDefaultRow(rows) : {};
    const newRecord = {
      [rowKey]: 'temp_' + Date.now(),
      ...defaultData
    };

    if (sequenceField && autoRenumber) {
      const maxVal = rows.reduce((max, r) => {
        const val = Number(r[sequenceField]) || 0;
        return val > max ? val : max;
      }, 0);
      newRecord[sequenceField] = maxVal + 1;
    }

    setRows(prev => [...prev, newRecord]);
    setSelectedRow(newRecord);
    setIsEditing(true);

    form?.resetFields();
    form?.setFieldsValue(newRecord);
  };

  // 輔助函數：對剩餘資料列進行序號重排並同步至後端
  const renumberRows = async (remainingRows) => {
    const updatedRows = remainingRows.map((row, idx) => {
      const targetSeq = idx + 1;
      if (Number(row[sequenceField]) !== targetSeq) {
        return { ...row, [sequenceField]: targetSeq };
      }
      return null;
    });

    const putRequests = [];
    for (let i = 0; i < updatedRows.length; i++) {
      const row = updatedRows[i];
      if (row) {
        const rowKeyVal = row[rowKey];
        if (rowKeyVal && !(typeof rowKeyVal === 'string' && rowKeyVal.startsWith('temp_'))) {
          let payload = { ...row };
          if (buildPayload) {
            payload = buildPayload(payload);
          }
          // 使用唯一的通用 URL helper buildRecordUrl
          putRequests.push(axios.put(buildRecordUrl(apiUrl, rowKeyVal), payload));
        }
      }
    }

    if (putRequests.length > 0) {
      await Promise.all(putRequests);
    }
  };

  // 5. 刪除資料 (Delete)
  const handleDelete = async () => {
    const activeRecordRef = { current: null };
    const activeRecord = null;
    const selectedRecordRef = selectedRowRef;
    const selectedRecord = selectedRow;

    const record =
      selectedRecordRef.current ||
      activeRecordRef.current ||
      selectedRecord ||
      activeRecord;

    const config = {};
    const keyField = config.key || rowKey || 'gkey';
    const keyVal = record?.[keyField];

    if (!keyVal) {
      console.warn('[GridForm Delete] Missing keyVal. record:', record, 'keyField:', keyField);
      message.error('找不到要刪除的資料主鍵');
      return;
    }

    const deleteUrl = buildRecordUrl(apiUrl, keyVal);

    Modal.confirm({
      title: deleteConfirmTitle || '確認刪除',
      content: deleteConfirmMessage || '確定要刪除此筆資料嗎？刪除後將無法復原。',
      okText: '確認',
      cancelText: '取消',
      async onOk() {
        await performDelete(record);
      }
    });

    // 實際進行刪除與重排/重整流程
    const performDelete = async (targetRecord) => {
      console.debug('[GridForm Delete] onOk triggered');
      console.debug('[GridForm Delete] record:', targetRecord);
      console.debug('[GridForm Delete] keyField:', keyField);
      console.debug('[GridForm Delete] keyVal:', keyVal);
      console.debug('[GridForm Delete] DELETE URL:', deleteUrl);

      setLoading(true);
      try {
        // 計算下一筆合理的資料
        const deleteIdx = rows.findIndex(r => r[keyField] === keyVal);
        let nextRow = null;
        if (deleteIdx !== -1 && rows.length > 1) {
          if (deleteIdx < rows.length - 1) {
            nextRow = rows[deleteIdx + 1];
          } else {
            nextRow = rows[deleteIdx - 1];
          }
        }

        if (typeof keyVal === 'string' && keyVal.startsWith('temp_')) {
          // A. Temp Row 刪除 (只在前端移除與重排)
          const remaining = rows.filter(r => r[keyField] !== keyVal);
          if (sequenceField && autoRenumber) {
            const renumbered = remaining.map((r, idx) => ({ ...r, [sequenceField]: idx + 1 }));
            setRows(renumbered);
            const nextSelect = nextRow ? renumbered.find(r => r[keyField] === nextRow[keyField]) : null;
            handleSelectRow(nextSelect || renumbered[0] || null);
          } else {
            setRows(remaining);
            handleSelectRow(nextRow || remaining[0] || null);
          }
          setIsEditing(false);
          message.success('已移除未存檔項目');
        } else {
          // B. 既有 Row 刪除
          const res = await axios.delete(deleteUrl);
          console.debug('[GridForm Delete] response status:', res.status);

          if (res.status === 200 || res.status === 202 || res.status === 204) {
            // DELETE 成功，計算 remaining (已排除刪除的 key)
            const remaining = rows.filter(r => r[keyField] !== keyVal);

            // 只有 DELETE 成功才執行 autoRenumber
            if (sequenceField && autoRenumber) {
              await renumberRows(remaining);
            }

            message.success('刪除成功');

            // 重新從伺服器讀取最新資料 (fetchData)
            const nextSelectKey = nextRow?.[keyField];
            await fetchData(nextSelectKey);
          } else {
            // 非 200/202/204 視為失敗
            const errorMsg = `刪除失敗，HTTP 狀態碼: ${res.status}`;
            console.error('[GridForm Delete] Delete failed status:', res.status, res.data);
            throw new Error(errorMsg);
          }
        }
      } catch (err) {
        console.error('[GridForm Delete] Delete request failed:', err);
        let errMsg = '刪除失敗';
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data;
          errMsg = `刪除失敗，狀態碼: ${status}，原因: ${parseDrfError(err, fieldLabels)}`;
          console.error(`[GridForm Delete] Server responded with status ${status}:`, data);
        } else {
          errMsg = `刪除失敗: ${err.message}`;
        }
        message.error(errMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    };
  };

  // 6. 儲存資料 (Save)
  const handleSave = async () => {
    if (!isEditing || !selectedRow) return;

    try {
      // 觸發表單驗證
      const values = await form.validateFields();
      
      // 外部自定義驗證
      if (validateRow) {
        const valError = validateRow(values);
        if (valError) {
          message.error(valError);
          return;
        }
      }

      setLoading(true);

      // 準備 Payload
      let payload = { ...selectedRow, ...values };
      if (buildPayload) {
        payload = buildPayload(payload);
      }

      const keyVal = selectedRow[rowKey];
      const isTemp = typeof keyVal === 'string' && keyVal.startsWith('temp_');

      let savedRecord = null;
      if (isTemp) {
        // 新增 (POST)
        // 移除前端暫時產生的 key，交由後端資料庫生成真正的 gkey
        if (payload && payload[rowKey] && typeof payload[rowKey] === 'string' && payload[rowKey].startsWith('temp_')) {
          delete payload[rowKey];
        }
        const res = await axios.post(getFullUrl(apiUrl), payload);
        message.success('新增成功');
        savedRecord = res.data;
      } else {
        // 修改 (PUT)
        const res = await axios.put(`${getFullUrl(apiUrl)}${keyVal}/`, payload);
        message.success('更新成功');
        savedRecord = res.data;
      }

      setIsEditing(false);
      if (afterSave) {
        afterSave(savedRecord);
      }
      
      // 重新讀取清單，並保留選取該筆剛存檔的資料
      const resList = await axios.get(getFullUrl(apiUrl));
      const data = resList.data || [];
      setRows(data);
      
      const found = data.find(r => r[rowKey] === savedRecord[rowKey]);
      handleSelectRow(found || data[0] || savedRecord);

    } catch (err) {
      console.error(err);
      message.error('儲存失敗：' + parseDrfError(err, fieldLabels));
    } finally {
      setLoading(false);
    }
  };

  // 7. 放棄變更 (Cancel)
  const handleCancel = () => {
    setIsEditing(false);
    const prevKey = selectedRowRef.current?.[rowKey];
    if (typeof prevKey === 'string' && prevKey.startsWith('temp_')) {
      // 若是新增一半放棄，直接移除該行
      const newRows = rows.filter(r => r[rowKey] !== prevKey);
      setRows(newRows);
      handleSelectRow(newRows.length > 0 ? newRows[0] : null);
    } else {
      // 否則還原為原先選取記錄之值
      handleSelectRow(selectedRow);
    }
    message.info('已放棄未存檔變更');
  };

  // 8. ⚡ 全域 MDI 廣播指令接收器
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === sheetId) {
        console.log(`⚡ [useSingleTableCrud] Intercepted command: ${action} for ${sheetId}`);
        if (action === 'retrieve') fetchData();
        else if (action === 'edit') setIsEditing(true);
        else if (action === 'insert') handleAdd();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
        else if (action === 'cancel') handleCancel();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [rows, selectedRow, isEditing]);

  // 初始自動載入
  useEffect(() => {
    fetchData();
  }, []);

  return {
    rows,
    selectedRow,
    isEditing,
    loading,
    setIsEditing,
    fetchData,
    handleSelectRow,
    handleAdd,
    handleDelete,
    handleSave,
    handleCancel
  };
}
