import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Card, Row, Col, Tag, Radio, Form, DatePicker, Divider, Popconfirm, message } from 'antd';
import { MessageOutlined, SearchOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, FileTextOutlined, CheckCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:8001/api/';

export default function Dp080Sheet() {
  const [form] = Form.useForm();

  // 🛠️ UNIFIED MODE CONTROLLER (Fitting vs CFM)
  const [stage, setStage] = useState('F'); // 'F' = Fitting, 'C' = CFM

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // 💾 Data States
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null); // Active Dp080
  
  // 💾 Grid States
  const [opinions, setOpinions] = useState([]); // Dp081 lines
  const [measurements, setMeasurements] = useState([]); // Dp082 lines

  // 🔎 Filters
  const [qSampleNo, setQSampleNo] = useState('');

  // Cache Lists for Dropdowns
  const [samples, setSamples] = useState([]);
  const [factories, setFactories] = useState([]);
  const [lasts, setLasts] = useState([]);
  const [bottoms, setBottoms] = useState([]);
  const [heels, setHeels] = useState([]);

  useEffect(() => {
    fetchLookups();
    doQuery();
  }, [stage]); // Re-query when stage toggles!

  const fetchLookups = async () => {
    try {
      const [s, f, l, b, h] = await Promise.all([
        axios.get(`${API_URL}dp030/`),
        axios.get(`${API_URL}ba015/`),
        axios.get(`${API_URL}dp010/`),
        axios.get(`${API_URL}dp015/`),
        axios.get(`${API_URL}dp020/`)
      ]);
      setSamples(s.data);
      setFactories(f.data);
      setLasts(l.data);
      setBottoms(b.data);
      setHeels(h.data);
    } catch (e) {
      console.error(e);
    }
  };

  const doQuery = async () => {
    setLoading(true);
    try {
      const params = { opiniontype: stage };
      if (qSampleNo) params.sampleno = qSampleNo;
      const res = await axios.get(`${API_URL}dp080/`, { params });
      setReports(res.data);
      handleAddNew(); // Default to new mode on query refresh
    } catch (e) {
      message.error('讀取評語清單失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadReportDetails = async (row) => {
    setActiveReport(row);
    setDetailLoading(true);
    try {
      // Fetch full aggregate row or sub-grids
      const [opRes, measRes] = await Promise.all([
        axios.get(`${API_URL}dp081/?dp080gkey=${row.gkey}`),
        axios.get(`${API_URL}dp082/?dp080gkey=${row.gkey}`)
      ]);

      setOpinions(opRes.data);
      setMeasurements(measRes.data);

      // Populate Form
      form.setFieldsValue({
        ...row,
        issuedate: row.issuedate ? dayjs(row.issuedate) : null
      });
    } catch (e) {
      message.error('明細加載失敗');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddNew = () => {
    setActiveReport(null);
    form.resetFields();
    form.setFieldsValue({
      opiniontype: stage,
      issuedate: dayjs()
    });
    setOpinions([]);
    setMeasurements([]);
  };

  // 🚀 AUTO FILL FROM SAMPLE SELECTION
  const handleSampleSelect = (sampleGkey) => {
    const smp = samples.find(s => s.gkey === sampleGkey);
    if (smp) {
      form.setFieldsValue({
        styleno: smp.styleno,
        sampleno: smp.sampleno,
        ba010gkey: smp.ba010gkey,
        ba015gkey: smp.ba015gkey,
        dp010gkey: smp.dp010gkey,
        dp015gkey: smp.dp015gkey,
        dp020gkey: smp.dp020gkey,
        photopath: smp.photopath
      });
    }
  };

  // ===========================================
  // ⚡ GRID ADD/UPDATE/REMOVE AGENTS
  // ===========================================
  const addOpinionRow = () => {
    const newSeq = opinions.length > 0 ? Math.max(...opinions.map(o => o.partsno || 0)) + 1 : 1;
    setOpinions([...opinions, {
      gkey: `temp_${Date.now()}`,
      partsno: newSeq,
      parts: '',
      partscomment: '',
      partscheck: 'OK'
    }]);
  };

  const updateOpinionCell = (gkey, col, val) => {
    setOpinions(opinions.map(o => o.gkey === gkey ? { ...o, [col]: val } : o));
  };

  const removeOpinionRow = (gkey) => {
    setOpinions(opinions.filter(o => o.gkey !== gkey));
  };

  const addMeasurementRow = () => {
    const newSeq = measurements.length > 0 ? Math.max(...measurements.map(m => m.serialno || 0)) + 1 : 1;
    setMeasurements([...measurements, {
      gkey: `temp_${Date.now()}`,
      serialno: newSeq,
      size: '8',
      measurement_type: 'Length',
      std_val: 0,
      act_val: 0,
      diff_val: 0
    }]);
  };

  const updateMeasurementCell = (gkey, col, val) => {
    setMeasurements(measurements.map(m => {
      if (m.gkey !== gkey) return m;
      const copy = { ...m, [col]: val };
      
      // Auto recalc difference
      if (col === 'std_val' || col === 'act_val') {
        copy.diff_val = parseFloat(copy.act_val || 0) - parseFloat(copy.std_val || 0);
      }
      return copy;
    }));
  };

  const removeMeasurementRow = (gkey) => {
    setMeasurements(measurements.filter(m => m.gkey !== gkey));
  };

  // ===========================================
  // 💾 ATOMIC DEEP SAVE
  // ===========================================
  const onFinishSave = async (values) => {
    setDetailLoading(true);
    try {
      const masterPayload = {
        ...values,
        gkey: activeReport?.gkey || undefined,
        opiniontype: stage,
        issuedate: values.issuedate ? values.issuedate.toISOString() : null
      };

      const payload = {
        master: masterPayload,
        opinions: opinions,
        measurements: measurements
      };

      const res = await axios.post(`${API_URL}dp080/deep_save/`, payload);
      
      if (res.data.success) {
        message.success(res.data.message);
        const newGkey = res.data.gkey;
        await doQuery();
        // Reload freshly saved report
        const resReload = await axios.get(`${API_URL}dp080/${newGkey}/`);
        loadReportDetails(resReload.data);
      }
    } catch (e) {
      message.error('交易失敗：' + (e.response?.data?.detail || e.message));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!activeReport) return;
    try {
      await axios.delete(`${API_URL}dp080/${activeReport.gkey}/`);
      message.success('🗑️ 反饋報告已全單刪除！');
      doQuery();
    } catch (e) {
      message.error('刪除失敗');
    }
  };

  const reportColumns = [
    {
      title: '樣品號 (序)',
      key: 'info',
      render: (_, r) => (
        <div>
          <b style={{ color: '#135200' }}>{r.sampleno}</b> 
          <Tag style={{ marginLeft: 6 }} color="green">第 {r.serialno} 次</Tag>
        </div>
      )
    },
    { title: '型體', dataIndex: 'styleno', width: 100 }
  ];

  const opinionColumns = [
    { title: '序號', dataIndex: 'partsno', width: 50 },
    {
      title: '🔨 部位 (Parts)',
      dataIndex: 'parts',
      width: 140,
      render: (v, r) => <Input size="small" value={v} onChange={e => updateOpinionCell(r.gkey, 'parts', e.target.value)} />
    },
    {
      title: '✍️ 改良意見 / 評估',
      dataIndex: 'partscomment',
      render: (v, r) => <Input size="small" value={v} onChange={e => updateOpinionCell(r.gkey, 'partscomment', e.target.value)} />
    },
    {
      title: '🚥 結果',
      dataIndex: 'partscheck',
      width: 120,
      render: (v, r) => (
        <Select 
          size="small" 
          style={{ width: '100%' }} 
          value={v} 
          onChange={val => updateOpinionCell(r.gkey, 'partscheck', val)}
          options={[
            { value: 'OK', label: '🟢 OK' },
            { value: 'Modify', label: '🟡 待修 (Modify)' },
            { value: 'NG', label: '🔴 不合格 (NG)' }
          ]}
        />
      )
    },
    {
      title: '',
      key: 'act',
      width: 50,
      render: (_, r) => <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => removeOpinionRow(r.gkey)} />
    }
  ];

  const measurementColumns = [
    {
      title: '尺碼',
      dataIndex: 'size',
      width: 80,
      render: (v, r) => <Input size="small" value={v} onChange={e => updateMeasurementCell(r.gkey, 'size', e.target.value)} />
    },
    {
      title: '量測別',
      dataIndex: 'measurement_type',
      width: 100,
      render: (v, r) => (
        <Select 
          size="small" 
          style={{ width: '100%' }} 
          value={v} 
          onChange={val => updateMeasurementCell(r.gkey, 'measurement_type', val)}
          options={[
            { value: 'Length', label: '鞋長' },
            { value: 'Width', label: '鞋寬' },
            { value: 'Height', label: '鞋高' },
            { value: 'Heel', label: '跟高' }
          ]}
        />
      )
    },
    {
      title: '標準值',
      dataIndex: 'std_val',
      width: 90,
      render: (v, r) => <Input size="small" type="number" value={v} onChange={e => updateMeasurementCell(r.gkey, 'std_val', e.target.value)} />
    },
    {
      title: '實際值',
      dataIndex: 'act_val',
      width: 90,
      render: (v, r) => <Input size="small" type="number" value={v} onChange={e => updateMeasurementCell(r.gkey, 'act_val', e.target.value)} />
    },
    {
      title: '誤差',
      dataIndex: 'diff_val',
      width: 80,
      render: (v) => (
        <span style={{ color: parseFloat(v) > 0.5 || parseFloat(v) < -0.5 ? '#f5222d' : '#52c41a', fontWeight: 'bold' }}>
          {(parseFloat(v) || 0).toFixed(2)}
        </span>
      )
    },
    {
      title: '',
      key: 'act',
      width: 40,
      render: (_, r) => <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => removeMeasurementRow(r.gkey)} />
    }
  ];

  return (
    <div className="modern-sheet-container">
      
      {/* Header Split Switcher */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#5b8c00', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageOutlined /> DP080 樣品試版反饋意見中心
          </span>
          <Radio.Group value={stage} onChange={e => setStage(e.target.value)} buttonStyle="solid">
            <Radio.Button value="F" style={{ fontWeight: 'bold' }}>🏃 FITTING (試穿樣階段)</Radio.Button>
            <Radio.Button value="C" style={{ fontWeight: 'bold' }}>🏆 CFM (確認樣階段)</Radio.Button>
          </Radio.Group>
        </div>
        
        <Space>
          <Button type="primary" ghost icon={<PlusOutlined />} onClick={handleAddNew}>開新反饋單</Button>
          {activeReport && (
            <Popconfirm title="⚠️ 確定要刪除這份試版報告的所有主細表嗎？" onConfirm={handleDeleteReport}>
              <Button danger icon={<DeleteOutlined />}>刪除整單</Button>
            </Popconfirm>
          )}
          <Button type="primary" icon={<SaveOutlined />} style={{ background: '#389e0d', border: '#389e0d' }} onClick={() => form.submit()}>
            儲存本單反饋
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
        
        {/* 🚪 LEFT PANEL: Query & History Explorer */}
        <div style={{ width: '300px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ marginBottom: '12px' }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="樣品單號..." value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} onPressEnter={doQuery} />
              <Button icon={<SearchOutlined />} onClick={doQuery} />
            </Space.Compact>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Table 
              loading={loading}
              dataSource={reports}
              columns={reportColumns}
              rowKey="gkey"
              size="small"
              bordered
              pagination={{ pageSize: 15 }}
              onRow={(record) => ({
                onClick: () => loadReportDetails(record),
                style: { cursor: 'pointer', background: activeReport?.gkey === record.gkey ? '#f6ffed' : 'inherit' }
              })}
            />
          </div>
        </div>

        {/* 🖼️ RIGHT PANEL: Active Work Area (Form + Dual Tables) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          
          {/* Top: Master Form Info */}
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <Form form={form} layout="vertical" onFinish={onFinishSave} size="small">
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="dp030gkey" label="🔗 連結開發指令單" rules={[{ required: true }]}>
                    <Select 
                      showSearch 
                      placeholder="選擇樣品單號"
                      onChange={handleSampleSelect}
                      options={samples.map(s => ({ value: s.gkey, label: `${s.sampleno} (${s.styleno})` }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item name="styleno" label="型體編號">
                    <Input disabled style={{ color: '#000', fontWeight: 'bold' }} />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item name="issuedate" label="📅 評估日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="ba015gkey" label="承製工廠">
                    <Select disabled options={factories.map(f => ({ value: f.gkey, label: f.shortname }))} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="dp010gkey" label="搭配楦頭">
                    <Select disabled options={lasts.map(l => ({ value: l.gkey, label: l.lastno }))} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="othercomment" label="📣 其他指示概要">
                    <Input placeholder="客戶口頭其他指示..." />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="remark" label="📝 試版整體備註">
                    <Input placeholder="填寫整體試穿備註..." />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="conclusion" label="🏁 總體評估結論">
                    <Input placeholder="最終裁定結論..." style={{ borderColor: '#389e0d', background: '#f6ffed' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>

          {/* Bottom Split: Double Tables for Opinions & Measurements */}
          <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
            
            {/* Opinions Table */}
            <div style={{ flex: 3, backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#262626' }}>💬 二階部位改良意見記錄 (Dp081)</span>
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addOpinionRow}>新增部位評語</Button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <Table 
                  loading={detailLoading}
                  dataSource={opinions}
                  columns={opinionColumns}
                  rowKey="gkey"
                  size="small"
                  bordered
                  pagination={false}
                />
              </div>
            </div>

            {/* Measurements Table */}
            <div style={{ flex: 2, backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '3px solid #1890ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1890ff' }}>📏 尺碼物理量測偏差 (Dp082)</span>
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addMeasurementRow}>新增尺碼量測</Button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <Table 
                  loading={detailLoading}
                  dataSource={measurements}
                  columns={measurementColumns}
                  rowKey="gkey"
                  size="small"
                  bordered
                  pagination={false}
                />
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
