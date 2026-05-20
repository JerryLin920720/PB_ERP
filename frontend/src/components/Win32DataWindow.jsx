import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Win32DataWindow.css';

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
      const data = response.data;
      
      // 依照 SerialNo 排序
      const sortedData = Array.isArray(data) 
        ? data.sort((a, b) => Number(a.serialno || 0) - Number(b.serialno || 0))
        : [];
      
      setRows(sortedData);
      setDirtyMap({});
      setDeleteSet(new Set());
      setSelectedRowIndex(sortedData.length > 0 ? 0 : -1);
      setEditingRowIndex(-1); // 重置為查詢模式
      setStatusMsg(`讀取完成。共 ${sortedData.length} 筆資料。`);
    } catch (err) {
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
    setSelectedRowIndex(currIndex => {
      if (currIndex < 0) return currIndex;
      
      setRows(prevRows => {
        if (currIndex >= prevRows.length) return prevRows;
        const rowToDelete = prevRows[currIndex];
        const key = rowToDelete.gkey;

        if (!key.startsWith('temp_')) {
          setDeleteSet(prevSet => {
            const nextSet = new Set(prevSet);
            nextSet.add(key);
            return nextSet;
          });
        }

        setDirtyMap(prevDirty => {
          const nextDirty = { ...prevDirty };
          delete nextDirty[key];
          return nextDirty;
        });

        return prevRows.filter((_, i) => i !== currIndex);
      });

      setStatusMsg('標記刪除成功，請點擊頂部「儲存」按鈕存檔。');
      // 自動計算新選擇位置
      return currIndex === 0 ? 0 : currIndex - 1;
    });
  };

  // 💾 儲存 (Save)
  const handleSave = async () => {
    setLoading(true);
    setStatusMsg('正在寫入批次交易 (Bulk Saving)...');
    
    // 由於 handleSave 是被全域事件調用，我們需要在當前閉包快照裡安全獲取最新狀態
    // 我們可以在執行前做一個短路判斷，但最佳的做法是從當前組件最新狀態直接取用。
    let upsertList = [];
    let deleteList = [];

    // 這裡直接利用 component state，因為 React Effect 重綁定會確保最新值
    upsertList = Object.values(dirtyMap);
    deleteList = Array.from(deleteSet);

    if (upsertList.length === 0 && deleteList.length === 0) {
      setStatusMsg('無任何資料異動，無須存檔。');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        upsert: upsertList,
        delete: deleteList
      };

      const bulkApiUrl = apiUrl.endsWith('/') ? `${apiUrl}bulk_save/` : `${apiUrl}/bulk_save/`;
      
      const res = await axios.post(bulkApiUrl, payload);
      
      if (res.data.success) {
        setStatusMsg('存檔成功！正在重載最新資料...');
        setEditingRowIndex(-1); // 存檔成功後回歸唯讀檢視
        await fetchRows();
      } else {
        throw new Error(res.data.detail || '存檔失敗');
      }
    } catch (err) {
      setStatusMsg(`存檔失敗: ${err.response?.data?.detail || err.message}`);
      setLoading(false);
    }
  };

  // ⚙️ 即時儲存格變更 (Immediate Inline Value Committer)
  const handleCellChange = (rIndex, colKey, newVal) => {
    setRows(prev => {
      const next = [...prev];
      const row = next[rIndex];
      if (!row) return prev;
      
      const updatedRow = { ...row, [colKey]: newVal };
      next[rIndex] = updatedRow;
      
      // 同步髒資料追蹤 (物理復刻精準度：確保整行資料被送出，防範 Partial Update 導致的必填欄位缺失)
      setDirtyMap(prevDirty => ({
        ...prevDirty,
        [row.gkey]: updatedRow
      }));
      
      return next;
    });
  };

  // ⚡ 全域 MDI 廣播指令接收器 (精準綁定最新狀態依賴)
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      
      if (targetSheet === sheetId) {
        console.log(`⚡ [${sheetId}] Intercepted command: ${action}`);
        if (action === 'retrieve') fetchRows();
        else if (action === 'edit') setEditingRowIndex(selectedRowIndex); // 解開目前選取列編輯鎖
        else if (action === 'insert') handleInsert();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
      }
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => {
      window.removeEventListener('mdi-global-command', handleGlobalCommand);
    };
  }, [apiUrl, sheetId, rows, selectedRowIndex, dirtyMap, deleteSet]);

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
                            />
                          )
                        ) : (
                          <span style={{ opacity: isDeleted ? 0.4 : 1 }}>
                            {col.displayKey && row[col.displayKey] !== undefined && row[col.displayKey] !== null
                              ? String(row[col.displayKey])
                              : (row[col.key] === undefined || row[col.key] === null ? '' : String(row[col.key]))}
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
