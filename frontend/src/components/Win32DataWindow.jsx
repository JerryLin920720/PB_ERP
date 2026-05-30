import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import './Win32DataWindow.css';

/**
 * Normalize API response content to extract list rows
 */
const normalizeListResponse = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.results)) return responseData.results;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return null;
};

/**
 * Helper to construct detail resource URL
 */
const buildDetailUrl = (baseUrl, gkey) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${gkey}/`;
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
export default function Win32DataWindow({ columns, apiUrl, title, sheetId }) {
  const [rows, setRows] = useState([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [editingRowIndex, setEditingRowIndex] = useState(-1); // 🔒 專屬編輯列索引，預設 -1 (唯讀模式)
  
  // 📝 髒資料追蹤 (Dirty States Tracker)
  const [dirtyMap, setDirtyMap] = useState({});   
  const [deleteSet, setDeleteSet] = useState(new Set()); 
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('就緒');

  // 📥 檢索 (Retrieve)
  const fetchRows = async () => {
    setLoading(true);
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

      // 依照 SerialNo 排序
      const sortedData = normalized.sort((a, b) => Number(a.serialno || 0) - Number(b.serialno || 0));
      
      setRows(sortedData);
      setDirtyMap({});
      setDeleteSet(new Set());
      setSelectedRowIndex(sortedData.length > 0 ? 0 : -1);
      setEditingRowIndex(-1); // 重置為查詢模式
      setStatusMsg(`讀取完成。共 ${sortedData.length} 筆資料。`);
    } catch (err) {
      console.error('[Win32DataWindow] fetchRows Error:', err);
      setStatusMsg(`錯誤: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ➕ 新增 (Insert Row)
  const handleInsert = () => {
    const tempGkey = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 建立初始預設值對象，包含所有可編輯欄位
    const newRow = {
      gkey: tempGkey,
      serialno: '(自動)'
    };
    columns.forEach(col => {
      if (col.editable) {
        newRow[col.key] = '';
      }
    });

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
      const hasSerialNo = columns.some(col => col.key === 'serialno');
      
      let finalRows = remaining;
      let nextDirty = { ...dirtyMap };
      delete nextDirty[gkey];
      
      if (hasSerialNo) {
        finalRows = remaining.map((row, idx) => {
          const newSn = idx + 1;
          if (row.serialno !== '(自動)' && Number(row.serialno) !== newSn) {
            const updatedRow = { ...row, serialno: newSn };
            nextDirty[row.gkey] = updatedRow;
            return updatedRow;
          }
          return row;
        });
      }
      
      setRows(finalRows);
      setDirtyMap(nextDirty);
      setSelectedRowIndex(prev => (prev === 0 ? 0 : prev - 1));
      setStatusMsg('已移除未儲存的新資料列。');
      return;
    }

    // 若選到的是資料庫既有資料：
    Modal.confirm({
      title: '確定要刪除此筆資料嗎？',
      content: `識別資料: ${getDeleteDisplayText(selectedRow, columns)}`,
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          setStatusMsg('正在從伺服器刪除資料...');
          const deleteUrl = buildDetailUrl(apiUrl, gkey);
          await axios.delete(deleteUrl);
          
          // 重新排序並儲存剩餘的資料列
          const remainingRows = rows.filter(row => row.gkey !== gkey);
          const hasSerialNo = columns.some(col => col.key === 'serialno');
          const upsertList = [];
          
          remainingRows.forEach((row, idx) => {
            const newSn = idx + 1;
            const isDirty = !!dirtyMap[row.gkey];
            const snChanged = row.serialno !== '(自動)' && Number(row.serialno) !== newSn;
            
            if (isDirty || snChanged) {
              const baseRow = dirtyMap[row.gkey] || row;
              upsertList.push({
                ...baseRow,
                serialno: row.serialno === '(自動)' ? '(自動)' : newSn
              });
            }
          });
          
          // 如果沒有 serialno 欄位，但有其他欄位在 dirtyMap 中，也一起儲存以防 fetchRows 刷新丟失
          if (!hasSerialNo) {
            const remainingDirty = Object.values(dirtyMap).filter(item => item.gkey !== gkey);
            if (remainingDirty.length > 0) {
              upsertList.push(...remainingDirty);
            }
          }
          
          if (upsertList.length > 0) {
            const bulkApiUrl = apiUrl.endsWith('/') ? `${apiUrl}bulk_save/` : `${apiUrl}/bulk_save/`;
            await axios.post(bulkApiUrl, {
              upsert: upsertList,
              delete: []
            });
          }
          
          message.success('刪除成功');
          await fetchRows();
        } catch (err) {
          const errorMsg = formatBackendError(err.response?.data || err.message, columns);
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
    setStatusMsg('正在寫入批次交易 (Bulk Saving)...');
    
    // 從實時 Ref 讀取狀態，徹底杜絕 Stale Closure 閉包過期問題
    const currentDirtyMap = opsRef.current.dirtyMap || {};
    const currentDeleteSet = opsRef.current.deleteSet || new Set();

    let upsertList = Object.values(currentDirtyMap);
    let deleteList = Array.from(currentDeleteSet);

    const bulkApiUrl = apiUrl.endsWith('/') ? `${apiUrl}bulk_save/` : `${apiUrl}/bulk_save/`;
    const payload = {
      upsert: upsertList,
      delete: deleteList
    };

    console.log('[Win32DataWindow] saving to:', bulkApiUrl);
    console.log('[Win32DataWindow] payload:', payload);
    console.log('[Win32DataWindow] upsertList.length:', upsertList.length);
    console.log('[Win32DataWindow] deleteList.length:', deleteList.length);

    if (upsertList.length === 0 && deleteList.length === 0) {
      setStatusMsg('無任何資料異動，無須存檔。');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(bulkApiUrl, payload);
      
      console.log('[Win32DataWindow] save success. status:', res.status, 'data:', res.data);
      if (res.data.success) {
        setStatusMsg('存檔成功！正在重載最新資料...');
        setEditingRowIndex(-1); // 存檔成功後回歸唯讀檢視
        await fetchRows();
      } else {
        throw new Error(res.data.detail || '存檔失敗');
      }
    } catch (err) {
      console.log('[Win32DataWindow] save failed. status:', err.response?.status, 'data:', err.response?.data, 'message:', err.message);
      const errorMsg = formatBackendError(err.response?.data || err.message, columns);
      message.error(`存檔失敗:\n${errorMsg}`);
      setStatusMsg(`存檔失敗: ${errorMsg}`);
      setLoading(false);
    }
  };

  // ⚙️ 即時儲存格變更 (Immediate Inline Value Committer)
  const handleCellChange = (rIndex, colKey, newVal) => {
    // 1. 同步更新 rows
    setRows(prev => {
      const next = [...prev];
      const row = next[rIndex];
      if (!row) return prev;
      
      const updatedRow = { ...row, [colKey]: newVal };
      next[rIndex] = updatedRow;
      return next;
    });
    
    // 2. 在 setRows 外部執行 setDirtyMap 更新以防 React State updater 副作用被丟失
    setRows(prev => {
      const row = prev[rIndex];
      if (row) {
        const updatedRow = { ...row, [colKey]: newVal };
        setDirtyMap(prevDirty => ({
          ...prevDirty,
          [row.gkey]: updatedRow
        }));
      }
      return prev;
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
      selectedRowIndex,
      dirtyMap,
      deleteSet
    };
  });

  // ⚡ 全域 MDI 廣播指令接收器 (精準綁定實時 Ref)
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      
      if (targetSheet === sheetId) {
        console.log(`⚡ [${sheetId}] Intercepted command: ${action}`);
        const ops = opsRef.current;
        if (action === 'retrieve') ops.fetchRows();
        else if (action === 'edit') setEditingRowIndex(ops.selectedRowIndex); // 解開目前選取列編輯鎖
        else if (action === 'insert') ops.handleInsert();
        else if (action === 'delete') ops.handleDelete();
        else if (action === 'save') {
          console.log('[Win32DataWindow] save command received');
          ops.handleSave();
        }
      }
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => {
      window.removeEventListener('mdi-global-command', handleGlobalCommand);
    };
  }, [sheetId]);

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
              {columns.map(col => (
                <th key={col.key} className="dw-th" style={{ width: col.width || 'auto' }}>
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
                  onDoubleClick={() => setEditingRowIndex(rIndex)} // 🌟 實測 PB 操作：雙擊直接進入編輯模式
                >
                  {/* 狀態指示符：當前列標為黑箭頭，有髒資料標為 * */}
                  <td className="dw-indicator-col">
                    {isSelected ? '▶' : (isRowDirty ? '*' : '')}
                  </td>

                  {columns.map(col => {
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
                            {col.displayKey && row[col.displayKey] !== undefined && row[col.displayKey] !== null
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
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
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
    </div>
  );
}
