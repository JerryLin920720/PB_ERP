import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Card, Tag, Row, Col, Form, message, Popconfirm, Divider } from 'antd';
import { SafetyCertificateOutlined, SearchOutlined, SaveOutlined, ReloadOutlined, FileSearchOutlined, DownOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api/';

export default function Dp050Sheet() {
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // 💾 Data Stores
  const [masterColors, setMasterColors] = useState([]); // Displays Dp031 items joined with Sample No
  const [selectedColor, setSelectedColor] = useState(null);

  const [dp033Sizes, setDp033Sizes] = useState([]); // Bottom grid sizes for selected color
  
  // 🔎 Search Criteria
  const [qSampleNo, setQSampleNo] = useState('');
  const [qYear, setQYear] = useState('');

  // State cache for lookup
  const STATUS_MAP = {
    '0': { label: '❌ 已取消 (Cancelled)', color: '#f5222d' },
    '1': { label: '🕒 待打樣待出 (Pending)', color: '#fa8c16' },
    '2': { label: '🏃 部分點發 (In Progress)', color: '#1890ff' },
    '3': { label: '✅ 簽結完成 (Finished)', color: '#52c41a' }
  };

  useEffect(() => {
    doQuery();
  }, []);

  const doQuery = async () => {
    setLoading(true);
    try {
      // To load Dp031 with sample info we can query Dp031 API, 
      // which in serializer includes sample master attributes! Let's add parameters if needed.
      const params = {};
      const res = await axios.get(`${API_URL}dp031/`, { params });
      
      let filtered = res.data;
      if (qSampleNo) {
        filtered = filtered.filter(item => 
          (item.sampleno && item.sampleno.toLowerCase().includes(qSampleNo.toLowerCase())) ||
          (item.styleno && item.styleno.toLowerCase().includes(qSampleNo.toLowerCase()))
        );
      }
      setMasterColors(filtered);
      setSelectedColor(null);
      setDp033Sizes([]);
    } catch (err) {
      message.error('獲取樣品配色主檔異常');
    } finally {
      setLoading(false);
    }
  };

  const loadColorSizes = async (colorRow) => {
    setSelectedColor(colorRow);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API_URL}dp033/?dp031gkey=${colorRow.gkey}`);
      // Hydrate client-only temporary receive input column
      const hydrated = res.data.map(sz => ({
        ...sz,
        thisreceive: 0 // default to zero incoming receipt
      }));
      setDp033Sizes(hydrated);
    } catch (err) {
      message.error('尺碼明細加載失敗');
    } finally {
      setDetailLoading(false);
    }
  };

  // ==========================================
  // ⚡ MASTER ACTION: MANUALLY OVERRIDE COLOR STATUS
  // ==========================================
  const handleOverrideStatus = async (row, newStatus) => {
    try {
      await axios.patch(`${API_URL}dp031/${row.gkey}/`, { status: newStatus });
      message.success(`🎨 配色狀態已強行修正為 [${STATUS_MAP[newStatus]?.label}]！`);
      doQuery(); // Refresh
    } catch (e) {
      message.error('變更狀態失敗！');
    }
  };

  // ==========================================
  // ⚡ DETAIL ACTION: DYNAMIC RECEIVE ACCUMULATION
  // ==========================================
  const updateReceiveInput = (idx, val) => {
    const copy = [...dp033Sizes];
    copy[idx].thisreceive = parseFloat(val) || 0;
    setDp033Sizes(copy);
  };

  const handleSaveReceipts = async () => {
    const receiving = dp033Sizes.filter(s => s.thisreceive > 0);
    if (receiving.length === 0) {
      message.warning('⚠️ 本次點收雙數皆為 0，無需儲存！');
      return;
    }

    setDetailLoading(true);
    try {
      const payload = {
        items: receiving.map(s => ({ gkey: s.gkey, thisreceive: s.thisreceive }))
      };

      // Call backend custom atomic action
      const res = await axios.post(`${API_URL}dp033/receive_samples/`, payload);
      
      if (res.data.success) {
        message.success(res.data.message);
        // Refresh parent list and current detailed grids to reflect cascade status update
        const savedKey = selectedColor.gkey;
        await doQuery();
        
        // Relocate and reload the selected row
        const res2 = await axios.get(`${API_URL}dp031/${savedKey}/`);
        loadColorSizes(res2.data);
      }
    } catch (e) {
      message.error('物理點收存檔失敗：' + (e.response?.data?.detail || e.message));
    } finally {
      setDetailLoading(false);
    }
  };

  const colorColumns = [
    {
      title: '樣品單號 (Sample No)',
      dataIndex: 'sampleno',
      render: (v, r) => (
        <div className="modern-sheet-container">
          {v || '未鏈接'} 
          {r.styleno && <span style={{ color: '#8c8c8c', fontSize: '11px', fontWeight: 'normal' }}> ({r.styleno})</span>}
        </div>
      )
    },
    { title: '顏色代碼', dataIndex: 'colorno', width: 100 },
    { title: '配色名稱', dataIndex: 'color', width: 180 },
    {
      title: '🚦 當前物理狀態',
      dataIndex: 'status',
      width: 160,
      render: (v) => {
        const spec = STATUS_MAP[v] || { label: `未知 [${v}]`, color: 'default' };
        return <Tag color={spec.color} style={{ fontWeight: 'bold' }}>{spec.label}</Tag>;
      }
    },
    {
      title: '⚙️ 強制簽審修正',
      key: 'actions',
      width: 180,
      render: (_, r) => (
        <Select 
          size="small"
          style={{ width: '100%' }} 
          value={r.status} 
          onChange={val => handleOverrideStatus(r, val)}
          options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
        />
      )
    }
  ];

  const sizeColumns = [
    { title: '序號', dataIndex: 'serialno', width: 60 },
    { title: '尺碼 (Size)', dataIndex: 'size', width: 100, render: v => <Tag color="volcano" style={{ fontWeight: 'bold' }}>US {v}</Tag> },
    {
      title: '總需求雙數 (客+留)',
      key: 'req',
      width: 150,
      render: (_, r) => (parseFloat(r.custpairs || 0) + parseFloat(r.keeppairs || 0)).toFixed(1)
    },
    {
      title: '🏭 已出貨寄出 (finishpairs)',
      dataIndex: 'finishpairs',
      width: 160,
      render: v => <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{(parseFloat(v) || 0).toFixed(1)}</span>
    },
    {
      title: '🏢 歷史已收 (receive)',
      dataIndex: 'receive',
      width: 140,
      render: v => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{(parseFloat(v) || 0).toFixed(1)}</span>
    },
    {
      title: '📥 本次收到 (thisreceive)',
      dataIndex: 'thisreceive',
      width: 160,
      render: (v, r, idx) => (
        <Input 
          type="number" 
          value={v} 
          onChange={e => updateReceiveInput(idx, e.target.value)} 
          style={{ background: '#f6ffed', borderColor: '#b7eb8f', color: '#389e0d', fontWeight: '800' }} 
        />
      )
    },
    {
      title: '🏁 完成概況比對',
      key: 'summary',
      render: (_, r) => {
        const req = parseFloat(r.custpairs || 0) + parseFloat(r.keeppairs || 0);
        const fin = parseFloat(r.finishpairs || 0);
        const rec = parseFloat(r.receive || 0);
        const total = fin + rec;
        const diff = req - total;

        if (diff <= 0) {
          return <Tag color="success">全面簽結</Tag>;
        } else {
          return <span style={{ color: '#cf1322', fontSize: '12px', fontWeight: 'bold' }}>欠 {diff.toFixed(1)} 雙</span>;
        }
      }
    }
  ];

  return (
    <div className="modern-sheet-container" style={{ padding: '16px', backgroundColor: 'var(--app-bg-panel)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Action Bar */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#5b8c00', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SafetyCertificateOutlined /> DP050 樣品單審核與物理簽收管理
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={doQuery}>查詢重置</Button>
        </Space>
      </div>

      {/* Double Tier Grid Split-View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        
        {/* 🥞 TOP TIER: Master Color Status Overrider */}
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 'bold', color: '#1f1f1f', fontSize: '15px' }}>📊 階段 1: 篩選樣品單配色項次</span>
            <Space>
              <Input placeholder="單號/型體..." style={{ width: 180 }} value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} onPressEnter={doQuery} />
              <Button type="primary" icon={<SearchOutlined />} onClick={doQuery} style={{ background: '#5b8c00', border: '#5b8c00' }}>檢索</Button>
            </Space>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Table 
              loading={loading}
              dataSource={masterColors}
              columns={colorColumns}
              rowKey="gkey"
              size="middle"
              bordered
              pagination={{ pageSize: 6 }}
              onRow={(record) => ({
                onClick: () => loadColorSizes(record),
                style: { cursor: 'pointer', background: selectedColor?.gkey === record.gkey ? '#f6ffed' : 'inherit' }
              })}
            />
          </div>
        </div>

        {/* 🥞 BOTTOM TIER: Physical Receiving Grid */}
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', borderTop: '4px solid #73d13d', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DownOutlined style={{ color: '#73d13d' }} />
              <span style={{ fontWeight: 'bold', color: '#1f1f1f', fontSize: '15px' }}>📥 階段 2: 成品實物點收錄入 (Size Runners)</span>
              {selectedColor && (
                <Tag color="green" style={{ fontWeight: 'bold', marginLeft: 8 }}>
                  當前選擇: {selectedColor.sampleno} / {selectedColor.color}
                </Tag>
              )}
            </div>

            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              style={{ background: '#389e0d', borderColor: '#389e0d' }} 
              disabled={!selectedColor}
              onClick={handleSaveReceipts}
            >
              儲存物理點收單
            </Button>
          </div>

          {selectedColor ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Table 
                loading={detailLoading}
                dataSource={dp033Sizes}
                columns={sizeColumns}
                rowKey="gkey"
                size="middle"
                bordered
                pagination={false}
              />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#bfbfbf', backgroundColor: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
              <FileSearchOutlined style={{ fontSize: '36px', marginBottom: '8px' }} />
              <span>請於上方表格中，點擊選定一筆「樣品配色」以執行二階尺碼實物點收。</span>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
