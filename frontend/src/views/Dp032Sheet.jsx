import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, Card, Row, Col, Progress, Badge, Image, Tag, message } from 'antd';
import { SearchOutlined, ReloadOutlined, DashboardOutlined, PictureOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:8001/api/';

export default function Dp032Sheet() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);

  // 🔍 Filters
  const [qCust, setQCust] = useState('');
  const [qYear, setQYear] = useState('');
  const [qSampleNo, setQSampleNo] = useState('');
  const [qSampleType, setQSampleType] = useState('');

  // 🌍 Dictionary Cache
  const [lookups, setLookups] = useState({
    customers: [],
    sampleTypes: []
  });

  useEffect(() => {
    fetchLookups();
    fetchData();
  }, []);

  // ⚡ MDI 監聽
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
          .then(res => { setData(res.data); if(res.data.length>0) setSelectedRow(res.data[0]); })
          .finally(() => setLoading(false));
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, []);

  const fetchLookups = async () => {
    try {
      const [custRes, stRes] = await Promise.all([
        axios.get(`${API_URL}ba010/`),
        axios.get(`${API_URL}dp002/`)
      ]);
      setLookups({
        customers: custRes.data,
        sampleTypes: stRes.data
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
      if (qYear) params.year = qYear;
      if (qSampleNo) params.sampleno = qSampleNo;
      if (qSampleType) params.dp002gkey = qSampleType;

      const res = await axios.get(`${API_URL}dp030/outstanding_samples/`, { params });
      setData(res.data);
      if (res.data.length > 0) {
        setSelectedRow(res.data[0]);
      } else {
        setSelectedRow(null);
      }
    } catch (e) {
      message.error('無法讀取欠數進度數據！');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '開發指令單號',
      dataIndex: 'sampleno',
      key: 'sampleno',
      sorter: (a, b) => a.sampleno.localeCompare(b.sampleno),
      render: (text, rec) => (
        <div>
          <div className="modern-sheet-container">{text}</div>
          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{rec.sampletype || '一般樣品'}</div>
        </div>
      )
    },
    {
      title: '客戶 / 工廠',
      key: 'entity',
      render: (_, rec) => (
        <div>
          <Tag color="blue">{rec.customer || 'N/A'}</Tag>
          <span style={{ color: '#bfbfbf', margin: '0 4px' }}>➔</span>
          <Tag color="cyan">{rec.factory || 'N/A'}</Tag>
        </div>
      )
    },
    {
      title: '型體配色 / 尺碼',
      key: 'style_color_size',
      render: (_, rec) => (
        <div>
          <div style={{ fontWeight: '600', color: '#262626' }}>{rec.styleno}</div>
          <div style={{ fontSize: '12px', color: '#595959' }}>
            {rec.color || '無配色'} <Badge count={rec.size} style={{ backgroundColor: '#fa8c16', marginLeft: 4 }} />
          </div>
        </div>
      )
    },
    {
      title: '需求 (客要+留底)',
      key: 'req',
      width: 110,
      align: 'right',
      render: (_, rec) => (
        <span style={{ fontWeight: 'bold' }}>
          {(rec.custpairs + rec.keeppairs).toFixed(1)}
        </span>
      )
    },
    {
      title: '已出貨',
      dataIndex: 'finishpairs',
      width: 80,
      align: 'right',
      render: v => <span style={{ color: '#389e0d', fontWeight: 'bold' }}>{(v || 0).toFixed(1)}</span>
    },
    {
      title: '欠數',
      dataIndex: 'outstanding',
      width: 80,
      align: 'right',
      render: v => (
        <span style={{ color: v > 0 ? '#cf1322' : '#bfbfbf', fontWeight: 'bold' }}>
          {(v || 0).toFixed(1)}
        </span>
      )
    },
    {
      title: '出貨達成進度',
      dataIndex: 'completion_rate',
      width: 160,
      sorter: (a, b) => a.completion_rate - b.completion_rate,
      render: (rate) => {
        let status = 'normal';
        let color = '#1890ff';
        if (rate >= 100) { color = '#52c41a'; status = 'success'; }
        else if (rate > 0) { color = '#faad14'; }
        else { color = '#ff4d4f'; }

        return (
          <div style={{ width: '100%' }}>
            <Progress percent={rate} size="small" strokeColor={color} status={status} />
          </div>
        );
      }
    },
    {
      title: '要求完成日',
      dataIndex: 'duedate',
      width: 110,
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : <span style={{ color: '#bfbfbf' }}>-</span>
    }
  ];

  return (
    <div className="modern-sheet-container" style={{ padding: '16px', backgroundColor: 'var(--app-bg-panel)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 🛠️ Header Toolbar */}
      <div style={{ backgroundColor: '#fff', padding: '16px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '20px', fontWeight: '800', color: '#722ed1', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DashboardOutlined /> DP032 未完樣品催交進度看板
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新進度</Button>
        </Space>
      </div>

      {/* 🔎 Query Filters */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px' }}>
        <Row gutter={16} align="bottom">
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>客戶簡稱</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="全部客戶" value={qCust} onChange={setQCust} options={lookups.customers.map(c => ({ value: c.gkey, label: c.shortname }))} />
          </Col>
          <Col span={4}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>年度</div>
            <Input placeholder="YYYY" value={qYear} onChange={e => setQYear(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>指令編號</div>
            <Input placeholder="關鍵字..." value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} />
          </Col>
          <Col span={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c' }}>樣品類別</div>
            <Select showSearch allowClear style={{ width: '100%' }} placeholder="篩選類別" value={qSampleType} onChange={setQSampleType} options={lookups.sampleTypes.map(t => ({ value: t.gkey, label: t.sampletype }))} />
          </Col>
          <Col span={5}>
            <Button type="primary" icon={<SearchOutlined />} onClick={fetchData} style={{ width: '100%', backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
              開始分析進度
            </Button>
          </Col>
        </Row>
      </div>

      {/* 📊 Main Workplace Layout */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
        
        {/* 📊 Left Grid (Flex 7) */}
        <div style={{ flex: 7, backgroundColor: '#fff', padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
          <Table
            loading={loading}
            dataSource={data}
            columns={columns}
            rowKey="gkey"
            size="middle"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            onRow={(record) => ({
              onClick: () => setSelectedRow(record),
              style: { cursor: 'pointer', background: selectedRow?.gkey === record.gkey ? '#f9f0ff' : 'inherit' }
            })}
            bordered
          />
        </div>

        {/* 🖼️ Right Visual Info Panel (Flex 3) */}
        <div style={{ flex: 3, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', overflowY: 'auto', display: 'flex', flexDirection: 'column', borderLeft: '4px solid #722ed1' }}>
          {selectedRow ? (
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#1f1f1f', marginBottom: '4px' }}>
                {selectedRow.styleno}
              </div>
              <div style={{ color: '#8c8c8c', fontSize: '13px', marginBottom: '16px' }}>{selectedRow.stylename || '無型體名稱資料'}</div>

              <div style={{ width: '100%', height: '220px', backgroundColor: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
                {selectedRow.photopath ? (
                  <Image
                    src={selectedRow.photopath}
                    alt="Style Photo"
                    style={{ objectFit: 'contain', maxHeight: '200px' }}
                    fallback="https://via.placeholder.com/400x300?text=Image+Not+Found"
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#bfbfbf' }}>
                    <PictureOutlined style={{ fontSize: '48px', marginBottom: '8px' }} /><br />
                    <span>暫無樣品型體照片</span>
                  </div>
                )}
              </div>

              <Card size="small" title="📑 詳細跟進數據" style={{ marginBottom: '16px' }}>
                <Row gutter={[8, 12]}>
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>楦頭編號</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedRow.lastno || '-'}</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>大底編號</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedRow.bottomno || '-'}</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>鞋跟編號</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedRow.heelno || '-'}</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>開單日期</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedRow.issuedate ? dayjs(selectedRow.issuedate).format('YYYY-MM-DD') : '-'}</div>
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="🚨 緊急狀態回報" style={{ borderColor: selectedRow.outstanding > 0 ? '#ffa39e' : '#d9d9d9', backgroundColor: selectedRow.outstanding > 0 ? '#fff1f0' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockCircleOutlined style={{ color: selectedRow.outstanding > 0 ? '#f5222d' : '#52c41a' }} />
                  <span style={{ color: selectedRow.outstanding > 0 ? '#cf1322' : '#389e0d', fontWeight: 'bold' }}>
                    {selectedRow.outstanding > 0 ? `目前仍短缺 ${selectedRow.outstanding.toFixed(1)} 雙，請盡速協調出貨！` : '該項次樣品出貨任務已全面完成！'}
                  </span>
                </div>
              </Card>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#bfbfbf' }}>
              <DashboardOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>請在左側表格中選擇一筆樣品項次</div>
            </div>
          )}
        </div>

      </div>
      <style>{`
        .modern-sheet-container { height: 100vh; overflow: hidden; background: #f0f2f5; }
        .modern-sheet-container .ant-table { font-size: 13px; }
        .modern-sheet-container .ant-table-thead > tr > th { background: #fafafa; font-weight: 600; padding: 12px 8px !important; }
        .modern-sheet-container .ant-table-tbody > tr > td { padding: 8px 8px !important; }
        .row-active td { background-color: #e6f7ff !important; }
      `}</style>
    </div>
  );
}
