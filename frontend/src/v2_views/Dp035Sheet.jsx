import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Row, Col, Modal, Checkbox, DatePicker, message } from 'antd';
import { SearchOutlined, PrinterOutlined, ReloadOutlined, BarcodeOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

const API_URL = 'http://localhost:8001/api/';

// 🎨 Barcode Font Loader for scannable barcode
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

  // 🔍 17 PB Filters
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
  const [qGroupGKey, setQGroupGKey] = useState(undefined);
  const [qMaker, setQMaker] = useState('');
  const [qMakerGKey, setQMakerGKey] = useState(undefined);
  const [qBrand, setQBrand] = useState('');
  const [qBrandGKey, setQBrandGKey] = useState(undefined);
  const [qBuyer, setQBuyer] = useState(undefined);
  const [qKind, setQKind] = useState(0);
  const [qDDate, setQDDate] = useState(dayjs());
  const [qDateRange, setQDateRange] = useState(null);

  // 🎛️ Color Status checkboxes (status1 default is Y/true)
  const [chkStatus1, setChkStatus1] = useState(true);
  const [chkStatus2, setChkStatus2] = useState(false);
  const [chkStatus3, setChkStatus3] = useState(false);
  const [chkStatus0, setChkStatus0] = useState(false);
  const [chkStatusT, setChkStatusT] = useState(false);

  // Dictionary cache
  const [lookups, setLookups] = useState({
    customers: [],
    sampleTypes: [],
    factories: [],
    seasons: [],
    buyers: []
  });

  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    fetchLookups();
    doQuery();
  }, []);

  // ⚡ MDI 監聽 - 支援 retrieve 與 print，忽略 save/delete
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
  }, [items, selectedKeys, qKind, qDDate, qCust, qFTY, qYear, qSeason, qSampleType, qSampleNo, qStyleNo, qStock, qStyleName, qGroup, qMaker, qBrand, qBuyer, chkStatus1, chkStatus2, chkStatus3, chkStatus0, chkStatusT]);

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
      console.error('Failed to load lookups for DP035', e);
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

      if (qDateRange && qDateRange[0] && qDateRange[1]) {
        params.issuedate_from = qDateRange[0].format('YYYY-MM-DD HH:mm:ss');
        params.issuedate_to = qDateRange[1].format('YYYY-MM-DD HH:mm:ss');
      }

      // Status checkboxes logic
      if (chkStatusT) {
        params.statuses = 'all';
      } else {
        const activeList = [];
        if (chkStatus1) activeList.push('1');
        if (chkStatus2) activeList.push('2');
        if (chkStatus3) activeList.push('3');
        if (chkStatus0) activeList.push('0');
        params.statuses = activeList.length > 0 ? activeList.join(',') : '1';
      }

      const res = await axios.get(`${API_URL}dp030/label_samples/`, { params });
      
      // Hydrate local state fields (chk and qty default)
      const hydrated = res.data.map(row => ({
        ...row,
        chk: 'N',
        computeqty: row.qty // Default is already calculated as (custpairs + keeppairs)*2 in backend
      }));

      setItems(hydrated);
      setSelectedKeys([]);
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
    const selected = items.filter(i => i.chk === 'Y');
    if (selected.length === 0) {
      message.warning('請先在 Grid 中勾選需要列印標籤的項次！');
      return;
    }
    setPreviewVisible(true);
  };

  const executePrint = () => {
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const renderLabels = () => {
    const labels = [];
    const dateStr = qDDate ? qDDate.format('YYYY-MM-DD') : '';

    // 1. Prepend blank placeholders
    const blankCount = parseInt(qKind) || 0;
    for (let b = 0; b < blankCount; b++) {
      labels.push(
        <div className="label-card empty-label" key={`blank_${b}`} style={{ height: '240px', border: '1px dashed #d9d9d9', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#bfbfbf', fontSize: '11px' }}>
          (空白格 #{b + 1})
        </div>
      );
    }

    // 2. Append actual selected labels duplicated by qty copies
    const selected = items.filter(i => i.chk === 'Y');
    selected.forEach(row => {
      const copies = parseInt(row.computeqty) || 0;
      const materialsText = `${row.dp031_color || ''} \\ ${row.dp031_upper || ''}`;
      
      for (let c = 0; c < copies; c++) {
        labels.push(
          <div className="label-card" key={`${row.gkey}_label_${c}`} style={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif', height: '240px', boxSizing: 'border-box' }}>
            {/* Top Brand & counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '2px', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>BRAND: {row.ba009_ebrand || 'Default'}</span>
              <span style={{ fontSize: '9px', color: '#bfbfbf' }}>#{c + 1} / {copies}</span>
            </div>

            {/* Body */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <Row gutter={8}>
                <Col span={14}>
                  <div style={{ fontSize: '8px', color: '#666' }}>SAMPLE NO</div>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', wordBreak: 'break-all' }}>{row.dp030_sampleno}</div>
                </Col>
                <Col span={10} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '8px', color: '#666' }}>SIZE</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f5222d' }}>{row.dp033_size || '-'}</div>
                </Col>
              </Row>

              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '8px', color: '#666' }}>STYLE / COLOR</div>
                <div style={{ fontSize: '10px', fontWeight: '600' }}>{row.dp031_styleno} / {row.dp031_color}</div>
              </div>

              <div style={{ marginTop: '4px', height: '34px', overflow: 'hidden' }}>
                <div style={{ fontSize: '8px', color: '#666' }}>MATERIALS</div>
                <div style={{ fontSize: '9px', lineHeight: '1.2' }}>{materialsText}</div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '8px', color: '#555' }}>
                <span>PO: {row.dp031_pono || '-'}</span>
                <span>OrderNo: {row.dp030_stock || '-'}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '8px', color: '#555' }}>
                <span>CLIENT: {row.ba010_shortname || ''}</span>
                <span>DATE: {dateStr}</span>
              </div>
            </div>

            {/* Scannable Barcode */}
            <div style={{ marginTop: '4px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '2px' }}>
              <div className="scannable-barcode">{row.dp033_barcode || row.dp030_sampleno}</div>
              <div style={{ fontSize: '8px', letterSpacing: '1px', fontWeight: '600' }}>{row.dp033_barcode || row.dp030_sampleno}</div>
            </div>
          </div>
        );
      }
    });

    return labels;
  };

  // 29 columns matching d_dp035_query.srd
  const columns = [
    {
      title: '選取',
      dataIndex: 'chk',
      key: 'chk',
      width: 60,
      align: 'center',
      render: (v, r, idx) => (
        <Checkbox 
          checked={v === 'Y'} 
          onChange={e => updateLocalCell(idx, 'chk', e.target.checked ? 'Y' : 'N')} 
        />
      )
    },
    {
      title: '張數',
      dataIndex: 'computeqty',
      key: 'computeqty',
      width: 80,
      render: (v, r, idx) => (
        <Input 
          type="number" 
          value={v} 
          onChange={e => updateLocalCell(idx, 'computeqty', parseInt(e.target.value) || 0)} 
          size="small"
        />
      )
    },
    {
      title: '客戶',
      dataIndex: 'ba010_shortname',
      key: 'ba010_shortname',
      width: 100,
    },
    {
      title: '工廠',
      dataIndex: 'ba015_shortname',
      key: 'ba015_shortname',
      width: 100,
    },
    {
      title: '樣品類別',
      dataIndex: 'dp002_esampletype',
      key: 'dp002_esampletype',
      width: 100,
    },
    {
      title: '樣品單號',
      dataIndex: 'dp030_sampleno',
      key: 'dp030_sampleno',
      width: 130,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp030_sampleno', e.target.value)} size="small" />
      )
    },
    {
      title: '型體編號',
      dataIndex: 'dp031_styleno',
      key: 'dp031_styleno',
      width: 130,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_styleno', e.target.value)} size="small" />
      )
    },
    {
      title: '型體名稱',
      dataIndex: 'dp030_stylename',
      key: 'dp030_stylename',
      width: 140,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp030_stylename', e.target.value)} size="small" />
      )
    },
    {
      title: '客戶型體 / Stock#',
      dataIndex: 'dp030_stock',
      key: 'dp030_stock',
      width: 150,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp030_stock', e.target.value)} size="small" />
      )
    },
    {
      title: '組別',
      dataIndex: 'dp023_groupname',
      key: 'dp023_groupname',
      width: 100,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp023_groupname', e.target.value)} size="small" />
      )
    },
    {
      title: '中文顏色',
      dataIndex: 'dp031_color',
      key: 'dp031_color',
      width: 120,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_color', e.target.value)} size="small" />
      )
    },
    {
      title: '英文顏色',
      dataIndex: 'dp031_ecolor',
      key: 'dp031_ecolor',
      width: 120,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_ecolor', e.target.value)} size="small" />
      )
    },
    {
      title: '面材',
      dataIndex: 'dp031_upper',
      key: 'dp031_upper',
      width: 150,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_upper', e.target.value)} size="small" />
      )
    },
    {
      title: '裡材',
      dataIndex: 'dp031_lining',
      key: 'dp031_lining',
      width: 150,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_lining', e.target.value)} size="small" />
      )
    },
    {
      title: '墊腳',
      dataIndex: 'dp031_sock',
      key: 'dp031_sock',
      width: 150,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_sock', e.target.value)} size="small" />
      )
    },
    {
      title: '大底',
      dataIndex: 'dp031_bottom',
      key: 'dp031_bottom',
      width: 150,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_bottom', e.target.value)} size="small" />
      )
    },
    {
      title: '跟材',
      dataIndex: 'dp031_heel',
      key: 'dp031_heel',
      width: 150,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_heel', e.target.value)} size="small" />
      )
    },
    {
      title: '舌片',
      dataIndex: 'dp031_tongue',
      key: 'dp031_tongue',
      width: 150,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp031_tongue', e.target.value)} size="small" />
      )
    },
    {
      title: '品牌',
      dataIndex: 'ba009_ebrand',
      key: 'ba009_ebrand',
      width: 110,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'ba009_ebrand', e.target.value)} size="small" />
      )
    },
    {
      title: 'Logo',
      dataIndex: 'dp030_logo',
      key: 'dp030_logo',
      width: 110,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp030_logo', e.target.value)} size="small" />
      )
    },
    {
      title: 'PONo',
      dataIndex: 'dp031_pono',
      key: 'dp031_pono',
      width: 110,
      render: (v, r, idx) => (
        <Input value={v || ''} onChange={e => updateLocalCell(idx, 'dp031_pono', e.target.value)} size="small" />
      )
    },
    {
      title: '楦頭編號',
      dataIndex: 'dp010_lastno',
      key: 'dp010_lastno',
      width: 110,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp010_lastno', e.target.value)} size="small" />
      )
    },
    {
      title: '尺碼',
      dataIndex: 'dp033_size',
      key: 'dp033_size',
      width: 80,
      render: (v, r, idx) => (
        <Input value={v} onChange={e => updateLocalCell(idx, 'dp033_size', e.target.value)} size="small" />
      )
    },
    {
      title: '客戶雙數',
      dataIndex: 'custpairs',
      key: 'custpairs',
      width: 90,
      align: 'right',
      render: v => typeof v === 'number' ? v.toFixed(1) : ''
    },
    {
      title: '留樣雙數',
      dataIndex: 'keeppairs',
      key: 'keeppairs',
      width: 90,
      align: 'right',
      render: v => typeof v === 'number' ? v.toFixed(1) : ''
    },
    {
      title: '條碼',
      dataIndex: 'dp033_barcode',
      key: 'dp033_barcode',
      width: 130,
      render: (v, r, idx) => (
        <Input value={v || ''} onChange={e => updateLocalCell(idx, 'dp033_barcode', e.target.value)} size="small" />
      )
    },
    {
      title: '其他1',
      dataIndex: 'other1',
      key: 'other1',
      width: 100,
      render: (v, r, idx) => (
        <Input value={v || ''} onChange={e => updateLocalCell(idx, 'other1', e.target.value)} size="small" />
      )
    },
    {
      title: '其他2',
      dataIndex: 'other2',
      key: 'other2',
      width: 100,
      render: (v, r, idx) => (
        <Input value={v || ''} onChange={e => updateLocalCell(idx, 'other2', e.target.value)} size="small" />
      )
    },
    {
      title: '其他3',
      dataIndex: 'other3',
      key: 'other3',
      width: 100,
      render: (v, r, idx) => (
        <Input value={v || ''} onChange={e => updateLocalCell(idx, 'other3', e.target.value)} size="small" />
      )
    }
  ];

  return (
    <div style={{ padding: '16px', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <BarcodeFontLoader />

      {/* Header Toolbar */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#13c2c2' }}>
          DP035 樣品 Label 資料管理 (Sample Label Management)
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={doQuery}>查詢 (Retrieve)</Button>
          <Button type="primary" icon={<PrinterOutlined />} style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }} onClick={handlePrint}>
            列印選中標籤 (Print)
          </Button>
        </Space>
      </div>

      {/* Query Panel (Pattern B) */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <Row gutter={[16, 12]} align="bottom">
          <Col span={6}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>開單日期範圍 (IssueDate)</div>
            <DatePicker.RangePicker style={{ width: '100%' }} value={qDateRange} onChange={setQDateRange} />
          </Col>
          <Col span={3}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>年度 (Year)</div>
            <Input placeholder="YYYY" value={qYear} onChange={e => setQYear(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>季節 (Season)</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="全部季節" value={qSeason} onChange={setQSeason} options={lookups.seasons.map(s => ({ value: s.gkey, label: s.groupcode }))} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>樣品類別 (SampleType)</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="全部類別" value={qSampleType} onChange={setQSampleType} options={lookups.sampleTypes.map(t => ({ value: t.gkey, label: t.sampletype }))} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>前置空白數 (kind)</div>
            <Input type="number" min={0} value={qKind} onChange={e => setQKind(parseInt(e.target.value) || 0)} />
          </Col>

          <Col span={4}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>開發指令單號 (SampleNo)</div>
            <Input placeholder="指令號..." value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>型體編號 (StyleNo)</div>
            <Input placeholder="型體號..." value={qStyleNo} onChange={e => setQStyleNo(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>指令序號 (Stock#)</div>
            <Input placeholder="庫存序號..." value={qStock} onChange={e => setQStock(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>型體名稱 (StyleName)</div>
            <Input placeholder="型體名..." value={qStyleName} onChange={e => setQStyleName(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>組別 (Group)</div>
            <ERPLookupField
              type="dp023"
              placeholder="F2 雙擊檢索..."
              value={qGroupGKey}
              onChange={(val, record) => {
                setQGroupGKey(val);
                setQGroup(record ? record.groupname : '');
              }}
            />
          </Col>

          <Col span={4}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>開發人 (Maker)</div>
            <ERPLookupField
              type="es101"
              placeholder="F2 雙擊檢索..."
              value={qMakerGKey}
              onChange={(val, record) => {
                setQMakerGKey(val);
                setQMaker(record ? record.englishname : '');
              }}
            />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>商標/品牌 (Brand)</div>
            <ERPLookupField
              type="ba009"
              placeholder="F2 雙擊檢索..."
              value={qBrandGKey}
              onChange={(val, record) => {
                setQBrandGKey(val);
                setQBrand(record ? record.ebrand : '');
              }}
            />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>所屬代理 (BelongTo)</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="代理商" value={qBuyer} onChange={setQBuyer} options={lookups.buyers.map(b => ({ value: b.gkey, label: b.ename }))} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>客戶 (Cust)</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="客戶選擇" value={qCust} onChange={setQCust} options={lookups.customers.map(c => ({ value: c.gkey, label: `${c.custno} (${c.shortname})` }))} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>工廠 (FTY)</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="工廠選擇" value={qFTY} onChange={setQFTY} options={lookups.factories.map(f => ({ value: f.gkey, label: `${f.factno} (${f.shortname})` }))} />
          </Col>

          <Col span={4}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>列印日期 (ddate)</div>
            <DatePicker style={{ width: '100%' }} value={qDDate} onChange={setQDDate} />
          </Col>
          <Col span={14}>
            <div style={{ marginBottom: '6px', fontSize: '12px', color: '#8c8c8c' }}>樣品單狀態 (複選)</div>
            <Space size="middle">
              <Checkbox checked={chkStatus1} onChange={e => handleStatusToggle('1', e.target.checked)}>進行中 </Checkbox>
              <Checkbox checked={chkStatus2} onChange={e => handleStatusToggle('2', e.target.checked)}>已寄出 </Checkbox>
              <Checkbox checked={chkStatus3} onChange={e => handleStatusToggle('3', e.target.checked)}>已完成 </Checkbox>
              <Checkbox checked={chkStatus0} onChange={e => handleStatusToggle('0', e.target.checked)}>作廢 </Checkbox>
              <Checkbox checked={chkStatusT} onChange={e => handleStatusToggle('all', e.target.checked)}>全部 </Checkbox>
            </Space>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={doQuery} style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2', width: 120 }}>
              開始檢索
            </Button>
          </Col>
        </Row>
      </div>

      {/* Result Table (Pattern B) */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Table
          loading={loading}
          dataSource={items}
          columns={columns}
          rowKey="gkey"
          size="middle"
          pagination={{ pageSize: 12 }}
          bordered
          scroll={{ x: '180%', y: 'calc(100vh - 430px)' }}
        />
      </div>

      {/* Print Preview Modal */}
      <Modal
        title="樣品條碼標籤列印預覽 (A4 貼紙格式)"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>關閉預覽</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={executePrint} style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}>
            送至印表機 (Print)
          </Button>
        ]}
      >
        <div style={{ maxHeight: '600px', overflowY: 'auto', padding: '15px', backgroundColor: '#fafafa' }}>
          <div className="print-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            {renderLabels()}
          </div>
        </div>
      </Modal>

    </div>
  );
}
