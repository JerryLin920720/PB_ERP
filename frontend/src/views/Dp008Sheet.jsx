import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Dp008Sheet() {
  const columns = [
    { key: 'serialno', label: '序號', width: '100px', editable: false, type: 'number' },
    { key: 'socklabel', label: 'Sock Label 描述', width: '480px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/dp008/';

  return (
    <ERPSheetPage
      sheetId="dp008"
      title="DP008 Sock Label 設定"
      breadcrumb={['開發管理', 'Sock Label 設定']}
    >
      <Win32DataWindow
        columns={columns}
        apiUrl={apiUrl}
        title="dp008--Sock Label 設定"
        sheetId="dp008"
        sequenceField="serialno"
        autoRenumber={true}
      />
    </ERPSheetPage>
  );
}
