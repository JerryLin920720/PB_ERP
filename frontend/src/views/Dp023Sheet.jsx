import React, { useState, useEffect } from 'react';
import { Divider, Space, Tag, Typography } from 'antd';
import { BlockOutlined } from '@ant-design/icons';
import axios from 'axios';
import Win32DataWindow from '../components/Win32DataWindow';
import './MdSheetLayout.css';

const API_URL = 'http://localhost:8001/api/';

/**
 * 📦 DP023 組別基本資料管理
 * 物理對齊: w_dp023.srw / d_dp023.srd
 */
export default function Dp023Sheet() {
  const { Text } = Typography;
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
    <div className="dp023-premium-container md-sheet-container">
      <div className="md-sheet-header">
        <Space>
          <BlockOutlined style={{ color: '#096dd9' }} />
          <span className="md-sheet-title">DP023 組別基本資料管理</span>
          <Divider type="vertical" />
          <Tag color="blue">VIEWING</Tag>
        </Space>
        <span className="md-sheet-version">PB Master-Detail Parity v3.2</span>
      </div>
      <div className="md-query-panel">
        <div className="dw-where-panel">
          <Text type="secondary" style={{ fontSize: 12 }}>
            使用上方工具列執行查詢、編輯、增行、刪行與儲存。
          </Text>
        </div>
        <div className="md-query-grid">
          <Win32DataWindow 
            sheetId="dp023"
            title="DP023 組別基本資料管理"
            apiUrl={`${API_URL}dp023/`}
            columns={columns}
          />
        </div>
      </div>
    </div>
  );
}
