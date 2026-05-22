import React, { useState, useEffect } from 'react';
import { Table, Button, Select, InputNumber, Space, message, Switch, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined, ArrowRightOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

const API_BASE_URL = 'http://localhost:8001/api/';

export default function Ba061Sheet() {
  const [currencies, setCurrencies] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [details, setDetails] = useState([]);
  
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);

  // Master & Detail Change Tracking
  const [editedPairs, setEditedPairs] = useState({});
  const [editedDetails, setEditedDetails] = useState({});

  const fetchCurrencies = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}ba060/`);
      setCurrencies(res.data);
    } catch (err) {
      message.error('載入幣別列表失敗');
    }
  };

  const fetchPairs = async () => {
    setLoadingLeft(true);
    try {
      const res = await axios.get(`${API_BASE_URL}ab230/`);
      setPairs(res.data);
      setEditedPairs({});
      if (res.data.length > 0) {
        if (!selectedPair) {
          handlePairSelect(res.data[0]);
        } else {
          const fresh = res.data.find(p => p.gkey === selectedPair.gkey);
          if (fresh) handlePairSelect(fresh);
        }
      }
    } catch (err) {
      message.error('載入交叉匯率主表失敗');
    } finally {
      setLoadingLeft(false);
    }
  };

  const fetchDetails = async (pairGkey) => {
    setLoadingRight(true);
    try {
      const res = await axios.get(`${API_BASE_URL}ab231/?ab230gkey=${pairGkey}`);
      setDetails(res.data);
      setEditedDetails({});
    } catch (err) {
      message.error('載入交叉匯率明細失敗');
    } finally {
      setLoadingRight(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
    fetchPairs();
  }, []);

  // ⚡ 全域 MDI 廣播指令接收器
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'ba061') {
        console.log(`⚡ [ba061] CrossRate Intercepted command: ${action}`);
        if (action === 'retrieve') fetchPairs();
        else if (action === 'insert') handleAddPair();
        else if (action === 'delete' && selectedPair) deletePair(selectedPair);
        else if (action === 'save') savePairs();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [pairs, selectedPair]);

  const handlePairSelect = (pair) => {
    setSelectedPair(pair);
    if (!pair.gkey.startsWith('temp_')) {
      fetchDetails(pair.gkey);
    } else {
      setDetails([]);
    }
  };

  // Helper to get currency code for display
  const getCurrencyCode = (gkey) => {
    const c = currencies.find(cur => cur.gkey === gkey);
    return c ? c.currencyno : '';
  };

  // Master CRUD Actions
  const handleAddPair = () => {
    const tempGkey = `temp_${Date.now()}`;
    const newPair = { gkey: tempGkey, ba060gkey1: '', ba060gkey2: '', exrate: null };
    const updated = [...pairs, newPair];
    setPairs(updated);
    setEditedPairs(prev => ({ ...prev, [tempGkey]: newPair }));
    setSelectedPair(newPair);
    setDetails([]);
  };

  const handleMasterFieldChange = (gkey, field, val) => {
    const updated = pairs.map(p => {
      if (p.gkey === gkey) {
        const item = { ...p, [field]: val };
        setEditedPairs(prev => ({ ...prev, [gkey]: item }));
        return item;
      }
      return p;
    });
    setPairs(updated);
  };

  const savePairs = async () => {
    const toSave = Object.values(editedPairs);
    if (toSave.length === 0) {
      message.info('沒有待儲存的匯率組合');
      return;
    }
    try {
      for (let pair of toSave) {
        if (!pair.ba060gkey1 || !pair.ba060gkey2) {
          message.warning('請填寫完整的來源與目標幣別');
          return;
        }
        if (pair.gkey.startsWith('temp_')) {
          const { gkey, ...rest } = pair;
          await axios.post(`${API_BASE_URL}ab230/`, rest);
        } else {
          await axios.put(`${API_BASE_URL}ab230/${pair.gkey}/`, pair);
        }
      }
      message.success('匯率對儲存成功，背景已自動生成倒數鏡像對！');
      fetchPairs();
    } catch (err) {
      message.error('匯率對儲存失敗：' + JSON.stringify(err.response?.data || err.message));
    }
  };

  const deletePair = async (record) => {
    if (record.gkey.startsWith('temp_')) {
      setPairs(pairs.filter(p => p.gkey !== record.gkey));
      setSelectedPair(null);
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}ab230/${record.gkey}/`);
      message.success('刪除成功，鏡像對也已同步刪除');
      if (selectedPair?.gkey === record.gkey) setSelectedPair(null);
      fetchPairs();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  // Detail CRUD Actions
  const handleAddDetail = () => {
    if (!selectedPair || selectedPair.gkey.startsWith('temp_')) {
      message.warning('請先儲存主檔匯率對');
      return;
    }
    const tempGkey = `temp_${Date.now()}`;
    const newDetail = {
      gkey: tempGkey,
      ab230gkey: selectedPair.gkey,
      exrate: 1.0,
      effectivedate: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      chk: 'N'
    };
    setDetails([newDetail, ...details]);
    setEditedDetails(prev => ({ ...prev, [tempGkey]: newDetail }));
  };

  const handleDetailFieldChange = (gkey, field, val) => {
    const updated = details.map(d => {
      if (d.gkey === gkey) {
        const item = { ...d, [field]: val };
        setEditedDetails(prev => ({ ...prev, [gkey]: item }));
        return item;
      }
      return d;
    });
    setDetails(updated);
  };

  const saveDetails = async () => {
    const toSave = Object.values(editedDetails);
    if (toSave.length === 0) {
      message.info('沒有待儲存的明細匯率');
      return;
    }
    try {
      for (let d of toSave) {
        const payload = {
          ...d,
          effectivedate: dayjs(d.effectivedate).toISOString()
        };
        if (d.gkey.startsWith('temp_')) {
          const { gkey, ...rest } = payload;
          await axios.post(`${API_BASE_URL}ab231/`, rest);
        } else {
          await axios.put(`${API_BASE_URL}ab231/${d.gkey}/`, payload);
        }
      }
      message.success('交叉匯率歷史儲存成功，鏡像歷史已自動對稱！');
      fetchPairs(); // Refresh to see refreshed cached exrate in master
    } catch (err) {
      message.error('儲存失敗：' + JSON.stringify(err.response?.data || err.message));
    }
  };

  const deleteDetail = async (record) => {
    if (record.gkey.startsWith('temp_')) {
      setDetails(details.filter(d => d.gkey !== record.gkey));
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}ab231/${record.gkey}/`);
      message.success('刪除成功，鏡像歷史已同步刪除');
      fetchDetails(selectedPair.gkey);
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  const currencyOptions = currencies.map(c => ({
    value: c.gkey,
    label: `${c.currencyno} - ${c.currency}`
  }));

  const masterColumns = [
    {
      title: '來源原始幣別',
      dataIndex: 'ba060gkey1',
      key: 'ba060gkey1',
      render: (val, record) => (
        <Select
          value={val}
          options={currencyOptions}
          style={{ width: '100%' }}
          onChange={(v) => handleMasterFieldChange(record.gkey, 'ba060gkey1', v)}
          disabled={!record.gkey.startsWith('temp_')}
        />
      )
    },
    {
      title: '',
      key: 'arrow',
      width: '30px',
      render: () => <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
    },
    {
      title: '目標兌換幣別',
      dataIndex: 'ba060gkey2',
      key: 'ba060gkey2',
      render: (val, record) => (
        <Select
          value={val}
          options={currencyOptions}
          style={{ width: '100%' }}
          onChange={(v) => handleMasterFieldChange(record.gkey, 'ba060gkey2', v)}
          disabled={!record.gkey.startsWith('temp_')}
        />
      )
    },
    {
      title: '當前匯率',
      dataIndex: 'exrate',
      key: 'exrate',
      width: '140px',
      render: (val) => val !== null ? Number(val).toFixed(8) : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: '60px',
      render: (_, record) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => deletePair(record)} size="small" />
      )
    }
  ];

  const detailColumns = [
    {
      title: '兌換匯率值 (高精度)',
      dataIndex: 'exrate',
      key: 'exrate',
      width: '180px',
      render: (val, record) => (
        <InputNumber
          value={val}
          precision={8}
          style={{ width: '100%' }}
          onChange={(v) => handleDetailFieldChange(record.gkey, 'exrate', v)}
        />
      )
    },
    {
      title: '生效時間日期',
      dataIndex: 'effectivedate',
      key: 'effectivedate',
      render: (val, record) => (
        <DatePicker
          value={val ? dayjs(val) : null}
          showTime
          format="YYYY-MM-DD HH:mm:ss"
          style={{ width: '100%' }}
          onChange={(date) => handleDetailFieldChange(record.gkey, 'effectivedate', date ? date.format('YYYY-MM-DDTHH:mm:ss') : null)}
        />
      )
    },
    {
      title: '當前財務匯率',
      dataIndex: 'chk',
      key: 'chk',
      width: '120px',
      render: (val, record) => (
        <Switch
          checked={val === 'Y'}
          onChange={(checked) => handleDetailFieldChange(record.gkey, 'chk', checked ? 'Y' : 'N')}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: '60px',
      render: (_, record) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => deleteDetail(record)} size="small" />
      )
    }
  ];

  const getPairTitle = () => {
    if (!selectedPair) return '未選擇';
    if (selectedPair.gkey.startsWith('temp_')) return '新匯率對';
    const c1 = getCurrencyCode(selectedPair.ba060gkey1);
    const c2 = getCurrencyCode(selectedPair.ba060gkey2);
    return `${c1} ➔ ${c2}`;
  };

  return (
    <ERPSheetPage
      sheetId="ba061"
      title="BA061 交叉匯率對與歷程設定"
      breadcrumb={['基本資料', '交叉匯率設定']}
    >
      <div className="erp-md-page">
        
        {/* 上方：交叉主檔 (Master) */}
        <div className="erp-md-master-area" style={{ flex: '0 0 240px', height: '240px', marginBottom: '12px' }}>
          <div className="erp-md-section-header">
            <span className="erp-md-section-title">
              📊 財務交叉匯率主表 (AB230)
            </span>
            <span style={{ color: '#8c8c8c', fontSize: '11px' }}>💡 頂部主控</span>
          </div>
          <div className="erp-md-table">
            <Table
              columns={masterColumns}
              dataSource={pairs}
              rowKey="gkey"
              loading={loadingLeft}
              pagination={false}
              size="small"
              rowClassName={(record) => record.gkey === selectedPair?.gkey ? 'row-active' : ''}
              onRow={(record) => ({
                onClick: () => handlePairSelect(record)
              })}
            />
          </div>
        </div>

        {/* 下方：交叉歷史明細 (Detail) */}
        <div className="erp-md-detail-area" style={{ flex: 1, marginBottom: '8px' }}>
          <div className="erp-md-section-header">
            <span className="erp-md-section-title">
              📅 匯率變動歷程: {getPairTitle()}
            </span>
            <div className="erp-md-toolbar-strip">
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddDetail}
                disabled={!selectedPair}
                size="small"
              >
                新增匯率
              </Button>
              <Button
                type="dashed"
                icon={<SaveOutlined />}
                onClick={saveDetails}
                disabled={!selectedPair}
                size="small"
              >
                儲存明細
              </Button>
            </div>
          </div>
          <div className="erp-md-table">
            <Table
              columns={detailColumns}
              dataSource={details}
              rowKey="gkey"
              loading={loadingRight}
              pagination={false}
              size="small"
            />
          </div>
        </div>

        {/* 底部狀態列 */}
        <div className="erp-md-statusbar">
          <span>提示：選擇上方匯率對後可查看下方歷史匯率；按上方【編輯】或【雙擊】進行修改。</span>
          <span>狀態：讀取完成。共 {pairs.length} 筆匯率對，{details.length} 筆歷史紀錄。</span>
        </div>
      </div>
    </ERPSheetPage>
  );
}
