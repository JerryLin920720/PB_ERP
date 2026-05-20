import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Card, Row, Col, Tag, Form, DatePicker, Popconfirm, message, Statistic, Divider } from 'antd';
import { FileAddOutlined, SearchOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, ImportOutlined, AccountBookOutlined, DollarOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:8001/api/';

export default function Dp100Sheet() {
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // 💾 Master Cache
  const [transfers, setTransfers] = useState([]);
  const [activeTransfer, setActiveTransfer] = useState(null);

  // 💾 Details State (Dp101)
  const [details, setDetails] = useState([]);

  // 🔎 Queries
  const [qRefNo, setQRefNo] = useState('');

  // 🗂️ Dropdowns Cache
  const [factories, setFactories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [samples, setSamples] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [lasts, setLasts] = useState([]);
  const [bottoms, setBottoms] = useState([]);
  const [heels, setHeels] = useState([]);

  useEffect(() => {
    fetchLookups();
    doQuery();
  }, []);

  // ⚡ MDI 監聽
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp100' && action === 'retrieve') doQuery();
      else if (targetSheet === 'dp100' && action === 'save') form.submit();
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, []);

  // 📡 參數接收監聽
  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === 'dp100' && params.refno) {
        setQRefNo(params.refno);
        setLoading(true);
        axios.get(`${API_URL}dp100/`, { params: { refno: params.refno } })
          .then(res => { setTransfers(res.data); if(res.data.length>0) loadTransferDetails(res.data[0]); })
          .finally(() => setLoading(false));
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, []);

  const fetchLookups = async () => {
    try {
      const [fac, cust, samp, cur, lst, btm, hel] = await Promise.all([
        axios.get(`${API_URL}ba015/`),
        axios.get(`${API_URL}ba010/`),
        axios.get(`${API_URL}dp030/`),
        axios.get(`${API_URL}ba060/`),
        axios.get(`${API_URL}dp010/`),
        axios.get(`${API_URL}dp015/`),
        axios.get(`${API_URL}dp020/`)
      ]);
      setFactories(fac.data);
      setCustomers(cust.data);
      setSamples(samp.data);
      setCurrencies(cur.data);
      setLasts(lst.data);
      setBottoms(btm.data);
      setHeels(hel.data);
    } catch (e) {
      console.error('Lookup error', e);
    }
  };

  const doQuery = async () => {
    setLoading(true);
    try {
      const params = {};
      if (qRefNo) params.refno = qRefNo;
      const res = await axios.get(`${API_URL}dp100/`, { params });
      setTransfers(res.data);
      handleAddNew(); // Default to new record state
    } catch (e) {
      message.error('讀取轉嫁單清單失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadTransferDetails = async (row) => {
    setActiveTransfer(row);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API_URL}dp101/?dp100gkey=${row.gkey}`);
      setDetails(res.data);
      form.setFieldsValue({
        ...row,
        issuedate: row.issuedate ? dayjs(row.issuedate) : null
      });
    } catch (e) {
      message.error('加載細表失敗');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddNew = () => {
    setActiveTransfer(null);
    form.resetFields();
    form.setFieldsValue({
      issuedate: dayjs(),
      year: dayjs().format('YYYY'),
      refno: `TRF-${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random()*1000)}`
    });
    setDetails([]);
  };

  // ⚡ AUTO BIND FROM SAMPLE SELECT
  const handleSampleChange = (sKey) => {
    const target = samples.find(s => s.gkey === sKey);
    if (target) {
      form.setFieldsValue({
        styleno: target.styleno,
        ba010gkey: target.ba010gkey,
        ba015gkey: target.ba015gkey,
        dp010gkey: target.dp010gkey,
        dp015gkey: target.dp015gkey,
        dp020gkey: target.dp020gkey,
        ba060gkey: target.ba060gkey
      });
    }
  };

  // 🚀 [超核心業務 - BOM 轉向導入 ue_preimport]
  const handleImportFromBOM = async () => {
    const sampleGkey = form.getFieldValue('dp030gkey');
    if (!sampleGkey) {
      message.warning('⚠️ 請先選擇「關聯樣品開發單」以供自動對沖轉向導入！');
      return;
    }

    setDetailLoading(true);
    try {
      const res = await axios.get(`${API_URL}dp032/?dp030gkey=${sampleGkey}`);
      
      const defaultCur = form.getFieldValue('ba060gkey') || currencies[0]?.gkey;

      // Transform BOM Dp032 specification to Transfer detail Dp101
      const importedRows = res.data.map((bom, index) => {
        // Logic: Qty = BOM gross yield, Price = Material cost
        const qty = parseFloat(bom.qprp || 0) * 2 * (1 + (parseFloat(bom.loss1 || 0) / 100));
        const price = parseFloat(bom.cost1 || 0);
        
        return {
          gkey: `temp_imp_${Date.now()}_${index}`,
          partname: `${bom.parts || ''} (${bom.cmaterial1 || '材料'})`,
          qty: qty || 1,
          ba060gkey: defaultCur,
          price: price || 0,
          amount: qty * price,
          remark: 'BOM 自動導入對沖'
        };
      });

      setDetails([...details, ...importedRows]);
      message.success(`🎉 成功自樣品開發單一鍵對沖導入 ${importedRows.length} 筆部位明細！`);
    } catch (e) {
      message.error('對沖導入發生系統錯誤。');
    } finally {
      setDetailLoading(false);
    }
  };

  // ===========================================
  // 📐 DYNAMIC ROW MATH ENGINE
  // ===========================================
  const addRow = () => {
    const defaultCur = form.getFieldValue('ba060gkey') || (currencies.length > 0 ? currencies[0].gkey : undefined);
    setDetails([...details, {
      gkey: `temp_${Date.now()}`,
      partname: '',
      qty: 1,
      price: 0,
      amount: 0,
      ba060gkey: defaultCur,
      remark: ''
    }]);
  };

  const updateCell = (gkey, field, val) => {
    setDetails(details.map(item => {
      if (item.gkey !== gkey) return item;
      
      const copy = { ...item, [field]: val };
      
      // Auto recalc sum logic
      if (field === 'qty' || field === 'price') {
        copy.amount = parseFloat(copy.qty || 0) * parseFloat(copy.price || 0);
      }
      return copy;
    }));
  };

  const removeRow = (gkey) => {
    setDetails(details.filter(d => d.gkey !== gkey));
  };

  // Compute Total
  const computedTotalAmount = React.useMemo(() => {
    return details.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  }, [details]);

  // ===========================================
  // 💾 ATOMIC DEEP SAVE HANDLER
  // ===========================================
  const onFinishSave = async (values) => {
    setDetailLoading(true);
    try {
      const payload = {
        master: {
          ...values,
          gkey: activeTransfer?.gkey || undefined,
          issuedate: values.issuedate ? values.issuedate.toISOString() : null,
          amount: computedTotalAmount // Bind computed sum to parent
        },
        details: details
      };

      const res = await axios.post(`${API_URL}dp100/deep_save/`, payload);
      if (res.data.success) {
        message.success(res.data.message);
        const newGkey = res.data.gkey;
        await doQuery();
        
        // Reload
        const reloadRes = await axios.get(`${API_URL}dp100/${newGkey}/`);
        loadTransferDetails(reloadRes.data);
      }
    } catch (e) {
      message.error('轉嫁交易存檔失敗: ' + (e.response?.data?.detail || e.message));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!activeTransfer) return;
    try {
      await axios.delete(`${API_URL}dp100/${activeTransfer.gkey}/`);
      message.success('🗑️ 費用轉嫁整單已作廢刪除！');
      doQuery();
    } catch (e) {
      message.error('作廢失敗');
    }
  };

  const masterColumns = [
    { title: '轉嫁單號', dataIndex: 'refno', render: v => <b style={{ color: '#0050b3' }}>{v}</b> },
    { title: '年度', dataIndex: 'year', width: 70 },
    { 
      title: '轉嫁金額', 
      dataIndex: 'amount', 
      render: v => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>${(parseFloat(v) || 0).toFixed(2)}</span> 
    }
  ];

  const detailColumns = [
    {
      title: '🔨 轉嫁部位/項目',
      dataIndex: 'partname',
      render: (v, r) => <Input size="small" value={v} onChange={e => updateCell(r.gkey, 'partname', e.target.value)} />
    },
    {
      title: '🔢 數量',
      dataIndex: 'qty',
      width: 100,
      render: (v, r) => <Input size="small" type="number" value={v} onChange={e => updateCell(r.gkey, 'qty', e.target.value)} />
    },
    {
      title: '🪙 幣別',
      dataIndex: 'ba060gkey',
      width: 110,
      render: (v, r) => (
        <Select 
          size="small"
          style={{ width: '100%' }}
          value={v}
          onChange={val => updateCell(r.gkey, 'ba060gkey', val)}
          options={currencies.map(c => ({ value: c.gkey, label: c.currency }))}
        />
      )
    },
    {
      title: '💰 單價',
      dataIndex: 'price',
      width: 120,
      render: (v, r) => <Input size="small" type="number" value={v} onChange={e => updateCell(r.gkey, 'price', e.target.value)} />
    },
    {
      title: '📊 項目總計',
      dataIndex: 'amount',
      width: 120,
      render: (v) => <b style={{ color: '#cf1322' }}>${(parseFloat(v) || 0).toFixed(2)}</b>
    },
    {
      title: '💬 備註',
      dataIndex: 'remark',
      render: (v, r) => <Input size="small" value={v} onChange={e => updateCell(r.gkey, 'remark', e.target.value)} />
    },
    {
      title: '',
      key: 'act',
      width: 50,
      render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => removeRow(r.gkey)} />
    }
  ];

  return (
    <div className="modern-sheet-container">
      
      {/* TOP TOOLBAR */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#096dd9', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AccountBookOutlined /> DP100 開發費用轉嫁管理 (Cost Transference Control)
        </span>
        <Space>
          <Button type="primary" ghost icon={<PlusOutlined />} onClick={handleAddNew}>新增轉嫁單</Button>
          {activeTransfer && (
            <Popconfirm title="⚠️ 確定要整單刪除作廢此轉嫁費用單嗎？" onConfirm={handleDeleteReport}>
              <Button danger icon={<DeleteOutlined />}>作廢整單</Button>
            </Popconfirm>
          )}
          <Button type="primary" icon={<SaveOutlined />} style={{ background: '#096dd9', borderColor: '#096dd9' }} onClick={() => form.submit()}>
            存檔並結算
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
        
        {/* 🚪 LEFT: BROWSER */}
        <div style={{ width: '320px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ marginBottom: '12px' }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="轉嫁單號..." value={qRefNo} onChange={e => setQRefNo(e.target.value)} onPressEnter={doQuery} />
              <Button icon={<SearchOutlined />} onClick={doQuery} />
            </Space.Compact>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Table 
              loading={loading}
              dataSource={transfers}
              columns={masterColumns}
              rowKey="gkey"
              size="small"
              bordered
              pagination={{ pageSize: 12 }}
              onRow={(record) => ({
                onClick: () => loadTransferDetails(record),
                style: { cursor: 'pointer', background: activeTransfer?.gkey === record.gkey ? '#e6f7ff' : 'inherit' }
              })}
            />
          </div>
        </div>

        {/* 🖼️ RIGHT: ACTIVE FORM & DETAILS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          
          {/* Top form */}
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <Form form={form} layout="vertical" size="small" onFinish={onFinishSave}>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="refno" label="📌 轉嫁單號" rules={[{ required: true }]}>
                    <Input style={{ fontWeight: 'bold', color: '#000' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dp030gkey" label="🔗 關聯樣品開發單" rules={[{ required: true }]}>
                    <Select 
                      showSearch
                      placeholder="關聯原始樣品BOM"
                      onChange={handleSampleChange}
                      options={samples.map(s => ({ value: s.gkey, label: `${s.sampleno} (${s.styleno})` }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="ba015gkey" label="🏢 轉嫁承擔工廠" rules={[{ required: true }]}>
                    <Select options={factories.map(f => ({ value: f.gkey, label: f.shortname }))} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="issuedate" label="📅 開單日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="year" label="📅 年度">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="ba010gkey" label="客戶對象">
                    <Select disabled options={customers.map(c => ({ value: c.gkey, label: c.shortname }))} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="styleno" label="型體編號">
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="dp015gkey" label="大底編號">
                    <Select disabled options={bottoms.map(b => ({ value: b.gkey, label: b.bottomno }))} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="ba060gkey" label="結算幣別">
                    <Select options={currencies.map(c => ({ value: c.gkey, label: c.currency }))} />
                  </Form.Item>
                </Col>
                <Col span={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '12px' }}>
                  {/* ⚡ DYNAMIC PRE-IMPORT ACTION */}
                  <Button 
                    type="dashed" 
                    icon={<ImportOutlined />} 
                    style={{ borderColor: '#722ed1', color: '#722ed1', fontWeight: 'bold' }}
                    onClick={handleImportFromBOM}
                  >
                    對沖一鍵導入 BOM
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>

          {/* Live HUD displaying Calculated sum of Grid */}
          <Card size="small" style={{ background: '#fff7e6', border: '1px dashed #ffa940', borderLeft: '6px solid #fa8c16' }}>
            <Row align="middle">
              <Col span={12}>
                <span style={{ color: '#d46b08', fontWeight: 'bold', fontSize: '14px' }}>
                  💡 金額流向：將此樣品開發過程中，對沖導入的部位材料與工資金額，完整轉讓結算給承製工廠。
                </span>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Statistic 
                  title="🏆 本單應收工廠費用結算總金額" 
                  value={computedTotalAmount} 
                  precision={2} 
                  prefix={<DollarOutlined />} 
                  valueStyle={{ color: '#cf1322', fontWeight: '800', fontSize: '26px' }} 
                />
              </Col>
            </Row>
          </Card>

          {/* Bottom Details Grid */}
          <div style={{ flex: 1, backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#262626' }}>📋 轉嫁對沖項目明細 (Dp101)</span>
              <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addRow}>新增手動項目</Button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <Table 
                loading={detailLoading}
                dataSource={details}
                columns={detailColumns}
                rowKey="gkey"
                size="small"
                bordered
                pagination={false}
              />
            </div>
          </div>

        </div>

      </div>
      <style>{`
        .modern-sheet-container { height: 100vh; overflow: hidden; background: #f0f2f5; }
        .modern-sheet-container .ant-table { font-size: 13px; }
        .modern-sheet-container .ant-table-thead > tr > th { background: #fafafa; font-weight: 600; padding: 12px 8px !important; }
        .modern-sheet-container .ant-table-tbody > tr > td { padding: 8px 8px !important; }
      `}</style>
    </div>
  );
}
