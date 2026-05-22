import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Dp001Sheet() {
  const columns = [
    { key: 'serialno', label: '流水號', width: '100px', editable: false, type: 'number' },
    { key: 'description', label: '片語描述', width: '520px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/dp001/';

  return (
    <ERPSheetPage
      sheetId="dp001"
      title="DP001 開發片語字庫 (Development Phrase Library)"
      breadcrumb={['開發管理', '開發片語字庫']}
    >
      <Win32DataWindow
        columns={columns}
        apiUrl={apiUrl}
        title="dp001--開發片語字庫"
        sheetId="dp001"
        sequenceField="serialno"
        autoRenumber={true}
      />
    </ERPSheetPage>
  );
}
