import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Ba003Sheet() {
  const columns = [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'corigin', label: '產地名稱(中)', width: '260px', editable: true, type: 'string' },
    { key: 'eorigin', label: '產地名稱(英)', width: '260px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/ba003/';

  return (
    <ERPSheetPage 
      sheetId="ba003" 
      title="產地設定檔" 
      breadcrumb="基本資料管理 > 產地設定"
    >
      <Win32DataWindow 
        columns={columns}
        apiUrl={apiUrl}
        title="ba003--產地設定"
        sheetId="ba003"
      />
    </ERPSheetPage>
  );
}

