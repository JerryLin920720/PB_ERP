import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Card, Row, Col, Modal, Checkbox, Tag, message, Tooltip } from 'antd';
import { SearchOutlined, PrinterOutlined, ReloadOutlined, BarcodeOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api/';

// 🎨 Dynamic inject for standard 128-Barcode Font for perfect physical scanning support
const BarcodeFontLoader = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
    .scannable-barcode {
      font-family: 'Libre Barcode 128', cursive;
      font-size: 48px;
      line-height: 1;
    }
    @media print {
      body * {
        visibility: hidden;
      }
      .print-container, .print-container * {
        visibility: visible;
      }
      .print-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .label-card {
        page-break-inside: avoid;
        border: 1px solid #000 !important;
        margin-bottom: 15px;
      }
    }
  `}} />
);

export default function Dp035Sheet() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);

  // 🔎 Filters
  const [qCust, setQCust] = useState('');
  const [qYear, setQYear] = useState('');
  const [qSampleNo, setQSampleNo] = useState('');

  // Lookups Cache
  const [customers, setCustomers] = useState([]);

  // Preview Modal
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    fetchLookups();
    doQuery();
  }, []);

  const fetchLookups = async () => {
    try {
      const res = await axios.get(`${API_URL}ba010/`);
      setCustomers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const doQuery = async () => {
    setLoading(true);
    try {
      const params = {};
      if (qCust) params.ba010gkey = qCust;
      if (qYear) params.year = qYear;
      if (qSampleNo) params.sampleno = qSampleNo;

      // Fetch outstanding samples which provides sizes and color runner data
      const res = await axios.get(`${API_URL}dp030/outstanding_samples/`, { params });
      
      // Hydrate local editable fields without touching DB (Pure Client-State)
      const hydrated = res.data.map(row => ({
        ...row,
        // ⚡ [物理張數公式]: Computeqty = (CustPairs + KeepPairs) * 2
        computeqty: (parseFloat(row.custpairs || 0) + parseFloat(row.keeppairs || 0)) * 2,
        custom_materials: row.upper_desc || 'Standard Synthetic Leather',
        brand_text: row.customer || 'Default'
      }));

      setItems(hydrated);
    } catch (e) {
      message.error('資料載入失敗');
    } finally {
      setLoading(false);
    }
  };

  // Helper for in-place editing
  const updateLocalCell = (idx, field, val) => {
    const copy = [...items];
    copy[idx][field] = val;
    setItems(copy);
  };

  const handlePrint = () => {
    if (selectedKeys.length === 0) {
      message.warning('⚠️ 請先勾選至少一筆需要列印標籤的項次！');
      return;
    }
    setPreviewVisible(true);
  };

  const executePhysicalPrint = () => {
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const getSelectedRows = () => {
    return items.filter(i => selectedKeys.includes(i.gkey));
  };

  const columns = [
    {
      title: '開發指令號',
      dataIndex: 'sampleno',
      render: (v, r) => (
        <div>
          <div className="modern-sheet-container">{v}</div>
          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>型體: {r.styleno}</div>
        </div>
      )
    },
    {
      title: '配色 / 尺碼',
      key: 'specs',
      render: (_, r) => (
        <div>
          <div>{r.color || '無配色'}</div>
          <Tag color="orange">尺碼: {r.size}</Tag>
        </div>
      )
    },
    {
      title: '需求雙數',
      key: 'pairs',
      render: (_, r) => (
        <div style={{ fontSize: '12px' }}>
          客: {r.custpairs.toFixed(1)} / 留: {r.keeppairs.toFixed(1)}
        </div>
      )
    },
    {
      title: '📐 列印數量 (張)',
      dataIndex: 'computeqty',
      width: 140,
      render: (v, r, idx) => (
        <Input 
          type="number" 
          value={v} 
          onChange={e => updateLocalCell(idx, 'computeqty', parseInt(e.target.value) || 0)} 
          prefix={<EditOutlined style={{ color: '#bfbfbf' }} />}
          style={{ fontWeight: 'bold', color: '#13c2c2' }}
        />
      )
    },
    {
      title: '🏷️ 標籤材質摘要 (可任意修編)',
      dataIndex: 'custom_materials',
      render: (v, r, idx) => (
        <Input 
          value={v} 
          onChange={e => updateLocalCell(idx, 'custom_materials', e.target.value)} 
        />
      )
    },
    {
      title: '🏢 客戶商標文本',
      dataIndex: 'brand_text',
      width: 160,
      render: (v, r, idx) => (
        <Input 
          value={v} 
          onChange={e => updateLocalCell(idx, 'brand_text', e.target.value)} 
        />
      )
    }
  ];

  return (
    <div className="modern-sheet-container" style={{ padding: '16px', backgroundColor: 'var(--app-bg-panel)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <BarcodeFontLoader />

      {/* Header */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#13c2c2', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarcodeOutlined /> DP035 樣品條碼標籤物理列印台
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={doQuery}>重整數據</Button>
          <Button 
            type="primary" 
            icon={<PrinterOutlined />} 
            style={{ background: '#13c2c2', borderColor: '#13c2c2' }}
            onClick={handlePrint}
          >
            列印選中標籤
          </Button>
        </Space>
      </div>

      {/* 💡 Usage Hint Banner */}
      <Card size="small" style={{ marginBottom: '16px', borderLeft: '4px solid #13c2c2', background: '#e6fffb' }}>
        <div style={{ fontSize: '13px', color: '#006d75' }}>
          📢 <strong>[物理臨時網格特性]</strong>: 您在此畫面修改的「列印數量」、「材質摘要」及「商標」僅供本次紙本標籤列印使用，<strong>不會寫回中央資料庫</strong>，完全保留 PB w_dp035 的獨立列印算力特徵。
        </div>
      </Card>

      {/* Query Bar */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px' }}>
        <Row gutter={16} align="bottom">
          <Col span={6}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>客戶選擇</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="全部客戶" value={qCust} onChange={setQCust} options={customers.map(c => ({ value: c.gkey, label: c.shortname }))} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>年度</div>
            <Input placeholder="YYYY" value={qYear} onChange={e => setQYear(e.target.value)} />
          </Col>
          <Col span={7}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>樣品單號</div>
            <Input placeholder="指令號碼關鍵字..." value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} />
          </Col>
          <Col span={6}>
            <Button type="primary" icon={<SearchOutlined />} onClick={doQuery} style={{ width: '100%', background: '#13c2c2', border: '#13c2c2' }}>檢索列印項目</Button>
          </Col>
        </Row>
      </div>

      {/* Main Grid */}
      <div style={{ flex: 1, backgroundColor: '#fff', padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Table 
          loading={loading}
          dataSource={items}
          columns={columns}
          rowKey="gkey"
          bordered
          size="middle"
          pagination={{ pageSize: 15 }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: keys => setSelectedKeys(keys)
          }}
        />
      </div>

      {/* 🖨️ Print Preview & Output Modal */}
      <Modal
        title="📑 樣品條碼標籤實體列印預覽"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>關閉預覽</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={executePhysicalPrint} style={{ background: '#13c2c2', border: '#13c2c2' }}>
            立即送至印表機
          </Button>
        ]}
      >
        <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '10px', backgroundColor: '#f0f2f5' }}>
          <div className="print-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {getSelectedRows().map((row) => {
              // Loop generation based on user's computeqty!
              const cards = [];
              for (let i = 0; i < (row.computeqty || 0); i++) {
                cards.push(
                  <div 
                    className="label-card" 
                    key={`${row.gkey}_card_${i}`} 
                    style={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #000', 
                      borderRadius: '4px', 
                      padding: '12px', 
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    {/* Top Label Headers */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '4px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>BRAND: {row.brand_text}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#13c2c2' }}>#{i+1} / {row.computeqty}</span>
                    </div>

                    {/* Body Attributes */}
                    <div style={{ flex: 1 }}>
                      <Row gutter={8}>
                        <Col span={14}>
                          <div style={{ fontSize: '10px', color: '#666' }}>SAMPLE NO</div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{row.sampleno}</div>
                        </Col>
                        <Col span={10}>
                          <div style={{ fontSize: '10px', color: '#666' }}>SIZE</div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f5222d' }}>US {row.size}</div>
                        </Col>
                      </Row>

                      <div style={{ marginTop: '6px' }}>
                        <div style={{ fontSize: '10px', color: '#666' }}>STYLE / COLOR</div>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>{row.styleno} / {row.color}</div>
                      </div>

                      <div style={{ marginTop: '6px', height: '30px', overflow: 'hidden' }}>
                        <div style={{ fontSize: '9px', color: '#666' }}>MATERIALS</div>
                        <div style={{ fontSize: '10px', lineHeight: '1.2' }}>{row.custom_materials}</div>
                      </div>
                    </div>

                    {/* Physical 1D Barcode */}
                    <div style={{ marginTop: '12px', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '6px' }}>
                      <div className="scannable-barcode">{row.sampleno}</div>
                      <div style={{ fontSize: '10px', marginTop: '2px', letterSpacing: '1.5px', fontWeight: '600' }}>{row.sampleno}</div>
                    </div>
                  </div>
                );
              }
              return cards;
            })}
          </div>
        </div>
      </Modal>

    </div>
  );
}
