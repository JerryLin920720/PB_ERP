import React, { useState, useEffect } from 'react';
import { Table, Input, Tag, message, Popconfirm } from 'antd';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api/dp002/';

/**
 * 📂 DP002 樣品類別設定 (Sample Type Setup)
 * 物理對齊: w_dp002.srw / d_dp002.srd
 */
export default function Dp002Sheet() {
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
      if (targetSheet === 'dp002') {
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
      sampletype: '',
      samplename: '',
      sampleename: ''
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
    // 物理校驗：sampletype 必須為單個大寫英文字母
    if (field === 'sampletype') {
      const upperVal = val.toUpperCase();
      if (upperVal && !/^[A-Z]{1}$/.test(upperVal)) {
        message.warning('代號必須為單個大寫英文字母');
        return;
      }
      val = upperVal;
    }

    setEntities(prev => prev.map(item => 
      item.gkey === gkey ? { ...item, [field]: val } : item
    ));
  };

  const handleSave = async () => {
    // 物理校驗：必填檢查
    const invalid = entities.find(e => !e.sampletype || !e.samplename);
    if (invalid) {
      message.error('代號與中文名稱為必填項目');
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
      message.error('存檔失敗，請檢查代號是否重複');
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
      
      {/* 🚀 Top Header Section (Toolbar Only) */}
      <div style={{ backgroundColor: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#1890ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📂 DP002 樣品類別設定 (Sample Type Setup)
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
          scroll={{ y: 'calc(100vh - 220px)' }}
          bordered
          onRow={record => ({
            onClick: () => setActiveRecord(record),
          })}
          rowClassName={r => r.gkey === activeRecord?.gkey ? 'row-active' : ''}
          columns={[
            { 
              title: '序號', 
              dataIndex: 'serialno', 
              width: 80, 
              align: 'center',
              render: v => <span style={{ color: '#8c8c8c' }}>{v}</span>
            },
            { 
              title: '代號 (Code)', 
              dataIndex: 'sampletype', 
              width: 120,
              render: (v, r) => (
                <Input 
                  variant="borderless"
                  value={v} 
                  maxLength={1}
                  onChange={e => handleUpdate(r.gkey, 'sampletype', e.target.value)} 
                  style={{ textAlign: 'center', fontWeight: 'bold', color: '#1890ff' }}
                />
              )
            },
            { 
              title: '中文名稱 (CN Name)', 
              dataIndex: 'samplename', 
              render: (v, r) => (
                <Input 
                  variant="borderless"
                  value={v} 
                  onChange={e => handleUpdate(r.gkey, 'samplename', e.target.value)} 
                />
              )
            },
            { 
              title: '英文名稱 (EN Name)', 
              dataIndex: 'sampleename', 
              render: (v, r) => (
                <Input 
                  variant="borderless"
                  value={v} 
                  onChange={e => handleUpdate(r.gkey, 'sampleename', e.target.value)} 
                />
              )
            }
          ]}
        />
      </div>

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
