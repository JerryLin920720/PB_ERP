import React from 'react';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Dp005Sheet() {
  const columns = [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'partgroup', label: '類別名稱 (中文)', width: '220px', editable: true, type: 'string' },
    { key: 'epartgroup', label: '類別名稱 (英文)', width: '220px', editable: true, type: 'string' },
    { 
      key: 'parttype', 
      label: '部位別 (Type)', 
      width: '180px', 
      editable: true, 
      type: 'select',
      required: true,
      options: [
        { value: 'UPPER', label: 'UPPER' },
        { value: 'LINING', label: 'LINING' },
        { value: 'SOCK', label: 'SOCK' },
        { value: 'OUTSOLE', label: 'OUTSOLE' },
        { value: 'HEEL', label: 'HEEL' },
        { value: 'TONGUE', label: 'TONGUE' },
        { value: 'ORNAMENT', label: 'ORNAMENT' },
        { value: 'OTHER', label: 'OTHER' }
      ]
    }
  ];

  const apiUrl = 'http://localhost:8001/api/dp005/';

  return (
    <ERPSheetPage
      sheetId="dp005"
      title="DP005 部位類別設定"
      breadcrumb={['開發管理', '部位類別設定']}
    >
      <Win32DataWindow
        columns={columns}
        apiUrl={apiUrl}
        title="dp005--部位類別設定"
        sheetId="dp005"
        sequenceField="serialno"
        autoRenumber={true}
      />
    </ERPSheetPage>
  );
}
