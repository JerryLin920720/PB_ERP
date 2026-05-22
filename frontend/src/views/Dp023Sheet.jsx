import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

const API_URL = 'http://localhost:8001/api/';

/**
 * 📦 DP023 組別基本資料管理
 * 物理對齊: w_dp023.srw / d_dp023.srd
 */
export default function Dp023Sheet() {
  const [lookups, setLookups] = useState({
    lasts: [],
    outsoles: [],
    heels: []
  });

  useEffect(() => {
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
        console.error('Failed to fetch lookups for DP023', err);
      }
    };
    fetchLookups();
  }, []);

  const columns = [
    { key: 'groupname', label: '🔑 組別名稱 (GroupName)', width: '250px', editable: true },
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

  return (
    <ERPSheetPage 
      sheetId="dp023" 
      title="組別基本資料管理" 
      breadcrumb="開發部門管理 > 組別基本資料管理"
    >
      <Win32DataWindow 
        sheetId="dp023"
        title="DP023 組別基本資料管理"
        apiUrl={`${API_URL}dp023/`}
        columns={columns}
      />
    </ERPSheetPage>
  );
}

