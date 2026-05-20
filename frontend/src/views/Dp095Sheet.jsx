import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Space, DatePicker, Tag, Badge, Tooltip, message, Popover } from 'antd';
import { CalendarOutlined, SearchOutlined, SaveOutlined, TruckOutlined, SafetyCertificateOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const API_URL = 'http://localhost:8001/api/';

export default function Dp095Sheet() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [dirtyRows, setDirtyRows] = useState({}); // Tracks edited fields by row gkey

  // 🔎 Query states
  const [qSampleNo, setQSampleNo] = useState('');
  const [qStyleNo, setQStyleNo] = useState('');
  const [qStatus, setQStatus] = useState(null);

  useEffect(() => {
    doQuery();
  }, []);

  const doQuery = async () => {
    setLoading(true);
    try {
      const params = {};
      if (qSampleNo) params.sampleno = qSampleNo;
      if (qStyleNo) params.styleno = qStyleNo;
      if (qStatus) params.status = qStatus;

      const res = await axios.get(`${API_URL}dp033/`, { params });
      setRows(res.data);
      setDirtyRows({}); // Clear dirty markers on fresh query
    } catch (e) {
      message.error('樣品排程加載失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (gkey, field, val) => {
    // Update local rows for real-time visual reflection
    setRows(prev => prev.map(r => (r.gkey === gkey ? { ...r, [field]: val } : r)));

    // Track modified value for batch commit
    setDirtyRows(prev => {
      const existing = prev[gkey] || {};
      return {
        ...prev,
        [gkey]: { ...existing, [field]: val }
      };
    });
  };

  // 🚀 Batch persistence engine
  const handleSaveChanges = async () => {
    const dirtyKeys = Object.keys(dirtyRows);
    if (dirtyKeys.length === 0) {
      message.info('✍️ 沒有任何修改變動需要儲存');
      return;
    }

    setLoading(true);
    try {
      // Perform sequential patch commits for all modified size rows
      const promises = dirtyKeys.map(gkey => {
        const updateBody = dirtyRows[gkey];
        // Serialize ISO dates correctly if Dayjs
        const payload = {};
        for (let k in updateBody) {
          if (dayjs.isDayjs(updateBody[k])) {
            payload[k] = updateBody[k].toISOString();
          } else if (updateBody[k] === null) {
            payload[k] = null;
          } else {
            payload[k] = updateBody[k];
          }
        }
        return axios.patch(`${API_URL}dp033/${gkey}/`, payload);
      });

      await Promise.all(promises);
      message.success(`🎉 成功保存 ${dirtyKeys.length} 筆樣品的物流與排程管控異動！`);
      setDirtyRows({});
      doQuery();
    } catch (e) {
      message.error('保存排程日期時發生系統錯誤');
    } finally {
      setLoading(false);
    }
  };

  const statusTags = {
    '0': <Tag color="default">取消</Tag>,
    '1': <Tag color="processing" icon={<ClockCircleOutlined spin />}>打樣進行中</Tag>,
    '2': <Tag color="warning" icon={<TruckOutlined />}>已寄出樣</Tag>,
    '3': <Tag color="success" icon={<CheckCircleOutlined />}>已完成核發</Tag>,
  };

  const columns = [
    {
      title: '樣品單號',
      dataIndex: 'sampleno',
      fixed: 'left',
      width: 130,
      render: (v, r) => (
        <div className="modern-sheet-container">
          <b style={{ color: '#1d39c4' }}>{v}</b>
          <span style={{ fontSize: '11px', color: '#8c8c8c' }}>Style: {r.styleno}</span>
        </div>
      )
    },
    {
      title: '型體資訊',
      dataIndex: 'stylename',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{v}</div>
          <div style={{ fontSize: '12px', color: '#595959' }}>{r.ecolor || '-'}</div>
        </div>
      )
    },
    {
      title: '承攬主體',
      render: (_, r) => (
        <div style={{ fontSize: '12px' }}>
          <div>👥 {r.ba010_shortname}</div>
          <div style={{ color: '#8c8c8c' }}>🏭 {r.ba015_shortname}</div>
        </div>
      )
    },
    {
      title: '尺碼 / 雙數',
      width: 110,
      render: (_, r) => (
        <div>
          <Tag color="blue">Sz: {r.size}</Tag>
          <div style={{ marginTop: 4, fontSize: '11px' }}>
            客樣: {parseFloat(r.custpairs)} | 留底: {parseFloat(r.keeppairs)}
          </div>
        </div>
      )
    },
    {
      title: '生命週期狀態',
      dataIndex: 'status',
      width: 130,
      render: v => statusTags[v] || <Tag>{v}</Tag>
    },
    {
      title: '📅 客戶要求交期',
      dataIndex: 'duedate',
      width: 120,
      render: v => v ? <span style={{ color: '#cf1322', fontWeight: 'bold' }}>{dayjs(v).format('YYYY/MM/DD')}</span> : '-'
    },
    {
      title: (
        <span style={{ color: '#722ed1', fontWeight: 'bold' }}>
          <CalendarOutlined /> 1. 預計安排寄出日
        </span>
      ),
      dataIndex: 'sentduedate',
      width: 160,
      render: (v, r) => (
        <DatePicker 
          size="small"
          style={{ width: '100%', border: dirtyRows[r.gkey]?.sentduedate ? '1px solid #722ed1' : undefined }}
          value={v ? dayjs(v) : null}
          onChange={date => handleCellChange(r.gkey, 'sentduedate', date)}
        />
      )
    },
    {
      title: (
        <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>
          <TruckOutlined /> 2. 裝船樣實寄日
        </span>
      ),
      dataIndex: 'shipmentdt',
      width: 160,
      render: (v, r) => (
        <DatePicker 
          size="small"
          style={{ width: '100%', border: dirtyRows[r.gkey]?.shipmentdt ? '1px solid #fa8c16' : undefined }}
          value={v ? dayjs(v) : null}
          onChange={date => handleCellChange(r.gkey, 'shipmentdt', date)}
        />
      )
    },
    {
      title: (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
          <SafetyCertificateOutlined /> 3. 確認樣簽收日期
        </span>
      ),
      dataIndex: 'approvedate',
      width: 160,
      render: (v, r) => (
        <DatePicker 
          size="small"
          style={{ width: '100%', border: dirtyRows[r.gkey]?.approvedate ? '1px solid #52c41a' : undefined }}
          value={v ? dayjs(v) : null}
          onChange={date => handleCellChange(r.gkey, 'approvedate', date)}
        />
      )
    },
    {
      title: '📝 進度追蹤備註 (Schedule Notes)',
      dataIndex: 'scheduleremark',
      render: (v, r) => (
        <Input 
          size="small"
          placeholder="點擊輸入進度描述..."
          style={{ border: dirtyRows[r.gkey]?.scheduleremark ? '1px solid #1890ff' : undefined }}
          value={v || ''}
          onChange={e => handleCellChange(r.gkey, 'scheduleremark', e.target.value)}
        />
      )
    }
  ];

  return (
    <div className="modern-sheet-container" style={{ padding: '16px', backgroundColor: 'var(--app-bg-panel)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* TOOLBAR BAR */}
      <div style={{ backgroundColor: '#fff', padding: '16px 24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '18px', color: '#096dd9', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarOutlined /> DP095 確認樣品排程與進度管控表 (Sample Timeline Tracker)
          </h3>
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
            在此介面集中管控打樣鞋的關鍵節點日期。修改後請點擊「批次儲存排程異動」進行伺服器物理同步。
          </span>
        </div>
        
        <Space>
          {Object.keys(dirtyRows).length > 0 && (
            <Badge count={Object.keys(dirtyRows).length}>
              <span style={{ paddingRight: '8px', color: '#fa8c16', fontSize: '12px', fontWeight: 'bold' }}>待同步行數</span>
            </Badge>
          )}
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            style={{ background: Object.keys(dirtyRows).length > 0 ? '#52c41a' : '#d9d9d9', borderColor: Object.keys(dirtyRows).length > 0 ? '#52c41a' : '#d9d9d9' }}
            disabled={Object.keys(dirtyRows).length === 0}
            onClick={handleSaveChanges}
          >
            批次儲存排程異動
          </Button>
        </Space>
      </div>

      {/* FILTER BOX */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', marginBottom: '16px' }}>
        <Space wrap size="large">
          <div>
            <span style={{ fontSize: '13px', marginRight: '8px' }}>📋 樣品單號</span>
            <Input placeholder="輸入單號搜尋" style={{ width: 180 }} value={qSampleNo} onChange={e => setQSampleNo(e.target.value)} onPressEnter={doQuery} />
          </div>
          <div>
            <span style={{ fontSize: '13px', marginRight: '8px' }}>👟 型體編號</span>
            <Input placeholder="輸入型體搜尋" style={{ width: 180 }} value={qStyleNo} onChange={e => setQStyleNo(e.target.value)} onPressEnter={doQuery} />
          </div>
          <div>
            <span style={{ fontSize: '13px', marginRight: '8px' }}>🚦 生命週期</span>
            <Select 
              placeholder="篩選開發狀態" 
              style={{ width: 160 }} 
              allowClear
              value={qStatus}
              onChange={setQStatus}
              options={[
                { value: '1', label: '打樣進行中' },
                { value: '2', label: '已寄出' },
                { value: '3', label: '確認樣完成' },
                { value: '0', label: '取消' },
              ]}
            />
          </div>
          <Button type="primary" icon={<SearchOutlined />} onClick={doQuery}>執行篩選</Button>
        </Space>
      </div>

      {/* MAIN DATA MATRIX */}
      <div style={{ flex: 1, backgroundColor: '#fff', padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Table 
          loading={loading}
          dataSource={rows}
          columns={columns}
          rowKey="gkey"
          bordered
          size="middle"
          scroll={{ x: 1500, y: 'calc(100vh - 320px)' }}
          pagination={{ pageSize: 50, showTotal: (total) => `共計 ${total} 筆配色尺碼配比項目` }}
        />
      </div>

    </div>
  );
}
