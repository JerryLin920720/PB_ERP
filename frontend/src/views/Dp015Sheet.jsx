import React, { useState, useEffect } from 'react';
import { Table, Form, Input, Button, Select, Space, Tabs, Row, Col, Card, message, DatePicker, Checkbox, InputNumber, Tag, Divider, Popconfirm, Typography, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined, EditOutlined, FileImageOutlined, BlockOutlined, DoubleLeftOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import './MdSheetLayout.css';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Text } = Typography;

const API_BASE = window.API_BASE || 'http://localhost:8001/api';

function LookupField({ value, onChange, placeholder, type, lookupList, openLookup, disabled }) {
  const displayVal = lookupList.find(item => item.gkey === value)?.shortname || 
                     lookupList.find(item => item.gkey === value)?.lastno || 
                     lookupList.find(item => item.gkey === value)?.groupcode || 
                     lookupList.find(item => item.gkey === value)?.gender || 
                     lookupList.find(item => item.gkey === value)?.currencyno || 
                     '';
  return (
    <Input
      readOnly
      placeholder={placeholder}
      className="editable-cell-pb"
      value={displayVal}
      disabled={disabled}
      onDoubleClick={() => {
        if (!disabled) {
          openLookup(type, (selected) => {
            if (onChange) onChange(selected.gkey);
          });
        }
      }}
      suffix={
        <SearchOutlined 
          style={{ color: disabled ? '#cbd5e1' : '#096dd9', cursor: disabled ? 'not-allowed' : 'pointer' }} 
          onClick={() => {
            if (!disabled) {
              openLookup(type, (selected) => {
                if (onChange) onChange(selected.gkey);
              });
            }
          }} 
        />
      }
    />
  );
}

