import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Dp003Sheet() {
  const columns = [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'shoetype', label: '鞋種類別 (中文)', width: '240px', editable: true, type: 'string' },
    { key: 'eshoetype', label: '鞋種類別 (英文)', width: '240px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/dp003/';

  return (
    <ERPSheetPage
      sheetId="dp003"
      title="DP003 鞋種類別設定 (Shoe Type Setup)"
      breadcrumb={['開發管理', '鞋種類別設定']}
    >
      <Win32DataWindow
        columns={columns}
        apiUrl={apiUrl}
        title="dp003--鞋種類別設定"
        sheetId="dp003"
        sequenceField="serialno"
        autoRenumber={true}
      />
    </ERPSheetPage>
  );
}
