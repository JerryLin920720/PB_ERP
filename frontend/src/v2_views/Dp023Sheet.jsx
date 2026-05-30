import React, { useState, useEffect } from 'react';
import axios from 'axios';
import createDataWindowSheet from '../components/erp/factory/createDataWindowSheet';

const API_URL = 'http://localhost:8001/api/';

// 預先宣告 DataWindowSheet 元件，確保組件參考穩定，防止 React 重複掛載造成焦點丟失
const DataWindowSheet = createDataWindowSheet({
  sheetId: 'dp023',
  title: '組別基本資料管理',
  breadcrumb: ['開發管理', '組別基本資料管理'],
  apiUrl: `${API_URL}dp023/`,
  sequenceField: 'serialno',
  autoRenumber: true,
  columns: [] // 初始值為空，將由 Wrapper 元件的 props.columns 覆蓋
});

/**
 * DP023Sheet - 組別基本資料管理
 * 
 * 符合 V2 架構規範的 SingleTableSheet (由舊版 A2 結構升級為標準工廠宣告式).
 * 1. 驗證 SingleTableSheet 同時處理「多個外鍵/動態下拉選單」的支援能力 (楦頭、大底、鞋跟).
 * 2. 僅保留載入外鍵資料所需的最小 React state/useEffect, CRUD 動作與廣播全權委託.
 */
export default function Dp023Sheet() {
  const [lookups, setLookups] = useState({
    lasts: [],
    outsoles: [],
    heels: []
  });

  useEffect(() => {
    // 僅用於非同步加載多個外鍵選項，不涉及任何狀態控制或 CRUD 流程
    const fetchLookups = async () => {
      try {
        const [resL, resO, resH] = await Promise.all([
          axios.get(`${API_URL}dp010/`),
          axios.get(`${API_URL}dp015/`),
          axios.get(`${API_URL}dp020/`)
        ]);
        setLookups({
          lasts: resL.data.map(i => ({ value: i.gkey, label: i.lastno })),
          outsoles: resO.data.map(i => ({ value: i.gkey, label: i.bottomno })),
          heels: resH.data.map(i => ({ value: i.gkey, label: i.heelno }))
        });
      } catch (err) {
        console.error('DP023 V2: 載入外鍵下拉選項失敗：', err);
      }
    };
    fetchLookups();
  }, []);

  const columns = [
    { key: 'groupname', label: '🔑 組別名稱 (GroupName)', width: '250px', editable: true, type: 'string' },
    { 
      key: 'dp010gkey', 
      label: '👟 楦頭編號 (Last)', 
      width: '200px', 
      editable: true, 
      type: 'select', 
      options: lookups.lasts,
      displayKey: 'lastno' 
    },
    { 
      key: 'dp015gkey', 
      label: '⚙️ 大底編號 (Outsole)', 
      width: '200px', 
      editable: true, 
      type: 'select', 
      options: lookups.outsoles,
      displayKey: 'bottomno' 
    },
    { 
      key: 'dp020gkey', 
      label: '👠 鞋跟編號 (Heel)', 
      width: '200px', 
      editable: true, 
      type: 'select', 
      options: lookups.heels,
      displayKey: 'heelno' 
    }
  ];

  return <DataWindowSheet columns={columns} />;
}
