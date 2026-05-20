import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Input, Select, Space, Card, Row, Col, Form, DatePicker, message, Popconfirm, InputNumber, Modal, Divider, Tag } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined, CopyOutlined, BuildOutlined, CheckCircleOutlined, UserOutlined, DollarOutlined, AppstoreOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import './MdSheetLayout.css';

const API_URL = 'http://localhost:8001/api/';

export default function Dp030Sheet() {
  // 📊 Main Navigation Tab Key
  const [activeTabKey, setActiveTabKey] = useState('query');
  
  // 💾 Master State
  const [sampleList, setSampleList] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🧼 Detail Grids States (Recursive Hierarchy Support)
  const [colors, setColors] = useState([]); // Dp031 (Each item embeds details_dp033: Array)
  const [materials, setMaterials] = useState([]); // Dp032
  const [logos, setLogos] = useState([]); // Dp034
  const [revisions, setRevisions] = useState([]); // Dp035
  const [trackers, setTrackers] = useState([]); // Dp104

  // 🧺 Deleted tracking trackers for Atomic Save
  const [deletedColors, setDeletedColors] = useState([]);
  const [deletedMaterials, setDeletedMaterials] = useState([]);
  const [deletedLogos, setDeletedLogos] = useState([]);
  const [deletedRevisions, setDeletedRevisions] = useState([]);
  const [deletedTrackers, setDeletedTrackers] = useState([]);
  
  // Deep child Dp033 deletes tracker
  const [deletedSizes, setDeletedSizes] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  // 🔎 Advanced Query Variables
  const [qFilters, setQFilters] = useState({
    sampleno: '',
    styleno: '',
    year: '',
    ba010gkey: '',
    ba015gkey: '',
    ba055gkey: '',
    status: ''
  });

  // 🌍 Comprehensive Lookups Cache
  const [lookups, setLookups] = useState({
    seasons: [], shoeTypes: [], genders: [],
    lasts: [], outsoles: [], heels: [], groups: [],
    customers: [], factories: [], currencies: [], users: [],
    origins: [], labels: [], sampleTypes: [],
    parts: [], partGroups: [], brands: []
  });

  // 🔍 F2 Lookup Dialog States (Standard PB-style open window popups)
  const [f2ModalOpen, setF2ModalOpen] = useState(false);
  const [f2ModalType, setF2ModalType] = useState(''); // 'lasts' | 'outsoles' | 'heels' | 'brands' | 'customers' | 'factories' | 'groups' | 'users'
  const [f2SearchQuery, setF2SearchQuery] = useState('');
  const [f2ActiveField, setF2ActiveField] = useState(''); // 'dp010gkey', 'dp015gkey', 'dp020gkey', 'ba010gkey', 'ba015gkey', 'ba009gkey', 'dp023gkey', 'es101gkey', 'mes101gkey', 'rqstby', 'designer', 'qFilters.ba010gkey'

  // ==========================================
  // 1. 🏗️ LOADS SYSTEM LOOKUPS
  // ==========================================
  const fetchAllLookups = async () => {
    try {
      const [se, st, ge, la, ou, he, gr, cu, fa, cur, us, ori, lab, smt, pt, pg, br] = await Promise.all([
        axios.get(`${API_URL}ba055/`), axios.get(`${API_URL}dp003/`), axios.get(`${API_URL}dp004/`),
        axios.get(`${API_URL}dp010/`), axios.get(`${API_URL}dp015/`), axios.get(`${API_URL}dp020/`),
        axios.get(`${API_URL}dp023/`), axios.get(`${API_URL}ba010/`), axios.get(`${API_URL}ba015/`),
        axios.get(`${API_URL}ba060/`), axios.get(`${API_URL}es101/`), axios.get(`${API_URL}ba003/`),
        axios.get(`${API_URL}dp008/`), axios.get(`${API_URL}dp002/`), axios.get(`${API_URL}dp006/`),
        axios.get(`${API_URL}dp005/`), axios.get(`${API_URL}ba009/`)
      ]);
      setLookups({
        seasons: se.data, shoeTypes: st.data, genders: ge.data,
        lasts: la.data, outsoles: ou.data, heels: he.data, groups: gr.data,
        customers: cu.data, factories: fa.data, currencies: cur.data, users: us.data,
        origins: ori.data, labels: lab.data, sampleTypes: smt.data,
        parts: pt.data, partGroups: pg.data, brands: br.data
      });
    } catch (err) {
      console.error('DP030 字典資料載入失敗', err);
    }
  };

  useEffect(() => {
    fetchAllLookups();
    doQuery();
  }, []);

  // ⚡ Open F2 Modal popup
  const openF2Lookup = (type, activeField) => {
    setF2ModalType(type);
    setF2ActiveField(activeField);
    setF2SearchQuery('');
    setF2ModalOpen(true);
  };

  // ⚡ Select item from F2 Modal and backfill it
  const handleF2Select = (record) => {
    if (f2ActiveField.startsWith('qFilters.')) {
      const field = f2ActiveField.split('.')[1];
      setQFilters(prev => ({ ...prev, [field]: record.gkey }));
    } else if (f2ActiveField === 'dp023gkey') {
      handleGroupSelection(record.gkey);
    } else {
      setSelectedSample(prev => {
        let value = record.gkey;
        if (f2ActiveField === 'rqstby' || f2ActiveField === 'designer') {
          value = record.englishname;
        }
        return { ...prev, [f2ActiveField]: value };
      });
      setIsDirty(true);
    }
    setF2ModalOpen(false);
  };

  // 📡 參數接收與 MDI 聯動監聽
  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === 'dp030') {
        if (params.sampleno) {
          const newFilters = { ...qFilters, sampleno: params.sampleno };
          setQFilters(newFilters);
          doQuery(newFilters);
        } else if (params.styleno) {
          const newFilters = { ...qFilters, styleno: params.styleno };
          setQFilters(newFilters);
          doQuery(newFilters);
        }
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, [qFilters]);

  // ==========================================
  // 2. 🔍 DB RETRIEVAL (Deep Fetching)
  // ==========================================
  const doQuery = async (filterOverride = null) => {
    setLoading(true);
    try {
      const params = filterOverride || { ...qFilters };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      const res = await axios.get(`${API_URL}dp030/`, { params });
      setSampleList(res.data);
    } catch (err) {
      message.error('樣品指令單主檔加載異常！');
    } finally {
      setLoading(false);
    }
  };

  // ⚡ MDI 監聽
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp030') {
        if (action === 'retrieve') {
          doQuery();
        } else if (action === 'insert') {
          handleNewSample();
        } else if (action === 'save') {
          handleSaveAll();
        } else if (action === 'edit') {
          if (selectedSample) {
            setActiveTabKey('details');
          } else {
            message.warning('請先選擇一筆樣品指令單記錄！');
          }
        } else if (action === 'delete') {
          if (selectedSample) {
            handleDeleteSample();
          } else {
            message.warning('請先選擇要刪除的樣品指令單記錄！');
          }
        }
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [selectedSample, isDirty, qFilters, colors, materials, logos, revisions, trackers]);

  const loadSampleDetails = async (masterObj) => {
    setSelectedSample({ ...masterObj });
    setColors([]);
    setMaterials([]);
    setLogos([]);
    setRevisions([]);
    setTrackers([]);
    setDeletedColors([]);
    setDeletedMaterials([]);
    setDeletedLogos([]);
    setDeletedRevisions([]);
    setDeletedTrackers([]);
    setDeletedSizes([]);
    setIsDirty(false);

    if (!masterObj.gkey.startsWith('temp_')) {
      setLoading(true);
      try {
        // Multi-level Async Data Fetching
        const [res31, res32, res33, res34, res35, res104] = await Promise.all([
          axios.get(`${API_URL}dp031/?dp030gkey=${masterObj.gkey}`), // Colors
          axios.get(`${API_URL}dp032/?dp030gkey=${masterObj.gkey}`), // Materials
          axios.get(`${API_URL}dp033/?dp030gkey=${masterObj.gkey}`), // Sizes for distribution
          axios.get(`${API_URL}dp034/?dp030gkey=${masterObj.gkey}`), // Logos
          axios.get(`${API_URL}dp035/?dp030gkey=${masterObj.gkey}`), // Revisions
          axios.get(`${API_URL}dp104/?dp030gkey=${masterObj.gkey}`)  // Tracker
        ]);

        // Distribute Dp033 sizes to respective parent Dp031 colors
        const structuredColors = res31.data.map(colorRow => {
          const childSizes = res33.data.filter(sz => sz.dp031gkey === colorRow.gkey);
          return { ...colorRow, details_dp033: childSizes };
        });

        setColors(structuredColors);
        setMaterials(res32.data);
        setLogos(res34.data);
        setRevisions(res35.data);
        setTrackers(res104.data);

      } catch (err) {
        message.error('獲取指令明細發生異常！');
      } finally {
        setLoading(false);
      }
    }
    setActiveTabKey('details');
  };

  // ==========================================
  // 3. ⚡ DYNAMIC DATA ACTIONS (PB EMULATORS)
  // ==========================================

  // A. 🆕 INSERT MASTER
  const handleNewSample = () => {
    const newSample = {
      gkey: `temp_${Date.now()}`,
      sampleno: `SMP-${Date.now().toString().slice(-4)}`,
      year: String(new Date().getFullYear()),
      issuedate: dayjs().toISOString(),
      duedate: dayjs().add(14, 'day').toISOString(),
      status: '1',
      cost: 'N',
      charge: 'N',
      approve: 'N'
    };
    loadSampleDetails(newSample);
  };

  // B. 👯‍♀️ COPY / CLONE MASTER (Xcopy)
  const handleCloneSample = () => {
    if (!selectedSample) return;
    const clonedMaster = {
      ...selectedSample,
      gkey: `temp_${Date.now()}`,
      sampleno: `${selectedSample.sampleno}-CLONED`,
      issuedate: dayjs().toISOString(),
      revisedate: null,
      approve: 'N'
    };

    // Clone all embedded levels!
    const clonedColors = colors.map((c, idx) => {
      const tempCkey = `temp_c_${idx}_${Date.now()}`;
      const clonedSizes = (c.details_dp033 || []).map((s, sIdx) => ({
        ...s,
        gkey: `temp_s_${idx}_${sIdx}_${Date.now()}`,
        dp031gkey: undefined,
        dp030gkey: undefined
      }));
      return { ...c, gkey: tempCkey, dp030gkey: undefined, details_dp033: clonedSizes };
    });

    const clonedMaterials = materials.map((m, idx) => ({ ...m, gkey: `temp_m_${idx}_${Date.now()}`, dp030gkey: undefined }));
    const clonedLogos = logos.map((l, idx) => ({ ...l, gkey: `temp_l_${idx}_${Date.now()}`, dp030gkey: undefined }));
    const clonedRevisions = revisions.map((r, idx) => ({ ...r, gkey: `temp_r_${idx}_${Date.now()}`, dp030gkey: undefined }));
    const clonedTrackers = trackers.map((t, idx) => ({ ...t, gkey: `temp_t_${idx}_${Date.now()}`, dp030gkey: undefined }));

    setSelectedSample(clonedMaster);
    setColors(clonedColors);
    setMaterials(clonedMaterials);
    setLogos(clonedLogos);
    setRevisions(clonedRevisions);
    setTrackers(clonedTrackers);
    setIsDirty(true);
    message.success('🧬 樣品指令單 DNA 結構克隆完成！');
  };

  // C. 🗑️ DELETE MASTER
  const handleDeleteSample = async () => {
    if (!selectedSample) return;
    if (selectedSample.gkey.startsWith('temp_')) {
      setSelectedSample(null);
      setColors([]);
      setMaterials([]);
      setLogos([]);
      setRevisions([]);
      setTrackers([]);
      setActiveTabKey('query');
      setIsDirty(false);
      message.success('已取消新增臨時單據');
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_URL}dp030/${selectedSample.gkey}/`);
      message.success('樣品指令單刪除成功！');
      setSelectedSample(null);
      setColors([]);
      setMaterials([]);
      setLogos([]);
      setRevisions([]);
      setTrackers([]);
      setActiveTabKey('query');
      setIsDirty(false);
      doQuery();
    } catch (err) {
      console.error(err);
      message.error('刪除單據失敗，可能存在外鍵聯動約束！');
    } finally {
      setLoading(false);
    }
  };

  // D. 🤖 核心 PB Emulator: wf_setvalue (部位材料文本動態回填)
  const handleCascadeAggregate = () => {
    if (materials.length === 0) {
      message.warning('無 BOM 部位材料，無法生成回填字串');
      return;
    }

    const groupMap = {
      upper: [],
      lining: [],
      sock: [],
      bottom: [],
      heel: [],
      tongue: []
    };

    materials.forEach(m => {
      const grpInfo = lookups.partGroups.find(pg => pg.gkey === m.dp005gkey);
      if (!grpInfo) return;
      
      const name = grpInfo.partgroup.toLowerCase();
      const matStr = `${m.parts || ''}:${m.cmaterial1 || ''}`;
      
      if (name.includes('面') || name.includes('upper')) groupMap.upper.push(matStr);
      else if (name.includes('裡') || name.includes('lining')) groupMap.lining.push(matStr);
      else if (name.includes('墊') || name.includes('sock')) groupMap.sock.push(matStr);
      else if (name.includes('底') || name.includes('bottom')) groupMap.bottom.push(matStr);
      else if (name.includes('跟') || name.includes('heel')) groupMap.heel.push(matStr);
      else if (name.includes('舌') || name.includes('tongue')) groupMap.tongue.push(matStr);
    });

    const composite = {
      upper: groupMap.upper.join(' / ').substring(0, 800),
      lining: groupMap.lining.join(' / ').substring(0, 800),
      sock: groupMap.sock.join(' / ').substring(0, 800),
      bottom: groupMap.bottom.join(' / ').substring(0, 800),
      heel: groupMap.heel.join(' / ').substring(0, 800),
      tongue: groupMap.tongue.join(' / ').substring(0, 800)
    };

    // Apply to ALL color rows currently in memory
    const updatedColors = colors.map(c => ({
      ...c,
      ...composite
    }));

    setColors(updatedColors);
    setIsDirty(true);
    message.success('🤖 PowerBuilder [wf_setvalue] 模擬成功：部位 BOM 材料文字已級聯串接回填！');
  };

  // E. 💾 DEEP ATOMIC SAVE
  const handleSaveAll = async () => {
    if (!selectedSample.sampleno) {
      message.error('【指令號】為必要物理欄位！');
      return;
    }

    setLoading(true);
    try {
      // Prep Cascade Payload conforming with backend deep_save atomic receiver
      const payload = {
        master: {
          ...selectedSample,
          gkey: selectedSample.gkey.startsWith('temp_') ? selectedSample.gkey : selectedSample.gkey
        },
        dp031: {
          upsert: colors.map(c => ({
            ...c,
            details_dp033: {
              upsert: (c.details_dp033 || []).map(s => ({
                ...s,
                gkey: s.gkey.startsWith('temp_') ? s.gkey : s.gkey
              })),
              delete: deletedSizes
            }
          })),
          delete: deletedColors
        },
        dp032: {
          upsert: materials.map(m => ({ ...m, gkey: m.gkey.startsWith('temp_') ? m.gkey : m.gkey })),
          delete: deletedMaterials
        },
        dp034: {
          upsert: logos.map(l => ({ ...l, gkey: l.gkey.startsWith('temp_') ? l.gkey : l.gkey })),
          delete: deletedLogos
        },
        dp035: {
          upsert: revisions.map(r => ({ ...r, gkey: r.gkey.startsWith('temp_') ? r.gkey : r.gkey })),
          delete: deletedRevisions
        },
        dp104: {
          upsert: trackers.map(t => ({ ...t, gkey: t.gkey.startsWith('temp_') ? t.gkey : t.gkey })),
          delete: deletedTrackers
        }
      };

      const response = await axios.post(`${API_URL}dp030/deep_save/`, payload);

      if (response.data.success) {
        message.success('🎉 樣品指令單 Master-Details 4層全級聯深度原子存檔成功！');
        setIsDirty(false);
        doQuery();
        
        // Refresh loaded entity
        const savedObjRes = await axios.get(`${API_URL}dp030/${response.data.gkey}/`);
        loadSampleDetails(savedObjRes.data);
      }
    } catch (err) {
      console.error('Deep save error:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      message.error('聯動存檔提交失敗：' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 4. ⛓️ DYNAMIC ROW UTILS & FORM UPDATERS
  // ==========================================
  
  const handleGroupSelection = (grpGkey) => {
    const foundGrp = lookups.groups.find(g => g.gkey === grpGkey);
    if (foundGrp) {
      setSelectedSample({
        ...selectedSample,
        dp023gkey: grpGkey,
        dp010gkey: foundGrp.dp010gkey,
        dp015gkey: foundGrp.dp015gkey,
        dp020gkey: foundGrp.dp020gkey
      });
      setIsDirty(true);
      message.info('💡 自動穿透：由組別聯動填入楦、底、鞋跟。');
    }
  };

  const updateMasterField = (field, val) => {
    setSelectedSample(prev => ({ ...prev, [field]: val }));
    setIsDirty(true);
  };

  // Color & Sizes Handlers (Dp031 / Dp033)
  const addColorRow = () => {
    const newCkey = `temp_c_${Date.now()}`;
    setColors([...colors, {
      gkey: newCkey,
      color: 'NEW_COLOR',
      details_dp033: []
    }]);
    setIsDirty(true);
  };

  const updateColorCell = (idx, field, val) => {
    const copy = [...colors];
    copy[idx][field] = val;
    setColors(copy);
    setIsDirty(true);
  };

  const deleteColorRow = (idx) => {
    const target = colors[idx];
    if (!target.gkey.startsWith('temp_')) {
      setDeletedColors([...deletedColors, target.gkey]);
    }
    setColors(colors.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  // Size Runner (Dp033)
  const addSizeRow = (colorIdx) => {
    const copy = [...colors];
    const parentC = copy[colorIdx];
    const curSizes = parentC.details_dp033 || [];
    const maxSn = curSizes.length > 0 ? Math.max(...curSizes.map(o => o.serialno || 0)) + 1 : 1;
    
    parentC.details_dp033 = [
      ...curSizes,
      { gkey: `temp_s_${Date.now()}`, serialno: maxSn, size: '8', custpairs: 1, keeppairs: 0, finishpairs: 0 }
    ];
    setColors(copy);
    setIsDirty(true);
  };

  const updateSizeCell = (colorIdx, sizeIdx, field, val) => {
    const copy = [...colors];
    copy[colorIdx].details_dp033[sizeIdx][field] = val;
    setColors(copy);
    setIsDirty(true);
  };

  const deleteSizeRow = (colorIdx, sizeIdx) => {
    const copy = [...colors];
    const targetS = copy[colorIdx].details_dp033[sizeIdx];
    if (!targetS.gkey.startsWith('temp_')) {
      setDeletedSizes([...deletedSizes, targetS.gkey]);
    }
    copy[colorIdx].details_dp033 = copy[colorIdx].details_dp033.filter((_, i) => i !== sizeIdx);
    setColors(copy);
    setIsDirty(true);
  };

  // BOM Materials Handlers (Dp032)
  const addMaterialRow = () => {
    const maxSn = materials.length > 0 ? Math.max(...materials.map(o => o.serialno || 0)) + 1 : 1;
    setMaterials([...materials, { gkey: `temp_m_${Date.now()}`, serialno: maxSn }]);
    setIsDirty(true);
  };

  const updateMaterialCell = (idx, field, val) => {
    const copy = [...materials];
    copy[idx][field] = val;
    if (field === 'parts') {
      const pt = lookups.parts.find(p => p.parts === val);
      if (pt) copy[idx]['dp005gkey'] = pt.dp005gkey;
    }
    setMaterials(copy);
    setIsDirty(true);
  };

  const deleteMaterialRow = (idx) => {
    const target = materials[idx];
    if (!target.gkey.startsWith('temp_')) setDeletedMaterials([...deletedMaterials, target.gkey]);
    setMaterials(materials.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  // Standard Grid Handlers (Logos / Revisions / Trackers)
  const addGridRow = (grid, setter) => {
    const maxSn = grid.length > 0 ? Math.max(...grid.map(o => o.serialno || 0)) + 1 : 1;
    setter([...grid, { gkey: `temp_g_${Date.now()}`, serialno: maxSn }]);
    setIsDirty(true);
  };

  const updateGridCell = (grid, setter, idx, field, val) => {
    const copy = [...grid]; copy[idx][field] = val; setter(copy); setIsDirty(true);
  };

  const deleteGridRow = (grid, setter, delSetter, delTracker, idx) => {
    const target = grid[idx];
    if (!target.gkey.startsWith('temp_')) delSetter([...delTracker, target.gkey]);
    setter(grid.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  // ==========================================
  // 5. 📋 DEFINITION: COLUMNS SCHEMAS
  // ==========================================

  const listColumns = [
    {
      title: '樣品指令單 (Sample No)',
      dataIndex: 'sampleno',
      key: 'sampleno',
      render: (text, record) => (
        <div style={{ cursor: 'pointer' }} onClick={() => loadSampleDetails(record)}>
          <div style={{ fontWeight: 'bold', color: '#1d39c4' }}>{text}</div>
          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>型體: {record.styleno || '未設'} / 客戶: {lookups.customers.find(c => c.gkey === record.ba010gkey)?.shortname || '未設'}</div>
        </div>
      )
    },
    { 
      title: '樣品類別', 
      dataIndex: 'dp002gkey', 
      key: 'dp002gkey', 
      width: 130, 
      render: v => lookups.sampleTypes.find(s => s.gkey === v)?.samplename || '' 
    },
    { 
      title: '開單日期', 
      dataIndex: 'issuedate', 
      width: 120, 
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : '' 
    },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      width: 100, 
      render: v => {
        const mapping = { '1': '進行中', '2': '已寄出', '3': '已完成', '0': '已取消' };
        const colorsMapping = { '1': '#fa8c16', '2': '#1890ff', '3': '#52c41a', '0': '#ff4d4f' };
        return <span style={{ color: colorsMapping[v] || '#fa541c', fontWeight: 'bold' }}>{mapping[v] || '進行中'}</span>;
      }
    }
  ];

  const colorColumns = [
    { title: '顏色名稱 / 代號', dataIndex: 'color', width: 160, render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateColorCell(idx, 'color', e.target.value)} /> },
    { title: '顏色代碼', dataIndex: 'colorcode', width: 110, render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateColorCell(idx, 'colorcode', e.target.value)} /> },
    { title: '面部摘要', dataIndex: 'upper', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateColorCell(idx, 'upper', e.target.value)} /> },
    { title: '裡部摘要', dataIndex: 'lining', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateColorCell(idx, 'lining', e.target.value)} /> },
    { title: '墊腳摘要', dataIndex: 'sock', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateColorCell(idx, 'sock', e.target.value)} /> },
    { title: '大底摘要', dataIndex: 'bottom', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateColorCell(idx, 'bottom', e.target.value)} /> },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteColorRow(idx)} /> }
  ];

  const sizeExpandedRowRender = (colorRow, colorIdx) => {
    const sizesData = colorRow.details_dp033 || [];
    const nestedCols = [
      { title: 'NO', dataIndex: 'serialno', width: 60 },
      { title: '尺碼 (Size)', dataIndex: 'size', width: 120, render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateSizeCell(colorIdx, idx, 'size', e.target.value)} /> },
      { title: '客戶打樣雙數', dataIndex: 'custpairs', width: 130, render: (v, r, idx) => <InputNumber size="small" min={0} value={v} onChange={val => updateSizeCell(colorIdx, idx, 'custpairs', val || 0)} style={{ width: '100%' }} /> },
      { title: '工廠留樣雙數', dataIndex: 'keeppairs', width: 130, render: (v, r, idx) => <InputNumber size="small" min={0} value={v} onChange={val => updateSizeCell(colorIdx, idx, 'keeppairs', val || 0)} style={{ width: '100%' }} /> },
      { title: '實際寄出雙數', dataIndex: 'sentpairs', width: 130, render: (v, r, idx) => <InputNumber size="small" min={0} value={v} onChange={val => updateSizeCell(colorIdx, idx, 'sentpairs', val || 0)} style={{ width: '100%' }} /> },
      { title: '工廠完成雙數', dataIndex: 'finishpairs', width: 130, render: (v, r, idx) => <InputNumber size="small" min={0} value={v} onChange={val => updateSizeCell(colorIdx, idx, 'finishpairs', val || 0)} style={{ width: '100%' }} /> },
      { title: '生產追蹤備註說明', dataIndex: 'scheduleremark', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateSizeCell(colorIdx, idx, 'scheduleremark', e.target.value)} /> },
      { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteSizeRow(colorIdx, idx)} /> }
    ];

    return (
      <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px dashed #d9d9d9', margin: '4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}>📏 尺碼配比分佈明細 (Size Runner) for {colorRow.color || '未命名'}</span>
          <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => addSizeRow(colorIdx)}>新增打樣尺碼</Button>
        </div>
        <Table dataSource={sizesData} columns={nestedCols} size="small" rowKey="gkey" pagination={false} bordered />
      </div>
    );
  };

  const materialColumns = [
    { title: 'NO', dataIndex: 'serialno', width: 60 },
    {
      title: '部位名稱 (Parts)',
      dataIndex: 'parts',
      width: 180,
      render: (v, r, idx) => (
        <Select
          size="small" showSearch allowClear style={{ width: '100%' }}
          value={v} onChange={val => updateMaterialCell(idx, 'parts', val)}
          options={lookups.parts.map(p => ({ value: p.parts, label: p.parts }))}
        />
      )
    },
    {
      title: '部位大類',
      dataIndex: 'dp005gkey',
      width: 140,
      render: (v, r, idx) => (
        <Select
          size="small" style={{ width: '100%' }} disabled
          value={v} options={lookups.partGroups.map(g => ({ value: g.gkey, label: g.partgroup }))}
        />
      )
    },
    { title: '材料規格1 (主要)', dataIndex: 'cmaterial1', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateMaterialCell(idx, 'cmaterial1', e.target.value)} /> },
    { title: '顏色名稱', dataIndex: 'clrnm1', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateMaterialCell(idx, 'clrnm1', e.target.value)} /> },
    { title: '配色代碼', dataIndex: 'pantone1', width: 110, render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateMaterialCell(idx, 'pantone1', e.target.value)} /> },
    { title: '材料規格2 (輔助)', dataIndex: 'cmaterial2', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateMaterialCell(idx, 'cmaterial2', e.target.value)} /> },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteMaterialRow(idx)} /> }
  ];

  const logoColumns = [
    { title: 'NO', dataIndex: 'serialno', width: 60 },
    { title: '加工商標 (Logo Content)', dataIndex: 'logo', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateGridCell(logos, setLogos, idx, 'logo', e.target.value)} /> },
    { title: '設計草圖 / 加工備註描述 (Logo Sketch)', dataIndex: 'logosketch', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateGridCell(logos, setLogos, idx, 'logosketch', e.target.value)} /> },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteGridRow(logos, setLogos, setDeletedLogos, deletedLogos, idx)} /> }
  ];

  const revisionColumns = [
    { title: '版本次', dataIndex: 'serialno', width: 60 },
    { title: '大底/修改意見與履歷說明 (Bottom Modification)', dataIndex: 'bottom', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateGridCell(revisions, setRevisions, idx, 'bottom', e.target.value)} /> },
    { title: '修改圖樣/指示說明檔 (Bottom Sketch)', dataIndex: 'bottomsketch', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateGridCell(revisions, setRevisions, idx, 'bottomsketch', e.target.value)} /> },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteGridRow(revisions, setRevisions, setDeletedRevisions, deletedRevisions, idx)} /> }
  ];

  const trackerColumns = [
    { title: '序號', dataIndex: 'serialno', width: 60 },
    { title: '追蹤項目代碼', dataIndex: 'itemno', width: 130, render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateGridCell(trackers, setTrackers, idx, 'itemno', e.target.value)} /> },
    { title: '項目名稱說明', dataIndex: 'itemname', width: 180, render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateGridCell(trackers, setTrackers, idx, 'itemname', e.target.value)} /> },
    { 
      title: '執行狀態 (Status)', 
      dataIndex: 'status', 
      width: 140, 
      render: (v, r, idx) => (
        <Select 
          size="small" value={v} onChange={val => updateGridCell(trackers, setTrackers, idx, 'status', val)}
          options={[{ value: 'Y', label: '已完成 (Y)' }, { value: 'N', label: '未完成 (N)' }, { value: 'A', label: '進行中 (A)' }]}
        />
      ) 
    },
    {
      title: '追蹤責任人',
      dataIndex: 'es101gkey',
      width: 180,
      render: (v, r, idx) => (
        <Select
          size="small" showSearch allowClear style={{ width: '100%' }}
          value={v} onChange={val => updateGridCell(trackers, setTrackers, idx, 'es101gkey', val)}
          options={lookups.users.map(u => ({ value: u.gkey, label: u.englishname }))}
        />
      )
    },
    { title: '追蹤備註說明', dataIndex: 'remark', render: (v, r, idx) => <Input size="small" value={v} onChange={e => updateGridCell(trackers, setTrackers, idx, 'remark', e.target.value)} /> },
    { title: '', width: 50, render: (_, r, idx) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteGridRow(trackers, setTrackers, setDeletedTrackers, deletedTrackers, idx)} /> }
  ];

  const renderMasterDate = (field) => (
    <DatePicker
      size="small" style={{ width: '100%' }} format="YYYY-MM-DD"
      value={selectedSample?.[field] ? dayjs(selectedSample[field]) : null}
      onChange={d => updateMasterField(field, d ? d.toISOString() : null)}
    />
  );

  return (
    <div className="dp030-premium-container md-sheet-container">
      <div className="md-sheet-header">
        <Space>
          <AppstoreOutlined style={{ color: '#096dd9' }} />
          <span className="md-sheet-title">DP030 樣品指令單管理</span>
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
                {/* 🔍 查詢條件面板 (dw_where_panel) */}
                <div className="dw-where-panel">
                  <Form className="pb-query-form" layout="vertical">
                    <Row gutter={12}>
                      <Col span={4}>
                        <Form.Item label="樣品單號">
                          <Input size="small" placeholder="樣品單號模糊篩選" value={qFilters.sampleno} onChange={e => setQFilters({...qFilters, sampleno: e.target.value})} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item label="型體編號">
                          <Input size="small" placeholder="型體號篩選" value={qFilters.styleno} onChange={e => setQFilters({...qFilters, styleno: e.target.value})} />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item label="年度">
                          <Input size="small" placeholder="年度" value={qFilters.year} onChange={e => setQFilters({...qFilters, year: e.target.value})} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item label="打樣客戶">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇客戶"
                              value={lookups.customers.find(c => c.gkey === qFilters.ba010gkey)?.shortname || ''}
                              onDoubleClick={() => openF2Lookup('customers', 'qFilters.ba010gkey')}
                              readOnly
                              style={{ cursor: 'pointer' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('customers', 'qFilters.ba010gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item label="單據狀態">
                          <Select style={{ width: '100%' }} allowClear value={qFilters.status} onChange={v => setQFilters({...qFilters, status: v})} options={[{value:'1', label:'進行中'}, {value:'2', label:'已寄出'}, {value:'3', label:'已完成'}, {value:'0', label:'已取消'}]} placeholder="選擇狀態" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '20px' }}>
                          <Button type="primary" style={{ background: '#fa541c', borderColor: '#fa541c' }} icon={<SearchOutlined />} onClick={() => doQuery()}>查詢</Button>
                          <Button icon={<ReloadOutlined />} onClick={() => setQFilters({ sampleno:'', styleno:'', year:'', ba010gkey:'', ba015gkey:'', ba055gkey:'', status:'' })}>重置</Button>
                        </Space>
                      </Col>
                    </Row>
                  </Form>
                </div>

                {/* 🛠️ 清單標題 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>
                    📋 樣品開發指令單瀏覽列表
                  </span>
                </div>

                {/* 📊 資料列表網格 */}
                <div className="md-query-grid">
                  <Table 
                    size="small" 
                    bordered 
                    dataSource={sampleList} 
                    columns={listColumns} 
                    rowKey="gkey" 
                    loading={loading}
                    pagination={{ pageSize: 20, size: 'small' }} 
                    onRow={(record) => ({
                      onClick: () => loadSampleDetails(record),
                      onDoubleClick: () => loadSampleDetails(record)
                    })}
                    rowClassName={(record) => (selectedSample?.gkey === record.gkey ? 'row-active' : '')}
                  />
                </div>
              </div>
            )
          },
          {
            key: 'details',
            label: '編輯維護',
            disabled: !selectedSample,
            children: selectedSample ? (
              <div className="md-editor-shell">
                <div className="md-editor-sidebar">
                  <div className="md-editor-sidebar-header">樣品單列表</div>
                  <div className="md-editor-sidebar-list">
                    {sampleList.map(item => (
                      <div
                        key={item.gkey}
                        className={`md-editor-sidebar-item ${selectedSample?.gkey === item.gkey ? 'active' : ''}`}
                        onClick={() => loadSampleDetails(item)}
                      >
                        <div className="md-editor-sidebar-item-title">{item.sampleno || '未命名樣品單'}</div>
                        <div className="md-editor-sidebar-item-meta">{item.styleno || item.year || ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md-editor-main" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* 🏷️ 樣品單規格核心主檔 */}
                <Card size="small" title={<span className="card-title-pb"><AppstoreOutlined /> 🏷️ 樣品指令主規格規格主檔 (Dp030 Master)</span>}>
                  <Form className="pb-form" layout="horizontal">
                    <Row gutter={12}>
                      <Col span={6}>
                        <Form.Item label="樣品單號" required>
                          <Input size="small" disabled={!selectedSample.gkey.startsWith('temp_')} value={selectedSample.sampleno} onChange={e => updateMasterField('sampleno', e.target.value)} style={{ backgroundColor: selectedSample.gkey.startsWith('temp_') ? '#fffbe6' : '#f5f5f5' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="樣品類型">
                          <Select size="small" showSearch value={selectedSample.dp002gkey} onChange={v => updateMasterField('dp002gkey', v)} options={lookups.sampleTypes.map(s=>({ value: s.gkey, label: s.samplename || s.sampletype }))} popupMatchSelectWidth={false} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="開單年度">
                          <Input size="small" value={selectedSample.year} onChange={e => updateMasterField('year', e.target.value)} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="開發季節">
                          <Select size="small" showSearch value={selectedSample.ba055gkey} onChange={v => updateMasterField('ba055gkey', v)} options={lookups.seasons.map(s=>({ value: s.gkey, label: s.season || s.groupcode }))} popupMatchSelectWidth={false} />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Row gutter={12} style={{ marginTop: '8px' }}>
                      <Col span={6}>
                        <Form.Item label="單據狀態">
                          <Select size="small" value={selectedSample.status} onChange={v => updateMasterField('status', v)} options={[{value:'1', label:'進行中'}, {value:'2', label:'已寄出'}, {value:'3', label:'已完成'}, {value:'0', label:'已取消'}]} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="開單日期">
                          {renderMasterDate('issuedate')}
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="預計交期">
                          {renderMasterDate('duedate')}
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="要求交期">
                          {renderMasterDate('custdate')}
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12} style={{ marginTop: '8px' }}>
                      <Col span={6}>
                        <Form.Item label="型體編號" required>
                          <Input size="small" value={selectedSample.styleno} onChange={e => updateMasterField('styleno', e.target.value)} style={{ backgroundColor: '#fffbe6' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="型體名稱">
                          <Input size="small" value={selectedSample.stylename} onChange={e => updateMasterField('stylename', e.target.value)} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="關聯楦頭">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇楦頭"
                              value={lookups.lasts.find(l => l.gkey === selectedSample.dp010gkey)?.lastno || ''}
                              onDoubleClick={() => openF2Lookup('lasts', 'dp010gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('lasts', 'dp010gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="關聯大底">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇大底"
                              value={lookups.outsoles.find(o => o.gkey === selectedSample.dp015gkey)?.bottomno || ''}
                              onDoubleClick={() => openF2Lookup('outsoles', 'dp015gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('outsoles', 'dp015gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="關聯鞋跟">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇鞋跟"
                              value={lookups.heels.find(h => h.gkey === selectedSample.dp020gkey)?.heelno || ''}
                              onDoubleClick={() => openF2Lookup('heels', 'dp020gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('heels', 'dp020gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="鞋墊標籤">
                          <Select size="small" showSearch allowClear value={selectedSample.dp008gkey} onChange={v => updateMasterField('dp008gkey', v)} options={lookups.labels.map(l=>({ value: l.gkey, label: l.labelname || l.labelcode }))} popupMatchSelectWidth={false} />
                        </Form.Item>
                      </Col>
                    </Row>
 
                    <Row gutter={12} style={{ marginTop: '8px' }}>
                      <Col span={6}>
                        <Form.Item label="研發組別">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇組別"
                              value={lookups.groups.find(g => g.gkey === selectedSample.dp023gkey)?.groupname || ''}
                              onDoubleClick={() => openF2Lookup('groups', 'dp023gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('groups', 'dp023gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="產地地區">
                          <Select size="small" showSearch allowClear value={selectedSample.ba003gkey} onChange={v => updateMasterField('ba003gkey', v)} options={lookups.origins.map(o=>({ value: o.gkey, label: o.country || o.originname }))} popupMatchSelectWidth={false} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="商標品牌">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇品牌"
                              value={lookups.brands.find(b => b.gkey === selectedSample.ba009gkey)?.ebrand || ''}
                              onDoubleClick={() => openF2Lookup('brands', 'ba009gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('brands', 'ba009gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="商標印繡">
                          <Input size="small" value={selectedSample.logo} onChange={e => updateMasterField('logo', e.target.value)} placeholder="輸入印繡/商標說明" />
                        </Form.Item>
                      </Col>
                    </Row>
 
                    <Row gutter={12} style={{ marginTop: '8px' }}>
                      <Col span={6}>
                        <Form.Item label="打樣客戶">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇客戶"
                              value={lookups.customers.find(c => c.gkey === selectedSample.ba010gkey)?.shortname || ''}
                              onDoubleClick={() => openF2Lookup('customers', 'ba010gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('customers', 'ba010gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="承製工廠">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇工廠"
                              value={lookups.factories.find(f => f.gkey === selectedSample.ba015gkey)?.shortname || ''}
                              onDoubleClick={() => openF2Lookup('factories', 'ba015gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('factories', 'ba015gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="申請人員">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇申請人"
                              value={selectedSample.rqstby || ''}
                              onDoubleClick={() => openF2Lookup('users', 'rqstby')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('users', 'rqstby')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="設計人員">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇設計人"
                              value={selectedSample.designer || ''}
                              onDoubleClick={() => openF2Lookup('users', 'designer')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('users', 'designer')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                    </Row>
 
                    <Row gutter={12} style={{ marginTop: '8px' }}>
                      <Col span={6}>
                        <Form.Item label="技術人員">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇技術員"
                              value={lookups.users.find(u => u.gkey === selectedSample.es101gkey)?.englishname || ''}
                              onDoubleClick={() => openF2Lookup('users', 'es101gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('users', 'es101gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="研發主管">
                          <Space.Compact style={{ width: '100%' }}>
                            <Input
                              placeholder="雙擊選擇主管"
                              value={lookups.users.find(u => u.gkey === selectedSample.mes101gkey)?.englishname || ''}
                              onDoubleClick={() => openF2Lookup('users', 'mes101gkey')}
                              readOnly
                              style={{ cursor: 'pointer', backgroundColor: '#fafafa' }}
                            />
                            <Button icon={<SearchOutlined />} onClick={() => openF2Lookup('users', 'mes101gkey')} />
                          </Space.Compact>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="結算幣別">
                          <Select size="small" showSearch allowClear value={selectedSample.aba060gkey} onChange={v => updateMasterField('aba060gkey', v)} options={lookups.currencies.map(c=>({ value: c.gkey, label: c.currency || c.currencycode }))} popupMatchSelectWidth={false} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="預算金額">
                          <InputNumber size="small" min={0} value={selectedSample.amount} onChange={val => updateMasterField('amount', val)} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12} style={{ marginTop: '8px' }}>
                      <Col span={6}>
                        <Form.Item label="工資成本">
                          <InputNumber size="small" min={0} value={selectedSample.wagescost} onChange={val => updateMasterField('wagescost', val)} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="管理費用">
                          <InputNumber size="small" min={0} value={selectedSample.managecost} onChange={val => updateMasterField('managecost', val)} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="目標利潤">
                          <InputNumber size="small" min={0} value={selectedSample.profit} onChange={val => updateMasterField('profit', val)} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="包裝規格">
                          <Input size="small" value={selectedSample.packing} onChange={e => updateMasterField('packing', e.target.value)} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>

                {/* 🛰️ 子分頁網格 (下半部) */}
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '12px', background: '#fff', minHeight: '400px' }}>
                  <Tabs 
                    type="card"
                    size="small"
                    className="inner-detail-tabs"
                    items={[
                      {
                        key: 'colors',
                        label: '🎨 顏色配比 (Colors & Sizes)',
                        children: (
                          <div>
                            <div style={{ textAlign: 'right', marginBottom: 6 }}><Button size="small" type="primary" icon={<PlusOutlined />} onClick={addColorRow}>新增搭配顏色</Button></div>
                            <Table dataSource={colors} columns={colorColumns} rowKey="gkey" size="small" pagination={false} bordered 
                              expandable={{
                                expandedRowRender: (record, index) => sizeExpandedRowRender(record, index),
                                defaultExpandAllRows: true
                              }}
                            />
                          </div>
                        )
                      },
                      {
                        key: 'materials',
                        label: '🧵 部位材料 (Material BOM)',
                        children: (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <Button size="small" type="primary" ghost icon={<BuildOutlined />} onClick={handleCascadeAggregate}>🤖 一鍵部位彙整字串 (wf_setvalue)</Button>
                              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addMaterialRow}>新增 BOM 材料部位</Button>
                            </div>
                            <Table dataSource={materials} columns={materialColumns} rowKey="gkey" size="small" pagination={false} bordered />
                          </div>
                        )
                      },
                      {
                        key: 'logos',
                        label: '🏷️ 商標標籤 (Logos)',
                        children: (
                          <div>
                            <div style={{ textAlign: 'right', marginBottom: 6 }}><Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => addGridRow(logos, setLogos)}>新增商標標籤</Button></div>
                            <Table dataSource={logos} columns={logoColumns} rowKey="gkey" size="small" pagination={false} bordered />
                          </div>
                        )
                      },
                      {
                        key: 'revisions',
                        label: '📝 大底修改履歷 (Revisions)',
                        children: (
                          <div>
                            <div style={{ textAlign: 'right', marginBottom: 6 }}><Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => addGridRow(revisions, setRevisions)}>新增大底修改記錄</Button></div>
                            <Table dataSource={revisions} columns={revisionColumns} rowKey="gkey" size="small" pagination={false} bordered />
                          </div>
                        )
                      },
                      {
                        key: 'remarks',
                        label: '💬 工藝備註 (Remarks)',
                        children: (
                          <div style={{ padding: '12px', background: '#fafafa', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                            <Form className="pb-form materials-form" layout="vertical">
                              <Row gutter={12}>
                                <Col span={12}><Form.Item label="研發備註一 (Remark1)"><Input.TextArea size="small" rows={3} value={selectedSample.remark1} onChange={e => updateMasterField('remark1', e.target.value)} /></Form.Item></Col>
                                <Col span={12}><Form.Item label="研發備註二 (Remark2)"><Input.TextArea size="small" rows={3} value={selectedSample.remark2} onChange={e => updateMasterField('remark2', e.target.value)} /></Form.Item></Col>
                              </Row>
                              <Row gutter={12} style={{ marginTop: '8px' }}>
                                <Col span={12}><Form.Item label="研發備註三 (Remark3)"><Input.TextArea size="small" rows={3} value={selectedSample.remark3} onChange={e => updateMasterField('remark3', e.target.value)} /></Form.Item></Col>
                                <Col span={12}><Form.Item label="包裝特殊說明 (Remark4)"><Input.TextArea size="small" rows={3} value={selectedSample.remark4} onChange={e => updateMasterField('remark4', e.target.value)} /></Form.Item></Col>
                              </Row>
                            </Form>
                          </div>
                        )
                      },
                      {
                        key: 'tracker',
                        label: '⏱️ 進度控管 (Tracker)',
                        children: (
                          <div>
                            <div style={{ textAlign: 'right', marginBottom: 6 }}><Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => addGridRow(trackers, setTrackers)}>新增開發追蹤點</Button></div>
                            <Table dataSource={trackers} columns={trackerColumns} rowKey="gkey" size="small" pagination={false} bordered />
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

      {/* 🔍 F2 Lookup Pop-up Modal (Double-click / Magnifier support) */}
      <Modal
        title={
          <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SearchOutlined /> 選擇 {
              f2ModalType === 'lasts' ? '楦頭基本資料 (Lasts)' :
              f2ModalType === 'outsoles' ? '大底基本資料 (Outsoles)' :
              f2ModalType === 'heels' ? '鞋跟基本資料 (Heels)' :
              f2ModalType === 'brands' ? '品牌資料 (Brands)' :
              f2ModalType === 'customers' ? '客戶基本資料 (Customers)' :
              f2ModalType === 'factories' ? '承製工廠資料 (Factories)' :
              f2ModalType === 'groups' ? '組別資料 (Groups)' :
              f2ModalType === 'users' ? '員工技術人員資料 (Users)' : '資料'
            }
          </span>
        }
        open={f2ModalOpen}
        onCancel={() => setF2ModalOpen(false)}
        footer={null}
        width={750}
        destroyOnClose
      >
        <div style={{ marginBottom: '12px' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="輸入代碼或名稱快速檢索..."
            value={f2SearchQuery}
            onChange={e => setF2SearchQuery(e.target.value)}
            allowClear
          />
        </div>
        <Table
          size="small"
          bordered
          dataSource={
            (() => {
              const q = f2SearchQuery.toLowerCase().trim();
              let list = [];
              if (f2ModalType === 'lasts') list = lookups.lasts;
              else if (f2ModalType === 'outsoles') list = lookups.outsoles;
              else if (f2ModalType === 'heels') list = lookups.heels;
              else if (f2ModalType === 'brands') list = lookups.brands;
              else if (f2ModalType === 'customers') list = lookups.customers;
              else if (f2ModalType === 'factories') list = lookups.factories;
              else if (f2ModalType === 'groups') list = lookups.groups;
              else if (f2ModalType === 'users') list = lookups.users;

              if (!q) return list;
              return list.filter(item => {
                return (
                  (item.lastno && item.lastno.toLowerCase().includes(q)) ||
                  (item.lastcode && item.lastcode.toLowerCase().includes(q)) ||
                  (item.bottomno && item.bottomno.toLowerCase().includes(q)) ||
                  (item.outsoleno && item.outsoleno.toLowerCase().includes(q)) ||
                  (item.heelno && item.heelno.toLowerCase().includes(q)) ||
                  (item.cbrand && item.cbrand.toLowerCase().includes(q)) ||
                  (item.ebrand && item.ebrand.toLowerCase().includes(q)) ||
                  (item.custno && item.custno.toLowerCase().includes(q)) ||
                  (item.shortname && item.shortname.toLowerCase().includes(q)) ||
                  (item.factno && item.factno.toLowerCase().includes(q)) ||
                  (item.groupname && item.groupname.toLowerCase().includes(q)) ||
                  (item.groupcode && item.groupcode.toLowerCase().includes(q)) ||
                  (item.englishname && item.englishname.toLowerCase().includes(q)) ||
                  (item.chinesename && item.chinesename.toLowerCase().includes(q))
                );
              });
            })()
          }
          columns={
            f2ModalType === 'lasts' ? [
              { title: '楦頭代碼', dataIndex: 'lastcode', width: 150 },
              { title: '楦頭編號', dataIndex: 'lastno' },
              { title: '尺寸段', dataIndex: 'sizeseg', width: 120 }
            ] : f2ModalType === 'outsoles' ? [
              { title: '大底編號', dataIndex: 'bottomno' },
              { title: '大底代碼', dataIndex: 'outsoleno', width: 180 },
              { title: '模具名稱', dataIndex: 'modelname', width: 180 }
            ] : f2ModalType === 'heels' ? [
              { title: '鞋跟編號', dataIndex: 'heelno' },
              { title: '鞋跟高度', dataIndex: 'heelheight', width: 150 },
              { title: '模具名稱', dataIndex: 'modelname', width: 180 }
            ] : f2ModalType === 'brands' ? [
              { title: '品牌代號', dataIndex: 'serialno', width: 120 },
              { title: '中文品牌', dataIndex: 'cbrand', width: 220 },
              { title: '英文品牌', dataIndex: 'ebrand' }
            ] : f2ModalType === 'customers' ? [
              { title: '客戶代號', dataIndex: 'custno', width: 150 },
              { title: '客戶簡稱', dataIndex: 'shortname', width: 200 },
              { title: '英文全稱', dataIndex: 'englishname' }
            ] : f2ModalType === 'factories' ? [
              { title: '工廠代號', dataIndex: 'factno', width: 150 },
              { title: '工廠簡稱', dataIndex: 'shortname', width: 200 },
              { title: '英文全稱', dataIndex: 'englishname' }
            ] : f2ModalType === 'groups' ? [
              { title: '組別代號', dataIndex: 'groupcode', width: 150 },
              { title: '組別名稱', dataIndex: 'groupname' }
            ] : f2ModalType === 'users' ? [
              { title: '英文姓名', dataIndex: 'englishname', width: 180 },
              { title: '中文姓名', dataIndex: 'chinesename', width: 180 },
              { title: '電子郵件', dataIndex: 'email' }
            ] : []
          }
          rowKey="gkey"
          pagination={{ pageSize: 8, size: 'small' }}
          onRow={record => ({
            onDoubleClick: () => handleF2Select(record)
          })}
          rowClassName="row-clickable"
          locale={{ emptyText: '無匹配的檢索結果' }}
        />
      </Modal>

      <style>{`
        .dp030-premium-container {
          padding: 8px 12px;
          height: 100vh;
          width: 100% !important;
          display: flex;
          flex-direction: column;
          background: #f1f5f9;
        }

        .dp030-premium-container,
        .dp030-premium-container * {
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
          width: 85px !important;
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
        .dp030-premium-container .ant-table-thead > tr > th {
          padding: 6px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          background: #f8fafc !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }

        .dp030-premium-container .ant-table-tbody > tr > td {
          padding: 4px 6px !important;
          font-size: 11px !important;
        }

        /* Inline Table Editors */
        .dp030-premium-container .ant-table-tbody .ant-input,
        .dp030-premium-container .ant-table-tbody .ant-input-number,
        .dp030-premium-container .ant-table-tbody .ant-select-selector,
        .dp030-premium-container .ant-table-tbody .ant-picker {
          height: 26px !important;
          font-size: 11px !important;
          padding: 0 4px !important;
        }

        .dp030-premium-container .ant-table-tbody .ant-btn {
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
