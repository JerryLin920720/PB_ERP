import React, { useState, useEffect } from 'react';
import { Table, Input, Select, message, Typography, Tag, Space, Divider } from 'antd';
import { BlockOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;
const { Option } = Select;
const API_URL = 'http://localhost:8001/api/dp006/';
const CATEGORY_API_URL = 'http://localhost:8001/api/dp005/';

export default function Dp006Sheet() {
  const [entities, setEntities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [deletedGkeys, setDeletedGkeys] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entitiesRes, categoriesRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(CATEGORY_API_URL)
      ]);
      setEntities(entitiesRes.data);
      setCategories(categoriesRes.data);
      setDeletedGkeys([]);
      setIsEditing(false);
      if (entitiesRes.data.length > 0) {
        setActiveRecord(entitiesRes.data[0]);
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
      if (targetSheet === 'dp006') {
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
      parts: '',
      eparts: '',
      dp005gkey: categories.length > 0 ? categories[0].gkey : ''
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
    if (!isEditing) {
      message.warning('請先開啟編輯模式');
      return;
    }
    const invalid = entities.find(e => !e.parts || !e.eparts || !e.dp005gkey);
    if (invalid) {
      message.error('名稱與類別均為必填項目');
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
      title: '部位名稱 (中文)', 
      dataIndex: 'parts', 
      render: (v, r) => (
        isEditing ? (
          <Input 
            variant="borderless"
            value={v} 
            onChange={e => handleUpdate(r.gkey, 'parts', e.target.value)} 
            style={{ fontSize: '13px' }}
          />
        ) : <Text style={{ fontSize: '13px', paddingLeft: '11px' }}>{v}</Text>
      )
    },
    { 
      title: '部位名稱 (英文)', 
      dataIndex: 'eparts', 
      render: (v, r) => (
        isEditing ? (
          <Input 
            variant="borderless"
            value={v} 
            onChange={e => handleUpdate(r.gkey, 'eparts', e.target.value)} 
            style={{ fontSize: '13px' }}
          />
        ) : <Text style={{ fontSize: '13px', paddingLeft: '11px' }}>{v}</Text>
      )
    },
    { 
      title: '所屬部位類別', 
      dataIndex: 'dp005gkey', 
      width: 250,
      render: (v, r) => {
        const cat = categories.find(c => c.gkey === v);
        return isEditing ? (
          <Select 
            variant="borderless"
            value={v} 
            onChange={val => handleUpdate(r.gkey, 'dp005gkey', val)}
            style={{ width: '100%', fontSize: '13px' }}
          >
            {categories.map(c => <Option key={c.gkey} value={c.gkey}>{c.partgroup}</Option>)}
          </Select>
        ) : <Text style={{ fontSize: '13px', paddingLeft: '11px' }}>{cat?.partgroup || '-'}</Text>
      }
    }
  ];

  return (
    <div style={{ padding: '15px', backgroundColor: '#f0f2f5', height: '100vh', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ backgroundColor: '#fff', padding: '8px 15px', borderRadius: '4px', border: '1px solid #d9d9d9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <BlockOutlined style={{ color: '#1890ff' }} />
          <Text strong>DP006 部位基本資料</Text>
          <Divider type="vertical" />
          {isEditing ? (
            <Tag icon={<EditOutlined />} color="orange">編輯模式 (Editing)</Tag>
          ) : (
            <Tag icon={<EyeOutlined />} color="blue">查看模式 (View-Only)</Tag>
          )}
        </Space>
        <Tag color="cyan">物理狀態控管</Tag>
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


