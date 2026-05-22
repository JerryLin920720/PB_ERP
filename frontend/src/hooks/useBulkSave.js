import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message } from 'antd';

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
 * useBulkSave - 用於 Pattern C 網格直接編輯與整批存檔的共用 Hook
 * 
 * @param {Object} params
 * @param {string} params.sheetId - 當前作業視窗 ID
 * @param {string} params.apiUrl - Django REST API 位址
 * @param {string} [params.bulkSaveUrl] - 批次存檔的獨立 API 位址，預設自動推導
 * @param {Function} [params.createEmptyRow] - 新增空白列的資料生成器
 * @param {string} [params.rowKey] - 識別列的 key，預設為 'gkey'
 * @param {boolean} [params.autoFetch] - 是否在載入時自動 fetchData，預設為 true
 */
export default function useBulkSave({
  sheetId,
  apiUrl,
  bulkSaveUrl,
  createEmptyRow,
  rowKey = 'gkey',
  autoFetch = true
}) {
  const [dataSource, setDataSource] = useState([]);
  const [deletedGkeys, setDeletedGkeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState(null);

  // 1. 檢索資料 (Fetch)
  const fetchData = async () => {
    if (!apiUrl) return;
    setLoading(true);
    try {
      const fullUrl = getFullUrl(apiUrl);
      const res = await axios.get(fullUrl);
      setDataSource(res.data || []);
      setDeletedGkeys([]);
      setSelectedRowKey(null);
    } catch (err) {
      console.error('Fetch data failed:', err);
      message.error('載入資料失敗！');
    } finally {
      setLoading(false);
    }
  };

  // 2. 儲存格欄位值變更 (Cell Edit)
  const handleCellChange = (gkey, field, val) => {
    setDataSource(prev =>
      prev.map(row => {
        if (row[rowKey] === gkey) {
          return { ...row, [field]: val };
        }
        return row;
      })
    );
  };

  // 3. 新增列 (Add)
  const handleAddRow = () => {
    const newRow = typeof createEmptyRow === 'function'
      ? createEmptyRow()
      : { [rowKey]: `temp_${Date.now()}` };
    
    setDataSource(prev => [...prev, newRow]);
    setSelectedRowKey(newRow[rowKey]);
  };

  // 4. 刪除列 (Delete)
  const handleDeleteRow = (gkeyToDelete) => {
    const targetKey = gkeyToDelete || selectedRowKey;
    if (!targetKey) {
      message.warning('請先選擇要刪除的資料列！');
      return;
    }

    // 若刪除的是資料庫已存在的列 (非 temp_)，將主鍵放入 deletedGkeys 暫存
    const isTemp = typeof targetKey === 'string' && targetKey.startsWith('temp_');
    if (!isTemp) {
      setDeletedGkeys(prev => {
        if (!prev.includes(targetKey)) {
          return [...prev, targetKey];
        }
        return prev;
      });
    }

    // 自本機列表移除
    setDataSource(prev => prev.filter(row => row[rowKey] !== targetKey));
    
    if (selectedRowKey === targetKey) {
      setSelectedRowKey(null);
    }
  };

  // 5. 批次存檔 (Bulk Save)
  const handleBulkSave = async () => {
    setLoading(true);
    try {
      // 處理待提交的 upsert 列表 (如果是 temp_ 開頭的 gkey 則移除 gkey，讓後端自動生成)
      const upsertList = dataSource.map(item => {
        const cleanItem = { ...item };
        const keyVal = cleanItem[rowKey];
        if (typeof keyVal === 'string' && keyVal.startsWith('temp_')) {
          delete cleanItem[rowKey];
        }
        return cleanItem;
      });

      const payload = {
        upsert: upsertList,
        delete: deletedGkeys
      };

      const targetSaveUrl = getFullUrl(bulkSaveUrl || `${apiUrl.replace(/\/$/, '')}/bulk_save`);
      await axios.post(targetSaveUrl, payload);
      message.success('批次儲存成功！');
      setDeletedGkeys([]);
      await fetchData();
    } catch (err) {
      console.error('Bulk save failed:', err);
      message.error('批次儲存失敗！');
    } finally {
      setLoading(false);
    }
  };

  // 6. 自動載入
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [apiUrl, autoFetch]);

  // 7. 使用 Ref 儲存最新方法，防止事件監聽器發生過期閉包
  const opsRef = useRef({});
  useEffect(() => {
    opsRef.current = {
      fetchData,
      handleAddRow,
      handleDeleteRow,
      handleBulkSave
    };
  });

  // 8. 監聽全域 MDI 事件
  useEffect(() => {
    if (!sheetId) return;

    const handleGlobalCommand = (e) => {
      if (!e || !e.detail) return;
      const { action, targetSheet } = e.detail;
      
      if (targetSheet?.toLowerCase() === sheetId.toLowerCase()) {
        switch (action) {
          case 'retrieve':
            opsRef.current.fetchData();
            break;
          case 'insert':
            opsRef.current.handleAddRow();
            break;
          case 'delete':
            opsRef.current.handleDeleteRow();
            break;
          case 'save':
            opsRef.current.handleBulkSave();
            break;
          case 'cancel':
            opsRef.current.fetchData();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => {
      window.removeEventListener('mdi-global-command', handleGlobalCommand);
    };
  }, [sheetId]);

  return {
    dataSource,
    setDataSource,
    deletedGkeys,
    setDeletedGkeys,
    loading,
    selectedRowKey,
    setSelectedRowKey,
    fetchData,
    handleCellChange,
    handleAddRow,
    handleDeleteRow,
    handleBulkSave,
    mode: 'edit' // Pattern C 全網格皆可編輯，狀態固定為 edit 模式
  };
}
