import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

export default function Dp006Sheet() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8001/api/dp005/')
      .then(res => {
        setCategories(res.data);
      })
      .catch(err => {
        console.error('載入部位類別資料失敗:', err);
      });
  }, []);

  const columns = [
    { key: 'serialno', label: '序號', width: '80px', editable: false, type: 'number' },
    { key: 'parts', label: '部位名稱 (中文)', width: '220px', editable: true, type: 'string' },
    { key: 'eparts', label: '部位名稱 (英文)', width: '220px', editable: true, type: 'string' },
    {
      key: 'dp005gkey',
      label: '所屬部位類別',
      width: '250px',
      editable: true,
      type: 'select',
      options: categories.map(c => ({
        value: c.gkey,
        label: c.partgroup || c.epartgroup || c.parttype || c.gkey
      }))
    }
  ];

  const apiUrl = 'http://localhost:8001/api/dp006/';

  return (
    <ERPSheetPage
      sheetId="dp006"
      title="DP006 部位基本資料"
      breadcrumb={['開發管理', '部位基本資料']}
    >
      <Win32DataWindow
        columns={columns}
        apiUrl={apiUrl}
        title="dp006--部位基本資料"
        sheetId="dp006"
        sequenceField="serialno"
        autoRenumber={true}
      />
    </ERPSheetPage>
  );
}
