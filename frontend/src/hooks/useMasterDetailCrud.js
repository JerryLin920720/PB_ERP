import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';

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
  return (err && err.message) || '發生未知錯誤';
};

/**
 * useMasterDetailCrud - Pattern B1 (單 Master + 單 Detail) 專用共用 CRUD Hook
 * 
 * 【功能限制說明】：
 * - 本第一版 Hook 僅支援 Pattern B1 的「單 Master + 單 Detail」架構（如 BA060、BA061、DP004 等上下堆疊版型）。
 * - 本第一版【不支援】如 BA010、DP010、DP015、DP025 等多 Detail Tabs 的複雜主從維護。
 * - 多 Detail Tabs 的複雜主從，未來應另做 useMultiDetailCrud 或以本版進行大規模擴充。
 * 
 * 【內部狀態與職責說明】：
 * - 第一版 useMasterDetailCrud 預設由 Hook 內部管理以下狀態：
 *   - masterRows (主檔資料列)
 *   - detailRows (明細資料列)
 *   - selectedMaster (目前選取的主檔)
 *   - selectedDetail (目前選取的明細)
 *   - editedMasters (編輯中的主檔對照表)
 *   - editedDetails (編輯中的明細對照表)
 *   - deletedMasterKeys (暫存刪除的主檔 keys)
 *   - deletedDetailKeys (暫存刪除的明細 keys)
 * - 外部 Sheet 元件【不應】再另外維護一套重複的主檔/明細/編輯狀態，否則極易造成資料不同步或視窗狀態混亂。
 * - BA060 等頁面在第一版時**建議不要傳入 onRetrieve**，優先讓 Hook 內建的 fetchMaster / fetchDetail 流程進行狀態管理。
 * - 若外部 Sheet 強制傳入 onRetrieve，外部必須自行確保 Hook 內部 state 的同步，否則極易造成主從資料不同步。
 * - 若傳入 onRetrieve，Hook 仍會先執行 clearDirtyState() 清空髒狀態，再呼叫 onRetrieve。
 * 
 * 【作用區操作規則 (activeArea)】：
 * 外部 Sheet 的元件在與此 Hook 互動時，必須遵守以下 activeArea 操作規則：
 * 1. 主檔表格點擊列 (Master Table Row Click) 時，必須呼叫：
 *    - handleSelectMaster(row)
 * 2. 明細表格點擊列 (Detail Table Row Click) 時，必須呼叫：
 *    - handleSelectDetail(row)
 * 3. 全域 Toolbar 的新增 (insert) 與刪除 (delete) 指令會根據當前 activeArea 的值決定對 Master 或 Detail 進行對應的操作。
 * 4. 如果 activeArea 不明確，預設對 Master 進行操作 (activeArea 預設為 'master')。
 * 
 * 【重要交易說明】：
 * 目前若後端沒有提供對應的 deep_save / bulk_save 整合端點，
 * 本 Hook 所執行的 handleSaveAll() 是由前端控制 (front-end orchestrated) 的批次儲存，
 * 分別循序調用各個 DELETE, POST, PUT 請求。這在前端「非」真正的資料庫原子交易 (Atomic Transaction)。
 * 若儲存途中發生錯誤，可能導致部分修改已提交、部分失敗。
 * 若需要絕對的事務原子性，後端應提供 deep_save API 端點。
 * 
 * @param {Object} config
 * @param {string} config.sheetId - 當前視窗 of ID，例如 'ba060'
 * @param {string} config.masterApiUrl - 主檔 API 位址，例如 'ba060' 或完整 URL
 * @param {string} config.detailApiUrl - 明細 API 位址，例如 'ba061' 或完整 URL
 * @param {string} [config.masterKey='gkey'] - 主檔主鍵欄位，預設 'gkey'
 * @param {string} [config.detailKey='gkey'] - 明細主鍵欄位，預設 'gkey'
 * @param {string} config.detailParentKey - 明細關聯主檔的外鍵欄位，例如 'ba060gkey'
 * @param {boolean} [config.cascadeDeleteDetailOnMasterDelete=true] - 刪除主檔時，是否假設後端會 Cascade 刪除明細
 * @param {Object} [config.fieldLabels={}] - 欄位英文與中文對照，用於 DRF 錯誤解析
 * @param {Function} [config.getMasterDisplayText] - 刪除主檔提示的文字生成器
 * @param {Function} [config.getDetailDisplayText] - 刪除明細提示的文字生成器
 * @param {Function} [config.createDefaultMasterRow] - 新增主檔時的預設列產生器
 * @param {Function} [config.createDefaultDetailRow] - 新增明細時的預設列產生器
 * @param {Function} [config.buildMasterPayload] - 儲存主檔前整理 Payload 的函數
 * @param {Function} [config.buildDetailPayload] - 儲存明細前整理 Payload 的函數
 * @param {Function} [config.onRetrieve] - 重新載入主檔數據的外部函數 (若未傳入，內部將執行預設 fetchMaster)
 * @param {Function} [config.onInsertMaster] - 新增主檔的特殊邏輯 (若未傳入，內部將執行預設新增行為)
 * @param {Function} [config.onInsertDetail] - 新增明細的特殊邏輯 (若未傳入，內部將執行預設新增行為)
 * @param {Function} [config.afterSave] - 儲存成功後的回呼函數
 */
