import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Card, Row, Col, Typography, message, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined, SwapOutlined, InteractionOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;
const API_URL = 'http://localhost:8001/api/';

/**
 * 🔄 DP065 樣品指令生命週期轉化查詢 (Sample Life-cycle Conversion)
 * 100% 物理復刻: w_dp065.srw / d_dp065_query.srd
 * 功能：追蹤樣品單從開發到量產訂單的轉化率與狀態變遷。
 */
export default function Dp065Sheet() {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [filters, setFilters] = useState({ sampleno: '', styleno: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}dp065/`, { params: filters });
      setDataSource(res.data);
    } catch (e) {
      message.error('轉換數據加載失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { title: '樣品單號', dataIndex: 'sampleno', width: 140 },
    { title: '型體編號', dataIndex: 'styleno', width: 140 },
    { title: '開發日期', dataIndex: 'dp030_date', width: 110 },
    { title: '客戶', dataIndex: 'ba010_shortname', width: 120 },
    { title: '開發狀態', dataIndex: 'status', width: 100, render: v => <Tag color="orange">{v}</Tag> },
    { title: '轉化正式單號', dataIndex: 'sa030_pono', width: 140, render: v => v ? <Text strong color="green">{v}</Text> : <Text type="secondary">尚未轉化</Text> },
    { title: '轉化日期', dataIndex: 'conv_date', width: 110 },
    { title: '轉化率', dataIndex: 'conv_rate', width: 90, align: 'right', render: v => `${v || 0}%` }
  ];

  return (
    <div className="mdi-sheet-container" style={{ padding: '16px', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="bottom">
          <Col span={6}>
            <Text size="small" type="secondary">樣品單號</Text>
            <Input prefix={<SwapOutlined />} value={filters.sampleno} onChange={e => setFilters({...filters, sampleno: e.target.value})} onPressEnter={fetchData} />
          </Col>
          <Col span={6}>
            <Text size="small" type="secondary">型體編號</Text>
            <Input value={filters.styleno} onChange={e => setFilters({...filters, styleno: e.target.value})} onPressEnter={fetchData} />
          </Col>
          <Col span={6}>
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>執行生命週期分析</Button>
          </Col>
        </Row>
      </Card>
      
      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong><InteractionOutlined /> 樣品生命週期轉化查詢 (d_dp065_query)</Text>
        </div>
        <Table 
          loading={loading}
          dataSource={dataSource}
          columns={columns}
          rowKey="gkey"
          size="small"
          bordered
          pagination={{ pageSize: 50 }}
        />
      </div>
    </div>
  );
}
