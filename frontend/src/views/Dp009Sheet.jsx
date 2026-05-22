import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Dp009Sheet() {
  const columns = [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'cmakedescription', label: '加工描述 (中)', width: '320px', editable: true, type: 'string' },
    { key: 'emakedescription', label: 'Processing Method (EN)', width: '320px', editable: true, type: 'string' }
  ];

  const apiUrl = 'http://localhost:8001/api/dp009/';

  return (
    <ERPSheetPage
      sheetId="dp009"
      title="DP009 部件加工設定"
      breadcrumb={['開發管理', '部件加工設定']}
    >
      <Win32DataWindow
        columns={columns}
        apiUrl={apiUrl}
        title="dp009--部件加工設定"
        sheetId="dp009"
        sequenceField="serialno"
        autoRenumber={true}
      />
    </ERPSheetPage>
  );
}
