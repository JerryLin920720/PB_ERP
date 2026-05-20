import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Row, Col, Space, message, Popconfirm, Tag } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api/dp001/';

/**
 * 📝 DP001 開發片語字庫 (Development Phrase Library)
 * 物理對齊: w_dp001.srw / d_phrase.srd
 */
export default function Dp001Sheet() {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [deletedGkeys, setDeletedGkeys] = useState([]); // 💡 物理追蹤：待刪除主鍵

  // 1. 🚀 載入資料
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setEntities(res.data);
      setDeletedGkeys([]); // 🚀 載入時清空待刪除清單
      if (res.data.length > 0 && !activeRecord) {
        setActiveRecord(res.data[0]);
      }
    } catch (e) {
      message.error('資料加載失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ⚡ MDI 監聽 (物理級全域整合)
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp001') {
        if (action === 'retrieve') fetchData();
        else if (action === 'insert') handleAdd();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [entities, activeRecord, deletedGkeys]);

  // 🔧 內部操作邏輯
  const handleAdd = () => {
    const newRecord = {
      gkey: `temp_${Date.now()}`,
      serialno: '(自動)',
      description: '',
      f2type: 'DP'
    };
    const newEntities = [newRecord, ...entities];
    // 💡 物理校準：新增時同步重編序號，確保視覺與儲存一致
    const reordered = newEntities.map((item, index) => ({
      ...item,
      serialno: index + 1
    }));
    setEntities(reordered);
    setActiveRecord(newRecord);
  };

  const handleUpdate = (gkey, field, val) => {
    setEntities(prev => prev.map(item => 
      item.gkey === gkey ? { ...item, [field]: val } : item
    ));
  };

  const handleSave = async () => {
    // 物理校驗：description 必填
    const invalid = entities.find(e => !e.description);
    if (invalid) {
      message.error('片語內容不能為空');
      return;
    }

    try {
      const payload = {
        upsert: entities,
        delete: deletedGkeys // 💡 物理同步：正式提交刪除
      };
      await axios.post(`${API_URL}bulk_save/`, payload);
      message.success('存檔成功');
      setDeletedGkeys([]); 
      fetchData();
    } catch (e) {
      message.error('存檔失敗');
    }
  };

  const handleDelete = () => {
    if (!activeRecord) return;
    
    // 1. 🔍 找出剩餘資料
    const remaining = entities.filter(e => e.gkey !== activeRecord.gkey);
    
    // 2. 📝 紀錄待刪除主鍵 (排除 temp)
    if (!activeRecord.gkey.startsWith('temp_')) {
      setDeletedGkeys(prev => [...prev, activeRecord.gkey]);
    }
    
    // 3. 🔢 物理重編序號 (序號自動減一/重新排號)
    const reordered = remaining.map((item, index) => ({
      ...item,
      serialno: index + 1
    }));

    setEntities(reordered);
    setActiveRecord(reordered.length > 0 ? reordered[0] : null);
    message.info('已移除行，請點擊存檔以確認刪除');
  };



  return (
    <div className="modern-sheet-container" style={{ padding: '16px', backgroundColor: '#f0f2f5', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 🚀 Top Header Section */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#1890ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📝 DP001 開發片語字庫 (Development Phrase Library)
          </span>
        </div>
      </div>

      {/* 📋 Data Table Section */}
      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '8px', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Table 
          size="small"
          loading={loading}
          dataSource={entities}
          rowKey="gkey"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ y: 'calc(100vh - 300px)' }}
          bordered
          onRow={record => ({
            onClick: () => setActiveRecord(record),
          })}
          rowClassName={r => r.gkey === activeRecord?.gkey ? 'row-active' : ''}
          columns={[
            { 
              title: '流水號', 
              dataIndex: 'serialno', 
              width: 100, 
              align: 'center',
              render: v => <span style={{ color: '#8c8c8c', fontWeight: '500' }}>{v}</span>
            },
            { 
              title: '片語描述 (Description)', 
              dataIndex: 'description', 
              render: (v, r) => (
                <Input 
                  variant="borderless"
                  value={v} 
                  onChange={e => handleUpdate(r.gkey, 'description', e.target.value)} 
                  placeholder="請輸入片語內容..."
                  style={{ width: '100%', fontSize: '13px' }}
                />
              )
            }
          ]}
        />
      </div>

      {/* 🎨 Parity Styles */}
      <style>{`
        .modern-sheet-container .ant-table { font-size: 13px; }
        .modern-sheet-container .ant-table-thead > tr > th { background: #fafafa; font-weight: 600; padding: 12px 8px !important; }
        .modern-sheet-container .ant-table-tbody > tr > td { padding: 4px 8px !important; }
        .row-active td { background-color: #e6f7ff !important; }
        .ant-input-borderless:focus, .ant-input-borderless-focused { background-color: #fff; box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1); }
      `}</style>
    </div>
  );
}
