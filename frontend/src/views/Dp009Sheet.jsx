import React, { useState, useEffect } from 'react';
import { Table, Input, message, Typography, Tag, Space, Divider } from 'antd';
import { BlockOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;
const API_URL = 'http://localhost:8001/api/dp009/';

export default function Dp009Sheet() {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [deletedGkeys, setDeletedGkeys] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setEntities(res.data);
      setDeletedGkeys([]);
      setIsEditing(false);
      if (res.data.length > 0) {
        setActiveRecord(res.data[0]);
      }
    } catch (e) {
      message.error('資料加載失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp009') {
        if (action === 'retrieve') fetchData();
        else if (action === 'edit') setIsEditing(true);
        else if (action === 'insert') { setIsEditing(true); handleAdd(); }
        else if (action === 'delete') { setIsEditing(true); handleDelete(); }
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [entities, activeRecord, deletedGkeys, isEditing]);

  const handleAdd = () => {
    const tempGkey = `temp_${Date.now()}`;
    const newRecord = {
      gkey: tempGkey,
      serialno: entities.length + 1,
      cmakedescription: '',
      emakedescription: ''
    };
    const newList = [newRecord, ...entities];
    const reordered = newList.map((item, index) => ({ ...item, serialno: index + 1 }));
    setEntities(reordered);
    setActiveRecord(newRecord);
  };

  const handleUpdate = (gkey, field, val) => {
    if (!isEditing) return;
    setEntities(prev => prev.map(item => 
      item.gkey === gkey ? { ...item, [field]: val } : item
    ));
  };

  const handleDelete = () => {
    if (!activeRecord) return;
    const remaining = entities.filter(e => e.gkey !== activeRecord.gkey);
    if (!activeRecord.gkey.startsWith('temp_')) {
      setDeletedGkeys(prev => [...prev, activeRecord.gkey]);
    }
    const reordered = remaining.map((item, index) => ({ ...item, serialno: index + 1 }));
    setEntities(reordered);
    setActiveRecord(reordered.length > 0 ? reordered[0] : null);
    message.info('已標記移除');
  };

  const handleSave = async () => {
    if (!isEditing) { message.warning('請先開啟編輯模式'); return; }
    const invalid = entities.find(e => !e.cmakedescription);
    if (invalid) {
      message.error('加工描述為必填項目');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}bulk_save/`, { upsert: entities, delete: deletedGkeys });
      message.success('存檔成功');
      fetchData();
    } catch (e) {
      message.error('存檔失敗');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      title: '序號', 
      dataIndex: 'serialno', 
      width: 70, 
      align: 'center',
      render: v => <Text type="secondary" style={{ fontSize: '12px' }}>{v}</Text>
    },
    { 
      title: '加工描述 (中)', 
      dataIndex: 'cmakedescription', 
      render: (v, r) => (
        isEditing ? (
          <Input 
            variant="borderless"
            value={v} 
            onChange={e => handleUpdate(r.gkey, 'cmakedescription', e.target.value)} 
            style={{ fontWeight: '600', fontSize: '13px' }}
          />
        ) : <Text style={{ fontSize: '13px', paddingLeft: '11px', fontWeight: '600' }}>{v}</Text>
      )
    },
    { 
      title: 'Processing Method (EN)', 
      dataIndex: 'emakedescription', 
      render: (v, r) => (
        isEditing ? (
          <Input 
            variant="borderless"
            value={v} 
            onChange={e => handleUpdate(r.gkey, 'emakedescription', e.target.value)} 
            style={{ fontSize: '13px' }}
          />
        ) : <Text style={{ fontSize: '13px', paddingLeft: '11px' }}>{v}</Text>
      )
    }
  ];

  return (
    <div style={{ padding: '15px', backgroundColor: '#f0f2f5', height: '100vh', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ backgroundColor: '#fff', padding: '8px 15px', borderRadius: '4px', border: '1px solid #d9d9d9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <BlockOutlined style={{ color: '#1890ff' }} />
          <Text strong>DP009 部件加工設定</Text>
          <Divider type="vertical" />
          {isEditing ? (
            <Tag icon={<EditOutlined />} color="orange">編輯模式 (Editing)</Tag>
          ) : (
            <Tag icon={<EyeOutlined />} color="blue">查看模式 (View-Only)</Tag>
          )}
        </Space>
        <Tag color="cyan">物理網格還原</Tag>
      </div>

      <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Table 
          size="small"
          loading={loading}
          dataSource={entities}
          columns={columns}
          rowKey="gkey"
          pagination={false}
          sticky
          bordered
          onRow={record => ({
            onClick: () => setActiveRecord(record),
            onDoubleClick: () => setIsEditing(true),
            className: activeRecord?.gkey === record.gkey ? 'row-active' : ''
          })}
        />
      </div>

      <style>{`
        .row-active td { background-color: #e6f7ff !important; border-bottom: 2px solid #1890ff !important; }
        .ant-table-thead > tr > th { background-color: #fafafa !important; font-weight: bold !important; font-size: 13px; }
        .ant-table-cell { padding: 4px 8px !important; }
      `}</style>
    </div>
  );
}
