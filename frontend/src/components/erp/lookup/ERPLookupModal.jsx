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
  apiBase = '',
  queryParams = {},
  title
}) {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 取得註冊設定
  const config = lookupRegistry[type];

  // Compute modalTitle based on priority:
  // 1. prop title (field-level override)
  // 2. config.title
  // 3. config.moduleCode + config.moduleName
  // 4. fallback: 關聯資料檢索
  const modalTitle = title
    ? title
    : config?.title
      ? config.title
      : (config?.moduleCode && config?.moduleName)
        ? `關聯作業：${config.moduleCode} ${config.moduleName}`
        : '關聯資料檢索';

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
      const host = 'http://localhost:8001';
      const path = config.apiUrl.startsWith('/') ? config.apiUrl : `/${config.apiUrl}`;
      const url = `${host}${path}`;

      const res = await axios.get(url, { params: queryParams });
      const fetched = res.data || [];
      setData(fetched);
      setFilteredData(fetched);
      if (fetched.length === 0) {
        message.info('關聯作業目前沒有資料，請先建立相關基本資料。');
      }
    } catch (err) {
      console.error('Lookup fetch failed:', err);
      message.error('讀取關聯作業資料失敗，請稍後再試或聯絡系統管理員。');
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
      title={modalTitle}
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
        locale={{
          emptyText: data.length === 0
            ? '關聯作業目前沒有資料，請先建立相關基本資料。'
            : '沒有符合條件的關聯資料。'
        }}
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


