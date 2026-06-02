import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { message } from 'antd';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSplitGridLayout from '../components/erp/layout/ERPSplitGridLayout';
import '../styles/erp-split-grid-layout.css';

export default function Mr015Sheet() {
  const [selectedMaster, setSelectedMaster] = useState(null);
  const selectedMasterRef = useRef(null);
  const [focusedGrid, setFocusedGrid] = useState('master'); // master | detail

  /**
   * Master columns: mr015 材料大類
   */
  const masterColumns = useMemo(
    () => [
      {
        key: 'serialno',
        label: '流水號',
        width: '80px',
        editable: false,
        type: 'number',
      },
      {
        key: 'matno',
        label: '大類代號',
        width: '120px',
        editable: true,
        type: 'string',
        maxLength: 20,
      },
      {
        key: 'cname',
        label: '中文名稱',
        width: '200px',
        editable: true,
        type: 'string',
        maxLength: 60,
      },
      {
        key: 'ename',
        label: '英文名稱',
        width: '200px',
        editable: true,
        type: 'string',
        maxLength: 60,
      },
    ],
    []
  );

  /**
   * Detail columns: mr016 材料小類
   *
   * 注意：
   * mr015gkey 雖然 hidden，但必須保留在 row / payload 中。
   * hidden 只代表 UI 不顯示，不代表不存檔。
   */
  const detailColumns = useMemo(
    () => [
      {
        key: 'serialno',
        label: '流水號',
        width: '80px',
        editable: false,
        type: 'number',
      },
      {
        key: 'smatno',
        label: '小類代號',
        width: '120px',
        editable: true,
        type: 'string',
        maxLength: 20,
        required: true,
      },
      {
        key: 'cname',
        label: '中文名稱',
        width: '200px',
        editable: true,
        type: 'string',
        maxLength: 60,
      },
      {
        key: 'ename',
        label: '英文名稱',
        width: '200px',
        editable: true,
        type: 'string',
        maxLength: 60,
      },
      {
        key: 'mr015gkey',
        label: 'mr015gkey',
        editable: true,
        hidden: true,
        persist: true,
      },
    ],
    []
  );

  const currentMaster = selectedMasterRef.current || selectedMaster;
  const currentMasterGkey = currentMaster?.gkey || '';

  /**
   * Detail API URL
   *
   * 使用相對路徑，交給現有 axios baseURL / dev proxy 處理。
   * 不要寫死 localhost:8001，避免不同環境或 proxy 設定失效。
   */
  const detailApiUrl =
    currentMasterGkey && !String(currentMasterGkey).startsWith('temp_')
      ? `/api/mr016/?mr015gkey=${encodeURIComponent(currentMasterGkey)}`
      : '';

  /**
   * 左側 master row select
   *
   * 用 ref 保存即時值，避免 detail insert 時拿到 stale state。
   */
  const handleMasterSelect = useCallback((row) => {
    selectedMasterRef.current = row || null;
    setSelectedMaster(row || null);

    console.log('[MR015 MASTER SELECT]', {
      row,
      gkey: row?.gkey,
      matno: row?.matno,
    });
  }, []);

  /**
   * 防止尚未選擇 master 或 master 尚未存檔時新增 detail。
   */
  const handleBeforeInsertDetail = useCallback(() => {
    const master = selectedMasterRef.current || selectedMaster;
    const masterGkey = master?.gkey;

    console.log('[MR015 DETAIL BEFORE INSERT]', {
      selectedMasterRef: selectedMasterRef.current,
      selectedMaster,
      master,
      masterGkey,
    });

    if (!masterGkey) {
      message.warning('請先選擇左側材料大類，再新增小類');
      return false;
    }

    if (String(masterGkey).startsWith('temp_')) {
      message.warning('請先儲存左側材料大類，再新增小類');
      return false;
    }

    return true;
  }, [selectedMaster]);

  /**
   * 新增 detail row 時自動帶入 mr015gkey。
   *
   * 注意：
   * 這裡故意用 function，讓 Win32DataWindow 在真正 insert 當下即時取值，
   * 避免 React stale closure。
   */
  const getDetailDefaultValues = useCallback(() => {
    const master = selectedMasterRef.current || selectedMaster;
    const masterGkey = master?.gkey || '';

    const defaults = {
      mr015gkey: masterGkey,
    };

    console.log('[MR015 DETAIL DEFAULT VALUES]', {
      master,
      defaults,
    });

    return defaults;
  }, [selectedMaster]);

  /**
   * 全域 toolbar command routing
   *
   * 重要修正：
   * Save 不再同時存 master + detail。
   * Save 只存目前 focusedGrid，避免 detail 中空白草稿列被一起送出，
   * 造成 smatno / mr015gkey 必填錯誤。
   */
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail || {};

      if (targetSheet !== 'mr015') {
        return;
      }

      if (action === 'save') {
        const target = focusedGrid === 'master' ? 'mr015_master' : 'mr015_detail';

        console.log('[MR015 GLOBAL SAVE ROUTE]', {
          action,
          focusedGrid,
          target,
          selectedMaster: selectedMasterRef.current || selectedMaster,
        });

        window.dispatchEvent(
          new CustomEvent('mdi-global-command', {
            detail: {
              action: 'save',
              targetSheet: target,
            },
          })
        );

        return;
      }

      if (action === 'retrieve') {
        console.log('[MR015 GLOBAL RETRIEVE ROUTE]', {
          action,
          target: 'mr015_master',
        });

        /**
         * Retrieve 只重查 master。
         * detail 會隨 selectedMaster 與 key 變化重新載入。
         */
        selectedMasterRef.current = null;
        setSelectedMaster(null);
        setFocusedGrid('master');

        window.dispatchEvent(
          new CustomEvent('mdi-global-command', {
            detail: {
              action: 'retrieve',
              targetSheet: 'mr015_master',
            },
          })
        );

        return;
      }

      /**
       * insert / delete / edit 等操作只送到目前 focused grid。
       */
      const target = focusedGrid === 'master' ? 'mr015_master' : 'mr015_detail';

      console.log('[MR015 GLOBAL COMMAND ROUTE]', {
        action,
        focusedGrid,
        target,
        selectedMaster: selectedMasterRef.current || selectedMaster,
      });

      window.dispatchEvent(
        new CustomEvent('mdi-global-command', {
          detail: {
            action,
            targetSheet: target,
          },
        })
      );
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);

    return () => {
      window.removeEventListener('mdi-global-command', handleGlobalCommand);
    };
  }, [focusedGrid, selectedMaster]);

  const leftGrid = (
    <div
      className={`erp-split-grid-wrapper ${focusedGrid === 'master' ? 'is-focused' : ''}`}
      onClick={() => setFocusedGrid('master')}
    >
      <div className="erp-split-grid-header">
        <span>材料大類 Master</span>
        <span className="focus-badge">
          {focusedGrid === 'master' ? '作用中' : '可點選'}
        </span>
      </div>

      <Win32DataWindow
        sheetId="mr015_master"
        apiUrl="/api/mr015/"
        title="材料大類設定"
        columns={masterColumns}
        sequenceField="serialno"
        autoRenumber={true}
        onRowSelect={handleMasterSelect}
      />
    </div>
  );

  const rightGrid = (
    <div
      className={`erp-split-grid-wrapper ${focusedGrid === 'detail' ? 'is-focused' : ''}`}
      onClick={() => setFocusedGrid('detail')}
    >
      <div className="erp-split-grid-header">
        <span>
          材料小類 Detail -{' '}
          {currentMaster
            ? `目前大類：${currentMaster.matno || ''} ${currentMaster.cname || ''}`
            : '未選取大類'}
        </span>
        <span className="focus-badge">
          {focusedGrid === 'detail' ? '作用中' : '可點選'}
        </span>
      </div>

      {detailApiUrl ? (
        <Win32DataWindow
          /**
           * 重要：
           * 切換不同 master 時強制重新 mount detail grid，
           * 避免保留前一個 master 的 rows / dirtyMap / temp row。
           */
          key={currentMasterGkey || 'no-master'}
          sheetId="mr015_detail"
          apiUrl={detailApiUrl}
          title="材料小類設定"
          columns={detailColumns}
          sequenceField="serialno"
          autoRenumber={true}
          onBeforeInsert={handleBeforeInsertDetail}
          defaultValues={getDetailDefaultValues}
          debugSelectedMaster={currentMaster}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            color: '#9ca3af',
            fontSize: '14px',
            minHeight: 240,
          }}
        >
          請先選擇左側已存檔的材料大類，以載入對應的小類資料。
        </div>
      )}
    </div>
  );

  return (
    <ERPSheetPage
      sheetId="mr015"
      title="材料大類設定"
      breadcrumb={['資材部門管理', '材料大類設定']}
    >
      <ERPSplitGridLayout
        leftPanel={leftGrid}
        rightPanel={rightGrid}
        defaultSplit={50}
        minWidth={300}
      />
    </ERPSheetPage>
  );
}