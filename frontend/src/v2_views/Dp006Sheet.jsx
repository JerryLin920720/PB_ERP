import React, { useState, useEffect } from 'react';
import axios from 'axios';
import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

// 預先宣告 DataWindowSheet 元件，確保組件參考在 Render 過程中保持穩定
const DataWindowSheet = createDataWindowSheet({
  sheetId: 'dp006',
  title: '部位基本資料設定',
  breadcrumb: ['開發管理', '部位基本資料'],
  apiUrl: 'http://localhost:8001/api/dp006/',
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [] // 初始值為空，將由 Wrapper component 動態傳入 props.columns 覆蓋
});

/**
 * DP006Sheet - 部位基本資料設定
 * 
 * 符合 V2 架構規範的 SingleTableSheet.
 * 1. 驗證 SingleTableSheet 對「動態載入外鍵選單 (dp005gkey)」的支援.
 * 2. 僅保留載入 dp005 類別資料所需的最小 React state/useEffect, CRUD 本身全權委託給 Win32DataWindow 處理.
 */
export default function Dp006Sheet() {
  const [dp005Options, setDp005Options] = useState([]);

  useEffect(() => {
    // 僅用於非同步加載外鍵 (dp005gkey) 的 options，不干涉 CRUD 核心控制
    axios.get('http://localhost:8001/api/dp005/')
      .then(res => {
        const data = res.data || [];
        const opts = data.map(row => ({
          value: row.gkey,
          label: row.partgroup || row.epartgroup || row.parttype || row.gkey
        }));
        setDp005Options(opts);
      })
      .catch(err => {
        console.error('DP006: 載入部位類別選項失敗：', err);
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
      options: dp005Options
    }
  ];

  return <DataWindowSheet columns={columns} />;
}
