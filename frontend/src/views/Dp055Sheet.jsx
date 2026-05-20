import React, { useState, useEffect, useMemo } from 'react';
import { Table, Input, Select, Button, Space, Card, Row, Col, Tag, Statistic, message, Popconfirm, InputNumber } from 'antd';
import { DollarOutlined, SearchOutlined, SaveOutlined, ReloadOutlined, CalculatorOutlined, LineChartOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api/';

export default function Dp055Sheet() {
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Data cache
  const [masterSamples, setMasterSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null); // Active Dp030 object

  // Sub-grids
  const [bomMaterials, setBomMaterials] = useState([]); // Dp032 lines
  
  // Query
  const [qSampleNo, setQSampleNo] = useState('');

  // Local overhead states for rapid calculation
  const [wages, setWages] = useState(0);
  const [manage, setManage] = useState(0);
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    doQuery();
  }, []);

  const doQuery = async () => {
    setLoading(true);
    try {
      const params = {};
      if (qSampleNo) params.sampleno = qSampleNo;
      const res = await axios.get(`${API_URL}dp030/`, { params });
      setMasterSamples(res.data);
      setSelectedSample(null);
      setBomMaterials([]);
    } catch (e) {
      message.error('載入樣品單主檔失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleCosting = async (row) => {
    setSelectedSample(row);
    setWages(parseFloat(row.wagescost || 0));
    setManage(parseFloat(row.managecost || 0));
    setProfit(parseFloat(row.profit || 0));

    setDetailLoading(true);
    try {
      const res = await axios.get(`${API_URL}dp032/?dp030gkey=${row.gkey}`);
      // Ensure numbers are parsed
      const parsed = res.data.map(m => ({
        ...m,
        cost1: parseFloat(m.cost1 || 0),
        loss1: parseFloat(m.loss1 || 0),
        qprp: parseFloat(m.qprp || 0)
      }));
      setBomMaterials(parsed);
    } catch (e) {
      message.error('BOM 材料資料讀取失敗');
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper to update local row costing inputs
  const updateMaterialCell = (idx, field, val) => {
    const copy = [...bomMaterials];
    copy[idx][field] = parseFloat(val) || 0;
    
    // ⚡ [毛用量物理公式]: Gross Yield = qprp * 2 * (1 + loss / 100)
    if (field === 'loss1') {
      const qprp = copy[idx].qprp || 0;
      copy[idx].grossyield1 = qprp * 2 * (1 + parseFloat(val || 0) / 100);
    }
    setBomMaterials(copy);
  };

  // 🧮 [FOB 物理核算運算引擎]
  const totals = useMemo(() => {
    let materialSum = 0;
    bomMaterials.forEach(item => {
      // Material Unit Cost sum using combination 1 as principal costing anchor
      const qprp = parseFloat(item.qprp || 0);
      const loss = parseFloat(item.loss1 || 0);
      const cost = parseFloat(item.cost1 || 0);
      
      // 1 Pair gross yield
      const gy = qprp * 2 * (1 + loss / 100);
      const lineAmount = gy * cost;
      materialSum += lineAmount;
    });

    const fob = materialSum + wages + manage + profit;

    return {
      materialSum,
      fob
    };
  }, [bomMaterials, wages, manage, profit]);

  // 💾 SAVE BACK TO VIRTUAL PERSPECTIVE (DP030/DP032)
  const handleSaveCosting = async () => {
    if (!selectedSample) return;
    setDetailLoading(true);
    try {
      // 1. Update Dp030 financial headers
      await axios.patch(`${API_URL}dp030/${selectedSample.gkey}/`, {
        wagescost: wages,
        managecost: manage,
        profit: profit,
        amount: totals.fob // Persist final FOB to amount
      });

      // 2. Sequentially update each Dp032 row with new costs
      const updates = bomMaterials.map(item => {
        const gy = item.qprp * 2 * (1 + item.loss1 / 100);
        return axios.patch(`${API_URL}dp032/${item.gkey}/`, {
          cost1: item.cost1,
          loss1: item.loss1,
          grossyield1: gy
        });
      });

      await Promise.all(updates);

      message.success('🎉 樣品成本 FOB 核算存檔完成！');
      
      // Refresh list to persist amounts
      const sKey = selectedSample.gkey;
      await doQuery();
      
      // Re-select to ensure UI fresh state
      const res = await axios.get(`${API_URL}dp030/${sKey}/`);
      loadSampleCosting(res.data);
    } catch (e) {
      message.error('存檔失敗！請確認網路或欄位內容。');
    } finally {
      setDetailLoading(false);
    }
  };

  const sampleColumns = [
    { title: '樣品單號 (Sample No)', dataIndex: 'sampleno', width: 150, render: v => <b style={{ color: '#1890ff' }}>{v}</b> },
    { title: '型體編號', dataIndex: 'styleno', width: 150 },
    { title: '客戶簡稱', dataIndex: 'ba010_shortname', width: 120 },
    { title: '幣別', dataIndex: 'aba060_code', width: 80 },
    {
      title: '💸 當前核算 FOB',
      dataIndex: 'amount',
      render: (v) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>${(parseFloat(v) || 0).toFixed(4)}</span>
    }
  ];

  const bomColumns = [
    { title: '序號', dataIndex: 'serialno', width: 50 },
    { title: '部位', dataIndex: 'parts', width: 120, render: v => <Tag color="blue">{v}</Tag> },
    { title: '材料說明', dataIndex: 'cmaterial1', ellipsis: true },
    { title: '單位', dataIndex: 'unit', width: 70 },
    { title: '0.5雙淨用', dataIndex: 'qprp', width: 90, render: v => (parseFloat(v) || 0).toFixed(4) },
    {
      title: '⚙️ 損耗 (%)',
      dataIndex: 'loss1',
      width: 120,
      render: (v, r, idx) => (
        <Input 
          type="number" 
          size="small"
          value={v} 
          onChange={e => updateMaterialCell(idx, 'loss1', e.target.value)} 
          style={{ background: '#fffbe6', borderColor: '#ffe58f' }}
        />
      )
    },
    {
      title: '📏 1雙毛用量',
      key: 'gy',
      width: 110,
      render: (_, r) => {
        const gy = r.qprp * 2 * (1 + (r.loss1 || 0) / 100);
        return <span style={{ color: '#fa8c16', fontWeight: '600' }}>{gy.toFixed(4)}</span>;
      }
    },
    {
      title: '💰 材料單價',
      dataIndex: 'cost1',
      width: 130,
      render: (v, r, idx) => (
        <Input 
          type="number" 
          size="small"
          value={v} 
          onChange={e => updateMaterialCell(idx, 'cost1', e.target.value)} 
          prefix="$"
          style={{ background: '#f6ffed', borderColor: '#b7eb8f', fontWeight: 'bold' }}
        />
      )
    },
    {
      title: '📊 材料小計',
      key: 'amt',
      width: 120,
      render: (_, r) => {
        const gy = r.qprp * 2 * (1 + (r.loss1 || 0) / 100);
        const lineAmt = gy * (r.cost1 || 0);
        return <b style={{ color: '#52c41a' }}>${lineAmt.toFixed(4)}</b>;
      }
    }
  ];

  return (
    <div className="modern-sheet-container">
      
      {/* Header */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#fa8c16', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalculatorOutlined /> DP055 樣品成本核算管理 (Virtual Costing Center)
        </span>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={doQuery}>查詢重置</Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        
        {/* SECTION 1: Sample Master Browser */}
        <div style={{ height: '220px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#595959' }}>🔍 選擇核算目標樣品單:</span>
            <Space>
              <Input size="small" placeholder="單號/型體..." style={{ width: 160 }} value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} onPressEnter={doQuery} />
              <Button size="small" type="primary" icon={<SearchOutlined />} onClick={doQuery} style={{ background: '#fa8c16', border: '#fa8c16' }}>搜尋</Button>
            </Space>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Table 
              loading={loading}
              dataSource={masterSamples}
              columns={sampleColumns}
              rowKey="gkey"
              size="small"
              bordered
              pagination={false}
              onRow={(record) => ({
                onClick: () => loadSampleCosting(record),
                style: { cursor: 'pointer', background: selectedSample?.gkey === record.gkey ? '#fff7e6' : 'inherit' }
              })}
            />
          </div>
        </div>

        {/* SECTION 2: Live Calculator HUD (Heads Up Display) */}
        {selectedSample && (
          <Card size="small" bordered={false} style={{ boxShadow: 'var(--shadow-sm)', borderLeft: '6px solid #fa8c16' }}>
            <Row gutter={16} align="middle">
              <Col span={4}>
                <Statistic 
                  title="📦 累計材料成本" 
                  value={totals.materialSum} 
                  precision={4} 
                  prefix="$" 
                  valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }} 
                />
              </Col>
              <Col span={12}>
                <Card size="small" style={{ backgroundColor: '#fafafa', border: '1px dashed #d9d9d9' }}>
                  <Row gutter={8}>
                    <Col span={8}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4 }}>👷 管工工資</div>
                      <InputNumber 
                        style={{ width: '100%' }} 
                        value={wages} 
                        onChange={setWages} 
                        precision={4}
                        prefix="$"
                      />
                    </Col>
                    <Col span={8}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4 }}>🏢 製造管理費</div>
                      <InputNumber 
                        style={{ width: '100%' }} 
                        value={manage} 
                        onChange={setManage} 
                        precision={4}
                        prefix="$"
                      />
                    </Col>
                    <Col span={8}>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 4 }}>📈 預計利潤</div>
                      <InputNumber 
                        style={{ width: '100%' }} 
                        value={profit} 
                        onChange={setProfit} 
                        precision={4}
                        prefix="$"
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
              <Col span={4} style={{ textAlign: 'right' }}>
                <Statistic 
                  title="🏁 試版核算 FOB" 
                  value={totals.fob} 
                  precision={4} 
                  prefix="$" 
                  valueStyle={{ color: '#52c41a', fontWeight: '800', fontSize: '24px' }} 
                />
              </Col>
              <Col span={4} style={{ textAlign: 'right' }}>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<SaveOutlined />} 
                  onClick={handleSaveCosting}
                  style={{ background: '#52c41a', borderColor: '#52c41a', height: '50px', width: '100%', fontWeight: 'bold' }}
                >
                  儲存核算 FOB
                </Button>
              </Col>
            </Row>
          </Card>
        )}

        {/* SECTION 3: Material Breakdown Editing Grid */}
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <LineChartOutlined style={{ color: '#fa8c16' }} />
            <span style={{ fontWeight: 'bold', color: '#1f1f1f', fontSize: '15px' }}>📝 BOM 部位用料及單價明細</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Table 
              loading={detailLoading}
              dataSource={bomMaterials}
              columns={bomColumns}
              rowKey="gkey"
              size="middle"
              bordered
              pagination={false}
              locale={{ emptyText: '請先選取上方樣品單以載入 BOM 材料核算明細。' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
