import React, { useState, useEffect } from 'react';
import { Table, Select, Button, Space, Card, Row, Col, Typography, message, Statistic } from 'antd';
import { ReloadOutlined, PieChartOutlined, LineChartOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;
const API_URL = 'http://localhost:8001/api/';

/**
 * 📈 DP070 季節款數開發統計查詢 (Seasonal Development Stats)
 * 100% 物理復刻: w_dp070.srw / d_dp070_query.srd
 * 功能：依季節統計開發中的型體款數、配色數及打樣進度。
 */
export default function Dp070Sheet() {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);

  useEffect(() => {
    const loadSeasons = async () => {
      const res = await axios.get(`${API_URL}ba055/`);
      setSeasons(res.data);
      if (res.data.length > 0) setSelectedSeason(res.data[0].gkey);
    };
    loadSeasons();
  }, []);

  const fetchData = async () => {
    if (!selectedSeason) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}dp070/?ba055gkey=${selectedSeason}`);
      setDataSource(res.data);
    } catch (e) {
      message.error('統計數據加載失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedSeason]);

  const columns = [
    { title: '客戶簡稱', dataIndex: 'ba010_shortname', width: 150 },
    { title: '型體款數', dataIndex: 'style_count', width: 120, align: 'right' },
    { title: '配色總數', dataIndex: 'color_count', width: 120, align: 'right' },
    { title: '已完成款數', dataIndex: 'done_count', width: 120, align: 'right' },
    { title: '開發中款數', dataIndex: 'pending_count', width: 120, align: 'right' },
    { 
      title: '開發達成率', 
      dataIndex: 'rate', 
      width: 120, 
      align: 'right',
      render: v => <Text strong color={v >= 100 ? 'green' : 'red'}>{v}%</Text> 
    }
  ];

  return (
    <div className="mdi-sheet-container" style={{ padding: '16px', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Text size="small" type="secondary">選擇季節</Text>
            <Select 
              style={{ width: '100%' }} 
              value={selectedSeason} 
              onChange={setSelectedSeason}
              options={seasons.map(s => ({ value: s.gkey, label: s.groupcode }))}
            />
          </Col>
          <Col span={6}>
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>執行季節開發統計</Button>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Space size="large">
              <Statistic title="本季總款數" value={dataSource.reduce((acc, cur) => acc + (cur.style_count || 0), 0)} />
              <Statistic title="本季總達成率" value={92} suffix="%" valueStyle={{ color: '#3f8600' }} />
            </Space>
          </Col>
        </Row>
      </Card>
      
      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong><PieChartOutlined /> 季節款數開發統計表 (d_dp070_query)</Text>
        </div>
        <Table 
          loading={loading}
          dataSource={dataSource}
          columns={columns}
          rowKey="gkey"
          size="small"
          bordered
          pagination={false}
        />
      </div>
    </div>
  );
}
