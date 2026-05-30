import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Card, Row, Col, Modal, Checkbox, Tag, message, Badge } from 'antd';
import { SearchOutlined, PrinterOutlined, ReloadOutlined, BarcodeOutlined, EditOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:8001/api/';

// 🎨 Dynamic inject for standard 128-Barcode Font for scanning support
const BarcodeFontLoader = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
    .scannable-barcode {
      font-family: 'Libre Barcode 128', cursive;
      font-size: 38px;
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
        display: grid !important;
        grid-template-columns: repeat(5, 1fr) !important;
        gap: 10px !important;
      }
      .label-card {
        page-break-inside: avoid;
        border: 1px solid #000 !important;
        height: 240px !important;
      }
      .empty-label {
        visibility: hidden !important;
      }
    }
  `}} />
);

export default function Dp035Sheet() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [expandFilters, setExpandFilters] = useState(false);

  // 🔎 Filters
  const [qCust, setQCust] = useState(undefined);
  const [qFTY, setQFTY] = useState(undefined);
  const [qYear, setQYear] = useState('');
  const [qSeason, setQSeason] = useState(undefined);
  const [qSampleType, setQSampleType] = useState(undefined);
  
  const [qSampleNo, setQSampleNo] = useState('');
  const [qStyleNo, setQStyleNo] = useState('');
  const [qStock, setQStock] = useState('');
  const [qStyleName, setQStyleName] = useState('');
  const [qGroup, setQGroup] = useState('');
  
  const [qMaker, setQMaker] = useState('');
  const [qBrand, setQBrand] = useState('');
  const [qBuyer, setQBuyer] = useState(undefined);
  const [qKind, setQKind] = useState(0);

  // 🎛️ PB Color Status checkboxes
  const [chkStatus1, setChkStatus1] = useState(true);  // 進行中 (1) - 預設為勾選
  const [chkStatus2, setChkStatus2] = useState(false); // 已寄出 (2)
  const [chkStatus3, setChkStatus3] = useState(false); // 已完成 (3)
  const [chkStatus0, setChkStatus0] = useState(false); // 作廢 (0)
  const [chkStatusT, setChkStatusT] = useState(false); // 全部 (All)

  // Lookups Cache
  const [lookups, setLookups] = useState({
    customers: [],
    sampleTypes: [],
    factories: [],
    seasons: [],
    buyers: []
  });

  // Preview Modal
  const [previewVisible, setPreviewVisible] = useState(false);

  // ⚡ MDI 監聽
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp035') {
        if (action === 'retrieve') doQuery();
        if (action === 'print') handlePrint();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [doQuery, handlePrint]);

  useEffect(() => {
    fetchLookups();
    doQuery();
  }, []);

  const fetchLookups = async () => {
    try {
      const [custRes, stRes, ftyRes, ssRes, byRes] = await Promise.all([
        axios.get(`${API_URL}ba010/`),
        axios.get(`${API_URL}dp002/`),
        axios.get(`${API_URL}ba015/`),
        axios.get(`${API_URL}ba055/`),
        axios.get(`${API_URL}ba005/`)
      ]);
      setLookups({
        customers: custRes.data,
        sampleTypes: stRes.data,
        factories: ftyRes.data.filter(f => f.type === '1' && (!f.parentgkey)),
        seasons: ssRes.data,
        buyers: byRes.data
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusToggle = (type, checked) => {
    if (type === 'all') {
      setChkStatusT(checked);
      setChkStatus1(checked);
      setChkStatus2(checked);
      setChkStatus3(checked);
      setChkStatus0(checked);
    } else {
      if (type === '1') setChkStatus1(checked);
      if (type === '2') setChkStatus2(checked);
      if (type === '3') setChkStatus3(checked);
      if (type === '0') setChkStatus0(checked);
      
      if (!checked) {
        setChkStatusT(false);
      } else {
        // If all sub-statuses are checked, mark 'all' as checked
        if (chkStatus1 && chkStatus2 && chkStatus3 && chkStatus0) {
          setChkStatusT(true);
        }
      }
    }
  };

  const doQuery = async () => {
    setLoading(true);
    try {
      const params = {};
      if (qCust) params.ba010gkey = qCust;
      if (qFTY) params.ba015gkey = qFTY;
      if (qYear) params.year = qYear;
      if (qSeason) params.ba055gkey = qSeason;
      if (qSampleType) params.dp002gkey = qSampleType;
      
      if (qSampleNo) params.sampleno = qSampleNo;
      if (qStyleNo) params.styleno = qStyleNo;
      if (qStock) params.stock = qStock;
      if (qStyleName) params.stylename = qStyleName;
      if (qGroup) params.groupname = qGroup;
      
      if (qMaker) params.englishname = qMaker;
      if (qBrand) params.ba009_ebrand = qBrand;
      if (qBuyer) params.dp030_ba005gkey = qBuyer;

      // Statuses logic
      if (chkStatusT) {
        params.statuses = 'all';
      } else {
        const activeList = [];
        if (chkStatus1) activeList.push('1');
        if (chkStatus2) activeList.push('2');
        if (chkStatus3) activeList.push('3');
        if (chkStatus0) activeList.push('0');
        
        // If nothing is checked, default to 1 as per PB
        params.statuses = activeList.length > 0 ? activeList.join(',') : '1';
      }

      const res = await axios.get(`${API_URL}dp030/label_samples/`, { params });
      
      // Hydrate local editable fields without touching DB (Pure Client-Side State)
      const hydrated = res.data.map(row => ({
        ...row,
        // materials detail summary
        custom_materials: [row.dp031_color, row.dp031_upper, row.dp031_lining, row.dp031_sock, row.dp031_bottom, row.dp031_heel, row.dp031_tongue]
          .filter(Boolean)
          .join(' / ') || 'N/A',
        brand_text: row.ba009_ebrand || row.ba010_shortname || 'Default'
      }));

      setItems(hydrated);
    } catch (e) {
      message.error('資料載入失敗');
    } finally {
      setLoading(false);
    }
  };

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

  const renderPreviewLabels = () => {
    const labels = [];
    
    // 1. Prepend blank labels based on qKind (kind)
    const kindCount = parseInt(qKind) || 0;
    for (let k = 0; k < kindCount; k++) {
      labels.push(
        <div 
          className="label-card empty-label" 
          key={`blank_${k}`} 
          style={{ 
            backgroundColor: 'transparent', 
            border: '1px dashed #d9d9d9', 
            borderRadius: '4px', 
            padding: '12px', 
            height: '240px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#bfbfbf',
            fontSize: '11px'
          }}
        >
          (預留空白格 #{k+1})
        </div>
      );
    }
    
    // 2. Append actual selected labels duplicated by computeqty
    const selectedRows = getSelectedRows();
    selectedRows.forEach(row => {
      const copies = parseInt(row.computeqty) || 0;
      for (let i = 0; i < copies; i++) {
        labels.push(
          <div 
            className="label-card" 
            key={`${row.gkey}_card_${i}`} 
            style={{ 
              backgroundColor: '#fff', 
              border: '2px solid #000', 
              borderRadius: '4px', 
              padding: '12px', 
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Arial, sans-serif',
              height: '240px',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Label Headers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '2px', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>BRAND: {row.brand_text}</span>
              <span style={{ fontSize: '10px', color: '#13c2c2', fontWeight: 'bold' }}>#{i+1} / {copies}</span>
            </div>

            {/* Body Attributes */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <Row gutter={8}>
                <Col span={14}>
                  <div style={{ fontSize: '9px', color: '#666' }}>SAMPLE NO</div>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', wordBreak: 'break-all' }}>{row.dp030_sampleno}</div>
                </Col>
                <Col span={10} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', color: '#666' }}>SIZE</div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f5222d' }}>{row.dp033_size || '-'}</div>
                </Col>
              </Row>

              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '9px', color: '#666' }}>STYLE / COLOR</div>
                <div style={{ fontSize: '11px', fontWeight: '600' }}>{row.dp031_styleno} / {row.dp031_color}</div>
              </div>

              <div style={{ marginTop: '4px', height: '36px', overflow: 'hidden' }}>
                <div style={{ fontSize: '8px', color: '#666' }}>MATERIALS</div>
                <div style={{ fontSize: '9px', lineHeight: '1.2' }}>{row.custom_materials}</div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '9px', color: '#555' }}>
                <span>PO: {row.dp031_pono || '-'}</span>
                <span>STOCK: {row.dp030_stock || '-'}</span>
              </div>
            </div>

            {/* Physical 1D Barcode */}
            <div style={{ marginTop: '6px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '4px' }}>
              <div className="scannable-barcode">{row.dp033_barcode || row.dp030_sampleno}</div>
              <div style={{ fontSize: '9px', marginTop: '1px', letterSpacing: '1px', fontWeight: '600' }}>{row.dp033_barcode || row.dp030_sampleno}</div>
            </div>
          </div>
        );
      }
    });
    
    return labels;
  };

  const columns = [
    {
      title: '開發指令單號',
      dataIndex: 'dp030_sampleno',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 'bold', color: '#13c2c2' }}>{v}</div>
          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>型體: {r.dp031_styleno}</div>
        </div>
      )
    },
    {
      title: '配色 / 尺碼',
      key: 'specs',
      render: (_, r) => (
        <div>
          <div>{r.dp031_color || '無配色'}</div>
          {r.dp033_size ? <Tag color="orange">尺碼: {r.dp033_size}</Tag> : '-'}
        </div>
      )
    },
    {
      title: '需求雙數',
      key: 'pairs',
      render: (_, r) => (
        <div style={{ fontSize: '12px' }}>
          客: {(r.custpairs || 0).toFixed(1)} / 留: {(r.keeppairs || 0).toFixed(1)}
        </div>
      )
    },
    {
      title: '📐 列印張數 (qty)',
      dataIndex: 'computeqty',
      width: 130,
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
      title: '🏷️ 標籤材質摘要 (可在此臨時修編)',
      dataIndex: 'custom_materials',
      render: (v, r, idx) => (
        <Input 
          value={v} 
          onChange={e => updateLocalCell(idx, 'custom_materials', e.target.value)} 
        />
      )
    },
    {
      title: '🏢 商標文本',
      dataIndex: 'brand_text',
      width: 150,
      render: (v, r, idx) => (
        <Input 
          value={v} 
          onChange={e => updateLocalCell(idx, 'brand_text', e.target.value)} 
        />
      )
    },
    {
      title: 'PO 號碼',
      dataIndex: 'dp031_pono',
      width: 130,
      render: (v, r, idx) => (
        <Input 
          value={v || ''} 
          onChange={e => updateLocalCell(idx, 'dp031_pono', e.target.value)} 
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

      {/* Usage Hint Banner */}
      <Card size="small" style={{ marginBottom: '16px', borderLeft: '4px solid #13c2c2', background: '#e6fffb' }}>
        <div style={{ fontSize: '13px', color: '#006d75' }}>
          📢 <strong>[物理臨時網格特性]</strong>: 您在此畫面修改的「列印張數」、「材質摘要」、「商標文本」及「PO 號碼」僅供本次紙本標籤列印使用，<strong>不會寫回中央資料庫</strong>，完全保留 PB w_dp035 的獨立列印算力特徵。
        </div>
      </Card>

      {/* Query Bar */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px' }}>
        <Row gutter={[16, 12]} align="bottom">
          <Col span={6}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>客戶選擇</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="全部客戶" value={qCust} onChange={setQCust} options={lookups.customers.map(c => ({ value: c.gkey, label: c.shortname }))} />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>工廠簡稱</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="全部工廠" value={qFTY} onChange={setQFTY} options={lookups.factories.map(f => ({ value: f.gkey, label: f.shortname }))} />
          </Col>
          <Col span={3}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>年度</div>
            <Input placeholder="YYYY" value={qYear} onChange={e => setQYear(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>季節</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="全部季節" value={qSeason} onChange={setQSeason} options={lookups.seasons.map(s => ({ value: s.gkey, label: s.groupcode }))} />
          </Col>
          <Col span={4}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>前置空白數 (kind)</div>
            <Input type="number" min={0} value={qKind} onChange={e => setQKind(parseInt(e.target.value) || 0)} />
          </Col>

          {expandFilters && (
            <>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>樣品類別</div>
                <Select showSearch allowClear style={{ width: '100%' }} placeholder="篩選類別" value={qSampleType} onChange={setQSampleType} options={lookups.sampleTypes.map(t => ({ value: t.gkey, label: t.sampletype }))} />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>樣品單號</div>
                <Input placeholder="單號關鍵字..." value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>型體號碼 (StyleNo)</div>
                <Input placeholder="型體號..." value={qStyleNo} onChange={e => setQStyleNo(e.target.value)} />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>指令序號 (Stock#)</div>
                <Input placeholder="庫存序號..." value={qStock} onChange={e => setQStock(e.target.value)} />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>型體名稱</div>
                <Input placeholder="型體名稱..." value={qStyleName} onChange={e => setQStyleName(e.target.value)} />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>組別</div>
                <Input placeholder="開發組別..." value={qGroup} onChange={e => setQGroup(e.target.value)} />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>開發人</div>
                <Input placeholder="Maker..." value={qMaker} onChange={e => setQMaker(e.target.value)} />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>商標/品牌</div>
                <Input placeholder="Brand..." value={qBrand} onChange={e => setQBrand(e.target.value)} />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>所屬代理 (BelongTo)</div>
                <Select showSearch allowClear style={{ width: '100%' }} placeholder="代理商" value={qBuyer} onChange={setQBuyer} options={lookups.buyers.map(b => ({ value: b.gkey, label: b.ename }))} />
              </Col>
            </>
          )}

          {/* 🎛️ PB Color status checkboxes selection */}
          <Col span={18}>
            <div style={{ marginBottom: '6px', fontSize: '12px', color: '#8c8c8c' }}>樣品單狀態 (複選對齊 PB)</div>
            <Space size="middle">
              <Checkbox checked={chkStatus1} onChange={e => handleStatusToggle('1', e.target.checked)}>進行中</Checkbox>
              <Checkbox checked={chkStatus2} onChange={e => handleStatusToggle('2', e.target.checked)}>已寄出</Checkbox>
              <Checkbox checked={chkStatus3} onChange={e => handleStatusToggle('3', e.target.checked)}>已完成</Checkbox>
              <Checkbox checked={chkStatus0} onChange={e => handleStatusToggle('0', e.target.checked)}>作廢</Checkbox>
              <Checkbox checked={chkStatusT} onChange={e => handleStatusToggle('all', e.target.checked)}>全部</Checkbox>
            </Space>
          </Col>

          <Col span={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button type="link" onClick={() => setExpandFilters(!expandFilters)} style={{ padding: 0 }}>
                {expandFilters ? <span>收起進階篩選 <UpOutlined /></span> : <span>展開進階篩選 <DownOutlined /></span>}
              </Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={doQuery} style={{ background: '#13c2c2', border: '#13c2c2', width: 130 }}>檢索項目</Button>
            </Space>
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
          scroll={{ y: 'calc(100vh - 430px)' }}
        />
      </div>

      {/* 🖨️ Print Preview & Output Modal */}
      <Modal
        title="📑 樣品條碼標籤實體列印預覽"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>關閉預覽</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={executePhysicalPrint} style={{ background: '#13c2c2', border: '#13c2c2' }}>
            立即送至印表機
          </Button>
        ]}
      >
        <div style={{ maxHeight: '600px', overflowY: 'auto', padding: '15px', backgroundColor: '#fafafa' }}>
          <div className="print-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {renderPreviewLabels()}
          </div>
        </div>
      </Modal>

    </div>
  );
}
