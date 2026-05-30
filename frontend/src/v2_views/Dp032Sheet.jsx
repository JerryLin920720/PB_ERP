import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Row, Col, Radio, DatePicker, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:8001/api/';

export default function Dp032Sheet() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  // 🔍 17 PB Filters
  const [qCust, setQCust] = useState(undefined);
  const [qFTY, setQFTY] = useState(undefined);
  const [qYear, setQYear] = useState('');
  const [qSeason, setQSeason] = useState(undefined);
  const [qSampleType, setQSampleType] = useState(undefined);
  const [qSampleNo, setQSampleNo] = useState('');
  const [qStyleNo, setQStyleNo] = useState('');
  const [qStyleName, setQStyleName] = useState('');
  const [qStock, setQStock] = useState('');
  const [qGroup, setQGroup] = useState('');
  const [qLastNo, setQLastNo] = useState('');
  const [qOutsoleNo, setQOutsoleNo] = useState('');
  const [qHeelNo, setQHeelNo] = useState('');
  const [qMaker, setQMaker] = useState('');
  const [qApprove, setQApprove] = useState('');
  const [qDateRange, setQDateRange] = useState(null);

  // 🌍 Dictionary Cache
  const [lookups, setLookups] = useState({
    customers: [],
    sampleTypes: [],
    factories: [],
    seasons: []
  });

  useEffect(() => {
    fetchLookups();
    fetchData();
  }, []);

  // ⚡ MDI 監聽 - 僅支援 retrieve，忽略 save 等修改指令
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp032' && action === 'retrieve') fetchData();
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, []);

  // 📡 參數接收監聽
  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === 'dp032' && params.sampleno) {
        setQSampleNo(params.sampleno);
        setLoading(true);
        axios.get(`${API_URL}dp030/outstanding_samples/`, { params: { sampleno: params.sampleno } })
          .then(res => { setData(res.data); })
          .finally(() => setLoading(false));
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, []);

  const fetchLookups = async () => {
    try {
      const [custRes, stRes, ftyRes, ssRes] = await Promise.all([
        axios.get(`${API_URL}ba010/`),
        axios.get(`${API_URL}dp002/`),
        axios.get(`${API_URL}ba015/`),
        axios.get(`${API_URL}ba055/`)
      ]);
      setLookups({
        customers: custRes.data,
        sampleTypes: stRes.data,
        factories: ftyRes.data.filter(f => f.type === '1' && (!f.parentgkey)),
        seasons: ssRes.data
      });
    } catch (e) {
      console.error('Failed to load lookups for DP032', e);
    }
  };

  const fetchData = async () => {
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
      if (qStyleName) params.stylename = qStyleName;
      if (qStock) params.stock = qStock;
      if (qGroup) params.groupname = qGroup;
      
      if (qLastNo) params.lastno = qLastNo;
      if (qOutsoleNo) params.bottomno = qOutsoleNo;
      if (qHeelNo) params.heelno = qHeelNo;
      if (qMaker) params.englishname = qMaker;
      if (qApprove !== '') params.approve = qApprove;
      
      if (qDateRange && qDateRange[0] && qDateRange[1]) {
        params.issuedate_from = qDateRange[0].format('YYYY-MM-DD HH:mm:ss');
        params.issuedate_to = qDateRange[1].format('YYYY-MM-DD HH:mm:ss');
      }

      const res = await axios.get(`${API_URL}dp030/outstanding_samples/`, { params });
      setData(res.data);
    } catch (e) {
      message.error('無法讀取未完樣品催交數據！');
    } finally {
      setLoading(false);
    }
  };

  // 13 visible columns in d_dp032_query.srd
  const columns = [
    {
      title: '樣品編號',
      dataIndex: 'sampleno',
      key: 'sampleno',
      width: 140,
      sorter: (a, b) => (a.sampleno || '').localeCompare(b.sampleno || '')
    },
    {
      title: '樣品類別',
      dataIndex: 'sampletype',
      key: 'sampletype',
      width: 110,
    },
    {
      title: '建單日期',
      dataIndex: 'issuedate',
      key: 'issuedate',
      width: 120,
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : ''
    },
    {
      title: '型體編號',
      dataIndex: 'styleno',
      key: 'styleno',
      width: 130,
    },
    {
      title: '型體名稱',
      dataIndex: 'stylename',
      key: 'stylename',
      width: 150,
    },
    {
      title: '客戶型體',
      dataIndex: 'stock',
      key: 'stock',
      width: 110,
    },
    {
      title: '客戶名稱',
      dataIndex: 'customer',
      key: 'customer',
      width: 100,
    },
    {
      title: '工廠',
      dataIndex: 'factory',
      key: 'factory',
      width: 100,
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 150,
    },
    {
      title: '尺碼',
      dataIndex: 'size',
      key: 'size',
      width: 80,
    },
    {
      title: '客要數量',
      dataIndex: 'custpairs',
      key: 'custpairs',
      width: 100,
      align: 'right',
      render: v => typeof v === 'number' ? v.toFixed(1) : ''
    },
    {
      title: '留底數量',
      dataIndex: 'keeppairs',
      key: 'keeppairs',
      width: 100,
      align: 'right',
      render: v => typeof v === 'number' ? v.toFixed(1) : ''
    },
    {
      title: '寄出日期',
      dataIndex: 'sentdate',
      key: 'sentdate',
      width: 120,
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : <span style={{ color: '#bfbfbf' }}>未出貨</span>
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding',
      key: 'outstanding',
      width: 110,
      align: 'right',
      render: v => typeof v === 'number' ? v.toFixed(1) : ''
    },
    {
      title: 'Completion Rate',
      dataIndex: 'completion_rate',
      key: 'completion_rate',
      width: 130,
      align: 'right',
      render: v => typeof v === 'number' ? `${v.toFixed(2)}%` : ''
    }
  ];

  return (
    <div style={{ padding: '16px', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header Toolbar */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#722ed1' }}>
          DP032 未完樣品催交清單 (Outstanding Sample List)
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新 (Retrieve)</Button>
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
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>開發指令單號 (SampleNo)</div>
            <Input placeholder="單號關鍵字..." value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} />
          </Col>

          <Col span={4}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>型體編號 (StyleNo)</div>
            <Input placeholder="型體號..." value={qStyleNo} onChange={e => setQStyleNo(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>型體名稱 (StyleName)</div>
            <Input placeholder="型體名稱..." value={qStyleName} onChange={e => setQStyleName(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>庫存編號 (Stock#)</div>
            <Input placeholder="庫存編號..." value={qStock} onChange={e => setQStock(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>組別 (Group)</div>
            <Input placeholder="開發群組..." value={qGroup} onChange={e => setQGroup(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>楦頭編號 (LastNo)</div>
            <Input placeholder="楦頭編號..." value={qLastNo} onChange={e => setQLastNo(e.target.value)} />
          </Col>

          <Col span={4}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>大底編號 (OutsoleNo)</div>
            <Input placeholder="大底編號..." value={qOutsoleNo} onChange={e => setQOutsoleNo(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>鞋跟編號 (HeelNo)</div>
            <Input placeholder="鞋跟編號..." value={qHeelNo} onChange={e => setQHeelNo(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>開發人 (Maker)</div>
            <Input placeholder="開發人姓名..." value={qMaker} onChange={e => setQMaker(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>客戶 (Cust)</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="客戶代碼" value={qCust} onChange={setQCust} options={lookups.customers.map(c => ({ value: c.gkey, label: `${c.custno} (${c.shortname})` }))} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>工廠 (FTY)</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="工廠代碼" value={qFTY} onChange={setQFTY} options={lookups.factories.map(f => ({ value: f.gkey, label: `${f.factno} (${f.shortname})` }))} />
          </Col>

          <Col span={6}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>審核狀態 (Approve)</div>
            <Radio.Group value={qApprove} onChange={e => setQApprove(e.target.value)}>
              <Radio value="">ALL</Radio>
              <Radio value="Y">已審核 (Approve)</Radio>
              <Radio value="N">未審核 (UnApprove)</Radio>
            </Radio.Group>
          </Col>
          <Col span={18} style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={fetchData} style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', width: 120 }}>
              開始檢索
            </Button>
          </Col>
        </Row>
      </div>

      {/* Result Table (Pattern B) */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Table
          loading={loading}
          dataSource={data}
          columns={columns}
          rowKey="gkey"
          size="middle"
          pagination={{ pageSize: 12 }}
          bordered
          scroll={{ y: 'calc(100vh - 430px)' }}
          summary={(pageData) => {
            let totalCust = 0;
            let totalKeep = 0;
            pageData.forEach(({ custpairs, keeppairs }) => {
              totalCust += Number(custpairs || 0);
              totalKeep += Number(keeppairs || 0);
            });
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                  <Table.Summary.Cell index={0} colSpan={10} align="left">TOTAL</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">{totalCust.toFixed(1)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">{totalKeep.toFixed(1)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={3} />
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </div>

    </div>
  );
}
