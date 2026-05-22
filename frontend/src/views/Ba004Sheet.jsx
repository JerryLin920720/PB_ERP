import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Ba004Sheet() {
  const columns = [
    { key: 'serialno', label: '流水號', width: '80px', editable: false, type: 'number' },
    { key: 'areacode', label: '區域代號', width: '120px', editable: true, type: 'string' },
    { key: 'carea', label: '區域名稱(中)', width: '220px', editable: true, type: 'string' },
    { key: 'earea', label: '區域名稱(英)', width: '220px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/ba004/';

  return (
    <ERPSheetPage 
      sheetId="ba004" 
      title="區域設定檔" 
      breadcrumb="基本資料管理 > 區域設定"
    >
      <Win32DataWindow 
        columns={columns}
        apiUrl={apiUrl}
        title="ba004--區域設定"
        sheetId="ba004"
      />
    </ERPSheetPage>
  );
}

