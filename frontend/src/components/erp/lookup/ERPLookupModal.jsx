import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import { lookupRegistry } from './lookupRegistry';
import './ERPLookup.css';

/**
 * ERPLookupModal - 共用開窗檢索對話框
 */
export default function ERPLookupModal({
  type,
  visible,
  onCancel,
  onSelect,
  apiBase = ''
}) {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 取得註冊設定
  const config = lookupRegistry[type];

  // 1. 開窗時載入資料
  useEffect(() => {
    if (visible && config) {
      fetchData();
    } else {
      // 關閉時清空狀態
      setData([]);
      setFilteredData([]);
      setSearchText('');
      setSelectedRowKey(null);
      setSelectedRecord(null);
    }
  }, [visible, type]);

  // 2. 當搜尋文字變更時，做前端過濾
  useEffect(() => {
    if (!data) return;
    if (!searchText.trim() || !config?.searchFields) {
      setFilteredData(data);
      return;
    }

    const query = searchText.toLowerCase();
    const filtered = data.filter(item => {
      return config.searchFields.some(field => {
        const val = item[field];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
    setFilteredData(filtered);
  }, [searchText, data, type]);

  const fetchData = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const host = apiBase || 'http://localhost:8001';
      const path = config.apiUrl.startsWith('/') ? config.apiUrl : `/${config.apiUrl}`;
      const url = `${host}${path}`;

      const res = await axios.get(url);
      setData(res.data || []);
      setFilteredData(res.data || []);
    } catch (err) {
      console.error('Lookup fetch failed:', err);
      message.error('讀取檢索字典失敗！');
    } finally {
      setLoading(false);
    }
  };

  // 確認選擇並回傳
  const handleOk = () => {
    if (!selectedRecord) {
      message.warning('請先選擇一筆資料！');
      return;
    }
    onSelect(selectedRecord);
  };

  if (!config) {
    return null;
  }

  const rowKeyField = config.rowKey || 'gkey';

  return (
    <Modal
      title={config.title || '檢索開窗'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={700}
      destroyOnClose
      okText="確認"
      cancelText="取消"
      className="erp-lookup-modal"
    >
      {/* 模糊搜尋框 */}
      <Input
        placeholder={`輸入關鍵字搜尋 (${config.searchFields.join(', ')})`}
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="erp-lookup-search-input"
        allowClear
      />

      {/* 資料列表 Table */}
      <Table
        size="small"
        loading={loading}
        dataSource={filteredData}
        columns={config.columns}
        rowKey={rowKeyField}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => {
            setSelectedRowKey(record[rowKeyField]);
            setSelectedRecord(record);
          },
          onDoubleClick: () => {
            onSelect(record);
          }
        })}
        rowClassName={(record) => 
          record[rowKeyField] === selectedRowKey ? 'erp-row-active' : ''
        }
        scroll={{ y: 280 }}
      />
    </Modal>
  );
}


