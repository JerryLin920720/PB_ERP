import React, { useState, useEffect } from 'react';
import ReportModal from '../components/erp/report/ReportModal';
import { getProgramConfig } from '../config/programRegistry';
import { Tabs, Table, Button, Input, Select, Space, Card, Row, Col, Form, DatePicker, message, Popconfirm, Tag, Alert } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined, GiftOutlined, CheckCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:8001/api/';

export default function Dp040Sheet() {
  const [activeTabKey, setActiveTabKey] = useState('query');
  const [loading, setLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportDefaultAction, setReportDefaultAction] = useState('preview');
  const [isDirty, setIsDirty] = useState(false);

  // 💾 Core Master & Detail States
  const [masterList, setMasterList] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);

  const [dp041, setDp041] = useState([]); // Sent Item details
  const [dp042, setDp042] = useState([]); // Cartons Weight
  const [dp043, setDp043] = useState([]); // Cartons Packaging

  // 🧺 Delete Trackers
  const [deleted41, setDeleted41] = useState([]);
  const [deleted42, setDeleted42] = useState([]);
  const [deleted43, setDeleted43] = useState([]);

  // 🔍 Top Search Box
  const [qInvoice, setQInvoice] = useState('');
  const [qYear, setQYear] = useState('');

  // 🌍 Lookup Dictionaries
  const [lookups, setLookups] = useState({
    customers: [], seasons: [], currencies: [], payments: [], 
    couriers: [], transports: [], users: [], companies: [], 
    sampleSizes: []
  });

  // Validation Warnings Cache
  const [validations, setValidations] = useState([]);

  useEffect(() => {
    fetchAllLookups();
    doQuery();
  }, []);

  useEffect(() => {
    // 🔎 Automatically run physical verification cross-referencing Carton Qty vs. Items Sent totals
    runInterlockValidation();
  }, [dp041, dp043]);

  const fetchAllLookups = async () => {
    try {
      const [cu, se, cur, pay, cou, tra, us, comp, sz] = await Promise.all([
        axios.get(`${API_URL}ba010/`),
        axios.get(`${API_URL}ba055/`),
        axios.get(`${API_URL}ba060/`),
        axios.get(`${API_URL}ba075/`),
        axios.get(`${API_URL}ba090/`),
        axios.get(`${API_URL}ba091/`),
        axios.get(`${API_URL}es101/`),
        axios.get(`${API_URL}ba005/`),
        // Fetch outstanding size runner options for lookup
        axios.get(`${API_URL}dp030/outstanding_samples/`)
      ]);

      setLookups({
        customers: cu.data, seasons: se.data, currencies: cur.data,
        payments: pay.data, couriers: cou.data, transports: tra.data,
        users: us.data, companies: comp.data, sampleSizes: sz.data
      });
    } catch (err) {
      console.error('加載出貨基本字庫失敗', err);
    }
  };

  const runInterlockValidation = () => {
    const warns = [];
    // Group Dp043 Qty sums by Dp041 link key
    const qtyMap = {};
    dp043.forEach(carton => {
      if (!carton.dp041gkey) return;
      qtyMap[carton.dp041gkey] = (qtyMap[carton.dp041gkey] || 0) + parseFloat(carton.qty || 0);
    });

    // Compare with Dp041 sentpairs
    dp041.forEach((item, idx) => {
      const targetQty = parseFloat(item.sentpairs || 0);
      const packedQty = qtyMap[item.gkey] || 0;
      if (targetQty !== packedQty) {
        const label = lookups.sampleSizes.find(s => s.gkey === item.dp033gkey)?.sampleno || `項次 #${idx+1}`;
        warns.push(`⚠️ ${label} 物理失衡：出貨總雙數 (${targetQty}) 與裝箱配置總雙數 (${packedQty}) 不一致！`);
      }
    });
    setValidations(warns);
  };

  const doQuery = async () => {
    setLoading(true);
    try {
      const params = {};
      if (qInvoice) params.invoiceno = qInvoice;
      if (qYear) params.year = qYear;
      const res = await axios.get(`${API_URL}dp040/`, { params });
      setMasterList(res.data);
    } catch (e) {
      message.error('出貨單列表讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (masterObj) => {
    setSelectedMaster({ ...masterObj });
    setDp041([]); setDp042([]); setDp043([]);
    setDeleted41([]); setDeleted42([]); setDeleted43([]);
    setIsDirty(false);

    if (!masterObj.gkey.startsWith('temp_')) {
      setLoading(true);
      try {
        const [res41, res42, res43] = await Promise.all([
          axios.get(`${API_URL}dp041/?dp040gkey=${masterObj.gkey}`),
          axios.get(`${API_URL}dp042/?dp040gkey=${masterObj.gkey}`),
          axios.get(`${API_URL}dp043/?dp040gkey=${masterObj.gkey}`)
        ]);
        setDp041(res41.data);
        setDp042(res42.data);
        setDp043(res43.data);
      } catch (e) {
        message.error('讀取明細失敗');
      } finally {
        setLoading(false);
      }
    }
    setActiveTabKey('details');
  };

  const handleNew = () => {
    const newObj = {
      gkey: `temp_${Date.now()}`,
      invoiceno: `INV-${dayjs().format('YYMM')}-${Math.floor(1000 + Math.random()*9000)}`,
      year: String(new Date().getFullYear()),
      sentdate: dayjs().toISOString()
    };
    loadDetails(newObj);
  };

  const handleSaveAll = async () => {
    if (!selectedMaster.invoiceno) return message.error('請輸入 Invoice No！');
    setLoading(true);
    try {
      const payload = {
        master: selectedMaster,
        dp041: { upsert: dp041, delete: deleted41 },
        dp042: { upsert: dp042, delete: deleted42 },
        dp043: { upsert: dp043, delete: deleted43 }
      };

      const res = await axios.post(`${API_URL}dp040/deep_save/`, payload);
      if (res.data.success) {
        message.success(res.data.message);
        setIsDirty(false);
        doQuery();
        const newGkey = res.data.data ? res.data.data.gkey : res.data.gkey;
        const refreshed = await axios.get(`${API_URL}dp040/${newGkey}/`);
        loadDetails(refreshed.data);
      }
    } catch (e) {
      message.error('保存出貨單失敗：' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Row Updators
  const updateMasterField = (field, val) => {
    setSelectedMaster(p => ({ ...p, [field]: val }));
    setIsDirty(true);
  };

  const add41Row = () => {
    const maxSn = dp041.length > 0 ? Math.max(...dp041.map(o => o.serialno || 0)) + 1 : 1;
    setDp041([...dp041, { gkey: `temp_41_${Date.now()}`, serialno: maxSn, sentpairs: 0 }]);
    setIsDirty(true);
  };

  const update41Row = (idx, field, val) => {
    const copy = [...dp041];
    copy[idx][field] = val;
    if (field === 'dp033gkey') {
      // Autofill sample details from lookups.sampleSizes!
      const szInfo = lookups.sampleSizes.find(s => s.gkey === val);
      if (szInfo) {
        copy[idx].dp030gkey = szInfo.gkey; // link reference
        copy[idx].req_custpairs = szInfo.custpairs;
        copy[idx].req_keeppairs = szInfo.keeppairs;
        copy[idx].sentpairs = parseFloat(szInfo.custpairs || 0) + parseFloat(szInfo.keeppairs || 0) - parseFloat(szInfo.finishpairs || 0);
      }
    }
    setDp041(copy);
    setIsDirty(true);
  };

  const delete41Row = (idx) => {
    const target = dp041[idx];
    if (!target.gkey.startsWith('temp_')) setDeleted41([...deleted41, target.gkey]);
    setDp041(dp041.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  // DP042 Cartons
  const add42Row = () => {
    const copy = [...dp042];
    const cartonNum = copy.length + 1;
    setDp042([...copy, { gkey: `temp_42_${Date.now()}`, carton: cartonNum, nw: 0, gw: 0 }]);
    setIsDirty(true);
  };

  const update42Row = (idx, field, val) => {
    const copy = [...dp042];
    copy[idx][field] = val;
    setDp042(copy);
    setIsDirty(true);
  };

  const delete42Row = (idx) => {
    const target = dp042[idx];
    if (!target.gkey.startsWith('temp_')) setDeleted42([...deleted42, target.gkey]);
    setDp042(dp042.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  // DP043 Packings
  const add43Row = () => {
    setDp043([...dp043, { gkey: `temp_43_${Date.now()}`, qty: 0 }]);
    setIsDirty(true);
  };

  const update43Row = (idx, field, val) => {
    const copy = [...dp043];
    copy[idx][field] = val;
    if (field === 'dp041gkey') {
      const item = dp041.find(i => i.gkey === val);
      if (item) {
        const szInfo = lookups.sampleSizes.find(s => s.gkey === item.dp033gkey);
        if (szInfo) {
          copy[idx].styleno = szInfo.styleno;
          copy[idx].size = szInfo.size;
          copy[idx].color = szInfo.color;
        }
      }
    }
    setDp043(copy);
    setIsDirty(true);
  };

  const delete43Row = (idx) => {
    const target = dp043[idx];
    if (!target.gkey.startsWith('temp_')) setDeleted43([...deleted43, target.gkey]);
    setDp043(dp043.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const listColumns = [
    {
      title: '發運 Invoice No',
      dataIndex: 'invoiceno',
      render: (t, r) => (
        <div onClick={() => loadDetails(r)} style={{ cursor: 'pointer' }}>
          <div className="modern-sheet-container">{t}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>出貨日: {r.sentdate ? dayjs(r.sentdate).format('YYYY-MM-DD') : '-'}</div>
        </div>
      )
    },
    { title: '客戶名稱', dataIndex: 'ba010_shortname', width: 180 },
    { title: '提單追踪號 AWB', dataIndex: 'blawb', width: 200 },
    { title: '製單人員', dataIndex: 'maker_name', width: 120 },
  ];

  const dp041Columns = [
    { title: '序號', dataIndex: 'serialno', width: 60 },
    {
      title: '關聯樣品指令單 Size Runner',
      dataIndex: 'dp033gkey',
      width: 360,
      render: (v, r, idx) => (
        <Select
          showSearch
          style={{ width: '100%' }}
          value={v}
          onChange={val => update41Row(idx, 'dp033gkey', val)}
          options={lookups.sampleSizes.map(s => ({
            value: s.gkey,
            label: `[${s.sampleno}] ${s.styleno} / ${s.color} / 尺碼:${s.size} (欠:${s.outstanding})`
          }))}
        />
      )
    },
    {
      title: '需求雙數 (客+留)',
      key: 'req',
      width: 140,
      render: (_, r, idx) => {
        const sz = lookups.sampleSizes.find(s => s.gkey === r.dp033gkey);
        return sz ? (parseFloat(sz.custpairs || 0) + parseFloat(sz.keeppairs || 0)).toFixed(1) : '-';
      }
    },
    {
      title: '本次發運雙數',
      dataIndex: 'sentpairs',
      width: 140,
      render: (v, r, idx) => (
        <Input type="number" value={v} onChange={e => update41Row(idx, 'sentpairs', parseFloat(e.target.value) || 0)} style={{ fontWeight: 'bold', color: '#d46b08' }} />
      )
    },
    { title: '備註', dataIndex: 'remark', render: (v, r, idx) => <Input value={v} onChange={e => update41Row(idx, 'remark', e.target.value)} /> },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => delete41Row(idx)} /> }
  ];

  const dp042Columns = [
    {
      title: '箱號 #',
      dataIndex: 'carton',
      width: 120,
      render: (v, r, idx) => <Input type="number" value={v} onChange={e => update42Row(idx, 'carton', parseInt(e.target.value) || 0)} />
    },
    {
      title: '淨重 (N.W) KGS',
      dataIndex: 'nw',
      width: 150,
      render: (v, r, idx) => <Input type="number" value={v} onChange={e => update42Row(idx, 'nw', parseFloat(e.target.value) || 0)} />
    },
    {
      title: '毛重 (G.W) KGS',
      dataIndex: 'gw',
      width: 150,
      render: (v, r, idx) => <Input type="number" value={v} onChange={e => update42Row(idx, 'gw', parseFloat(e.target.value) || 0)} />
    },
    {
      title: '才數 (CUFT)',
      dataIndex: 'cuft',
      width: 150,
      render: (v, r, idx) => <Input type="number" value={v} onChange={e => update42Row(idx, 'cuft', parseFloat(e.target.value) || 0)} />
    },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => delete42Row(idx)} /> }
  ];

  const dp043Columns = [
    {
      title: '關聯箱號 Carton',
      dataIndex: 'dp042gkey',
      width: 180,
      render: (v, r, idx) => (
        <Select
          placeholder="選擇箱號"
          style={{ width: '100%' }}
          value={v}
          onChange={val => update43Row(idx, 'dp042gkey', val)}
          options={dp042.map(c => ({ value: c.gkey, label: `第 ${c.carton} 箱` }))}
        />
      )
    },
    {
      title: '裝箱品項 Item',
      dataIndex: 'dp041gkey',
      width: 300,
      render: (v, r, idx) => (
        <Select
          placeholder="選擇發運品項"
          style={{ width: '100%' }}
          value={v}
          onChange={val => update43Row(idx, 'dp041gkey', val)}
          options={dp041.map(item => {
            const sz = lookups.sampleSizes.find(s => s.gkey === item.dp033gkey);
            return {
              value: item.gkey,
              label: sz ? `${sz.styleno} / ${sz.color} / 尺碼:${sz.size}` : '未知品項'
            };
          })}
        />
      )
    },
    {
      title: '本箱分配雙數 Qty',
      dataIndex: 'qty',
      width: 160,
      render: (v, r, idx) => <Input type="number" value={v} onChange={e => update43Row(idx, 'qty', parseFloat(e.target.value) || 0)} style={{ fontWeight: 'bold' }} />
    },
    { title: '備註', dataIndex: 'remark', render: (v, r, idx) => <Input value={v} onChange={e => update43Row(idx, 'remark', e.target.value)} /> },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => delete43Row(idx)} /> }
  ];

  return (
    <div className="modern-sheet-container" style={{ padding: '16px', backgroundColor: 'var(--app-bg-panel)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 🛠️ Global Header */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#fa8c16', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GiftOutlined /> DP040 樣品發運出貨管理
          </span>
          {selectedMaster && (
            <Tag color="orange" style={{ fontWeight: 'bold', fontSize: '13px' }}>📄 {selectedMaster.invoiceno}</Tag>
          )}
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={doQuery}>檢索重整</Button>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleNew}>新增出貨</Button>
          {selectedMaster && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              style={{ background: isDirty ? '#52c41a' : '#fa8c16', borderColor: isDirty ? '#52c41a' : '#fa8c16' }}
              onClick={handleSaveAll}
            >
              儲存交易儲備檔 {isDirty ? '*' : ''}
            </Button>
          )}
        </Space>
      </div>

      {/* 🚨 Realtime Physical Validation Banners */}
      {validations.length > 0 && selectedMaster && (
        <div style={{ marginBottom: '16px' }}>
          <Alert
            message="🚨 出貨平衡校驗警報 (Packing Interlock Verification)"
            description={
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {validations.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            }
            type="warning"
            showIcon
          />
        </div>
      )}

      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', padding: '8px 16px', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          items={[
            {
              key: 'query',
              label: '🔍 數據檢索 (Explorer)',
              children: (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px', background: '#fafafa', padding: '12px', borderRadius: '6px' }}>
                    <Input style={{ width: 200 }} placeholder="Invoice No..." value={qInvoice} onChange={e => setQInvoice(e.target.value)} />
                    <Input style={{ width: 100 }} placeholder="年度 YYYY" value={qYear} onChange={e => setQYear(e.target.value)} />
                    <Button type="primary" icon={<SearchOutlined />} onClick={doQuery} style={{ background: '#fa8c16', border: '#fa8c16' }}>篩選 Invoice</Button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <Table dataSource={masterList} columns={listColumns} rowKey="gkey" loading={loading} bordered />
                  </div>
                </div>
              )
            },
            {
              key: 'details',
              label: '📋 出貨單規格維護 (Details Panel)',
              disabled: !selectedMaster,
              children: selectedMaster ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                  
                  {/* Master Data */}
                  <Card size="small" title={<span style={{ color: '#fa8c16' }}><InfoCircleOutlined /> 出貨發運核心主檔 (Dp040)</span>}>
                    <Row gutter={[16, 12]}>
                      <Col span={4}><Form.Item label="Invoice No" required layout="vertical" style={{ marginBottom:0 }}><Input value={selectedMaster.invoiceno} onChange={e => updateMasterField('invoiceno', e.target.value)} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="出貨日期" layout="vertical" style={{ marginBottom:0 }}><DatePicker style={{ width:'100%' }} value={selectedMaster.sentdate ? dayjs(selectedMaster.sentdate):null} onChange={d => updateMasterField('sentdate', d?d.toISOString():null)} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="年度" layout="vertical" style={{ marginBottom:0 }}><Input value={selectedMaster.year} onChange={e => updateMasterField('year', e.target.value)} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="發貨公司" layout="vertical" style={{ marginBottom:0 }}><Select value={selectedMaster.ba005gkey} onChange={v => updateMasterField('ba005gkey', v)} options={lookups.companies.map(c=>({ value: c.gkey, label: c.shortname }))} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="客戶" layout="vertical" style={{ marginBottom:0 }}><Select showSearch value={selectedMaster.ba010gkey} onChange={v => updateMasterField('ba010gkey', v)} options={lookups.customers.map(c=>({ value: c.gkey, label: c.shortname }))} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="季節" layout="vertical" style={{ marginBottom:0 }}><Select showSearch value={selectedMaster.ba055gkey} onChange={v => updateMasterField('ba055gkey', v)} options={lookups.seasons.map(s=>({ value: s.gkey, label: s.groupcode }))} /></Form.Item></Col>
                      
                      <Col span={4}><Form.Item label="提單 AWB No" layout="vertical" style={{ marginBottom:0 }}><Input value={selectedMaster.blawb} onChange={e => updateMasterField('blawb', e.target.value)} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="快遞代理" layout="vertical" style={{ marginBottom:0 }}><Select showSearch value={selectedMaster.ba090gkey} onChange={v => updateMasterField('ba090gkey', v)} options={lookups.couriers.map(c=>({ value: c.gkey, label: c.courier }))} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="運輸方式" layout="vertical" style={{ marginBottom:0 }}><Select value={selectedMaster.ba091gkey} onChange={v => updateMasterField('ba091gkey', v)} options={lookups.transports.map(t=>({ value: t.gkey, label: t.shipmode }))} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="幣別" layout="vertical" style={{ marginBottom:0 }}><Select value={selectedMaster.ba060gkey} onChange={v => updateMasterField('ba060gkey', v)} options={lookups.currencies.map(c=>({ value: c.gkey, label: c.currency }))} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="製單人" layout="vertical" style={{ marginBottom:0 }}><Select value={selectedMaster.es101gkey} onChange={v => updateMasterField('es101gkey', v)} options={lookups.users.map(u=>({ value: u.gkey, label: u.englishname }))} /></Form.Item></Col>
                      <Col span={4}><Form.Item label="結案標記" layout="vertical" style={{ marginBottom:0 }}><Select value={selectedMaster.closeflag} onChange={v => updateMasterField('closeflag', v)} options={[{ value: 'Y', label: '已結案' }, { value: 'N', label: '未結案' }]} /></Form.Item></Col>
                    </Row>
                  </Card>

                  {/* Multi Grids for Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '12px' }}>
                    <Tabs
                      type="card"
                      items={[
                        {
                          key: 'items',
                          label: '📦 出貨品項明細 (Dp041)',
                          children: (
                            <div>
                              <div style={{ textAlign: 'right', marginBottom: 8 }}><Button size="small" icon={<PlusOutlined />} onClick={add41Row}>新增加品項</Button></div>
                              <Table dataSource={dp041} columns={dp041Columns} size="small" rowKey="gkey" pagination={false} bordered />
                            </div>
                          )
                        },
                        {
                          key: 'cartonWeights',
                          label: '⚖️ 毛淨重與箱號配置 (Dp042)',
                          children: (
                            <div>
                              <div style={{ textAlign: 'right', marginBottom: 8 }}><Button size="small" icon={<PlusOutlined />} onClick={add42Row}>新增箱號定義</Button></div>
                              <Table dataSource={dp042} columns={dp042Columns} size="small" rowKey="gkey" pagination={false} bordered />
                            </div>
                          )
                        },
                        {
                          key: 'cartonItems',
                          label: '📐 裝箱包裝分配 (Dp043)',
                          children: (
                            <div>
                              <div style={{ textAlign: 'right', marginBottom: 8 }}><Button size="small" icon={<PlusOutlined />} onClick={add43Row}>分配品項進箱</Button></div>
                              <Table dataSource={dp043} columns={dp043Columns} size="small" rowKey="gkey" pagination={false} bordered />
                            </div>
                          )
                        }
                      ]}
                    />
                  </div>
                </div>
              ) : null
            }
          ]}
        />
      </div>
      <ReportModal 
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        reportConfig={getProgramConfig('dp040')?.reportConfig}
        activeRecord={selectedMaster}
        queryParams={{}}
        isDirty={isDirty}
        defaultAction={reportDefaultAction}
      />
    </div>
  );
}