export default function Dp015Sheet() {
  const [form] = Form.useForm();
  const [entities, setEntities] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1'); 
  const [detailTabKey, setDetailTabKey] = useState('1'); 
  const [qFilters, setQFilters] = useState({ bottomno: '', bottomname: '', year: '', ba010gkey: null, ba015gkey: null });

  const [dp016List, setDp016List] = useState([]); 
  const [dp017List, setDp017List] = useState([]); 
  const [dp018List, setDp018List] = useState([]); 

  const [activeDp017, setActiveDp017] = useState(null); 

  const [lookupState, setLookupState] = useState({
    visible: false,
    type: '', 
    searchText: '',
    callback: null
  });

  const openLookup = (type, callback) => {
    setLookupState({
      visible: true,
      type,
      searchText: '',
      callback
    });
  };

  const [customers, setCustomers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [genders, setGenders] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [lasts, setLasts] = useState([]);

  const fetchLookups = async () => {
    try {
      const [resCust, resSeas, resSup, resGen, resCur, resLast] = await Promise.all([
        axios.get(`${API_BASE}/ba010/`),
        axios.get(`${API_BASE}/ba055/`),
        axios.get(`${API_BASE}/ba015/`),
        axios.get(`${API_BASE}/dp004/`),
        axios.get(`${API_BASE}/ba060/`),
        axios.get(`${API_BASE}/dp010/`)
      ]);
      setCustomers(resCust.data);
      setSeasons(resSeas.data);
      setSuppliers(resSup.data);
      setGenders(resGen.data);
      setCurrencies(resCur.data);
      setLasts(resLast.data);
    } catch (e) {
      message.error('關聯欄位字典加載失敗');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/dp015/`, { params: qFilters });
      setEntities(res.data);
      if (res.data.length > 0 && !selectedMaster) {
        loadDetail(res.data[0]);
      }
    } catch (e) {
      message.error('大底列表加載失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchData();
  }, []);

  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp015') {
        if (action === 'retrieve') fetchData();
        else if (action === 'edit') { setIsEditing(true); setActiveTab('2'); }
        else if (action === 'insert') handleAdd();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [entities, selectedMaster, dp016List, dp017List, dp018List, isEditing]);

  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === 'dp015' && params.bottomno) {
        setQFilters(prev => ({ ...prev, bottomno: params.bottomno }));
        setLoading(true);
        axios.get(`${API_BASE}/dp015/`, { params: { bottomno: params.bottomno } })
          .then(res => {
            setEntities(res.data);
            if (res.data.length > 0) {
              loadDetail(res.data[0]);
              setActiveTab('2');
            }
          })
          .finally(() => setLoading(false));
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, []);

  const loadDetail = async (record) => {
    setSelectedMaster(record);
    setIsEditing(false);
    form.setFieldsValue({
      ...record,
      molddate: record.molddate ? dayjs(record.molddate) : null
    });

    try {
      const [res16, res17, res18] = await Promise.all([
        axios.get(`${API_BASE}/dp016/?dp015gkey=${record.gkey}`),
        axios.get(`${API_BASE}/dp017/?dp015gkey=${record.gkey}`),
        axios.get(`${API_BASE}/dp018/?dp015gkey=${record.gkey}`)
      ]);
      setDp016List(res16.data);
      setDp017List(res17.data);
      setDp018List(res18.data);
      setActiveDp017(res17.data[0] || null);
    } catch (e) {
      message.error('載入大底子表細節失敗');
    }
  };

  const handleAdd = () => {
    const newM = {
      gkey: `temp_${Date.now()}`,
      bottomno: '',
      bottomname: '',
      year: dayjs().format('YYYY'),
      ba055gkey: seasons[0]?.gkey || '',
      adopted: 'N',
      photopath: '',
      remark: ''
    };
    setSelectedMaster(newM);
    setDp016List([]);
    setDp017List([]);
    setDp018List([]);
    setActiveDp017(null);
    setIsEditing(true);
    setActiveTab('2');
    form.resetFields();
    form.setFieldsValue({
      year: newM.year,
      ba055gkey: newM.ba055gkey,
      molddate: dayjs(),
      adopted: 'N'
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const mPayload = {
        ...values,
        gkey: selectedMaster.gkey,
        molddate: values.molddate ? values.molddate.toISOString() : null
      };

      setLoading(true);
      const response = await axios.post(`${API_BASE}/dp015/deep_save/`, {
        master: mPayload,
        molds: dp016List,
        costs: dp017List,
        sizes: dp018List
      });

      if (response.data.success) {
        message.success('大底主從明細原子儲存成功！');
        setIsEditing(false);
        const savedGkey = response.data.gkey;
        const res = await axios.get(`${API_BASE}/dp015/`, { params: qFilters });
        setEntities(res.data);
        const updated = res.data.find(e => e.gkey === savedGkey);
        if (updated) {
          loadDetail(updated);
        } else if (res.data.length > 0) {
          loadDetail(res.data[0]);
        }
      } else {
        message.error('儲存失敗: ' + response.data.detail);
      }
    } catch (e) {
      const errorMsg = e.response?.data?.detail || e.message || '請確認必填欄位！';
      message.error('儲存失敗: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMaster) return;
    if (selectedMaster.gkey.startsWith('temp_')) {
      setSelectedMaster(null);
      setDp016List([]);
      setDp017List([]);
      setDp018List([]);
      setActiveDp017(null);
      setIsEditing(false);
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/dp015/${selectedMaster.gkey}/`);
      message.success('大底及關聯子表明細已成功級聯刪除！');
      setSelectedMaster(null);
      setIsEditing(false);
      await fetchData();
      setActiveTab('1');
    } catch (e) {
      message.error('大底刪除失敗: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const calcSizeRun = (start, fullhalf, end, max) => {
    const connector = fullhalf === '1' ? '-' : (fullhalf === '2' ? '＼' : '&');
    return `${start || ''}${connector}${max || end || ''}`;
  };

  const updateDp016 = (idx, field, val) => {
    const list = [...dp016List];
    list[idx][field] = val;
    if (['startsize', 'fullhalf', 'endsize', 'maxsize'].includes(field)) {
      list[idx].sizerun = calcSizeRun(list[idx].startsize, list[idx].fullhalf, list[idx].endsize, list[idx].maxsize);
    }
    setDp016List(list);
  };

  const addDp016Row = () => {
    const newRow = {
      gkey: `temp_16_${Date.now()}`,
      serialno: dp016List.length + 1,
      dp015gkey: selectedMaster.gkey,
      material: '',
      size: '',
      sizerun: '',
      startsize: 5.0,
      fullhalf: '2', 
      endsize: 10.0,
      maxsize: null,
      moldcharge: 0,
      price: 0
    };
    newRow.sizerun = calcSizeRun(newRow.startsize, newRow.fullhalf, newRow.endsize, newRow.maxsize);
    setDp016List([...dp016List, newRow]);
  };

  const addDp017Row = () => {
    const newRow = {
      gkey: `temp_17_${Date.now()}`,
      serialno: dp017List.length + 1,
      dp015gkey: selectedMaster.gkey,
      dp016gkey: dp016List[0]?.gkey || null, 
      moldtype: '',
      dp004gkey: null,
      appyear: 1,
      fcpairs: 0,
      cost: 0,
      amount: 0,
      ba015gkey: null,
      ba060gkey: currencies[0]?.gkey || null,
      exrate: currencies[0]?.exrate || 1
    };
    setDp017List([...dp017List, newRow]);
    setActiveDp017(newRow);
  };

  const handleCostMoldChange = (idx, moldGkey) => {
    const list = [...dp017List];
    list[idx].dp016gkey = moldGkey;

    const moldRecord = dp016List.find(m => m.gkey === moldGkey);
    if (moldRecord) {
      list[idx].dp004gkey = moldRecord.dp004gkey;
      const start = parseFloat(moldRecord.startsize || 0);
      const end = parseFloat(moldRecord.endsize || 0);
      const max = parseFloat(moldRecord.maxsize || 0);
      const limit = max > end ? max : end;
      const fullhalf = moldRecord.fullhalf || '1';
      const step = fullhalf === '2' ? 0.5 : 1.0;

      const sizeRows = [];
      if (start > 0 && limit >= start) {
        let serial = 1;
        for (let s = start; s <= limit; s += step) {
          sizeRows.push({
            gkey: `temp_size_${Date.now()}_${s}`,
            dp015gkey: selectedMaster.gkey,
            dp016gkey: moldRecord.gkey,
            dp017gkey: list[idx].gkey,
            serialno: serial++,
            size: s.toFixed(1),
            cvalue: 0
          });
        }
      }
      const filteredSizes = dp018List.filter(s => s.dp017gkey !== list[idx].gkey);
      setDp018List([...filteredSizes, ...sizeRows]);
      list[idx].fcpairs = 0;
      list[idx].amount = 0;
    }
    setDp017List(list);
  };

  const handleSizePairsChange = (sizeGkey, pairs) => {
    const numPairs = parseFloat(pairs) || 0;
    const newSizes = dp018List.map(s => s.gkey === sizeGkey ? { ...s, cvalue: numPairs } : s);
    setDp018List(newSizes);

    const activeSizes = newSizes.filter(s => s.dp017gkey === activeDp017?.gkey);
    const totalPairs = activeSizes.reduce((sum, s) => sum + (parseFloat(s.cvalue) || 0), 0);

    const updatedCosts = dp017List.map(c => {
      if (c.gkey === activeDp017?.gkey) {
        const costVal = parseFloat(c.cost) || 0;
        return { ...c, fcpairs: totalPairs, amount: totalPairs * costVal };
      }
      return c;
    });
    setDp017List(updatedCosts);
  };

  const filteredEntities = entities.filter(i => 
    (!qFilters.bottomno || i.bottomno.toLowerCase().includes(qFilters.bottomno.toLowerCase())) &&
    (!qFilters.bottomname || (i.bottomname || '').toLowerCase().includes(qFilters.bottomname.toLowerCase())) &&
    (!qFilters.year || i.year === qFilters.year) &&
    (!qFilters.ba010gkey || i.ba010gkey === qFilters.ba010gkey) &&
    (!qFilters.ba015gkey || i.ba015gkey === qFilters.ba015gkey)
  );

  const SearchTab = (
    <div className="search-tab-content md-query-panel">
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div className="dw-where-panel">
            <Form layout="vertical" size="small" className="pb-form">
              <Row gutter={8} align="bottom">
                <Col span={5}>
                  <Form.Item label="大底編號" style={{ marginBottom: 0 }}>
                    <Input placeholder="輸入編號..." value={qFilters.bottomno} onChange={e => setQFilters({ ...qFilters, bottomno: e.target.value })} />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item label="大底名稱" style={{ marginBottom: 0 }}>
                    <Input placeholder="輸入名稱..." value={qFilters.bottomname} onChange={e => setQFilters({ ...qFilters, bottomname: e.target.value })} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item label="年度" style={{ marginBottom: 0 }}>
                    <Input placeholder="如 2026..." value={qFilters.year} onChange={e => setQFilters({ ...qFilters, year: e.target.value })} />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item label="客戶" style={{ marginBottom: 0 }}>
                    <Select allowClear showSearch optionFilterProp="label" value={qFilters.ba010gkey} onChange={v => setQFilters({ ...qFilters, ba010gkey: v })} options={customers.map(c => ({ value: c.gkey, label: c.shortname }))} />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item label="主要廠商" style={{ marginBottom: 0 }}>
                    <Select allowClear showSearch optionFilterProp="label" value={qFilters.ba015gkey} onChange={v => setQFilters({ ...qFilters, ba015gkey: v })} options={suppliers.map(s => ({ value: s.gkey, label: s.shortname }))} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        </div>

        <div style={{ width: '220px', flexShrink: 0 }}>
          <div className="master-form-container" style={{ height: '100%', padding: '6px', background: '#fafafa', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
            <div className="form-group-title" style={{ fontSize: '11px', marginBottom: '4px' }}>大底外觀圖片</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px', minHeight: '56px' }}>
              {selectedMaster?.photopath ? (
                <img src={`/media/${selectedMaster.photopath}`} alt="大底圖片" style={{ maxWidth: '100%', maxHeight: '48px', objectFit: 'contain' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'; }} />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>無大底圖片</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="md-query-grid">
        <Table 
          size="small" bordered dataSource={filteredEntities} rowKey="gkey" pagination={{ pageSize: 15 }} loading={loading}
          onRow={record => ({
            onClick: () => loadDetail(record),
            onDoubleClick: () => { loadDetail(record); setActiveTab('2'); }
          })}
          rowClassName={r => r.gkey === selectedMaster?.gkey ? 'row-active' : ''}
          columns={[
            { title: '大底編號', dataIndex: 'bottomno', width: 160, render: v => <b>{v}</b> },
            { title: '大底名稱', dataIndex: 'bottomname' },
            { title: '年度', dataIndex: 'year', width: 80, align: 'center' },
            { title: '客戶名稱', dataIndex: 'ba010_shortname', width: 150 },
            { title: '主要廠商', dataIndex: 'ba015_shortname', width: 150 },
            { title: '採用狀態', dataIndex: 'adopted', width: 100, align: 'center', render: v => v === 'Y' ? <Tag color="success">已採用</Tag> : <Tag color="default">未採用</Tag> }
          ]}
        />
      </div>
    </div>
  );

  return (
    <div className="dp015-premium-container md-sheet-container">
      <div className="md-sheet-header">
        <Space>
          <BlockOutlined style={{ color: '#096dd9' }} />
          <span className="md-sheet-title">DP015 大底基本資料管理</span>
          <Divider type="vertical" />
          <Tag color={isEditing ? 'orange' : 'blue'}>{isEditing ? 'EDITING' : 'VIEWING'}</Tag>
        </Space>
        <span className="md-sheet-version">PB Master-Detail Parity v3.2</span>
      </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" className="md-sheet-tabs">
          <TabPane tab="查詢列表" key="1">{SearchTab}</TabPane>
          <TabPane tab="編輯維護" key="2">
            <div className="md-editor-shell">
              <div className="md-editor-sidebar">
                <div className="md-editor-sidebar-header">大底列表</div>
                <div className="md-editor-sidebar-list">
                  {entities.map(item => (
                    <div 
                      key={item.gkey} 
                      className={`md-editor-sidebar-item ${selectedMaster?.gkey === item.gkey ? 'active' : ''}`}
                      onClick={() => loadDetail(item)}
                    >
                      <div className="md-editor-sidebar-item-title">{item.bottomno || '(未命名)'}</div>
                      <div className="md-editor-sidebar-item-meta">{item.bottomname || item.year || ''}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md-editor-main">
                <div className="editor-parity-layout">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div className="master-form-container" style={{ height: '100%' }}>
                    <Form form={form} layout="vertical" size="small" className="pb-form" disabled={!isEditing}>
                      <div className="form-group-title">主檔資料</div>
                      <Row gutter={4}>
                        <Col span={4}>
                          <Form.Item name="bottomno" label="大底編號" rules={[{ required: true, message: '不可空白' }]}>
                            <Input placeholder="大底編號" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="bottomname" label="大底名稱" rules={[{ required: true, message: '不可空白' }]}>
                            <Input placeholder="大底名稱" />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item name="ba010gkey" label="客戶對象">
                            <LookupField placeholder="雙擊選擇客戶..." type="customer" lookupList={customers} openLookup={openLookup} disabled={!isEditing} />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item name="year" label="年度">
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="ba055gkey" label="季節">
                            <LookupField placeholder="雙擊選擇季節..." type="season" lookupList={seasons} openLookup={openLookup} disabled={!isEditing} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={4}>
                        <Col span={6}>
                          <Form.Item name="molddate" label="發行日期">
                            <DatePicker style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name="ba005gkey" label="歸屬公司">
                            <Select options={[{ value: 'C001', label: 'Youngnet HQ' }]} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item name="adopted" label="已採用" valuePropName="checked" getValueProps={v => ({ checked: v === 'Y' })} getValueFromEvent={e => e.target.checked ? 'Y' : 'N'}>
                            <Checkbox>Y</Checkbox>
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item name="photopath" label="圖片路徑">
                            <Input suffix={<FileImageOutlined />} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={4}>
                        <Col span={24}>
                          <Form.Item name="remark" label="備註說明">
                            <TextArea rows={1} placeholder="大底開發備註與特別說明..." />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form>
                  </div>
                </div>

                <div style={{ width: '220px', flexShrink: 0 }}>
                  <div className="master-form-container" style={{ height: '100%', padding: '6px', background: '#fafafa', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'flex', flexDirection: 'column' }}>
                    <div className="form-group-title" style={{ fontSize: '11px', marginBottom: '4px' }}>大底外觀圖片 (uo_picroot)</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px', minHeight: '80px' }}>
                      {selectedMaster?.photopath ? (
                        <img src={`/media/${selectedMaster.photopath}`} alt="大底圖片" style={{ maxWidth: '100%', maxHeight: '72px', objectFit: 'contain' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'; }} />
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>無大底圖片</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                  <div className="detail-panel-container" style={{ marginTop: '8px' }}>
                    <Tabs activeKey={detailTabKey} onChange={setDetailTabKey} size="small" type="card" className="inner-detail-tabs">
                      <TabPane tab="大底明細資料" key="1">
                        <div className="detail-panel-header">
                          <div className="detail-panel-title">大底配模明細清單</div>
                          <div className="detail-panel-actions">
                            {isEditing && (
                              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addDp016Row}>
                                新增配模明細
                              </Button>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#0284c7', borderRadius: '50%' }}></span>
                          大底基本規格資料
                        </div>
                        <Table 
                          size="small" bordered dataSource={dp016List} rowKey="gkey" pagination={false} scroll={{ x: 1300, y: 120 }}
                          style={{ marginBottom: '8px' }}
                          columns={[
                            { title: '項次', dataIndex: 'serialno', width: 50, align: 'center', fixed: 'left' },
                            { title: '底廠', dataIndex: 'bmba015gkey', width: 140, render: (v, r, idx) => isEditing ? (
                              <LookupField value={v} onChange={val => {
                                updateDp016(idx, 'bmba015gkey', val);
                                const list = [...dp016List];
                                list[idx].bottom_fty_name = suppliers.find(s => s.gkey === val)?.shortname || '';
                                setDp016List(list);
                              }} placeholder="雙擊選擇底廠..." type="supplier" lookupList={suppliers} openLookup={openLookup} />
                            ) : (r.bottom_fty_name || '-') },
                            { title: '模具廠', dataIndex: 'mdba015gkey', width: 140, render: (v, r, idx) => isEditing ? (
                              <LookupField value={v} onChange={val => {
                                updateDp016(idx, 'mdba015gkey', val);
                                const list = [...dp016List];
                                list[idx].mold_fty_name = suppliers.find(s => s.gkey === val)?.shortname || '';
                                setDp016List(list);
                              }} placeholder="雙擊選擇模具廠..." type="supplier" lookupList={suppliers} openLookup={openLookup} />
                            ) : (r.mold_fty_name || '-') },
                            { title: '材料材料說明', dataIndex: 'material', width: 160, render: (v, r, idx) => isEditing ? <Input className="editable-cell-pb" size="small" value={v} onChange={e => updateDp016(idx, 'material', e.target.value)} /> : v },
                            { title: '楦頭編號', dataIndex: 'dp010gkey', width: 140, render: (v, r, idx) => isEditing ? (
                              <LookupField value={v} onChange={val => {
                                updateDp016(idx, 'dp010gkey', val);
                                const list = [...dp016List];
                                list[idx].last_no = lasts.find(l => l.gkey === val)?.lastno || '';
                                setDp016List(list);
                              }} placeholder="雙擊選擇楦頭..." type="last" lookupList={lasts} openLookup={openLookup} />
                            ) : (r.last_no || '-') },
                            { title: '基準碼', dataIndex: 'size', width: 90, render: (v, r, idx) => isEditing ? <Input className="editable-cell-pb" size="small" value={v} onChange={e => updateDp016(idx, 'size', e.target.value)} /> : v },
                            { title: '起始碼', dataIndex: 'startsize', width: 85, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'startsize', val)} /> : v },
                            { title: '全半碼', dataIndex: 'fullhalf', width: 75, render: (v, r, idx) => isEditing ? <Select className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'fullhalf', val)} options={[{ value: '1', label: '全碼' }, { value: '2', label: '半碼' }, { value: '3', label: '連號' }]} /> : (v === '1' ? '全' : v === '2' ? '半' : '連') },
                            { title: '結束碼', dataIndex: 'endsize', width: 85, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'endsize', val)} /> : v },
                            { title: '最大碼', dataIndex: 'maxsize', width: 85, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'maxsize', val)} /> : v },
                            { title: 'SizeRun(展開)', dataIndex: 'sizerun', width: 140, render: v => <span style={{ color: '#096dd9', fontWeight: 'bold' }}>{v}</span> },
                            {
                              title: '刪除', width: 70, align: 'center', fixed: 'right',
                              render: (_, __, idx) => isEditing ? (
                                <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => setDp016List(dp016List.filter((_, i) => i !== idx))} />
                              ) : '-'
                            }
                          ]}
                        />

                        <div style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#0284c7', borderRadius: '50%' }}></span>
                          大底費用與工程開發狀態
                        </div>
                        <Table 
                          size="small" bordered dataSource={dp016List} rowKey="gkey" pagination={false} scroll={{ x: 1200, y: 120 }}
                          columns={[
                            { title: '項次', dataIndex: 'serialno', width: 50, align: 'center', fixed: 'left' },
                            { title: '開模費', dataIndex: 'moldcharge', width: 110, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'moldcharge', val)} /> : v },
                            { title: '大底單價', dataIndex: 'price', width: 100, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'price', val)} /> : v },
                            { title: '大底單價2', dataIndex: 'price1', width: 100, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'price1', val)} /> : v },
                            { title: '大底單價3', dataIndex: 'price2', width: 100, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'price2', val)} /> : v },
                            { title: '大底單價4', dataIndex: 'price3', width: 100, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => updateDp016(idx, 'price3', val)} /> : v },
                            { title: '性別', dataIndex: 'dp004gkey', width: 110, render: (v, r, idx) => isEditing ? (
                              <LookupField value={v} onChange={val => {
                                updateDp016(idx, 'dp004gkey', val);
                                const list = [...dp016List];
                                list[idx].gender_name = genders.find(g => g.gkey === val)?.gender || '';
                                setDp016List(list);
                              }} placeholder="雙擊選擇性別..." type="gender" lookupList={genders} openLookup={openLookup} />
                            ) : (r.gender_name || '-') },
                            { title: '量產廠', dataIndex: 'apba015gkey', width: 140, render: (v, r, idx) => isEditing ? (
                              <LookupField value={v} onChange={val => {
                                updateDp016(idx, 'apba015gkey', val);
                                const list = [...dp016List];
                                list[idx].prod_fty_name = suppliers.find(s => s.gkey === val)?.shortname || '';
                                setDp016List(list);
                              }} placeholder="雙擊選擇量產廠..." type="supplier" lookupList={suppliers} openLookup={openLookup} />
                            ) : (r.prod_fty_name || '-') },
                            { title: '配件裝配廠', dataIndex: 'asba015gkey', width: 140, render: (v, r, idx) => isEditing ? (
                              <LookupField value={v} onChange={val => {
                                updateDp016(idx, 'asba015gkey', val);
                                const list = [...dp016List];
                                list[idx].assembly_fty_name = suppliers.find(s => s.gkey === val)?.shortname || '';
                                setDp016List(list);
                              }} placeholder="雙擊選擇裝配廠..." type="supplier" lookupList={suppliers} openLookup={openLookup} />
                            ) : (r.assembly_fty_name || '-') },
                            { title: '試模OK狀態', dataIndex: 'testmoldok', width: 120, render: (v, r, idx) => isEditing ? <Input className="editable-cell-pb" size="small" value={v} onChange={e => updateDp016(idx, 'testmoldok', e.target.value)} /> : v },
                            { title: '工程圖OK', dataIndex: 'cfmphotook', width: 120, render: (v, r, idx) => isEditing ? <Input className="editable-cell-pb" size="small" value={v} onChange={e => updateDp016(idx, 'cfmphotook', e.target.value)} /> : v }
                          ]}
                        />
                      </TabPane>

                      <TabPane tab="模具費用分攤與尺碼" key="2">
                        <div className="detail-panel-header">
                          <div className="detail-panel-title">模具費用攤提與尺寸配量</div>
                          <div className="detail-panel-actions">
                            {isEditing && (
                              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addDp017Row}>
                                新增費用攤提
                              </Button>
                            )}
                          </div>
                        </div>
                        <Row gutter={8}>
                          <Col span={17}>
                            <Table 
                              size="small" bordered dataSource={dp017List} rowKey="gkey" pagination={false} scroll={{ y: 220 }}
                              onRow={record => ({ onClick: () => setActiveDp017(record) })}
                              rowClassName={r => r.gkey === activeDp017?.gkey ? 'row-active' : ''}
                              columns={[
                                { title: '序號', dataIndex: 'serialno', width: 50, align: 'center' },
                                { title: '對應明細項次', dataIndex: 'dp016gkey', width: 120, render: (v, r, idx) => isEditing ? <Select className="editable-cell-pb" size="small" value={v} onChange={val => handleCostMoldChange(idx, val)} options={dp016List.map(m => ({ value: m.gkey, label: `明細#${m.serialno}` }))} /> : (dp016List.find(m=>m.gkey===v)?.serialno ? `明細#${dp016List.find(m=>m.gkey===v).serialno}` : '-') },
                                { title: 'MoldType', dataIndex: 'moldtype', width: 85, render: (v, r, idx) => isEditing ? <Input className="editable-cell-pb" size="small" maxLength={1} value={v} onChange={e => { const l=[...dp017List]; l[idx].moldtype=e.target.value.toUpperCase(); setDp017List(l); }} /> : v },
                                { title: '性別', dataIndex: 'dp004gkey', width: 90, render: (v, r, idx) => isEditing ? (
                                  <LookupField value={v} onChange={val => {
                                    const l = [...dp017List];
                                    l[idx].dp004gkey = val;
                                    l[idx].gender_name = genders.find(g => g.gkey === val)?.gender || '';
                                    setDp017List(l);
                                  }} placeholder="雙擊選擇..." type="gender" lookupList={genders} openLookup={openLookup} />
                                ) : (r.gender_name || '-') },
                                { title: '攤提廠商', dataIndex: 'ba015gkey', width: 120, render: (v, r, idx) => isEditing ? (
                                  <LookupField value={v} onChange={val => {
                                    const l = [...dp017List];
                                    l[idx].ba015gkey = val;
                                    l[idx].factory_name = suppliers.find(s => s.gkey === val)?.shortname || '';
                                    setDp017List(l);
                                  }} placeholder="雙擊選擇廠商..." type="supplier" lookupList={suppliers} openLookup={openLookup} />
                                ) : (r.factory_name || '-') },
                                { title: '幣別', dataIndex: 'ba060gkey', width: 80, render: (v, r, idx) => isEditing ? (
                                  <LookupField value={v} onChange={val => {
                                    const l = [...dp017List];
                                    l[idx].ba060gkey = val;
                                    const cur = currencies.find(c => c.gkey === val);
                                    if (cur) {
                                      l[idx].exrate = cur.exrate;
                                      l[idx].currency_name = cur.currencyno;
                                    }
                                    setDp017List(l);
                                  }} placeholder="雙擊..." type="currency" lookupList={currencies} openLookup={openLookup} />
                                ) : (r.currency_name || '-') },
                                { title: '匯率', dataIndex: 'exrate', width: 80, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => { const l=[...dp017List]; l[idx].exrate=val; setDp017List(l); }} /> : v },
                                { title: '對數(合計)', dataIndex: 'fcpairs', width: 85, render: v => <span style={{ fontWeight: 'bold' }}>{v || 0}</span> },
                                { title: '單對成本', dataIndex: 'cost', width: 90, render: (v, r, idx) => isEditing ? <InputNumber className="editable-cell-pb" size="small" value={v} onChange={val => { const l=[...dp017List]; l[idx].cost=val; l[idx].amount=(val||0)*(l[idx].fcpairs||0); setDp017List(l); }} /> : v },
                                { title: '攤提總額', dataIndex: 'amount', width: 100, render: v => <span style={{ color: 'red', fontWeight: 'bold' }}>{v ? parseFloat(v).toFixed(2) : '0.00'}</span> },
                                {
                                  title: '刪除', width: 60, align: 'center',
                                  render: (_, __, idx) => isEditing ? (
                                    <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => {
                                      const deleted = dp017List[idx];
                                      setDp017List(dp017List.filter((_, i) => i !== idx));
                                      setDp018List(dp018List.filter(s => s.dp017gkey !== deleted.gkey));
                                      if (activeDp017?.gkey === deleted.gkey) setActiveDp017(null);
                                    }} />
                                  ) : '-'
                                }
                              ]}
                            />
                          </Col>
                          <Col span={7}>
                            <Card size="small" title={`尺碼配量 - Type: ${activeDp017?.moldtype || '-'}`} style={{ borderLeft: '3px solid #096dd9' }}>
                              {!activeDp017 ? (
                                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: '11px' }}>請先選擇左側一筆費用項目</div>
                              ) : (
                                <Table 
                                  size="small" bordered dataSource={dp018List.filter(s => s.dp017gkey === activeDp017.gkey)} rowKey="gkey" pagination={false} scroll={{ y: 180 }}
                                  columns={[
                                    { title: '尺寸 (Size)', dataIndex: 'size', width: 90, align: 'center', render: v => <b>{v}</b> },
                                    { title: '對數 (Pairs)', dataIndex: 'cvalue', render: (v, r) => isEditing ? <InputNumber className="editable-cell-pb" size="small" min={0} value={v} onChange={val => handleSizePairsChange(r.gkey, val)} style={{ width: '100%' }} /> : v }
                                  ]}
                                />
                              )}
                            </Card>
                          </Col>
                        </Row>
                      </TabPane>
                    </Tabs>
                  </div>
                </div>
              </div>
            </div>
          </TabPane>
        </Tabs>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: 'bold' }}>
            <SearchOutlined />
            {lookupState.type === 'customer' && '選擇客戶視窗 (ba010)'}
            {lookupState.type === 'supplier' && '選擇廠商視窗 (ba015)'}
            {lookupState.type === 'last' && '選擇楦頭視窗 (dp010)'}
            {lookupState.type === 'season' && '選擇季節視窗 (ba055)'}
            {lookupState.type === 'gender' && '選擇性別視窗 (dp004)'}
            {lookupState.type === 'currency' && '選擇幣別視窗 (ba060)'}
          </div>
        }
        open={lookupState.visible}
        onCancel={() => setLookupState(prev => ({ ...prev, visible: false }))}
        footer={[
          <Button key="cancel" size="small" onClick={() => setLookupState(prev => ({ ...prev, visible: false }))}>
            取消 (Cancel)
          </Button>
        ]}
        width={700}
        styles={{ body: { padding: '12px' } }}
        destroyOnClose
      >
        <div style={{ marginBottom: '8px' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="請輸入關鍵字快速搜尋..."
            value={lookupState.searchText}
            onChange={e => setLookupState(prev => ({ ...prev, searchText: e.target.value }))}
            allowClear
            autoFocus
            size="middle"
            style={{ borderRadius: '4px' }}
          />
        </div>

        <Table
          size="small"
          bordered
          rowKey="gkey"
          pagination={{ pageSize: 8, showSizeChanger: false, size: 'small' }}
          dataSource={
            lookupState.type === 'customer' ? customers.filter(c => 
              (c.customerno || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (c.shortname || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (c.fullname || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) :
            lookupState.type === 'supplier' ? suppliers.filter(s => 
              (s.factoryno || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (s.shortname || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (s.fullname || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) :
            lookupState.type === 'last' ? lasts.filter(l => 
              (l.lastno || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (l.remark || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) :
            lookupState.type === 'season' ? seasons.filter(s => 
              (s.groupcode || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) :
            lookupState.type === 'gender' ? genders.filter(g => 
              (g.gender || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) :
            lookupState.type === 'currency' ? currencies.filter(c => 
              (c.currencyno || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) : []
          }
          columns={
            lookupState.type === 'customer' ? [
              { title: '客戶代碼', dataIndex: 'customerno', width: 120, sorter: (a, b) => (a.customerno || '').localeCompare(b.customerno || '') },
              { title: '客戶簡稱', dataIndex: 'shortname', width: 180, sorter: (a, b) => (a.shortname || '').localeCompare(b.shortname || '') },
              { title: '客戶全稱', dataIndex: 'fullname', ellipsis: true }
            ] :
            lookupState.type === 'supplier' ? [
              { title: '廠商代碼', dataIndex: 'factoryno', width: 120, sorter: (a, b) => (a.factoryno || '').localeCompare(b.factoryno || '') },
              { title: '廠商簡稱', dataIndex: 'shortname', width: 180, sorter: (a, b) => (a.shortname || '').localeCompare(b.shortname || '') },
              { title: '廠商全稱', dataIndex: 'fullname', ellipsis: true }
            ] :
            lookupState.type === 'last' ? [
              { title: '楦頭編號', dataIndex: 'lastno', width: 180, sorter: (a, b) => (a.lastno || '').localeCompare(b.lastno || '') },
              { title: '楦頭年度', dataIndex: 'year', width: 100, sorter: (a, b) => (a.year || '').localeCompare(b.year || '') },
              { title: '說明/備註', dataIndex: 'remark', ellipsis: true }
            ] :
            lookupState.type === 'season' ? [
              { title: '季節代碼', dataIndex: 'groupcode', sorter: (a, b) => (a.groupcode || '').localeCompare(b.groupcode || '') }
            ] :
            lookupState.type === 'gender' ? [
              { title: '性別名稱', dataIndex: 'gender', sorter: (a, b) => (a.gender || '').localeCompare(b.gender || '') }
            ] :
            lookupState.type === 'currency' ? [
              { title: '幣別代碼', dataIndex: 'currencyno', width: 250, sorter: (a, b) => (a.currencyno || '').localeCompare(b.currencyno || '') },
              { title: '匯率', dataIndex: 'exrate', sorter: (a, b) => (a.exrate || 0) - (b.exrate || 0) }
            ] : []
          }
          onRow={record => ({
            onDoubleClick: () => {
              if (lookupState.callback) {
                lookupState.callback(record);
              }
              setLookupState(prev => ({ ...prev, visible: false }));
            },
            style: { cursor: 'pointer' }
          })}
        />
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
          * 💡 提示：雙擊任意資料列即可完成選擇並帶回欄位。
        </div>
      </Modal>

      <style>{`
        .dp015-premium-container {
          padding: 8px 12px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f1f5f9;
        }

        .mdi-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          margin-bottom: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .mdi-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .mdi-body .ant-tabs {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .mdi-body .ant-tabs-content {
          flex: 1;
          overflow: auto;
        }

        .search-tab-content {
          padding: 12px;
        }

        .query-panel-v2 {
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          margin-bottom: 12px;
        }

        .filter-label {
          font-size: 11px;
          color: #475569;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .editor-master-layout {
          display: flex;
          height: calc(100vh - 120px);
          overflow: hidden;
        }

        .editor-sidebar {
          width: 180px;
          border-right: 1px solid #cbd5e1;
          display: flex;
          flex-direction: column;
          flex: 0 0 auto;
          background: #f8fafc;
        }

        .sidebar-header {
          padding: 5px 8px;
          background: #e0f2fe;
          color: #0369a1;
          font-weight: bold;
          border-bottom: 1px solid #cbd5e1;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
        }

        .sidebar-item {
          padding: 5px 8px;
          border-bottom: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
          color: #334155;
          font-size: 11px;
        }

        .sidebar-item:hover {
          background: #f1f5f9;
        }

        .sidebar-item.active {
          background: #e0f2fe;
          color: #0284c7;
          border-right: 3px solid #0284c7;
          font-weight: 600;
        }

        .editor-main-content {
          flex: 1;
          overflow-y: auto;
          background: #ffffff;
          padding: 12px;
        }

        .editor-parity-layout {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .master-form-container {
          background: #fafafa;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 12px;
        }

        .form-group-title {
          font-size: 12px;
          font-weight: 700;
          color: #1e3a8a;
          margin-bottom: 8px;
          border-left: 3px solid #1e3a8a;
          padding-left: 6px;
        }

        .pb-form .ant-form-item {
          margin-bottom: 4px !important;
        }
        .pb-form .ant-form-item-label {
          padding: 0 0 2px !important;
        }
        .pb-form .ant-form-item-label label {
          font-size: 12px !important;
          color: #595959 !important;
          height: 18px !important;
          line-height: 18px !important;
        }
        .pb-form .ant-input,
        .pb-form .ant-input-number,
        .pb-form .ant-select-selector,
        .pb-form .ant-picker {
          font-size: 13px !important;
          height: 28px !important;
          padding: 2px 8px !important;
          border-radius: 0 !important;
          border-color: #d9d9d9 !important;
          line-height: 24px !important;
        }
        .pb-form .ant-select-selection-item {
          line-height: 24px !important;
        }

        .dw-where-panel {
          background: #fff;
          padding: 8px;
          border: 1px solid #d9d9d9;
          margin-bottom: 8px;
          flex: 0 0 auto;
        }

        .detail-panel-container {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          padding: 8px 12px;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }
        .detail-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 4px;
        }
        .detail-panel-title {
          font-size: 11px;
          font-weight: 700;
          color: #1e3a8a;
          border-left: 3px solid #0284c7;
          padding-left: 6px;
        }
        .detail-panel-actions {
          display: flex;
          gap: 6px;
        }

        .inner-detail-tabs .ant-table-thead > tr > th {
          background-color: #f1f5f9 !important;
          color: #1e293b !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          padding: 6px 8px !important;
          border-bottom: 2px solid #cbd5e1 !important;
        }

        .inner-detail-tabs .ant-table-tbody > tr > td {
          padding: 4px 8px !important;
          font-size: 13px !important;
        }

        .inner-detail-tabs .ant-select-selector,
        .inner-detail-tabs .ant-input,
        .inner-detail-tabs .ant-input-number,
        .inner-detail-tabs .ant-input-number-input {
          height: 26px !important;
          font-size: 12px !important;
          padding: 2px 6px !important;
          line-height: 22px !important;
        }
        .inner-detail-tabs .ant-select-selection-item {
          line-height: 22px !important;
        }

        .row-active td {
          background-color: #f0f9ff !important;
        }

        .editable-cell-pb {
          background-color: #fffbeb !important;
          border: 1px solid #fef3c7 !important;
          border-radius: 3px;
          transition: all 0.2s;
        }
        .editable-cell-pb:focus, .editable-cell-pb-active {
          border-color: #3b82f6 !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
