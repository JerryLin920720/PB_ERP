import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Ba002Sheet() {
  const columns = [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'ccountry', label: '國家名稱(中)', width: '260px', editable: true, type: 'string' },
    { key: 'ecountry', label: '國家名稱(英)', width: '260px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/ba002/';

  return (
    <ERPSheetPage 
      sheetId="ba002" 
      title="國家設定檔" 
      breadcrumb="基本資料管理 > 國家設定"
    >
      <Win32DataWindow 
        columns={columns}
        apiUrl={apiUrl}
        title="ba002--國家設定"
        sheetId="ba002"
      />
    </ERPSheetPage>
  );
}

