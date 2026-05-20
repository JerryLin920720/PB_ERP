import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Card, Row, Col, Typography, message, Divider } from 'antd';
import { SearchOutlined, ReloadOutlined, FileImageOutlined, BarChartOutlined, DeploymentUnitOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;
const API_URL = 'http://localhost:8001/api/';

/**
 * 👞 DP060 大底量產統計查詢 (Outsole Production Stats)
 * 100% 物理復刻: w_dp060.srw / d_dp060_query.srd
 * 功能：統計特定大底在所有正式訂單中的使用總量。
 */
export default function Dp060Sheet() {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  
  // 🔎 查詢條件 (d_dp060_query_where)
  const [filters, setFilters] = useState({
    bottomno: '',
    shortname: '',
    factno: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.bottomno) params.bottomno = filters.bottomno;
      if (filters.shortname) params.shortname = filters.shortname;
      if (filters.factno) params.factno = filters.factno;
      
      // 這裡呼叫後端統計 API (模擬 PB 聚算)
      const res = await axios.get(`${API_URL}dp060/`, { params });
      setDataSource(res.data);
      if (res.data.length > 0) setSelectedRow(res.data[0]);
    } catch (e) {
      message.error('統計數據加載失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ⚡ MDI 監聽
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp060' && action === 'retrieve') fetchData();
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, []);

  // 📡 參數接收監聽
  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === 'dp060' && params.bottomno) {
        setFilters(prev => ({ ...prev, bottomno: params.bottomno }));
        // Trigger fetch with immediate param to avoid stale state
        const immediateParams = { ...filters, bottomno: params.bottomno };
        setLoading(true);
        axios.get(`${API_URL}dp060/`, { params: immediateParams })
          .then(res => { setDataSource(res.data); if(res.data.length>0) setSelectedRow(res.data[0]); })
          .finally(() => setLoading(false));
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, [filters]);

  const columns = [
    { title: '大底編號', dataIndex: 'dp015_bottomno', width: 150, sorter: (a, b) => a.dp015_bottomno.localeCompare(b.dp015_bottomno) },
    { title: '楦頭編號', dataIndex: 'dp010_lastno', width: 120 },
    { title: '型體編號', dataIndex: 'sa031_styleno', width: 150 },
    { title: '客戶簡稱', dataIndex: 'ba010_shortname', width: 120 },
    { title: '工廠簡稱', dataIndex: 'ba015_shortname', width: 120 },
    { title: '性別', dataIndex: 'dp004_gender', width: 100 },
    { title: 'PO單號', dataIndex: 'sa030_pono', width: 130 },
    { title: 'SizeRun', dataIndex: 'sa032_sizerun', width: 120 },
    { 
      title: '下單總數', 
      dataIndex: 'totalpairs', 
      width: 100, 
      align: 'right',
      render: v => <b style={{ color: '#1890ff' }}>{Number(v).toLocaleString()}</b>
    }
  ];

  return (
    <div className="mdi-sheet-container" style={{ padding: '16px', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      
      {/* 🛠️ Query Header */}
      <Card size="small" style={{ marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Row gutter={16} align="bottom">
          <Col span={5}>
            <Text size="small" type="secondary">大底編號</Text>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="輸入大底編號..." 
              value={filters.bottomno} 
              onChange={e => setFilters({...filters, bottomno: e.target.value})}
              onPressEnter={fetchData}
            />
          </Col>
          <Col span={5}>
            <Text size="small" type="secondary">客戶名稱</Text>
            <Input 
              placeholder="輸入客戶..." 
              value={filters.shortname} 
              onChange={e => setFilters({...filters, shortname: e.target.value})}
              onPressEnter={fetchData}
            />
          </Col>
          <Col span={5}>
            <Text size="small" type="secondary">工廠編號</Text>
            <Input 
              placeholder="輸入工廠..." 
              value={filters.factno} 
              onChange={e => setFilters({...filters, factno: e.target.value})}
              onPressEnter={fetchData}
            />
          </Col>
          <Col span={9}>
            <Space>
              <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>執行量產統計檢索</Button>
              <Button icon={<BarChartOutlined />} onClick={() => message.info('正在生成對應報表...')}>報表預覽</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
        {/* 📊 Main Data Table */}
        <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong><DeploymentUnitOutlined /> 大底量產下單統計清單 (d_dp060_query)</Text>
            {selectedRow && <Tag color="blue">選中大底: {selectedRow.dp015_bottomno}</Tag>}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table 
              loading={loading}
              dataSource={dataSource}
              columns={columns}
              rowKey={(r, i) => i}
              size="small"
              bordered
              pagination={{ pageSize: 50 }}
              sticky
              onRow={(record) => ({
                onClick: () => setSelectedRow(record),
                style: { cursor: 'pointer', backgroundColor: selectedRow === record ? '#e6f7ff' : undefined }
              })}
            />
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: '#fafafa', borderTop: '1px solid #f0f0f0', textAlign: 'right' }}>
            <Text strong>總計累計雙數: </Text>
            <Text style={{ fontSize: '18px', color: '#cf1322', fontWeight: 'bold' }}>
              {dataSource.reduce((acc, cur) => acc + Number(cur.totalpairs || 0), 0).toLocaleString()} 雙
            </Text>
          </div>
        </div>

        {/* 🖼️ Side Picture Preview (uo_pic) */}
        <div style={{ width: '300px', backgroundColor: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <Text strong style={{ marginBottom: '12px', display: 'block' }}><FileImageOutlined /> 大底圖片預覽 (uo_pic)</Text>
          <div style={{ flex: 1, border: '1px dashed #d9d9d9', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', overflow: 'hidden' }}>
            {selectedRow && selectedRow.dp015_photopath ? (
              <img 
                src={selectedRow.dp015_photopath} 
                alt="Outsole" 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=No+Image'}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#bfbfbf' }}>
                <FileImageOutlined style={{ fontSize: '48px', marginBottom: '8px' }} />
                <div>暫無圖片</div>
              </div>
            )}
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ fontSize: '12px', color: '#595959' }}>
            <div><b>大底編號:</b> {selectedRow?.dp015_bottomno || '-'}</div>
            <div><b>型體:</b> {selectedRow?.sa031_styleno || '-'}</div>
            <div><b>客戶:</b> {selectedRow?.ba010_shortname || '-'}</div>
          </div>
        </div>
      </div>

      <style>{`
        .modern-sheet-container { height: 100vh; overflow: hidden; background: #f0f2f5; }
        .modern-sheet-container .ant-table { font-size: 13px; }
        .modern-sheet-container .ant-table-thead > tr > th { background: #fafafa; font-weight: 600; padding: 12px 8px !important; }
        .modern-sheet-container .ant-table-tbody > tr > td { padding: 8px 8px !important; }
        .ant-table-row:hover td { background-color: #f5f5f5 !important; }
      `}</style>
    </div>
  );
}
