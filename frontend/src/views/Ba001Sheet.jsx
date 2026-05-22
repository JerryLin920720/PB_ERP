import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Ba001Sheet() {
  // 1. 定義 ba001 欄位配置對象
  const columns = [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'description', label: '片語說明', width: '420px', editable: true, type: 'string' },
    { key: 'f2type', label: '類別代號', width: '120px', editable: true, type: 'string' }
  ];

  // API 路由，對接 Django 後端 (對接 8001 埠)
  const apiUrl = 'http://localhost:8001/api/ba001/';

  return (
    <ERPSheetPage 
      sheetId="ba001" 
      title="個人片語字庫設定" 
      breadcrumb={['基本資料管理', '個人片語']}
      mode="view"
    >
      <Win32DataWindow 
        columns={columns}
        apiUrl={apiUrl}
        title="ba001--個人片語字庫設定"
        sheetId="ba001"
      />
    </ERPSheetPage>
  );
}

