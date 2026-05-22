import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Dp002Sheet() {
  const columns = [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'sampletype', label: '代號', width: '120px', editable: true, type: 'string' },
    { key: 'samplename', label: '中文名稱', width: '220px', editable: true, type: 'string' },
    { key: 'sampleename', label: '英文名稱', width: '220px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/dp002/';

  return (
    <ERPSheetPage
      sheetId="dp002"
      title="DP002 樣品類別設定 (Sample Type Setup)"
      breadcrumb={['開發管理', '樣品類別設定']}
    >
      <Win32DataWindow
        columns={columns}
        apiUrl={apiUrl}
        title="dp002--樣品類別設定"
        sheetId="dp002"
        sequenceField="serialno"
        autoRenumber={true}
      />
    </ERPSheetPage>
  );
}
