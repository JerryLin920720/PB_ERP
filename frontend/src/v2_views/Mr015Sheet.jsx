import React, { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSplitGridLayout from '../components/erp/layout/ERPSplitGridLayout';
import '../styles/erp-split-grid-layout.css';

export default function Mr015Sheet() {
  const [selectedMaster, setSelectedMaster] = useState(null);
  const selectedMasterRef = useRef(null);
  const [focusedGrid, setFocusedGrid] = useState('master'); // 'master' or 'detail'

  // Master columns
  const masterColumns = [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'matno', label: '大類代號', width: '120px', editable: true, type: 'string', maxLength: 20 },
    { key: 'cname', label: '中文名稱', width: '200px', editable: true, type: 'string', maxLength: 60 },
    { key: 'ename', label: '英文名稱', width: '200px', editable: true, type: 'string', maxLength: 60 }
  ];

  // Detail columns
  const detailColumns = [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'smatno', label: '小類代號', width: '120px', editable: true, type: 'string', maxLength: 20 },
    { key: 'cname', label: '中文名稱', width: '200px', editable: true, type: 'string', maxLength: 60 },
    { key: 'ename', label: '英文名稱', width: '200px', editable: true, type: 'string', maxLength: 60 },
    { key: 'mr015gkey', label: 'mr015gkey', editable: true, hidden: true }
  ];

  // Derive detail API URL based on selected master key
  const detailApiUrl = selectedMaster && selectedMaster.gkey && !String(selectedMaster.gkey).startsWith('temp_')
    ? `http://localhost:8001/api/mr016/?mr015gkey=${selectedMaster.gkey}`
    : '';

  // Intercept global toolbar command from ERPSheetPage ('mr015') and route it
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;

      if (targetSheet === 'mr015') {
        console.log(`⚡ [Mr015Sheet] Routing global command: ${action} to ${focusedGrid}`);

        if (action === 'save') {
          // Save both Master and Detail grids
          window.dispatchEvent(new CustomEvent('mdi-global-command', {
            detail: { action: 'save', targetSheet: 'mr015_master' }
          }));
          window.dispatchEvent(new CustomEvent('mdi-global-command', {
            detail: { action: 'save', targetSheet: 'mr015_detail' }
          }));
        } else if (action === 'retrieve') {
          // Retrieve master reloads master (which will reset selectedMaster and thus reload detail)
          window.dispatchEvent(new CustomEvent('mdi-global-command', {
            detail: { action: 'retrieve', targetSheet: 'mr015_master' }
          }));
        } else {
          // insert, delete, edit go to the currently focused grid
          const target = focusedGrid === 'master' ? 'mr015_master' : 'mr015_detail';
          window.dispatchEvent(new CustomEvent('mdi-global-command', {
            detail: { action, targetSheet: target }
          }));
        }
      }
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => {
      window.removeEventListener('mdi-global-command', handleGlobalCommand);
    };
  }, [focusedGrid]);

  // Prevent inserting detail row if no valid master row is selected
  const handleBeforeInsertDetail = () => {
    const masterGkey = selectedMasterRef.current?.gkey || selectedMaster?.gkey;
    if (!masterGkey) {
      message.warning('請先選擇左側材料大類，再新增小類');
      return false;
    }
    if (String(masterGkey).startsWith('temp_')) {
      message.warning('請先儲存左側材料大類，再行新增小類。');
      return false;
    }
    return true;
  };

  // Provide foreign key default values for detail row
  const getDetailDefaultValues = () => {
    return {
      mr015gkey: selectedMasterRef.current?.gkey || selectedMaster?.gkey || ''
    };
  };

  const leftGrid = (
    <div 
      className={`erp-split-grid-wrapper ${focusedGrid === 'master' ? 'is-focused' : ''}`}
      onClick={() => setFocusedGrid('master')}
    >
      <div className="erp-split-grid-header">
        <span>材料大類 (Master)</span>
        <span className="focus-badge">{focusedGrid === 'master' ? '作用中' : '可點選'}</span>
      </div>
      <Win32DataWindow
        sheetId="mr015_master"
        apiUrl="http://localhost:8001/api/mr015/"
        title="材料大類設定"
        columns={masterColumns}
        sequenceField="serialno"
        autoRenumber={true}
        onRowSelect={(row) => {
          selectedMasterRef.current = row;
          setSelectedMaster(row);
        }}
      />
    </div>
  );

  const rightGrid = (
    <div 
      className={`erp-split-grid-wrapper ${focusedGrid === 'detail' ? 'is-focused' : ''}`}
      onClick={() => setFocusedGrid('detail')}
    >
      <div className="erp-split-grid-header">
        <span>材料小類 (Detail - {selectedMaster ? `目前大類: ${selectedMaster.matno || ''} ${selectedMaster.cname || ''}` : '未選取大類'})</span>
        <span className="focus-badge">{focusedGrid === 'detail' ? '作用中' : '可點選'}</span>
      </div>
      {detailApiUrl ? (
        <Win32DataWindow
          sheetId="mr015_detail"
          apiUrl={detailApiUrl}
          title="材料小類設定"
          columns={detailColumns}
          sequenceField="serialno"
          autoRenumber={true}
          sequenceScopeField="mr015gkey"
          sequenceScopeValue={selectedMasterRef.current?.gkey || selectedMaster?.gkey}
          onBeforeInsert={handleBeforeInsertDetail}
          defaultValues={getDetailDefaultValues}
          debugSelectedMaster={selectedMasterRef.current || selectedMaster}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', color: '#9ca3af', fontSize: '14px' }}>
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
