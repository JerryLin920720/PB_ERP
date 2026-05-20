import React, { useState, useEffect } from 'react';
import { Table, Button, Input, InputNumber, Space, message, Switch, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const API_BASE_URL = 'http://localhost:8001/api/';

export default function Ba060Sheet() {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // 🔒 編輯防改鎖
  const [rates, setRates] = useState([]);
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);

  // Master & Detail Change Tracking
  const [editedCurrencies, setEditedCurrencies] = useState({});
  const [editedRates, setEditedRates] = useState({});

  const fetchCurrencies = async () => {
    setLoadingLeft(true);
    try {
      const res = await axios.get(`${API_BASE_URL}ba060/`);
      setCurrencies(res.data);
      setEditedCurrencies({});
      if (res.data.length > 0) {
        if (!selectedCurrency) {
          handleCurrencySelect(res.data[0]);
        } else {
          // Refresh selected to see changes
          const fresh = res.data.find(c => c.gkey === selectedCurrency.gkey);
          if (fresh) handleCurrencySelect(fresh);
        }
      }
      setIsEditing(false); // 檢索自動鎖定唯讀
    } catch (err) {
      message.error('載入幣別失敗');
    } finally {
      setLoadingLeft(false);
    }
  };

  const fetchRates = async (currencyGkey) => {
    setLoadingRight(true);
    try {
      const res = await axios.get(`${API_BASE_URL}ba061/?ba060gkey=${currencyGkey}`);
      setRates(res.data);
      setEditedRates({});
    } catch (err) {
      message.error('載入歷史匯率失敗');
    } finally {
      setLoadingRight(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  // ⚡ 全域 MDI 廣播指令接收器
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'ba060') {
        console.log(`⚡ [ba060] Currency Intercepted command: ${action}`);
        if (action === 'retrieve') fetchCurrencies();
        else if (action === 'edit') setIsEditing(true); // 進入編輯模式
        else if (action === 'insert') handleAddCurrency();
        else if (action === 'delete' && selectedCurrency) deleteCurrency(selectedCurrency);
        else if (action === 'save') saveCurrencies();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [currencies, selectedCurrency]);

  const handleCurrencySelect = (currency) => {
    setSelectedCurrency(currency);
    if (!currency.gkey.startsWith('temp_')) {
      fetchRates(currency.gkey);
    } else {
      setRates([]);
    }
  };

  // Master CRUD Actions
  const handleAddCurrency = () => {
    const tempGkey = `temp_${Date.now()}`;
    const newCur = { gkey: tempGkey, currencyno: '', currency: '', exrate: null };
    const updated = [...currencies, newCur];
    setCurrencies(updated);
    setEditedCurrencies(prev => ({ ...prev, [tempGkey]: newCur }));
    setSelectedCurrency(newCur);
    setIsEditing(true); // 新增操作解開鎖定
    setRates([]);
  };

  const handleMasterFieldChange = (gkey, field, val) => {
    const updated = currencies.map(c => {
      if (c.gkey === gkey) {
        const item = { ...c, [field]: val };
        setEditedCurrencies(prev => ({ ...prev, [gkey]: item }));
        return item;
      }
      return c;
    });
    setCurrencies(updated);
  };

  const saveCurrencies = async () => {
    const toSave = Object.values(editedCurrencies);
    if (toSave.length === 0) {
      message.info('沒有待儲存的幣別資料');
      return;
    }
    try {
      for (let cur of toSave) {
        if (!cur.currencyno || !cur.currency) {
          message.warning('請填寫完整幣別代號與名稱');
          return;
        }
        if (cur.gkey.startsWith('temp_')) {
          const { gkey, ...rest } = cur;
          await axios.post(`${API_BASE_URL}ba060/`, rest);
        } else {
          await axios.put(`${API_BASE_URL}ba060/${cur.gkey}/`, cur);
        }
      }
      message.success('幣別存檔成功');
      fetchCurrencies();
    } catch (err) {
      message.error('幣別存檔失敗：' + JSON.stringify(err.response?.data || err.message));
    }
  };

  const deleteCurrency = async (record) => {
    if (record.gkey.startsWith('temp_')) {
      setCurrencies(currencies.filter(c => c.gkey !== record.gkey));
      setSelectedCurrency(null);
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}ba060/${record.gkey}/`);
      message.success('刪除成功');
      if (selectedCurrency?.gkey === record.gkey) setSelectedCurrency(null);
      fetchCurrencies();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  // Detail CRUD Actions
  const handleAddRate = () => {
    if (!selectedCurrency || selectedCurrency.gkey.startsWith('temp_')) {
      message.warning('請先儲存主檔幣別');
      return;
    }
    const tempGkey = `temp_${Date.now()}`;
    const newRate = {
      gkey: tempGkey,
      ba060gkey: selectedCurrency.gkey,
      rate: 1.0,
      effectivedate: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      losectivedate: dayjs().add(1, 'year').format('YYYY-MM-DDTHH:mm:ss'),
      chk: 'N'
    };
    setRates([newRate, ...rates]);
    setEditedRates(prev => ({ ...prev, [tempGkey]: newRate }));
    setIsEditing(true); // 新增匯率解除鎖定
  };

  const handleDetailFieldChange = (gkey, field, val) => {
    const updated = rates.map(r => {
      if (r.gkey === gkey) {
        const item = { ...r, [field]: val };
        setEditedRates(prev => ({ ...prev, [gkey]: item }));
        return item;
      }
      return r;
    });
    setRates(updated);
  };

  const saveRates = async () => {
    const toSave = Object.values(editedRates);
    if (toSave.length === 0) {
      message.info('沒有待儲存的匯率資料');
      return;
    }
    try {
      for (let rate of toSave) {
        if (dayjs(rate.losectivedate).isBefore(dayjs(rate.effectivedate))) {
          message.error('失效日期不可早於生效日期！');
          return;
        }
        const payload = {
          ...rate,
          effectivedate: dayjs(rate.effectivedate).toISOString(),
          losectivedate: dayjs(rate.losectivedate).toISOString()
        };
        if (rate.gkey.startsWith('temp_')) {
          const { gkey, ...rest } = payload;
          await axios.post(`${API_BASE_URL}ba061/`, rest);
        } else {
          await axios.put(`${API_BASE_URL}ba061/${rate.gkey}/`, payload);
        }
      }
      message.success('匯率明細存檔成功');
      fetchCurrencies(); // Refresh to see updated exrate in master
    } catch (err) {
      message.error('匯率明細存檔失敗：' + JSON.stringify(err.response?.data || err.message));
    }
  };

  const deleteRate = async (record) => {
    if (record.gkey.startsWith('temp_')) {
      setRates(rates.filter(r => r.gkey !== record.gkey));
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}ba061/${record.gkey}/`);
      message.success('匯率刪除成功');
      fetchRates(selectedCurrency.gkey);
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  const masterColumns = [
    {
      title: '幣別代號',
      dataIndex: 'currencyno',
      key: 'currencyno',
      width: '120px',
      render: (text, record) => (
        isEditing ? (
          <Input
            value={text}
            maxLength={10}
            style={{ textTransform: 'uppercase' }}
            onChange={(e) => handleMasterFieldChange(record.gkey, 'currencyno', e.target.value.toUpperCase())}
          />
        ) : (
          <span>{text}</span>
        )
      )
    },
    {
      title: '幣別中文名稱',
      dataIndex: 'currency',
      key: 'currency',
      render: (text, record) => (
        isEditing ? (
          <Input
            value={text}
            maxLength={20}
            onChange={(e) => handleMasterFieldChange(record.gkey, 'currency', e.target.value)}
          />
        ) : (
          <span>{text}</span>
        )
      )
    },
    {
      title: '當前匯率(參考)',
      dataIndex: 'exrate',
      key: 'exrate',
      width: '130px',
      render: (val) => val !== null ? Number(val).toFixed(4) : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: '80px',
      render: (_, record) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => deleteCurrency(record)} size="small" />
      )
    }
  ];

  const detailColumns = [
    {
      title: '基準匯率值',
      dataIndex: 'rate',
      key: 'rate',
      width: '140px',
      render: (val, record) => (
        isEditing ? (
          <InputNumber
            value={val}
            precision={4}
            style={{ width: '100%' }}
            onChange={(v) => handleDetailFieldChange(record.gkey, 'rate', v)}
          />
        ) : (
          <span>{val !== null && val !== undefined ? Number(val).toFixed(4) : ''}</span>
        )
      )
    },
    {
      title: '生效日期',
      dataIndex: 'effectivedate',
      key: 'effectivedate',
      render: (val, record) => (
        isEditing ? (
          <DatePicker
            value={val ? dayjs(val) : null}
            showTime
            format="YYYY-MM-DD HH:mm"
            onChange={(date) => handleDetailFieldChange(record.gkey, 'effectivedate', date ? date.format('YYYY-MM-DDTHH:mm:ss') : null)}
          />
        ) : (
          <span>{val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'}</span>
        )
      )
    },
    {
      title: '失效日期',
      dataIndex: 'losectivedate',
      key: 'losectivedate',
      render: (val, record) => (
        isEditing ? (
          <DatePicker
            value={val ? dayjs(val) : null}
            showTime
            format="YYYY-MM-DD HH:mm"
            onChange={(date) => handleDetailFieldChange(record.gkey, 'losectivedate', date ? date.format('YYYY-MM-DDTHH:mm:ss') : null)}
          />
        ) : (
          <span>{val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'}</span>
        )
      )
    },
    {
      title: '當前啟用',
      dataIndex: 'chk',
      key: 'chk',
      width: '90px',
      render: (val, record) => (
        isEditing ? (
          <Switch
            checked={val === 'Y'}
            onChange={(checked) => handleDetailFieldChange(record.gkey, 'chk', checked ? 'Y' : 'N')}
          />
        ) : (
          <span>{val === 'Y' ? '✅ 是' : '❌ 否'}</span>
        )
      )
    },
    {
      title: '操作',
      key: 'action',
      width: '80px',
      render: (_, record) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => deleteRate(record)} size="small" />
      )
    }
  ];

  return (
    <div className="modern-sheet-container">
      
      {/* 左側：幣別主檔 (Master) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>
            🌍 全域幣別設定
            {isEditing && <span style={{ fontSize: '12.5px', color: '#52c41a', marginLeft: '8px' }}>(✏️ 編輯中)</span>}
          </h3>
          <span style={{ color: '#8c8c8c', fontSize: '12px' }}>💡 雙擊表格行解除鎖定</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={masterColumns}
            dataSource={currencies}
            rowKey="gkey"
            loading={loadingLeft}
            pagination={false}
            size="small"
            rowClassName={(record) => record.gkey === selectedCurrency?.gkey ? 'ant-table-row-selected' : ''}
            onRow={(record) => ({
              onClick: () => handleCurrencySelect(record),
              onDoubleClick: () => setIsEditing(true)
            })}
          />
        </div>
      </div>

      {/* 右側：匯率明細檔 (Detail) */}
      <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontWeight: 600 }}>
            📅 歷史匯率明細: {selectedCurrency ? `${selectedCurrency.currencyno || '新幣別'} (${selectedCurrency.currency || ''})` : '未選擇'}
          </h3>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddRate}
              disabled={!selectedCurrency}
              size="small"
            >
              新增匯率
            </Button>
            <Button
              type="primary"
              style={{ backgroundColor: '#52c41a' }}
              icon={<SaveOutlined />}
              onClick={saveRates}
              disabled={!selectedCurrency}
              size="small"
            >
              儲存明細
            </Button>
          </Space>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={detailColumns}
            dataSource={rates}
            rowKey="gkey"
            loading={loadingRight}
            pagination={false}
            size="small"
            onRow={(record) => ({
              onDoubleClick: () => setIsEditing(true)
            })}
          />
        </div>
      </div>
      
      <style>{`
        .ant-table-row-selected td {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </div>
  );
}
