import React, { useState, useEffect } from 'react';
import { Tabs, Table, Checkbox, Tag, Button, Input, InputNumber, Image, Select, Space, Card, Row, Col, Form, DatePicker, message, Divider, Popconfirm, Modal, Radio } from 'antd';
import { DeleteOutlined, PlusOutlined, ImportOutlined, SearchOutlined, FileImageOutlined, AppstoreOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import './MdSheetLayout.css';

const API_URL = 'http://localhost:8001/api/';

export default function Dp025Sheet() {
  // 📊 Main App Navigation Tabs
  const [activeTabKey, setActiveTabKey] = useState('query');
  
  // 💾 Core Entity States
  const [styleList, setStyleList] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null); // Current active Dp025 master record object
  const [loading, setLoading] = useState(false);
  
  // 🧼 Detail Grids States
  const [prices, setPrices] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [accessories, setAccessories] = useState([]);
  
  // 🧺 Dirty Tracking Sets for Cascaded Atomic Commit
  const [deletedPrices, setDeletedPrices] = useState([]);
  const [deletedTransfers, setDeletedTransfers] = useState([]);
  const [deletedAccessories, setDeletedAccessories] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  // 🌍 Lookup Dictionaries State
  const [lookups, setLookups] = useState({
    seasons: [], shoeTypes: [], genders: [],
    lasts: [], outsoles: [], heels: [], groups: [],
    customers: [], factories: [], currencies: [], terms: [], users: [],
    ports: []
  });

  // 🔎 Advanced Query Variables
  const [qFilters, setQFilters] = useState({
    styleno: '',
    stylename: '',
    year: '',
    ba055gkey: null,
    dp023gkey: null,
    ba010gkey: null,
    ba015gkey: null,
    es101gkey: null,
    adopted: 'A',
    dp003gkey: null,
    confirms: 'A',
    issuedate_start: null,
    issuedate_end: null
  });

  // 🏎️ Bro View for Tech Transfer
  const [selectedTechRowIndex, setSelectedTechRowIndex] = useState(0);

  // 🔄 ue_custom1 樣品單匯入狀態
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [sampleSearchQuery, setSampleSearchQuery] = useState('');
  const [samplesList, setSamplesList] = useState([]);
  const [samplesLoading, setSamplesLoading] = useState(false);

  // 🔍 F2 關聯彈出視窗狀態
  const [f2ModalType, setF2ModalType] = useState(null); // 'groups' | 'lasts' | 'outsoles' | 'heels' | 'seasons' | 'shoeTypes' | 'genders' | 'ports'
  const [f2SearchQuery, setF2SearchQuery] = useState('');
  const [f2ActivePriceRowIndex, setF2ActivePriceRowIndex] = useState(null);

  // ==========================================
  // 1. 🏗️ BOOTSTRAP LOOKUPS
  // ==========================================
  const fetchAllLookups = async () => {
    try {
      const [se, st, ge, la, ou, he, gr, cu, fa, cur, te, us, po] = await Promise.all([
        axios.get(`${API_URL}ba055/`), axios.get(`${API_URL}dp003/`), axios.get(`${API_URL}dp004/`),
        axios.get(`${API_URL}dp010/`), axios.get(`${API_URL}dp015/`), axios.get(`${API_URL}dp020/`),
        axios.get(`${API_URL}dp023/`), axios.get(`${API_URL}ba010/`), axios.get(`${API_URL}ba015/`),
        axios.get(`${API_URL}ba060/`), axios.get(`${API_URL}ba070/`), axios.get(`${API_URL}es101/`),
        axios.get(`${API_URL}ba065/`)
      ]);
      setLookups({
        seasons: se.data, shoeTypes: st.data, genders: ge.data,
        lasts: la.data, outsoles: ou.data, heels: he.data, groups: gr.data,
        customers: cu.data, factories: fa.data, currencies: cur.data, terms: te.data, users: us.data,
        ports: po.data
      });
    } catch (err) {
      console.error('字典資料緩存加載失敗', err);
    }
  };

  useEffect(() => {
    fetchAllLookups();
    doQuery();
  }, []);

  // ⚡ MDI 監聽 (100% 精準對齊全域工具列，實施無感全域託管)
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp025') {
        if (action === 'retrieve') doQuery();
        else if (action === 'edit') {
          if (selectedStyle) {
            setActiveTabKey('details');
          } else {
            message.warning('請先選擇一筆型體記錄進行編輯');
          }
        }
        else if (action === 'save') handleSaveAll();
        else if (action === 'insert') handleNewStyle();
        else if (action === 'delete') handleDeleteStyle();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [styleList, selectedStyle, isDirty, activeTabKey]);

  // 📡 參數接收監聽
  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === 'dp025' && params.styleno) {
        const newFilters = { ...qFilters, styleno: params.styleno };
        setQFilters(newFilters);
        doQuery(newFilters);
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, [qFilters]);

  // ==========================================
  // 2. 🔍 MASTER RETRIEVE LOGIC
  // ==========================================
  const doQuery = async (filterOverride = null) => {
    setLoading(true);
    try {
      const params = filterOverride || { ...qFilters };
      const reqParam = { ...params };
      // Clean up empty filters
      Object.keys(reqParam).forEach(key => {
        if (reqParam[key] === null || reqParam[key] === '' || reqParam[key] === undefined) {
          delete reqParam[key];
        }
      });
      // Handle the adopted select option
      if (reqParam.adopted === 'A') {
        delete reqParam.adopted;
      }
      
      const res = await axios.get(`${API_URL}dp025/`, { params: reqParam });
      setStyleList(res.data);
    } catch (err) {
      message.error('型體主檔讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 啟動卡片編輯頁
  const loadStyleDetails = async (styleObj) => {
    setSelectedStyle({ ...styleObj });
    setIsDirty(false);
    setDeletedPrices([]);
    setDeletedTransfers([]);
    setDeletedAccessories([]);
    setSelectedTechRowIndex(0);
    
    if (!styleObj.gkey.startsWith('temp_')) {
      setLoading(true);
      try {
        const [res26, res27, res28] = await Promise.all([
          axios.get(`${API_URL}dp026/?dp025gkey=${styleObj.gkey}`),
          axios.get(`${API_URL}dp027/?dp025gkey=${styleObj.gkey}`),
          axios.get(`${API_URL}dp028/?dp025gkey=${styleObj.gkey}`)
        ]);
        setPrices(res26.data);
        setTransfers(res27.data);
        setAccessories(res28.data);
      } catch (err) {
        message.error('細項表格同步加載異常！');
      } finally {
        setLoading(false);
      }
    } else {
      setPrices([]);
      setTransfers([]);
      setAccessories([]);
    }
    
    setActiveTabKey('details');
  };

  // ==========================================
  // 3. ⚡ BUSINESS ACTIONS
  // ==========================================

  // 🆕 A. 新增 (Insert Mode)
  const handleNewStyle = () => {
    const newObj = {
      gkey: `temp_${Date.now()}`,
      styleno: `NEW-${Date.now().toString().slice(-4)}`,
      year: String(new Date().getFullYear()),
      adopted: 'N',
      confirms: 'N',
      firstpairs: 0,
      issuedate: dayjs().toISOString()
    };
    loadStyleDetails(newObj);
  };

  // 💾 B. 儲存 (Save)
  const handleSaveAll = async () => {
    if (!selectedStyle) {
      message.warning('當前無可儲存的型體主檔。');
      return;
    }

    // --- Validation Rules (取代原廠 validationConfig) ---
    if (!selectedStyle.styleno) {
      message.error('【型體號】為必填主鍵！');
      return;
    }
    if (!selectedStyle.stylename) {
      message.error('【型體名稱】為必填！');
      return;
    }
    if (!selectedStyle.year) {
      message.error('【年度】為必填！');
      return;
    }
    
    // Check details validation
    for (const p of prices) {
      if (p.price < 0 || p.cost < 0) {
        message.error('價格明細中的【單價/成本】不可為負數！');
        return;
      }
    }
    
    // Lock check
    if (selectedStyle.confirms === 'Y') {
      message.error('此筆資料已確認 (Approve Locked)，禁止修改儲存！');
      return;
    }

    setLoading(true);
    try {
      const isNewMaster = selectedStyle.gkey.startsWith('temp_');
      
      // 🚀 DeepSaveMixinV2 Payload Construction
      const payload = {
        master: {
          ...selectedStyle,
          gkey: isNewMaster ? undefined : selectedStyle.gkey
        },
        prices: {
          upsert: prices.map(p => ({ ...p, gkey: p.gkey.startsWith('temp_') ? undefined : p.gkey })),
          delete: deletedPrices
        },
        tech: {
          upsert: transfers.map(t => ({ ...t, gkey: t.gkey.startsWith('temp_') ? undefined : t.gkey })),
          delete: deletedTransfers
        },
        accessories: {
          upsert: accessories.map(a => ({ ...a, gkey: a.gkey.startsWith('temp_') ? undefined : a.gkey })),
          delete: deletedAccessories
        }
      };

      // 🔄 一次性呼叫 V2 deep_save (Atomic Transaction)
      const saveRes = await axios.post(`${API_URL}dp025/deep_save/`, payload);

      message.success('🎉 恭喜！型體基本資料 BOM (Dp025-028) 原子存檔成功！');
      setIsDirty(false);
      doQuery();
      // V2 回傳資料通常在 res.data.data
      const newMasterData = saveRes.data.data ? saveRes.data.data : saveRes.data;
      loadStyleDetails(newMasterData);
    } catch (err) {
      message.error('存檔失敗: ' + (err.response?.data?.detail || err.response?.data?.styleno || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ❌ C. 刪除 (Delete)
  const handleDeleteStyle = async () => {
    if (!selectedStyle) {
      message.warning('請先選擇欲刪除的型體主檔。');
      return;
    }
    if (selectedStyle.gkey.startsWith('temp_')) {
      setSelectedStyle(null);
      setActiveTabKey('query');
      doQuery();
      message.success('已取消新增');
      return;
    }
    
    try {
      setLoading(true);
      await axios.delete(`${API_URL}dp025/${selectedStyle.gkey}/`);
      message.success('型體主檔刪除成功');
      setSelectedStyle(null);
      setActiveTabKey('query');
      doQuery();
    } catch (err) {
      message.error('刪除失敗：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. 🔄 樣品一鍵導入 (ue_custom1 業務流)
  // ==========================================
  const fetchSamples = async () => {
    setSamplesLoading(true);
    try {
      const res = await axios.get(`${API_URL}dp031/`);
      setSamplesList(res.data);
    } catch (err) {
      message.error('無法獲取樣品開發配色清單');
    } finally {
      setSamplesLoading(false);
    }
  };

  useEffect(() => {
    if (importModalOpen) {
      fetchSamples();
    }
  }, [importModalOpen]);

  const handleImportSample = async (dp031gkey) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}dp025/import_from_sample/`, { dp031gkey });
      if (res.data.success) {
        const importedData = res.data.data;
        importedData.gkey = `temp_${Date.now()}`;
        setSelectedStyle(importedData);
        setPrices([]);
        setTransfers([]);
        setAccessories([]);
        setDeletedPrices([]);
        setDeletedTransfers([]);
        setDeletedAccessories([]);
        setIsDirty(true);
        setImportModalOpen(false);
        setActiveTabKey('details');
        message.success('🎉 樣品工藝參數一鍵轉量產成功！請確認規格並儲存！');
      } else {
        message.error(res.data.detail || '轉單失敗');
      }
    } catch (err) {
      message.error('轉單失敗：' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredSamples = samplesList.filter(s =>
    (!sampleSearchQuery || 
      (s.sampleno || '').toLowerCase().includes(sampleSearchQuery.toLowerCase()) ||
      (s.styleno || '').toLowerCase().includes(sampleSearchQuery.toLowerCase()) ||
      (s.color || '').toLowerCase().includes(sampleSearchQuery.toLowerCase())
    )
  );

  const sampleColumns = [
    { title: '樣品單號', dataIndex: 'sampleno', width: 140, render: v => <b>{v}</b> },
    { title: '型體編號', dataIndex: 'styleno', width: 140 },
    { title: '樣品名稱', dataIndex: 'sample_stylename', width: 160 },
    { title: '顏色描述', dataIndex: 'color', width: 140 },
    { title: '英文顏色', dataIndex: 'ecolor', width: 140 },
    { title: '面料描述', dataIndex: 'upper', ellipsis: true },
    { 
      title: '操作', 
      key: 'act', 
      width: 110, 
      align: 'center',
      render: (_, r) => (
        <Button type="primary" size="small" icon={<ImportOutlined />} onClick={() => handleImportSample(r.gkey)}>
          轉換導入
        </Button>
      )
    }
  ];

  // ==========================================
  // 5. 🔗 LINKAGE CONTROLLERS & F2 SELECT
  // ==========================================
  
  // A. 組別穿透選擇
  const handleGroupSelection = (grpGkey) => {
    const foundGrp = lookups.groups.find(g => g.gkey === grpGkey);
    if (foundGrp) {
      setSelectedStyle({
        ...selectedStyle,
        dp023gkey: grpGkey,
        dp010gkey: foundGrp.dp010gkey,
        dp015gkey: foundGrp.dp015gkey,
        dp020gkey: foundGrp.dp020gkey
      });
      setIsDirty(true);
      message.success('💡 外鍵鏈接穿透：自動注入關聯楦頭、大底及鞋跟！');
    } else {
      updateMasterField('dp023gkey', null);
    }
  };

  // F2 雙重選擇確認觸發
  const handleF2Select = (gkey) => {
    if (f2ModalType === 'ports') {
      const foundPort = lookups.ports.find(p => p.gkey === gkey);
      if (foundPort && f2ActivePriceRowIndex !== null) {
        updatePriceCell(f2ActivePriceRowIndex, 'term', foundPort.term);
      }
      setF2ActivePriceRowIndex(null);
    } else if (f2ModalType === 'groups') {
      handleGroupSelection(gkey);
    } else {
      updateMasterField(
        f2ModalType === 'lasts' ? 'dp010gkey' :
        f2ModalType === 'outsoles' ? 'dp015gkey' :
        f2ModalType === 'heels' ? 'dp020gkey' :
        f2ModalType === 'seasons' ? 'ba055gkey' :
        f2ModalType === 'shoeTypes' ? 'dp003gkey' :
        f2ModalType === 'genders' ? 'dp004gkey' : '',
        gkey
      );
    }
    setF2ModalType(null);
    setF2SearchQuery('');
  };

  // B. Master變更
  const updateMasterField = (field, value) => {
    setSelectedStyle(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // C. 子表列編輯
  const addPriceRow = () => {
    const maxSn = prices.length > 0 ? Math.max(...prices.map(o => o.serialno || 0)) + 1 : 1;
    setPrices([...prices, { gkey: `temp_${Date.now()}`, serialno: maxSn, price: 0, cost: 0, sizerun: '', quotedate: null, stock: '' }]);
    setIsDirty(true);
  };
  const addTransferRow = () => {
    const newRow = { gkey: `temp_${Date.now()}`, issuedate: dayjs().toISOString() };
    setTransfers([...transfers, newRow]);
    setSelectedTechRowIndex(transfers.length);
    setIsDirty(true);
  };
  const addAccessoryRow = () => {
    const maxSn = accessories.length > 0 ? Math.max(...accessories.map(o => o.serialno || 0)) + 1 : 1;
    setAccessories([...accessories, { gkey: `temp_${Date.now()}`, serialno: maxSn, accessory: '', description: '' }]);
    setIsDirty(true);
  };

  const updatePriceCell = (index, field, val) => {
    const updated = [...prices]; updated[index][field] = val; setPrices(updated); setIsDirty(true);
  };
  const updateTechField = (index, field, val) => {
    const updated = [...transfers]; updated[index][field] = val; setTransfers(updated); setIsDirty(true);
  };
  const updateAccessoryCell = (index, field, val) => {
    const updated = [...accessories]; updated[index][field] = val; setAccessories(updated); setIsDirty(true);
  };

  const deletePriceRow = (index) => {
    const row = prices[index];
    if (!row.gkey.startsWith('temp_')) setDeletedPrices([...deletedPrices, row.gkey]);
    setPrices(prices.filter((_, i) => i !== index));
    setIsDirty(true);
  };
  const deleteTransferRow = (index) => {
    const row = transfers[index];
    if (!row.gkey.startsWith('temp_')) setDeletedTransfers([...deletedTransfers, row.gkey]);
    const remaining = transfers.filter((_, i) => i !== index);
    setTransfers(remaining);
    setSelectedTechRowIndex(0);
    setIsDirty(true);
  };
  const deleteAccessoryRow = (index) => {
    const row = accessories[index];
    if (!row.gkey.startsWith('temp_')) setDeletedAccessories([...deletedAccessories, row.gkey]);
    setAccessories(accessories.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // ==========================================
  // 6. 📋 GRID COLUMNS SPECIFICATIONS
  // ==========================================

  // 100%鏡像對齊查詢面板的列表網格欄位 (還原 PB 原廠 d_dp025_query 完整版)
  const listColumns = [
    {
      title: '確認',
      dataIndex: 'confirms',
      width: 70,
      align: 'center',
      render: (v, record) => (
        <Checkbox 
          checked={v === 'Y'} 
          onChange={async (e) => {
            const newVal = e.target.checked ? 'Y' : 'N';
            try {
              await axios.patch(`${API_URL}dp025/${record.gkey}/`, { confirms: newVal });
              message.success('確認狀態更新成功');
              // 重新查詢更新前端列表狀態
              doQuery();
            } catch (err) {
              message.error('確認狀態更新失敗');
            }
          }}
        />
      )
    },
    { title: '型體編號', dataIndex: 'styleno', width: 140, render: v => <b>{v}</b>, sorter: (a, b) => a.styleno.localeCompare(b.styleno) },
    { title: '型體名稱', dataIndex: 'stylename', width: 160 },
    { title: '品牌 Logo', dataIndex: 'logo', width: 100 },
    { title: '配色名稱', dataIndex: 'colorname', width: 130 },
    { title: '鞋面材料', dataIndex: 'upper', width: 180, ellipsis: true },
    { title: '內裡材料', dataIndex: 'lining', width: 180, ellipsis: true },
    { title: '鞋墊材料', dataIndex: 'sock', width: 180, ellipsis: true },
    { title: '大底材料', dataIndex: 'bottom', width: 180, ellipsis: true },
    { title: '鞋跟材料', dataIndex: 'heel', width: 180, ellipsis: true },
    { title: '尺碼段', dataIndex: 'sizerun', width: 110 },
    { title: '年度', dataIndex: 'year', width: 70, align: 'center' },
    { title: '季節', dataIndex: 'season_code', width: 80, align: 'center' },
    { title: '關聯組別', dataIndex: 'dp023_groupname', width: 120 },
    { title: '關聯楦頭', dataIndex: 'dp010_lastno', width: 120 },
    { title: '關聯大底', dataIndex: 'dp015_bottomno', width: 120 },
    { title: '關聯鞋跟', dataIndex: 'dp020_heelno', width: 120 },
    { title: '開發人員', dataIndex: 'es101_englishname', width: 110 },
    { 
      title: '量產採用', 
      dataIndex: 'adopted', 
      width: 90, 
      align: 'center', 
      render: v => v === 'Y' ? <Tag color="green">Y</Tag> : <Tag color="default">N</Tag> 
    },
    { 
      title: '發行日期', 
      dataIndex: 'issuedate', 
      width: 110, 
      align: 'center',
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : ''
    }
  ];

  // 報價明細欄位
  const priceColumns = [
    { title: 'NO', dataIndex: 'serialno', width: 60, render: (v, r, idx) => <Input value={v} onChange={e => updatePriceCell(idx, 'serialno', e.target.value)} /> },
    {
      title: '客戶',
      dataIndex: 'ba010gkey',
      width: 220,
      render: (v, r, idx) => (
        <Select
          showSearch allowClear style={{ width: '100%' }}
          popupMatchSelectWidth={false}
          value={v} placeholder="選擇客戶"
          optionFilterProp="label"
          onChange={val => updatePriceCell(idx, 'ba010gkey', val)}
          options={lookups.customers.map(c => ({ value: c.gkey, label: c.shortname }))}
        />
      )
    },
    {
      title: '生產底廠/工廠',
      dataIndex: 'ba015gkey',
      width: 220,
      render: (v, r, idx) => (
        <Select
          showSearch allowClear style={{ width: '100%' }}
          popupMatchSelectWidth={false}
          value={v} placeholder="選定工廠"
          optionFilterProp="label"
          onChange={val => updatePriceCell(idx, 'ba015gkey', val)}
          options={lookups.factories.map(f => ({ value: f.gkey, label: f.shortname }))}
        />
      )
    },
    {
      title: '尺碼段',
      dataIndex: 'sizerun',
      width: 130,
      render: (v, r, idx) => <Input value={v} onChange={e => updatePriceCell(idx, 'sizerun', e.target.value)} />
    },
    { title: '報價幣', dataIndex: 'ba060gkey', width: 120, render: (v, r, idx) => (
      <Select popupMatchSelectWidth={false} value={v} onChange={val => updatePriceCell(idx, 'ba060gkey', val)} options={lookups.currencies.map(c => ({ value: c.gkey, label: c.currency }))} />
    )},
    { title: '單價', dataIndex: 'price', width: 110, render: (v, r, idx) => <Input type="number" value={v} onChange={e => updatePriceCell(idx, 'price', parseFloat(e.target.value) || 0)} /> },
    { title: '成本幣', dataIndex: 'cba060gkey', width: 120, render: (v, r, idx) => (
      <Select popupMatchSelectWidth={false} value={v} onChange={val => updatePriceCell(idx, 'cba060gkey', val)} options={lookups.currencies.map(c => ({ value: c.gkey, label: c.currency }))} />
    )},
    { title: '成本', dataIndex: 'cost', width: 110, render: (v, r, idx) => <Input type="number" value={v} onChange={e => updatePriceCell(idx, 'cost', parseFloat(e.target.value) || 0)} /> },
    {
      title: '報價日期',
      dataIndex: 'quotedate',
      width: 150,
      render: (v, r, idx) => (
        <DatePicker
          style={{ width: '100%' }} format="YYYY-MM-DD"
          value={v ? dayjs(v) : null}
          onChange={date => updatePriceCell(idx, 'quotedate', date ? date.toISOString() : null)}
        />
      )
    },
    { title: '貿易條件', dataIndex: 'ba070gkey', width: 160, render: (v, r, idx) => (
      <Select showSearch allowClear popupMatchSelectWidth={false} optionFilterProp="label" value={v} onChange={val => updatePriceCell(idx, 'ba070gkey', val)} options={lookups.terms.map(t => ({ value: t.gkey, label: t.termtype }))} />
    )},
    {
      title: 'Port港口',
      dataIndex: 'term',
      width: 240,
      render: (v, r, idx) => (
        <div style={{ display: 'flex', width: '100%', gap: '4px' }}>
          <Input 
            value={v} 
            placeholder="雙擊或按右側開窗選擇港口" 
            onChange={e => updatePriceCell(idx, 'term', e.target.value)} 
            onDoubleClick={() => {
              setF2ActivePriceRowIndex(idx);
              setF2ModalType('ports');
            }}
          />
          <Button 
            icon={<SearchOutlined />} 
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => {
              setF2ActivePriceRowIndex(idx);
              setF2ModalType('ports');
            }}
            title="選擇港口 (F2)"
          />
        </div>
      )
    },
    {
      title: '庫存碼',
      dataIndex: 'stock',
      width: 140,
      render: (v, r, idx) => <Input value={v} onChange={e => updatePriceCell(idx, 'stock', e.target.value)} />
    },
    { title: '備註', dataIndex: 'remark', render: (v, r, idx) => <Input value={v} onChange={e => updatePriceCell(idx, 'remark', e.target.value)} /> },
    { title: '', key: 'x', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deletePriceRow(idx)} /> }
  ];

  const techListColumns = [
    {
      title: '轉接記錄 FTY',
      dataIndex: 'ba015gkey',
      render: (v, record, idx) => {
        const fty = lookups.factories.find(f => f.gkey === v);
        return (
          <div style={{ padding: '4px 8px', cursor: 'pointer', backgroundColor: selectedTechRowIndex === idx ? '#e6f7ff' : 'transparent', fontWeight: selectedTechRowIndex === idx ? 'bold' : 'normal' }} onClick={() => setSelectedTechRowIndex(idx)}>
            🏭 {fty ? fty.shortname : `未指定 FTY (${idx+1})`}
          </div>
        );
      }
    }
  ];

  const accColumns = [
    { title: '序號', dataIndex: 'serialno', width: 70, render: (v, r, idx) => <Input value={v} onChange={e => updateAccessoryCell(idx, 'serialno', e.target.value)} /> },
    { title: '項目 (Accessory)', dataIndex: 'accessory', width: 240, render: (v, r, idx) => <Input placeholder="鍵入配件項目名稱..." value={v} onChange={e => updateAccessoryCell(idx, 'accessory', e.target.value)} /> },
    { title: '項目標準與描述', dataIndex: 'description', render: (v, r, idx) => <Input placeholder="在此鍵入物料規範標準..." value={v} onChange={e => updateAccessoryCell(idx, 'description', e.target.value)} /> },
    { title: '備註', dataIndex: 'remark', width: 200, render: (v, r, idx) => <Input value={v} onChange={e => updateAccessoryCell(idx, 'remark', e.target.value)} /> },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteAccessoryRow(idx)} /> }
  ];

  const renderDate = (field) => (
    <DatePicker
      style={{ width: '100%', height: '32px' }} format="YYYY-MM-DD"
      value={selectedStyle?.[field] ? dayjs(selectedStyle[field]) : null}
      onChange={(date, str) => updateMasterField(field, date ? date.toISOString() : null)}
    />
  );

  const activeTechTransfer = transfers[selectedTechRowIndex] || null;

  // 💡 輔助函數：渲染包含 下拉選單 與 彈出搜尋視窗 (F2) 的雙向選擇元件
  const renderDualSelector = (field, lookupType, optionsList, labelProp) => {
    return (
      <div style={{ display: 'flex', width: '100%', gap: '4px' }}>
        <Select
          showSearch
          allowClear
          style={{ flex: 1 }}
          value={selectedStyle?.[field]}
          onChange={v => {
            if (lookupType === 'groups') handleGroupSelection(v);
            else updateMasterField(field, v);
          }}
          options={optionsList.map(item => ({
            value: item.gkey,
            label: item[labelProp] || ''
          }))}
          optionFilterProp="label"
          popupMatchSelectWidth={false}
        />
        <Button 
          icon={<SearchOutlined />} 
          onClick={() => setF2ModalType(lookupType)} 
          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={`開窗選擇 (${lookupType})`}
        />
      </div>
    );
  };

  return (
    <div className="dp025-premium-container md-sheet-container">
      <div className="md-sheet-header">
        <Space>
          <AppstoreOutlined style={{ color: '#096dd9' }} />
          <span className="md-sheet-title">DP025 型體基本資料管理</span>
          <Divider type="vertical" />
          <Tag color={isDirty ? 'orange' : 'blue'}>{isDirty ? 'EDITING' : 'VIEWING'}</Tag>
        </Space>
        <span className="md-sheet-version">PB Master-Detail Parity v3.2</span>
      </div>
      {/* 📑 主視窗多頁籤 (瀏覽列表 vs 卡片編輯頁) */}
      <Tabs 
        activeKey={activeTabKey} 
        onChange={setActiveTabKey}
        type="line"
        className="md-sheet-tabs"
        items={[
          {
            key: 'query',
            label: '查詢列表',
            children: (
              <div className="md-query-panel">
                {/* 🔍 查詢條件面板 (dw_where_panel - 13大核心業務指標篩選，100%對齊 PB 原廠設計) */}
                <div className="dw-where-panel">
                  <Form className="pb-query-form" layout="vertical" size="small">
                    <Row gutter={16}>
                      <Col span={18}>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item label="型體編號">
                              <Input value={qFilters.styleno} onChange={e => setQFilters({...qFilters, styleno: e.target.value})} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="型體名稱">
                              <Input value={qFilters.stylename} onChange={e => setQFilters({...qFilters, stylename: e.target.value})} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="年度">
                              <Input value={qFilters.year} onChange={e => setQFilters({...qFilters, year: e.target.value})} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item label="季節">
                              <Select allowClear showSearch optionFilterProp="label" value={qFilters.ba055gkey} onChange={v => setQFilters({...qFilters, ba055gkey: v})} options={lookups.seasons.map(s => ({ value: s.gkey, label: s.groupcode }))} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="鞋種類別">
                              <Select allowClear showSearch optionFilterProp="label" value={qFilters.dp003gkey} onChange={v => setQFilters({...qFilters, dp003gkey: v})} options={lookups.shoeTypes.map(t => ({ value: t.gkey, label: t.shoetype }))} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="關聯組別">
                              <Select allowClear showSearch optionFilterProp="label" value={qFilters.dp023gkey} onChange={v => setQFilters({...qFilters, dp023gkey: v})} options={lookups.groups.map(g => ({ value: g.gkey, label: g.groupname }))} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item label="買主客戶">
                              <Select allowClear showSearch optionFilterProp="label" value={qFilters.ba010gkey} onChange={v => setQFilters({...qFilters, ba010gkey: v})} options={lookups.customers.map(c => ({ value: c.gkey, label: c.shortname }))} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="生產工廠">
                              <Select allowClear showSearch optionFilterProp="label" value={qFilters.ba015gkey} onChange={v => setQFilters({...qFilters, ba015gkey: v})} options={lookups.factories.map(f => ({ value: f.gkey, label: f.shortname }))} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="開發人員">
                              <Select allowClear showSearch optionFilterProp="label" value={qFilters.es101gkey} onChange={v => setQFilters({...qFilters, es101gkey: v})} options={lookups.users.map(u => ({ value: u.gkey, label: u.englishname }))} />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item label="發行日期(起)">
                              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" value={qFilters.issuedate_start ? dayjs(qFilters.issuedate_start) : null} onChange={date => setQFilters({...qFilters, issuedate_start: date ? date.format('YYYY-MM-DD') : null})} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="發行日期(迄)">
                              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" value={qFilters.issuedate_end ? dayjs(qFilters.issuedate_end) : null} onChange={date => setQFilters({...qFilters, issuedate_end: date ? date.format('YYYY-MM-DD') : null})} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Col>
                      <Col span={6}>
                        <div className="radio-group-box">
                          <div className="box-label">確認狀態</div>
                          <Radio.Group value={qFilters.confirms} onChange={e => setQFilters({...qFilters, confirms: e.target.value})}>
                            <Space direction="vertical">
                              <Radio value="Y">已確認</Radio>
                              <Radio value="N">未確認</Radio>
                              <Radio value="A">全部</Radio>
                            </Space>
                          </Radio.Group>
                        </div>
                        <div className="radio-group-box" style={{ marginTop: 8 }}>
                          <div className="box-label">量產採用</div>
                          <Radio.Group value={qFilters.adopted} onChange={e => setQFilters({...qFilters, adopted: e.target.value})}>
                            <Space direction="vertical">
                              <Radio value="Y">已採用</Radio>
                              <Radio value="N">未採用</Radio>
                              <Radio value="A">全部</Radio>
                            </Space>
                          </Radio.Group>
                        </div>
                      </Col>
                    </Row>
                  </Form>
                </div>

                {/* 🛠️ 清單工具列 (僅保留核心的業務一鍵轉單，杜絕任何地方新增 CRUD 按鈕，嚴格尊崇全域 MDI 託管) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                    📋 型體主檔瀏覽清單
                  </span>
                  <Space>
                    <Button type="primary" ghost icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)} style={{ color: '#722ed1', borderColor: '#722ed1' }}>
                      樣品單一鍵轉量產 (ue_custom1)
                    </Button>
                  </Space>
                </div>

                {/* 📊 資料列表網格 */}
                <div className="md-query-grid">
                  <Table 
                    size="small" 
                    bordered 
                    dataSource={styleList} 
                    columns={listColumns} 
                    rowKey="gkey" 
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 50, size: 'small' }} 
                    onRow={record => ({
                      onClick: () => loadStyleDetails(record),
                      onDoubleClick: () => loadStyleDetails(record)
                    })}
                    rowClassName={r => selectedStyle && r.gkey === selectedStyle.gkey ? 'row-active' : ''}
                  />
                </div>
              </div>
            )
          },
          {
            key: 'details',
            label: '編輯維護',
            disabled: !selectedStyle,
            children: selectedStyle ? (
              <div className="md-editor-shell">
                <div className="md-editor-sidebar">
                  <div className="md-editor-sidebar-header">型體列表</div>
                  <div className="md-editor-sidebar-list">
                    {styleList.map(item => (
                      <div
                        key={item.gkey}
                        className={`md-editor-sidebar-item ${selectedStyle?.gkey === item.gkey ? 'active' : ''}`}
                        onClick={() => loadStyleDetails(item)}
                      >
                        <div className="md-editor-sidebar-item-title">{item.styleno || '未命名型體'}</div>
                        <div className="md-editor-sidebar-item-meta">{item.stylename || item.colorname || ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md-editor-main" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Row gutter={16}>
                  {/* 左側：型體詳細規格與研發日程 */}
                  <Col span={16}>
                    {/* 🏷️ 型體核心規格主檔 (還原 PB 原始所有主物理欄位，完全對齊原廠) */}
                    <Card size="small" title={<span className="card-title-pb"><AppstoreOutlined /> 🏷️ 型體核心規格主檔 (Dp025 Master)</span>}>
                      <Form className="pb-form" layout="horizontal">
                        <Row gutter={12}>
                          <Col span={6}>
                            <Form.Item label="型體編號" required>
                              <Input disabled={!selectedStyle.gkey.startsWith('temp_')} value={selectedStyle.styleno} onChange={e => updateMasterField('styleno', e.target.value)} style={{ backgroundColor: selectedStyle.gkey.startsWith('temp_') ? '#fffbe6' : '#f5f5f5' }} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="發行日期">
                              {renderDate('issuedate')}
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="中文名稱">
                              <Input value={selectedStyle.stylename} onChange={e => updateMasterField('stylename', e.target.value)} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="主要配色" required>
                              <Input value={selectedStyle.colorname} onChange={e => updateMasterField('colorname', e.target.value)} style={{ backgroundColor: '#fffbe6' }} />
                            </Form.Item>
                          </Col>
                        </Row>
                        
                        <Row gutter={12} style={{ marginTop: '8px' }}>
                          <Col span={6}>
                            <Form.Item label="季節">
                              {renderDualSelector('ba055gkey', 'seasons', lookups.seasons, 'groupcode')}
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="年度" required>
                              <Input value={selectedStyle.year} onChange={e => updateMasterField('year', e.target.value)} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="組別名稱">
                              {renderDualSelector('dp023gkey', 'groups', lookups.groups, 'groupname')}
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="開發人員">
                              <Select showSearch allowClear value={selectedStyle.es101gkey} onChange={v => updateMasterField('es101gkey', v)} options={lookups.users.map(u => ({ value: u.gkey, label: u.englishname }))} placeholder="選擇人員" popupMatchSelectWidth={false} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={12} style={{ marginTop: '8px' }}>
                          <Col span={6}>
                            <Form.Item label="關聯楦頭">
                              {renderDualSelector('dp010gkey', 'lasts', lookups.lasts, 'lastno')}
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="關聯大底">
                              {renderDualSelector('dp015gkey', 'outsoles', lookups.outsoles, 'bottomno')}
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="關聯鞋跟">
                              {renderDualSelector('dp020gkey', 'heels', lookups.heels, 'heelno')}
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="鞋種類別">
                              {renderDualSelector('dp003gkey', 'shoeTypes', lookups.shoeTypes, 'shoetype')}
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={12} style={{ marginTop: '8px' }}>
                          <Col span={6}>
                            <Form.Item label="性別類型">
                              {renderDualSelector('dp004gkey', 'genders', lookups.genders, 'gender')}
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="商標 Logo">
                              <Input value={selectedStyle.logo} onChange={e => updateMasterField('logo', e.target.value)} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="庫存條碼">
                              <Input value={selectedStyle.stock} onChange={e => updateMasterField('stock', e.target.value)} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="尺碼段">
                              <Input value={selectedStyle.sizerun} onChange={e => updateMasterField('sizerun', e.target.value)} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={12} style={{ marginTop: '8px' }}>
                          <Col span={6}>
                            <Form.Item label="原始舊型">
                              <Input value={selectedStyle.oldstyle} onChange={e => updateMasterField('oldstyle', e.target.value)} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="首出船期">
                              {renderDate('firstshipdate')}
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="首出雙數">
                              <InputNumber style={{ width: '100%' }} value={selectedStyle.firstpairs} onChange={v => updateMasterField('firstpairs', v)} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="圖片路徑">
                              <Input value={selectedStyle.photopath} onChange={e => updateMasterField('photopath', e.target.value)} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={12} style={{ marginTop: '8px' }}>
                          <Col span={6}>
                            <Form.Item label="確認狀態">
                              <Select value={selectedStyle.confirms} onChange={v => updateMasterField('confirms', v)} options={[{value:'Y', label:'已確認'}, {value:'N', label:'未確認'}]} />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item label="量產採用">
                              <Select value={selectedStyle.adopted} onChange={v => updateMasterField('adopted', v)} options={[{value:'Y', label:'是 (Adopted)'}, {value:'N', label:'否'}]} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="備註說明">
                              <Input value={selectedStyle.remark} onChange={e => updateMasterField('remark', e.target.value)} placeholder="建檔備註說明" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>
                    </Card>

                    {/* 🧵 鞋部材料與工藝規格 (Footwear Materials & Technical Specifications) */}
                    <Card size="small" title={<span className="card-title-pb">🧵 鞋部材料與工藝規格 (Footwear Materials Specifications)</span>} style={{ marginTop: '12px' }}>
                      <Form className="pb-form materials-form" layout="vertical">
                        <Row gutter={12}>
                          <Col span={8}>
                            <Form.Item label="鞋面材料" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                              <Input.TextArea rows={4} style={{ width: '100%' }} value={selectedStyle.upper} onChange={e => updateMasterField('upper', e.target.value)} placeholder="請輸入鞋面主要材料與特性描述" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="內裡材料" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                              <Input.TextArea rows={4} style={{ width: '100%' }} value={selectedStyle.lining} onChange={e => updateMasterField('lining', e.target.value)} placeholder="請輸入內裡材料與舒適度描述" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="大底材料" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                              <Input.TextArea rows={4} style={{ width: '100%' }} value={selectedStyle.bottom} onChange={e => updateMasterField('bottom', e.target.value)} placeholder="請輸入大底材質與工藝要求" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={12} style={{ marginTop: '12px' }}>
                          <Col span={8}>
                            <Form.Item label="鞋舌材料" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                              <Input.TextArea rows={4} style={{ width: '100%' }} value={selectedStyle.tongue} onChange={e => updateMasterField('tongue', e.target.value)} placeholder="請輸入鞋舌材料與結構描述" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="鞋墊材料" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                              <Input.TextArea rows={4} style={{ width: '100%' }} value={selectedStyle.sock} onChange={e => updateMasterField('sock', e.target.value)} placeholder="請輸入鞋墊/墊腳材質與吸震規格" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="鞋跟材料" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                              <Input.TextArea rows={4} style={{ width: '100%' }} value={selectedStyle.heel} onChange={e => updateMasterField('heel', e.target.value)} placeholder="請輸入鞋跟材質與跟高規格說明" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={12} style={{ marginTop: '12px' }}>
                          <Col span={16}>
                            <Form.Item label="材質工藝詳細備註 (Technical Remarks)" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                              <Input.TextArea 
                                rows={8} 
                                style={{ width: '100%', fontSize: '13px' }} 
                                value={selectedStyle.material} 
                                onChange={e => updateMasterField('material', e.target.value)} 
                                placeholder="請在此處輸入該型體的詳細材質技術指標、針車/成型工藝細節或特殊生產指導備註..." 
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Col>

                  {/* 右側：型體設計圖片預覽 (完全鏡像對齊 DP020/015 精美佈局) */}
                  <Col span={8}>
                    <Card size="small" title={<span className="card-title-pb"><FileImageOutlined /> 型體設計外觀圖片</span>} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, border: '1px dashed #cbd5e1', borderRadius: '4px', height: '460px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', overflow: 'hidden' }}>
                        {selectedStyle.photopath ? (
                          <Image src={`/media/${selectedStyle.photopath}`} style={{ maxHeight: '440px', maxWidth: '100%', objectFit: 'contain' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'; }} />
                        ) : (
                          <div style={{ color: '#bfbfbf', textAlign: 'center' }}><FileImageOutlined style={{ fontSize: '48px' }} /><div>無設計圖片記錄</div></div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* 🛰️ 子分頁網格 */}
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '12px', background: '#fff' }}>
                  <Tabs 
                    type="card"
                    items={[
                      {
                        key: 'pricing',
                        label: '💰 報價與成本明細 (Dp026)',
                        children: (
                          <div style={{ height: '350px', overflowY: 'auto' }}>
                            <div style={{ textAlign: 'right', marginBottom: 8 }}><Button size="small" icon={<PlusOutlined />} onClick={addPriceRow}>新增客戶報價</Button></div>
                            <Table dataSource={prices} columns={priceColumns} rowKey="gkey" size="small" pagination={false} bordered />
                          </div>
                        )
                      },
                      {
                        key: 'transfer',
                        label: '⚙️ 技轉與修改意見 (Dp027)',
                        children: (
                          <div style={{ display: 'flex', gap: '16px', height: '400px' }}>
                            <div style={{ width: '220px', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>
                              <div style={{ marginBottom: '8px' }}><Button block size="small" icon={<PlusOutlined />} onClick={addTransferRow}>新增技轉記錄</Button></div>
                              <Table dataSource={transfers} columns={techListColumns} rowKey="gkey" size="small" pagination={false} showHeader={false} bordered />
                            </div>
                            <div style={{ flex: 1, padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', overflowY: 'auto' }}>
                              {activeTechTransfer ? (
                                <Form className="pb-form" layout="horizontal">
                                  <Row gutter={16}>
                                    <Col span={8}>
                                      <Form.Item label="發運日期">
                                        <DatePicker 
                                          style={{ width: '100%', height: '32px' }} format="YYYY-MM-DD"
                                          value={activeTechTransfer.issuedate ? dayjs(activeTechTransfer.issuedate) : null}
                                          onChange={(date, str) => updateTechField(selectedTechRowIndex, 'issuedate', date ? date.toISOString() : null)}
                                        />
                                      </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                      <Form.Item label="轉接日期">
                                        <DatePicker 
                                          style={{ width: '100%', height: '32px' }} format="YYYY-MM-DD"
                                          value={activeTechTransfer.trandate ? dayjs(activeTechTransfer.trandate) : null}
                                          onChange={(date, str) => updateTechField(selectedTechRowIndex, 'trandate', date ? date.toISOString() : null)}
                                        />
                                      </Form.Item>
                                    </Col>
                                    <Col span={8}><Form.Item label="FTY 工廠">
                                      <Select 
                                        showSearch 
                                        allowClear 
                                        style={{ width: '100%', height: '32px' }} 
                                        popupMatchSelectWidth={false}
                                        optionFilterProp="label"
                                        value={activeTechTransfer.ba015gkey} 
                                        onChange={v => updateTechField(selectedTechRowIndex, 'ba015gkey', v)} 
                                        options={lookups.factories.map(f=>({value:f.gkey, label:f.shortname}))} 
                                      />
                                    </Form.Item></Col>
                                  </Row>
                                  <Row gutter={16} style={{ marginTop: '8px' }}>
                                    <Col span={8}><Form.Item label="ShipTo"><Input value={activeTechTransfer.shipto} onChange={e=>updateTechField(selectedTechRowIndex, 'shipto', e.target.value)} /></Form.Item></Col>
                                    <Col span={8}><Form.Item label="CC"><Input value={activeTechTransfer.cc} onChange={e=>updateTechField(selectedTechRowIndex, 'cc', e.target.value)} /></Form.Item></Col>
                                    <Col span={8}><Form.Item label="ShipFrom"><Input value={activeTechTransfer.shipfrom} onChange={e=>updateTechField(selectedTechRowIndex, 'shipfrom', e.target.value)} /></Form.Item></Col>
                                  </Row>
                                  <Divider style={{margin:'8px 0'}} />
                                  <Row gutter={16}>
                                    <Col span={12}><Form.Item label="生產廠確認"><Input value={activeTechTransfer.tranfact} onChange={e=>updateTechField(selectedTechRowIndex, 'tranfact', e.target.value)} /></Form.Item></Col>
                                    <Col span={12}><Form.Item label="紙版確認"><Input value={activeTechTransfer.tranpattern} onChange={e=>updateTechField(selectedTechRowIndex, 'tranpattern', e.target.value)} /></Form.Item></Col>
                                    <Col span={12}><Form.Item label="開發確認"><Input value={activeTechTransfer.trandev} onChange={e=>updateTechField(selectedTechRowIndex, 'trandev', e.target.value)} /></Form.Item></Col>
                                    <Col span={12}><Form.Item label="QC確認"><Input value={activeTechTransfer.tranqc} onChange={e=>updateTechField(selectedTechRowIndex, 'tranqc', e.target.value)} /></Form.Item></Col>
                                  </Row>
                                  <Form.Item label="修改意見" style={{ marginTop: '8px' }}><Input.TextArea rows={3} value={activeTechTransfer.modifymemo} onChange={e=>updateTechField(selectedTechRowIndex, 'modifymemo', e.target.value)} /></Form.Item>
                                  <Form.Item label="工廠反饋" style={{ marginTop: '8px' }}><Input.TextArea rows={3} value={activeTechTransfer.factcomment} onChange={e=>updateTechField(selectedTechRowIndex, 'factcomment', e.target.value)} /></Form.Item>
                                  <div style={{ textAlign: 'right', marginTop: '12px' }}><Popconfirm title="確定刪除此筆技轉記錄？" onConfirm={() => deleteTransferRow(selectedTechRowIndex)}><Button danger icon={<DeleteOutlined />}>刪除此記錄</Button></Popconfirm></div>
                                </Form>
                              ) : <div style={{ textAlign: 'center', marginTop: '100px', color: '#bfbfbf' }}>👈 請選擇左側技轉記錄進行編輯</div>}
                            </div>
                          </div>
                        )
                      },
                      {
                        key: 'accessories',
                        label: '🧶 鞋材/配件明細 (Dp028)',
                        children: (
                          <div style={{ height: '350px', overflowY: 'auto' }}>
                            <div style={{ textAlign: 'right', marginBottom: 8 }}><Button size="small" icon={<PlusOutlined />} onClick={addAccessoryRow}>新增配件項</Button></div>
                            <Table dataSource={accessories} columns={accColumns} rowKey="gkey" size="small" pagination={false} bordered />
                          </div>
                        )
                      },
                      {
                        key: 'milestones',
                        label: '📅 生產時序日程追蹤 (Milestone Calendar)',
                        children: (
                          <div style={{ overflowY: 'auto', height: '350px', padding: '8px' }}>
                            <Row gutter={[16, 16]}>
                              <Col span={6}><Form.Item label="技轉日 (預計)" layout="vertical">{renderDate('trandue')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="技轉日 (實際)" layout="vertical">{renderDate('tranreal')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="首剪CFM (預計)" layout="vertical">{renderDate('cutcfmdue')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="首剪CFM (實際)" layout="vertical">{renderDate('cutcfmreal')}</Form.Item></Col>
                              
                              <Col span={6}><Form.Item label="基本號CFM (預計)" layout="vertical">{renderDate('baccfmdue')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="基本號CFM (實際)" layout="vertical">{renderDate('baccfmreal')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="斬刀完成日 (預計)" layout="vertical">{renderDate('newknifedue')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="斬刀完成日 (實際)" layout="vertical">{renderDate('newknifereal')}</Form.Item></Col>
                              
                              <Col span={6}><Form.Item label="大中小CFM (預計)" layout="vertical">{renderDate('lmscfmdue')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="大中小CFM (實際)" layout="vertical">{renderDate('lmscfmreal')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="全套刀模CFM (預)" layout="vertical">{renderDate('fitknifedue')}</Form.Item></Col>
                              <Col span={6}><Form.Item label="全套刀模CFM (實)" layout="vertical">{renderDate('fitknifereal')}</Form.Item></Col>
                            </Row>
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
              </div>
              </div>
            ) : null
          }
        ]}
      />

      {/* 🔄 樣品一鍵轉量產 Modal 視窗 (ue_custom1) */}
      <Modal
        title="🌟 樣品配色工藝指令一鍵導入轉換 (ue_custom1)"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        width={950}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '4px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '12px' }}>
            💡 系統會自動提取樣品開發時設定的「面、裡、底、墊、跟、舌」部位材料工藝，並完整拷貝楦頭/大底/鞋跟/商標/性別關聯，無感回灌至量產主檔！
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>快速篩選:</span>
            <Input 
              style={{ width: 300, height: '32px' }} 
              placeholder="輸入樣品單號 / 型體編號 / 顏色..." 
              value={sampleSearchQuery}
              onChange={e => setSampleSearchQuery(e.target.value)} 
              allowClear
            />
          </div>
          <Table 
            size="small"
            dataSource={filteredSamples}
            columns={sampleColumns}
            rowKey="gkey"
            loading={samplesLoading}
            pagination={{ pageSize: 8, size: 'small' }}
            bordered
          />
        </div>
      </Modal>

      {/* 🔍 F2 關聯彈出式選擇視窗 (加寬至 950px 大版面，提供極致明晰的資料視野) */}
      <Modal
        title={`🔍 選擇 ${
          f2ModalType === 'groups' ? '組別' :
          f2ModalType === 'lasts' ? '楦頭' :
          f2ModalType === 'outsoles' ? '大底' :
          f2ModalType === 'heels' ? '鞋跟' :
          f2ModalType === 'seasons' ? '季節' :
          f2ModalType === 'shoeTypes' ? '鞋類' :
          f2ModalType === 'genders' ? '性別' :
          f2ModalType === 'ports' ? '交易港口' : ''
        }`}
        open={!!f2ModalType}
        onCancel={() => { setF2ModalType(null); setF2SearchQuery(''); }}
        footer={null}
        width={950}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>關鍵字搜尋:</span>
            <Input 
              style={{ width: 300, height: '32px' }} 
              placeholder="輸入代碼或名稱快速檢索..." 
              value={f2SearchQuery}
              onChange={e => setF2SearchQuery(e.target.value)} 
              allowClear
            />
          </div>
          <Table 
            size="small"
            dataSource={
              (() => {
                const list = 
                  f2ModalType === 'groups' ? lookups.groups :
                  f2ModalType === 'lasts' ? lookups.lasts :
                  f2ModalType === 'outsoles' ? lookups.outsoles :
                  f2ModalType === 'heels' ? lookups.heels :
                  f2ModalType === 'seasons' ? lookups.seasons :
                  f2ModalType === 'shoeTypes' ? lookups.shoeTypes :
                  f2ModalType === 'genders' ? lookups.genders :
                  f2ModalType === 'ports' ? lookups.ports : [];
                
                return list.filter(item => {
                  if (!f2SearchQuery) return true;
                  const query = f2SearchQuery.toLowerCase();
                  
                  if (f2ModalType === 'groups') {
                    return (item.groupcode || '').toLowerCase().includes(query) || (item.groupname || '').toLowerCase().includes(query);
                  } else if (f2ModalType === 'lasts') {
                    return (item.lastno || '').toLowerCase().includes(query) || (item.lasttype || '').toLowerCase().includes(query);
                  } else if (f2ModalType === 'outsoles') {
                    return (item.bottomno || '').toLowerCase().includes(query) || (item.bottomname || '').toLowerCase().includes(query);
                  } else if (f2ModalType === 'heels') {
                    return (item.heelno || '').toLowerCase().includes(query) || (item.heelname || '').toLowerCase().includes(query);
                  } else if (f2ModalType === 'seasons') {
                    return (item.groupcode || '').toLowerCase().includes(query) || (item.groupname || '').toLowerCase().includes(query);
                  } else if (f2ModalType === 'shoeTypes') {
                    return (item.shoetype || '').toLowerCase().includes(query);
                  } else if (f2ModalType === 'genders') {
                    return (item.gender || '').toLowerCase().includes(query);
                  } else if (f2ModalType === 'ports') {
                    return (item.term || '').toLowerCase().includes(query) || (item.serialno || '').toString().includes(query);
                  }
                  return true;
                });
              })()
            }
            columns={
              f2ModalType === 'groups' ? [
                { title: '組別代碼', dataIndex: 'groupcode', width: 150 },
                { title: '組別名稱', dataIndex: 'groupname' }
              ] : f2ModalType === 'lasts' ? [
                { title: '楦頭編號', dataIndex: 'lastno', width: 180 },
                { title: '楦型/描述', dataIndex: 'lasttype' }
              ] : f2ModalType === 'outsoles' ? [
                { title: '大底編號', dataIndex: 'bottomno', width: 180 },
                { title: '大底名稱/材質', dataIndex: 'bottomname' }
              ] : f2ModalType === 'heels' ? [
                { title: '鞋跟型號', dataIndex: 'heelno', width: 180 },
                { title: '鞋跟名稱', dataIndex: 'heelname' }
              ] : f2ModalType === 'seasons' ? [
                { title: '季節代碼', dataIndex: 'groupcode', width: 150 },
                { title: '季節名稱', dataIndex: 'groupname' }
              ] : f2ModalType === 'shoeTypes' ? [
                { title: '鞋種類別', dataIndex: 'shoetype' }
              ] : f2ModalType === 'genders' ? [
                { title: '性別類型', dataIndex: 'gender' }
              ] : f2ModalType === 'ports' ? [
                { title: '序號', dataIndex: 'serialno', width: 150 },
                { title: '交易港口 (Port)', dataIndex: 'term' }
              ] : []
            }
            rowKey="gkey"
            pagination={{ pageSize: 12, size: 'small' }}
            scroll={{ y: 380 }}
            bordered
            onRow={record => ({
              onDoubleClick: () => handleF2Select(record.gkey),
              onClick: () => handleF2Select(record.gkey)
            })}
            rowClassName="row-clickable"
          />
        </div>
      </Modal>

      <style>{`
        .dp025-premium-container {
          padding: 8px 12px;
          height: 100vh;
          width: 100% !important;
          display: flex;
          flex-direction: column;
          background: #f1f5f9;
        }

        .dp025-premium-container,
        .dp025-premium-container * {
          font-size: 12px !important;
        }

        .dp025-premium-container .md-editor-sidebar {
          flex-basis: 150px;
          width: 150px;
        }

        .dp025-premium-container .md-editor-sidebar-item {
          padding: 6px 8px;
        }

        .dp025-premium-container .md-editor-sidebar-item-title {
          font-size: 12px !important;
        }

        .dw-where-panel {
          background: #fff;
          padding: 6px 12px;
          border: 1px solid #cbd5e1;
          margin-bottom: 8px;
          flex: 0 0 auto;
          border-radius: 4px;
        }

        /* 🔍 pb-query-form (Vertical layout, dense and neat) */
        .pb-query-form .ant-form-item {
          margin-bottom: 4px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          width: 100% !important;
        }

        .pb-query-form .ant-form-item-label {
          width: 100% !important;
          text-align: left !important;
          padding: 0 0 2px 0 !important;
          line-height: 18px !important;
        }

        .pb-query-form .ant-form-item-label > label {
          font-size: 11px !important;
          color: #475569 !important;
          font-weight: 600 !important;
        }

        .pb-query-form .ant-form-item-control {
          width: 100% !important;
        }

        .pb-query-form .ant-input,
        .pb-query-form .ant-input-number,
        .pb-query-form .ant-select-selector,
        .pb-query-form .ant-picker {
          height: 28px !important;
          border-radius: 4px !important;
          border: 1px solid #cbd5e1 !important;
          width: 100% !important;
          font-size: 11px !important;
        }

        .pb-query-form .ant-select-selector {
          padding: 0 8px !important;
          display: flex !important;
          align-items: center !important;
        }

        .pb-query-form .ant-select-selection-search {
          margin-inline-start: 0 !important;
        }

        /* 📝 pb-form (Master & Card Edit Form) */
        .pb-form .ant-form-item {
          margin-bottom: 0 !important;
          display: flex !important;
          align-items: center !important;
        }

        .pb-form .ant-form-item-label {
          width: 80px !important;
          text-align: right !important;
          padding-right: 8px !important;
          line-height: 28px !important;
        }

        .pb-form .ant-form-item-label > label {
          font-size: 11px !important;
          color: #475569 !important;
          font-weight: 600 !important;
        }

        .pb-form.materials-form .ant-form-item {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
        }

        .pb-form.materials-form .ant-form-item-label {
          width: 100% !important;
          text-align: left !important;
          padding-right: 0 !important;
          line-height: 20px !important;
        }

        .pb-form.materials-form .ant-form-item-label > label {
          font-size: 11px !important;
          color: #475569 !important;
          font-weight: 600 !important;
          text-align: left !important;
        }

        .pb-form .ant-form-item-control-input-content {
          display: flex;
          align-items: center;
        }

        .pb-form .ant-input,
        .pb-form .ant-input-number,
        .pb-form .ant-select-selector,
        .pb-form .ant-picker {
          height: 28px !important;
          border-radius: 4px !important;
          border: 1px solid #cbd5e1 !important;
          font-size: 12px !important;
        }

        .pb-form .ant-select-selector {
          padding: 0 8px !important;
          display: flex !important;
          align-items: center !important;
        }

        .pb-form .ant-select-selection-search {
          margin-inline-start: 0 !important;
        }

        .pb-form .ant-checkbox-wrapper {
          font-size: 11px;
        }

        /* 📊 Table Compact & Dense Styles */
        .dp025-premium-container .ant-table-thead > tr > th {
          padding: 6px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          background: #f8fafc !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }

        .dp025-premium-container .ant-table-tbody > tr > td {
          padding: 4px 6px !important;
          font-size: 11px !important;
        }

        /* Inline Table Editors */
        .dp025-premium-container .ant-table-tbody .ant-input,
        .dp025-premium-container .ant-table-tbody .ant-input-number,
        .dp025-premium-container .ant-table-tbody .ant-select-selector,
        .dp025-premium-container .ant-table-tbody .ant-picker {
          height: 26px !important;
          font-size: 11px !important;
          padding: 0 4px !important;
        }

        .dp025-premium-container .ant-table-tbody .ant-btn {
          height: 26px !important;
          line-height: 26px !important;
          padding: 0 6px !important;
          font-size: 11px !important;
        }

        .card-title-pb {
          font-weight: 700;
          color: #1e293b;
          font-size: 13px !important;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .row-active td {
          background-color: #f1f5f9 !important;
          font-weight: 600;
        }

        .row-clickable {
          cursor: pointer;
        }

        .row-clickable:hover td {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </div>
  );
}
