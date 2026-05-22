import { useEffect, useRef } from 'react';

/**
 * useMdiCrud - 訂閱全域 MDI Toolbar 動作的 React Hook
 * 
 * @param {Object} params
 * @param {string} params.sheetId - 當前作業視窗 ID
 * @param {Function} [params.onRetrieve]
 * @param {Function} [params.onInsert]
 * @param {Function} [params.onEdit]
 * @param {Function} [params.onDelete]
 * @param {Function} [params.onSave]
 * @param {Function} [params.onCancel]
 * @param {Function} [params.onExport]
 * @param {Function} [params.onPrint]
 */
export default function useMdiCrud({
  sheetId,
  onRetrieve,
  onInsert,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  onExport,
  onPrint
}) {
  // 使用 Ref 存放 callbacks 引用，避免每次 Render 重綁 Event Listener 產生閉包問題
  const callbacksRef = useRef({});

  useEffect(() => {
    callbacksRef.current = {
      retrieve: onRetrieve,
      insert: onInsert,
      edit: onEdit,
      delete: onDelete,
      save: onSave,
      cancel: onCancel,
      export: onExport,
      print: onPrint
    };
  }, [onRetrieve, onInsert, onEdit, onDelete, onSave, onCancel, onExport, onPrint]);

  useEffect(() => {
    if (!sheetId) return;

    const handleGlobalCommand = (e) => {
      if (!e || !e.detail) return;
      
      const { action, targetSheet } = e.detail;
      
      // 僅響應針對當前 sheetId 的廣播
      if (targetSheet?.toLowerCase() === sheetId.toLowerCase()) {
        const callback = callbacksRef.current[action];
        if (typeof callback === 'function') {
          callback(e.detail);
        }
      }
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    
    return () => {
      window.removeEventListener('mdi-global-command', handleGlobalCommand);
    };
  }, [sheetId]);
}