export default function useMasterDetailCrud({
  sheetId,
  masterApiUrl,
  detailApiUrl,
  masterKey = 'gkey',
  detailKey = 'gkey',
  detailParentKey,
  cascadeDeleteDetailOnMasterDelete = true,
  fieldLabels = {},
  getMasterDisplayText,
  getDetailDisplayText,
  createDefaultMasterRow,
  createDefaultDetailRow,
  buildMasterPayload,
  buildDetailPayload,
  onRetrieve,
  onInsertMaster,
  onInsertDetail,
  afterSave,
  masterColumns,
  detailColumns,
  validateMasterRow,
  validateDetailRow,
  validateAll,
  disableDetailAddAction = false,
  saveAllOverride
}) {
  const [masterRows, setMasterRows] = useState([]);
  const [detailRows, setDetailRows] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [activeArea, setActiveArea] = useState('master'); // 'master' | 'detail'
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 異動與刪除快取
  const [deletedMasterKeys, setDeletedMasterKeys] = useState([]);
  const [deletedDetailKeys, setDeletedDetailKeys] = useState([]);
  const [editedMasters, setEditedMasters] = useState({});
  const [editedDetails, setEditedDetails] = useState({});

  // 髒檢查：判斷前端是否有未存檔的變更
  const isDirty = 
    deletedMasterKeys.length > 0 || 
    deletedDetailKeys.length > 0 || 
    Object.keys(editedMasters).length > 0 || 
    Object.keys(editedDetails).length > 0;

  // 使用 Ref 來避免非同步 fetchMaster/fetchDetail 閉包問題
  const selectedMasterRef = useRef(selectedMaster);
  useEffect(() => {
    selectedMasterRef.current = selectedMaster;
  }, [selectedMaster]);

  // 統一清除髒狀態 (Clear Dirty State)
  const clearDirtyState = () => {
    setDeletedMasterKeys([]);
    setDeletedDetailKeys([]);
    setEditedMasters({});
    setEditedDetails({});
    setSelectedDetail(null);
    setIsEditing(false);
    setActiveArea('master'); // 取消/檢索重置後預設回到 master 作用區
  };

  // 1. 預設讀取主檔資料
  const fetchMaster = async () => {
    if (!masterApiUrl) return;
    setLoading(true);
    try {
      const res = await axios.get(getFullUrl(masterApiUrl));
      const data = res.data || [];
      setMasterRows(data);
      
      // 清空所有快取狀態與 dirty 狀態
      clearDirtyState();

      // 直接決定 nextSelectedMaster 進行設定與明細讀取，避免閉包混亂
      if (data.length > 0) {
        let nextSelectedMaster = null;
        const currentSelected = selectedMasterRef.current;
        if (!currentSelected) {
          nextSelectedMaster = data[0];
        } else {
          const freshSelected = data.find(item => item[masterKey] === currentSelected[masterKey]);
          nextSelectedMaster = freshSelected || data[0];
        }
        setSelectedMaster(nextSelectedMaster);
        if (nextSelectedMaster) {
          const nextSelectedKey = nextSelectedMaster[masterKey];
          // 內部呼叫時 manageLoading 設為 false，避免重複開關與閃爍
          await fetchDetail(nextSelectedKey, { manageLoading: false });
        }
      } else {
        setSelectedMaster(null);
        setSelectedDetail(null);
        setDetailRows([]);
      }
    } catch (err) {
      console.error('Fetch master failed:', err);
      message.error('載入主檔資料失敗：' + parseDrfError(err, fieldLabels));
    } finally {
      setLoading(false);
    }
  };

  // 2. 預設讀取明細資料
  const fetchDetail = async (parentGkey, { manageLoading = true } = {}) => {
    if (!detailApiUrl || !parentGkey) return;
    
    // 1. 如果是臨時主檔，從 editedDetails 中找出屬於該主檔的明細列
    if (typeof parentGkey === 'string' && parentGkey.startsWith('temp_')) {
      const tempRows = Object.values(editedDetails).filter(
        d => d[detailParentKey] === parentGkey
      );
      setDetailRows(tempRows);
      return;
    }
    
    if (manageLoading) setLoading(true);
    try {
      const res = await axios.get(`${getFullUrl(detailApiUrl)}?${detailParentKey}=${parentGkey}`);
      const allServerRows = res.data || [];
      // 前端過濾：防範後端 API 未實作外鍵查詢過濾，只保留所選主檔對應的明細列
      const serverRows = allServerRows.filter(r => String(r[detailParentKey]) === String(parentGkey));
      
      // 合併 editedDetails 中的最新修改，並過濾掉已刪除的明細
      const mergedRows = serverRows
        .filter(r => !deletedDetailKeys.includes(r[detailKey]))
        .map(r => {
          const edited = editedDetails[r[detailKey]];
          return edited ? { ...r, ...edited } : r;
        });
        
      // 找出屬於該主檔的臨時新增明細（如果有）
      const tempDetailsForParent = Object.values(editedDetails).filter(
        d => d[detailParentKey] === parentGkey && typeof d[detailKey] === 'string' && d[detailKey].startsWith('temp_')
      );
      
      // 合併臨時明細
      const finalRows = [...mergedRows, ...tempDetailsForParent];
      
      // 依序號排序以保持正確顯示
      finalRows.sort((a, b) => (Number(a.serialno) || 0) - (Number(b.serialno) || 0));
      
      setDetailRows(finalRows);
      setSelectedDetail(null);
    } catch (err) {
      console.error('Fetch detail failed:', err);
      message.error('載入明細資料失敗：' + parseDrfError(err, fieldLabels));
    } finally {
      if (manageLoading) setLoading(false);
    }
  };

  // 3. 選取主檔列 (自動切換 activeArea 至 master)
  const handleSelectMaster = (row) => {
    setSelectedMaster(row);
    setSelectedDetail(null);
    setActiveArea('master');
    // 立即清空明細資料，避免顯示舊主檔的明細（避免混淆與 race condition）
    setDetailRows([]);
    if (row) {
      const keyVal = row[masterKey];
      fetchDetail(keyVal);
    }
  };

  // 3.5. 選取明細列 (自動切換 activeArea 至 detail)
  const handleSelectDetail = (row) => {
    setSelectedDetail(row);
    setActiveArea('detail');
  };

  // 4. 新增主檔列 (不再依賴傳入 createDefaultRow 函數，直接調用 config 的產生器)
  const handleAddMaster = () => {
    if (typeof onInsertMaster === 'function') {
      onInsertMaster();
      return;
    }
    const tempGkey = `temp_${Date.now()}`;
    const newRow = typeof createDefaultMasterRow === 'function'
      ? createDefaultMasterRow(tempGkey)
      : { [masterKey]: tempGkey };

    setMasterRows(prev => [...prev, newRow]);
    setEditedMasters(prev => ({ ...prev, [tempGkey]: newRow }));
    setSelectedMaster(newRow);
    setDetailRows([]); // 新增主檔，明細清空
    setIsEditing(true); // 自動解鎖編輯
    setActiveArea('master');
  };

  // 5. 新增明細列 (不再依賴傳入 createDefaultRow 函數，直接調用 config 的產生器)
  const handleAddDetail = () => {
    if (disableDetailAddAction) {
      message.info('明細由主檔尺碼範圍自動產生，請調整主檔尺碼欄位。');
      return;
    }
    if (typeof onInsertDetail === 'function') {
      onInsertDetail();
      return;
    }
    if (!selectedMaster) {
      message.warning('請先選擇或建立一筆主檔資料！');
      return;
    }
    const parentGkey = selectedMaster[masterKey];
    const tempGkey = `temp_${Date.now()}`;
    const newRow = typeof createDefaultDetailRow === 'function'
      ? createDefaultDetailRow(tempGkey, parentGkey)
      : { [detailKey]: tempGkey, [detailParentKey]: parentGkey };

    setDetailRows(prev => [newRow, ...prev]);
    setEditedDetails(prev => ({ ...prev, [tempGkey]: newRow }));
    setSelectedDetail(newRow);
    setIsEditing(true);
    setActiveArea('detail');
  };

  // 6. 主檔資料變更
  const handleMasterFieldChange = (gkey, field, val) => {
    const updatedRows = masterRows.map(row => {
      if (row[masterKey] === gkey) {
        const updatedRow = { ...row, [field]: val };
        setEditedMasters(prev => ({ ...prev, [gkey]: updatedRow }));
        if (selectedMaster && selectedMaster[masterKey] === gkey) {
          setSelectedMaster(updatedRow);
        }
        return updatedRow;
      }
      return row;
    });
    setMasterRows(updatedRows);
  };

  // 7. 明細資料變更
  const handleDetailFieldChange = (gkey, field, val) => {
    const updatedRows = detailRows.map(row => {
      if (row[detailKey] === gkey) {
        const updatedRow = { ...row, [field]: val };
        setEditedDetails(prev => ({ ...prev, [gkey]: updatedRow }));
        if (selectedDetail && selectedDetail[detailKey] === gkey) {
          setSelectedDetail(updatedRow);
        }
        return updatedRow;
      }
      return row;
    });
    setDetailRows(updatedRows);
  };

  // 8. 彈窗確認刪除主檔 (延遲刪除)
  const confirmDeleteMaster = (row) => {
    if (!row) return;
    const displayText = typeof getMasterDisplayText === 'function'
      ? getMasterDisplayText(row)
      : row[masterKey];

    Modal.confirm({
      title: '確認刪除主檔資料？',
      content: `您確定要刪除主檔項目「${displayText}」嗎？這將會連帶清除或刪除其對應的所有明細資料。`,
      okText: '確定',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        const keyVal = row[masterKey];
        const isTemp = typeof keyVal === 'string' && keyVal.startsWith('temp_');

        if (!isTemp) {
          setDeletedMasterKeys(prev => {
            if (!prev.includes(keyVal)) return [...prev, keyVal];
            return prev;
          });
        }

        // cascadeDeleteDetailOnMasterDelete 為 false 時，手動加進 deletedDetailKeys
        if (!cascadeDeleteDetailOnMasterDelete) {
          const keysToTrash = detailRows
            .filter(d => d[detailParentKey] === keyVal)
            .map(d => d[detailKey])
            .filter(k => !(typeof k === 'string' && k.startsWith('temp_')));

          if (keysToTrash.length > 0) {
            setDeletedDetailKeys(prev => {
              const next = [...prev];
              keysToTrash.forEach(k => {
                if (!next.includes(k)) next.push(k);
              });
              return next;
            });
          }
        }

        // 從編輯快取中移除主檔
        setEditedMasters(prev => {
          const next = { ...prev };
          delete next[keyVal];
          return next;
        });

        // 從明細編輯快取中移除該主檔底下的明細
        setEditedDetails(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            if (next[k][detailParentKey] === keyVal) {
              delete next[k];
            }
          });
          return next;
        });

        // 從主檔畫面移出
        setMasterRows(prev => prev.filter(r => r[masterKey] !== keyVal));

        // 如果刪除的是當前選取的項目，重設明細與選取
        if (selectedMaster && selectedMaster[masterKey] === keyVal) {
          setSelectedMaster(null);
          setDetailRows([]);
          setSelectedDetail(null);
        }
      }
    });
  };

  // 9. 彈窗確認刪除明細 (延遲刪除)
  const confirmDeleteDetail = (row) => {
    if (!row) return;
    const displayText = typeof getDetailDisplayText === 'function'
      ? getDetailDisplayText(row)
      : row[detailKey];

    Modal.confirm({
      title: '確認刪除明細資料？',
      content: `您確定要刪除明細項目「${displayText}」嗎？`,
      okText: '確定',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        const keyVal = row[detailKey];
        const isTemp = typeof keyVal === 'string' && keyVal.startsWith('temp_');

        if (!isTemp) {
          setDeletedDetailKeys(prev => {
            if (!prev.includes(keyVal)) return [...prev, keyVal];
            return prev;
          });
        }
        // 從編輯快取中移除
        setEditedDetails(prev => {
          const next = { ...prev };
          delete next[keyVal];
          return next;
        });

        // 從明細畫面移出
        setDetailRows(prev => prev.filter(r => r[detailKey] !== keyVal));
        if (selectedDetail && selectedDetail[detailKey] === keyVal) {
          setSelectedDetail(null);
        }
      }
    });
  };

  // 10. 取消編輯，回復原狀
  const handleCancel = () => {
    // 確保所有異動狀態在 onRetrieve 前被清空
    clearDirtyState();

    if (typeof onRetrieve === 'function') {
      onRetrieve();
    } else {
      fetchMaster();
    }
  };

  // 11. 合併儲存 (前端編排一鍵儲存主從)
  const handleSaveAll = async () => {
    setLoading(true);
    const detailList = Object.values(editedDetails);

    // ==========================================
    // Pre-Save Validation Phase
    // ==========================================
    try {
      // 1. Validate Master required fields & custom validateMasterRow
      const masterEditedList = Object.values(editedMasters);
      for (const mRow of masterEditedList) {
        const mKeyVal = mRow[masterKey];
        if (deletedMasterKeys.includes(mKeyVal)) {
          continue; // Skip if scheduled for deletion
        }

        // Required check
        if (masterColumns) {
          for (const col of masterColumns) {
            if (col.required) {
              const val = mRow[col.key];
              if (val === undefined || val === null || val === '') {
                const label = col.label || fieldLabels[col.key] || col.key;
                throw new Error(`主檔欄位「${label}」為必填項目`);
              }
            }
          }
        }

        // Custom validation callback
        if (typeof validateMasterRow === 'function') {
          validateMasterRow(mRow);
        }

        // Dry-run payload check to verify buildMasterPayload doesn't throw
        if (typeof buildMasterPayload === 'function') {
          buildMasterPayload(mRow);
        }
      }

      // 2. Validate Detail required fields & custom validateDetailRow
      for (const dRow of detailList) {
        const dKeyVal = dRow[detailKey];
        if (deletedDetailKeys.includes(dKeyVal)) {
          continue; // Skip if scheduled for deletion
        }

        const parentKeyVal = dRow[detailParentKey] || (selectedMaster ? selectedMaster[masterKey] : null);
        // If parent master is deleted, skip validation
        if (parentKeyVal && deletedMasterKeys.includes(parentKeyVal)) {
          continue;
        }

        // Relation check: parent must exist
        if (parentKeyVal === undefined || parentKeyVal === null || parentKeyVal === '') {
          throw new Error('明細資料缺少主檔關聯，無法儲存。');
        }

        // Required check
        if (detailColumns) {
          for (const col of detailColumns) {
            if (col.required) {
              const val = dRow[col.key];
              if (val === undefined || val === null || val === '') {
                const label = col.label || fieldLabels[col.key] || col.key;
                throw new Error(`明細欄位「${label}」為必填項目`);
              }
            }
          }
        }

        // Custom validation callback
        if (typeof validateDetailRow === 'function') {
          validateDetailRow(dRow);
        }

        // Dry-run payload check to verify buildDetailPayload doesn't throw
        if (typeof buildDetailPayload === 'function') {
          buildDetailPayload(dRow, {});
        }
      }

      // 3. Custom validateAll callback
      if (typeof validateAll === 'function') {
        validateAll({
          masterRows,
          detailRows,
          editedMasters,
          editedDetails,
          deletedMasterKeys,
          deletedDetailKeys
        });
      }
    } catch (valErr) {
      console.warn('[useMasterDetailCrud] Pre-Save validation failed:', valErr);
      message.error(valErr.message || '存檔校驗未通過');
      setLoading(false);
      return;
    }

    // 支援自訂儲存策略（saveAllOverride）
    if (typeof saveAllOverride === 'function') {
      try {
        await saveAllOverride({
          masterRows,
          detailRows,
          editedMasters,
          editedDetails,
          deletedMasterKeys,
          deletedDetailKeys,
          selectedMaster,
          axios,
          getFullUrl,
          clearDirtyState,
          fetchMaster
        });
        message.success('主從資料儲存成功！');
        
        clearDirtyState();
        setIsEditing(false);

        if (typeof afterSave === 'function') {
          await afterSave();
        }

        if (typeof onRetrieve === 'function') {
          await onRetrieve();
        } else {
          await fetchMaster();
        }
      } catch (err) {
        console.error('Save all override failed:', err);
        message.error('儲存失敗：' + parseDrfError(err, fieldLabels));
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // 1) 物理刪除明細
      for (const dKey of deletedDetailKeys) {
        await axios.delete(`${getFullUrl(detailApiUrl)}${dKey}/`);
      }

      // 2) 物理刪除主檔
      for (const mKey of deletedMasterKeys) {
        await axios.delete(`${getFullUrl(masterApiUrl)}${mKey}/`);
      }

      // 3) 儲存/異動主檔 (Upsert Master)
      const tempParentKeyMap = {};
      const masterList = Object.values(editedMasters);
      
      for (const masterRow of masterList) {
        const mKeyVal = masterRow[masterKey];
        // 排除已在暫存刪除名單中的主檔
        if (deletedMasterKeys.includes(mKeyVal)) {
          continue;
        }

        let rawPayload = typeof buildMasterPayload === 'function'
          ? buildMasterPayload(masterRow)
          : { ...masterRow };

        if (rawPayload === null || rawPayload === undefined) {
          console.warn('buildMasterPayload returned null/undefined, skipping row:', masterRow);
          continue;
        }

        // 拷貝 Payload 以防污染 React State 內的 row 物件
        const payload = { ...rawPayload };

        const isTemp = typeof mKeyVal === 'string' && mKeyVal.startsWith('temp_');

        if (isTemp) {
          // 新增主檔：移出臨時主鍵，讓 Django 自動產生
          delete payload[masterKey];
          const res = await axios.post(getFullUrl(masterApiUrl), payload);
          const realKey = res.data[masterKey];
          // 註冊臨時鍵與真實鍵對照，供後續明細對接外鍵使用
          tempParentKeyMap[mKeyVal] = realKey;
        } else {
          // 修改主檔
          await axios.put(`${getFullUrl(masterApiUrl)}${mKeyVal}/`, payload);
        }
      }

      // 4) 儲存/異動明細 (Upsert Detail)
      for (const detailRow of detailList) {
        const dKeyVal = detailRow[detailKey];
        if (deletedDetailKeys.includes(dKeyVal)) {
          continue;
        }

        let rawPayload = typeof buildDetailPayload === 'function'
          ? buildDetailPayload(detailRow, tempParentKeyMap)
          : { ...detailRow };

        if (rawPayload === null || rawPayload === undefined) {
          console.warn('buildDetailPayload returned null/undefined, skipping row:', detailRow);
          continue;
        }

        // 拷貝 Payload 以防污染 React State 內的 row 物件
        const payload = { ...rawPayload };

        // 3. 保底 detailParentKey
        if (payload[detailParentKey] === undefined || payload[detailParentKey] === null) {
          payload[detailParentKey] = detailRow[detailParentKey] || (selectedMaster ? selectedMaster[masterKey] : null);
        }

        // 解析 parent key (外鍵關聯)
        const parentKeyVal = payload[detailParentKey];
        // 如果 parent key 在 tempParentKeyMap 對照表內，代表是剛新增的主檔，需動態替換為真實主鍵
        if (parentKeyVal && typeof parentKeyVal === 'string' && parentKeyVal.startsWith('temp_')) {
          if (tempParentKeyMap[parentKeyVal]) {
            payload[detailParentKey] = tempParentKeyMap[parentKeyVal];
          }
        }

        const isTemp = typeof dKeyVal === 'string' && dKeyVal.startsWith('temp_');

        if (isTemp) {
          // 新增明細：送出前刪除 temp key
          delete payload[detailKey];
          await axios.post(getFullUrl(detailApiUrl), payload);
        } else {
          // 修改明細
          await axios.put(`${getFullUrl(detailApiUrl)}${dKeyVal}/`, payload);
        }
      }

      message.success('主從資料儲存成功！');
      
      // a. 清 dirty 狀態與重設暫存
      clearDirtyState();
      
      // b. isEditing false
      setIsEditing(false);

      // c. await afterSave
      if (typeof afterSave === 'function') {
        await afterSave();
      }

      // d. await onRetrieve 或 fetchMaster
      if (typeof onRetrieve === 'function') {
        await onRetrieve();
      } else {
        await fetchMaster();
      }
    } catch (err) {
      console.error('Save all failed:', err);
      message.error('儲存失敗：' + parseDrfError(err, fieldLabels));
    } finally {
      setLoading(false);
    }
  };

  // 11b. replaceDetailRows — 批次取代 detail rows（通用，不清 master 狀態）
  //   newRows        : 新的 detail rows 完整陣列
  //   markDirty=true : 是否將所有新 rows 加入 editedDetails 髒標記
  const replaceDetailRows = (newRows, { markDirty = true } = {}) => {
    if (!selectedMaster) return;
    const currentParentKeyVal = selectedMaster[masterKey];
    
    // 過濾出屬於目前主檔的 rows，防範混入其他主檔的明細
    const filteredRows = newRows.filter(row => row[detailParentKey] === currentParentKeyVal);
    
    setDetailRows(filteredRows);
    if (markDirty) {
      const dirtyMap = {};
      filteredRows.forEach(row => {
        const k = row[detailKey];
        if (k !== undefined && k !== null) {
          dirtyMap[k] = row;
        }
      });
      setEditedDetails(prev => ({ ...prev, ...dirtyMap }));
      setIsEditing(true);
    }
    setActiveArea('detail');
  };

  // 11c. updateDetailRows — 以 updater function 更新 detail rows
  //   updater   : (prevRows: Array) => Array
  //   markDirty : 是否清 editedDetails（預設不標記，由呼叫端自行決定）
  const updateDetailRows = (updater, { markDirty = false } = {}) => {
    setDetailRows(prev => {
      const next = updater(prev);
      if (markDirty) {
        const dirtyMap = {};
        next.forEach(row => {
          const k = row[detailKey];
          if (k !== undefined && k !== null) {
            dirtyMap[k] = row;
          }
        });
        setEditedDetails(prevEdited => ({ ...prevEdited, ...dirtyMap }));
        setIsEditing(true);
      }
      return next;
    });
  };

  // 11d. markDetailRowsDirty — 將指定 rows 加入 editedDetails 髒標記
  //   rows : Array of detail row objects（需包含 detailKey 欄位）
  const markDetailRowsDirty = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    setEditedDetails(prev => {
      const next = { ...prev };
      rows.forEach(row => {
        const k = row[detailKey];
        if (k !== undefined && k !== null) {
          next[k] = row;
        }
      });
      return next;
    });
    setIsEditing(true);
  };

  // 12. 透過 Ref 封裝 callback 以免事件監聽器發生過期閉包
  const opsRef = useRef({});
  useEffect(() => {
    opsRef.current = {
      handleCancel,
      handleAddMaster,
      handleAddDetail,
      confirmDeleteMaster,
      confirmDeleteDetail,
      handleSaveAll,
      activeArea,
      selectedMaster,
      selectedDetail
    };
  });

  // 13. 監聽全域 MDI Command 指令
  useEffect(() => {
    if (!sheetId) return;

    const handleGlobalCommand = (e) => {
      if (!e || !e.detail) return;
      const { action, targetSheet } = e.detail;

      if (targetSheet?.toLowerCase() === sheetId.toLowerCase()) {
        const ops = opsRef.current;
        console.log(`⚡ [useMasterDetailCrud] Intercepted command: ${action} for ${sheetId}`);
        
        switch (action) {
          case 'retrieve':
            ops.handleCancel(); // 重新載入，等於取消編輯
            break;
          case 'edit':
            setIsEditing(true);
            break;
          case 'insert':
            if (ops.activeArea === 'detail') {
              if (disableDetailAddAction) {
                message.info('明細由主檔尺碼範圍自動產生，請調整主檔尺碼欄位。');
              } else {
                ops.handleAddDetail();
              }
            } else {
              ops.handleAddMaster();
            }
            break;
          case 'delete':
            if (ops.activeArea === 'detail') {
              if (ops.selectedDetail) {
                ops.confirmDeleteDetail(ops.selectedDetail);
              } else {
                message.warning('請先選擇要刪除的明細資料！');
              }
            } else {
              if (ops.selectedMaster) {
                ops.confirmDeleteMaster(ops.selectedMaster);
              } else {
                message.warning('請先選擇要刪除的主檔資料！');
              }
            }
            break;
          case 'save':
            ops.handleSaveAll();
            break;
          case 'cancel':
            ops.handleCancel();
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
    // 狀態
    masterRows,
    setMasterRows,
    detailRows,
    setDetailRows,
    selectedMaster,
    setSelectedMaster,
    selectedDetail,
    setSelectedDetail,
    activeArea,
    setActiveArea,
    isEditing,
    setIsEditing,
    loading,
    setLoading,
    deletedMasterKeys,
    deletedDetailKeys,
    editedMasters,
    editedDetails,
    isDirty,

    // 方法
    fetchMaster,
    fetchDetail,
    handleSelectMaster,
    handleSelectDetail,
    handleAddMaster,
    handleAddDetail,
    handleMasterFieldChange,
    handleDetailFieldChange,
    confirmDeleteMaster,
    confirmDeleteDetail,
    handleCancel,
    handleSaveAll,

    // 通用 detail rows 操作方法（供需要程式化更新 detail 的 Sheet 使用，如 DP004）
    replaceDetailRows,
    updateDetailRows,
    markDetailRowsDirty
  };
}
