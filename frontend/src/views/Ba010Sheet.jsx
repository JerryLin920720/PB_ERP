import React, { useState, useEffect } from 'react';
import { Table, Form, Input, InputNumber, Button, Select, Space, Tabs, Row, Col, Divider, Switch, message, Popconfirm, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined, UserOutlined, BankOutlined, PrinterOutlined, TagOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { TabPane } = Tabs;
const API_URL = 'http://localhost:8001/api/';

export default function Ba010Sheet() {
  const [form] = Form.useForm();

  // State for main Customer listing
  const [customers, setCustomers] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // 🔒 專屬編輯模式鎖定 (預設唯讀)
  const [sheetTabKey, setSheetTabKey] = useState('1'); // 🗂️ 原生 PB 二頁式大頁籤 (1: 查詢列表, 2: 編輯明細)
  const [loadingLeft, setLoadingLeft] = useState(false);
  
  // 🔍 Tab 1 查詢條件緩存區
  const [queryFilters, setQueryFilters] = useState({ custno: '', shortname: '', custname: '' });

  // Sub-states for the 4 Detail tab grids
  const [brands, setBrands] = useState([]);         // ba011
  const [qcs, setQcs] = useState([]);               // ba012
  const [custAccs, setCustAccs] = useState([]);     // ba013
  const [contacts, setContacts] = useState([]);     // ba014
  const [loadingSub, setLoadingSub] = useState(false);

  // Edit state trackers for sub-grids (inline)
  const [editedBrands, setEditedBrands] = useState({});
  const [editedQcs, setEditedQcs] = useState({});
  const [editedAccs, setEditedAccs] = useState({});
  const [editedContacts, setEditedContacts] = useState({});

  // FK Options Lookups
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [terms, setTerms] = useState([]);
  const [ports, setPorts] = useState([]);
  
  const [brandList, setBrandList] = useState([]);       // master ba009 lookup
  const [accList, setAccList] = useState([]);           // master ba080 lookup

  const fetchDropdowns = async () => {
    const safeGet = async (url) => {
      try {
        const res = await axios.get(url);
        return res.data;
      } catch (e) {
        console.warn(`Failed to load dictionary from ${url}:`, e);
        return [];
      }
    };

    const [resC, resCur, resP, resT, resPort, resB, resAcc] = await Promise.all([
      safeGet(`${API_URL}ba002/`),
      safeGet(`${API_URL}ba060/`),
      safeGet(`${API_URL}ba075/`),
      safeGet(`${API_URL}ba070/`),
      safeGet(`${API_URL}ba065/`),
      safeGet(`${API_URL}ba009/`),
      safeGet(`${API_URL}ba080/`)
    ]);
    
    setCountries(resC);
    setCurrencies(resCur);
    setPayments(resP);
    setTerms(resT);
    setPorts(resPort);
    setBrandList(resB);
    setAccList(resAcc);
  };

  const fetchCustomers = async () => {
    setLoadingLeft(true);
    try {
      const res = await axios.get(`${API_URL}ba010/`);
      setCustomers(res.data);
      if (res.data.length > 0 && !activeRecord) {
        handleRowSelect(res.data[0]);
      }
      setIsEditing(false); // 重新檢索自動鎖定為唯讀
      setSheetTabKey('1'); // 自動切換至「查詢列表」主頁
    } catch (err) {
      message.error('載入客戶列表失敗');
    } finally {
      setLoadingLeft(false);
    }
  };

  const fetchSubDetails = async (custGkey) => {
    setLoadingSub(true);
    try {
      const [resB, resQ, resA, resC] = await Promise.all([
        axios.get(`${API_URL}ba011/?ba010gkey=${custGkey}`),
        axios.get(`${API_URL}ba012/?ba010gkey=${custGkey}`),
        axios.get(`${API_URL}ba013/?ba010gkey=${custGkey}`),
        axios.get(`${API_URL}ba014/?ba010gkey=${custGkey}`)
      ]);
      setBrands(resB.data);
      setQcs(resQ.data);
      setCustAccs(resA.data);
      setContacts(resC.data);
      
      setEditedBrands({});
      setEditedQcs({});
      setEditedAccs({});
      setEditedContacts({});
    } catch (err) {
      message.error('載入明細頁籤失敗');
    } finally {
      setLoadingSub(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchCustomers();
  }, []);

  // ⚡ 全域 MDI 廣播指令接收器 (100% 物理連動頂部工具列)
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'ba010') {
        console.log(`⚡ [ba010] Customer Intercepted command: ${action}`);
        if (action === 'retrieve') fetchCustomers();
        else if (action === 'edit') {
          setIsEditing(true); 
          setSheetTabKey('2'); 
        }
        else if (action === 'insert') handleAdd();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [customers, activeRecord, brands, qcs, custAccs, contacts, isEditing]);

  // 📡 參數接收監聽
  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === 'ba010' && params.custno) {
        setQueryFilters(prev => ({ ...prev, custno: params.custno }));
        // Immediate fetch with params to avoid stale state
        setLoadingLeft(true);
        axios.get(`${API_URL}ba010/`, { params: { custno: params.custno } })
          .then(res => { setCustomers(res.data); if(res.data.length>0) handleRowSelect(res.data[0]); })
          .finally(() => setLoadingLeft(false));
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, []);

  const handleRowSelect = (record) => {
    setSelectedRowKeys([record.gkey]);
    setActiveRecord(record);
    form.setFieldsValue(record);
    if (!record.gkey.startsWith('temp_')) {
      fetchSubDetails(record.gkey);
    } else {
      setBrands([]);
      setQcs([]);
      setCustAccs([]);
      setContacts([]);
    }
  };

  // --- Master Actions ---
  const handleAdd = () => {
    const tempGkey = `temp_${Date.now()}`;
    const newRec = { gkey: tempGkey, custno: '', shortname: '', custname: '' };
    setCustomers([...customers, newRec]);
    setActiveRecord(newRec);
    setSelectedRowKeys([tempGkey]);
    setIsEditing(true); 
    setSheetTabKey('2'); 
    form.resetFields();
    setBrands([]);
    setQcs([]);
    setCustAccs([]);
    setContacts([]);
  };

  const handleSave = async () => {
    if (!isEditing || !activeRecord) {
      console.log('⚠️ [ba010] Not in editing mode or no active record. Skip save.');
      return;
    }
    try {
      const values = await form.validateFields();
      
      const masterPayload = {
        ...activeRecord,
        ...values
      };

      const payload = {
        master: masterPayload,
        brands: brands,
        qcs: qcs,
        accessories: custAccs,
        contacts: contacts
      };

      const res = await axios.post(`${API_URL}ba010/deep_save/`, payload);
      
      if (res.data.success) {
        message.success('客戶主從資料原子儲存成功！');
        setIsEditing(false);
        const savedGkey = res.data.gkey;
        
        // Refresh customer list
        const resList = await axios.get(`${API_URL}ba010/`);
        setCustomers(resList.data);
        
        const saved = resList.data.find(c => c.gkey === savedGkey);
        if (saved) {
          setActiveRecord(saved);
          setSelectedRowKeys([savedGkey]);
          form.setFieldsValue(saved);
          // Reload subdetails
          fetchSubDetails(savedGkey);
        }
      } else {
        message.error('儲存失敗：' + res.data.detail);
      }
    } catch (err) {
      if (err.name === 'FieldsError' || err.errorFields) {
        // Ant Design form validation error
        message.warning('請填寫必填欄位 (客戶代號與客戶簡稱)！');
        return;
      }
      message.error('儲存客戶失敗：' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
    }
  };

  const handleDelete = () => {
    if (!activeRecord) {
      message.warning('請先選擇要刪除的客戶');
      return;
    }
    Modal.confirm({
      title: '確定要刪除此客戶主檔與其所有明細資料嗎？',
      content: `客戶編號: ${activeRecord.custno} (${activeRecord.shortname})。此操作將會連同刪除所有相關的授權品牌、QC人員、客供配件及業務窗口，且無法復原！`,
      okText: '確定刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (activeRecord.gkey.startsWith('temp_')) {
          setCustomers(customers.filter(c => c.gkey !== activeRecord.gkey));
          setActiveRecord(null);
          return;
        }
        try {
          await axios.delete(`${API_URL}ba010/${activeRecord.gkey}/`);
          message.success('刪除成功');
          setActiveRecord(null);
          fetchCustomers();
        } catch (err) {
          message.error('刪除失敗');
        }
      }
    });
  };

  // --- Brand Management Inline ---
  const handleAddBrand = () => {
    const tempGkey = `temp_${Date.now()}`;
    const item = { gkey: tempGkey, ba010gkey: activeRecord.gkey, ba009gkey: '' };
    setBrands([...brands, item]);
    setEditedBrands(prev => ({ ...prev, [tempGkey]: item }));
  };

  const saveBrands = async () => {
    await handleSave();
  };

  const deleteBrand = (rec) => {
    setBrands(brands.filter(b => b.gkey !== rec.gkey));
    setEditedBrands(prev => {
      const copy = { ...prev };
      delete copy[rec.gkey];
      return copy;
    });
  };

  // --- QC Inspection Inline ---
  const handleAddQC = () => {
    const tempGkey = `temp_${Date.now()}`;
    const item = { gkey: tempGkey, ba010gkey: activeRecord.gkey, qccontact: '', tel: '', email: '' };
    setQcs([...qcs, item]);
    setEditedQcs(prev => ({ ...prev, [tempGkey]: item }));
  };

  const saveQCs = async () => {
    await handleSave();
  };

  const deleteQC = (rec) => {
    setQcs(qcs.filter(q => q.gkey !== rec.gkey));
    setEditedQcs(prev => {
      const copy = { ...prev };
      delete copy[rec.gkey];
      return copy;
    });
  };

  // --- Accessories Inline ---
  const handleAddAcc = () => {
    const tempGkey = `temp_${Date.now()}`;
    const item = { gkey: tempGkey, ba010gkey: activeRecord.gkey, ba080gkey: '', description: '', unit: '1', pairs: 0, supplytype: '1' };
    setCustAccs([...custAccs, item]);
    setEditedAccs(prev => ({ ...prev, [tempGkey]: item }));
  };

  const saveAccs = async () => {
    await handleSave();
  };

  const deleteAcc = (rec) => {
    setCustAccs(custAccs.filter(a => a.gkey !== rec.gkey));
    setEditedAccs(prev => {
      const copy = { ...prev };
      delete copy[rec.gkey];
      return copy;
    });
  };

  // --- Contacts Inline ---
  const handleAddContact = () => {
    const tempGkey = `temp_${Date.now()}`;
    const item = { gkey: tempGkey, ba010gkey: activeRecord.gkey, contact: '', department: '', jobposition: '', tel: '', email: '' };
    setContacts([...contacts, item]);
    setEditedContacts(prev => ({ ...prev, [tempGkey]: item }));
  };

  const saveContacts = async () => {
    await handleSave();
  };

  const deleteContact = (rec) => {
    setContacts(contacts.filter(c => c.gkey !== rec.gkey));
    setEditedContacts(prev => {
      const copy = { ...prev };
      delete copy[rec.gkey];
      return copy;
    });
  };

  const queryColumns = [
    { title: '客戶編號 (ID)', dataIndex: 'custno', key: 'custno', width: '130px', sorter: (a, b) => a.custno.localeCompare(b.custno) },
    { title: '客戶簡稱', dataIndex: 'shortname', key: 'shortname', width: '180px' },
    { title: '中文全稱', dataIndex: 'custname', key: 'custname' },
    { title: '英文全稱', dataIndex: 'ecustname', key: 'ecustname' },
    { 
      title: '主要幣別', 
      dataIndex: 'ba060gkey', 
      key: 'ba060gkey', 
      width: '110px',
      render: (val) => {
        const cur = currencies.find(c => c.gkey === val);
        return cur ? `${cur.currencyno}` : '-';
      }
    }
  ];

  const agentOptions = customers.filter(c => !activeRecord || c.gkey !== activeRecord.gkey).map(c => ({
    value: c.gkey,
    label: `[${c.custno}] ${c.shortname}`
  }));

  const filteredCustomers = customers.filter(c => {
    const matchNo = !queryFilters.custno || c.custno.toLowerCase().includes(queryFilters.custno.toLowerCase());
    const matchShort = !queryFilters.shortname || c.shortname.toLowerCase().includes(queryFilters.shortname.toLowerCase());
    const matchName = !queryFilters.custname || (c.custname && c.custname.toLowerCase().includes(queryFilters.custname.toLowerCase()));
    return matchNo && matchShort && matchName;
  });

  return (
    <div className="modern-sheet-container">
      <Tabs 
        type="card" 
        activeKey={sheetTabKey} 
        onChange={setSheetTabKey}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
        className="pb-sheet-root-tabs"
      >
        {/* 🚀 第一頁：查詢列表 (Tabpage 1) */}
        <TabPane tab="1. 查詢列表 (F3 檢索)" key="1" style={{ height: 'calc(100vh - 210px)', overflow: 'auto', backgroundColor: '#fff', padding: '12px', border: '1px solid #d9d9d9', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          
          <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '12px' }}>
            <Row gutter={12} align="bottom">
              <Col span={5}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>客戶編號</div>
                <Input placeholder="輸入代碼..." value={queryFilters.custno} onChange={e => setQueryFilters({...queryFilters, custno: e.target.value})} allowClear size="small"/>
              </Col>
              <Col span={5}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>客戶簡稱</div>
                <Input placeholder="輸入簡稱..." value={queryFilters.shortname} onChange={e => setQueryFilters({...queryFilters, shortname: e.target.value})} allowClear size="small"/>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>中文全稱</div>
                <Input placeholder="輸入中文全名..." value={queryFilters.custname} onChange={e => setQueryFilters({...queryFilters, custname: e.target.value})} allowClear size="small"/>
              </Col>
              <Col span={4}>
                <Button type="default" size="small" danger onClick={() => setQueryFilters({ custno: '', shortname: '', custname: '' })}>重設條件</Button>
              </Col>
            </Row>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontWeight: 600, color: '#fa8c16' }}>👞 客戶總管理名錄大主檔</h4>
            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>💡 提示：在清單列「連按兩下」，可迅速切換進入編輯細檔</span>
          </div>
          <Table
            columns={queryColumns}
            dataSource={filteredCustomers}
            rowKey="gkey"
            loading={loadingLeft}
            pagination={{ pageSize: 20, size: 'small' }}
            size="small"
            rowClassName={(record) => record.gkey === activeRecord?.gkey ? 'ant-table-row-selected' : ''}
            onRow={(record) => ({
              onClick: () => handleRowSelect(record),
              onDoubleClick: () => {
                handleRowSelect(record);
                setSheetTabKey('2');
              }
            })}
          />
        </TabPane>

        {/* 🚀 第二頁：編輯明細 (Tabpage 2) - Master On Top, Details On Bottom */}
        <TabPane tab="2. 編輯主細明細" key="2" style={{ height: 'calc(100vh - 210px)', backgroundColor: '#fff', padding: '12px', border: '1px solid #d9d9d9', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
            <h4 style={{ margin: 0, color: '#fa8c16' }}>
              🌐 維護對象: {activeRecord ? `[${activeRecord.custno || 'NEW'}] ${activeRecord.shortname || ''}` : '請回第一頁選擇資料'}
              {isEditing && <span style={{ color: '#52c41a', fontSize: '12px', marginLeft: '10px' }}>(✏️ 編輯模式開)</span>}
            </h4>
            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>💡 佈局提示：上半部為客戶主檔卡片，下半部為經營品牌、窗口等細表</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Form form={form} layout="vertical" disabled={!isEditing || !activeRecord} size="small" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              {/* 📋 MASTER SECTION (上半部) */}
              <div style={{ flexShrink: 0, padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', marginBottom: '12px', backgroundColor: '#fafafa' }}>
                <Tabs type="line" size="small" style={{ marginBottom: 0 }}>
                  <TabPane tab="基本資料與通訊" key="sub1">
                    <Row gutter={8}>
                      <Col span={4}>
                        <Form.Item name="custno" label="客戶代號" rules={[{ required: true }]} style={{ marginBottom: '4px' }}>
                          <Input maxLength={20} style={{ textTransform: 'uppercase' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="shortname" label="客戶簡稱" rules={[{ required: true }]} style={{ marginBottom: '4px' }}>
                          <Input maxLength={30} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="custname" label="中文全稱" style={{ marginBottom: '4px' }}><Input maxLength={50} /></Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="engcustname" label="英文全稱" style={{ marginBottom: '4px' }}><Input maxLength={60} /></Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="ba060gkey" label="結算幣別" style={{ marginBottom: '4px' }}>
                          <Select options={currencies.map(c => ({ value: c.gkey, label: `${c.currencyno} - ${c.currency}` }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={5}>
                        <Form.Item name="ba010gkey" label="代理商 (Agent)" style={{ marginBottom: '4px' }}>
                          <Select showSearch optionFilterProp="label" allowClear options={agentOptions} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="ba002gkey" label="所屬國家" style={{ marginBottom: '4px' }}>
                          <Select options={countries.map(c => ({ value: c.gkey, label: `${c.serialno} - ${c.ccountry}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="tel1" label="辦公電話1" style={{ marginBottom: '4px' }}><Input maxLength={40} /></Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="email" label="聯絡Email" style={{ marginBottom: '4px' }}><Input maxLength={50} /></Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="boss" label="負責人" style={{ marginBottom: '4px' }}><Input maxLength={20} /></Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item name="caddress" label="中文地址" style={{ marginBottom: '2px' }}><Input maxLength={100} /></Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="eaddress" label="英文通訊地址" style={{ marginBottom: '2px' }}><Input maxLength={2000} /></Form.Item>
                      </Col>
                    </Row>
                  </TabPane>

                  <TabPane tab="財務交易與提列比率" key="sub2">
                    <Row gutter={8}>
                      <Col span={6}>
                        <Form.Item name="ba075gkey" label="付款大類" style={{ marginBottom: '4px' }}>
                          <Select options={payments.map(p => ({ value: p.gkey, label: `${p.serialno} - ${p.paymenttype}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="payment" label="自訂付款描述" style={{ marginBottom: '4px' }}><Input maxLength={100} /></Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="ba070gkey" label="貿易條件" style={{ marginBottom: '4px' }}>
                          <Select options={terms.map(t => ({ value: t.gkey, label: `${t.serialno} - ${t.termtype}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="term" label="條件描述" style={{ marginBottom: '4px' }}><Input maxLength={50} /></Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={6}>
                        <Form.Item name="ba065gkey" label="指定港口" style={{ marginBottom: '4px' }}>
                          <Select options={ports.map(p => ({ value: p.gkey, label: `${p.serialno} - ${p.term}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="express" label="快遞公司" style={{ marginBottom: '4px' }}><Input maxLength={20} /></Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="accountno" label="快遞帳戶" style={{ marginBottom: '4px' }}><Input maxLength={20} /></Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="shipto" label="目的港口" style={{ marginBottom: '4px' }}><Input maxLength={60} /></Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={4}>
                        <Form.Item name="unitprice" label="控制系數" style={{ marginBottom: '2px' }}><InputNumber style={{ width: '100%' }} precision={4} /></Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="ebcomm" label="EB佣金(%)" style={{ marginBottom: '2px' }}><InputNumber style={{ width: '100%' }} precision={4} /></Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="cusebcomm" label="客戶預扣(%)" style={{ marginBottom: '2px' }}><InputNumber style={{ width: '100%' }} precision={4} /></Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="othencost" label="其他費(%)" style={{ marginBottom: '2px' }}><InputNumber style={{ width: '100%' }} precision={3} /></Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="laprice" label="LA地區(%)" style={{ marginBottom: '2px' }}><InputNumber style={{ width: '100%' }} precision={4} /></Form.Item>
                      </Col>
                    </Row>
                  </TabPane>

                  <TabPane tab="麥頭與指示 Blob" key="sub3">
                    <Row gutter={8}>
                      <Col span={8}>
                        <Form.Item name="forwarder" label="船務代理 Forwarder" style={{ marginBottom: '4px' }}><TextArea rows={2} /></Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="notify" label="通知方 Notify Party" style={{ marginBottom: '4px' }}><TextArea rows={2} /></Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="specialinstruction" label="裝運特殊指示" style={{ marginBottom: '4px' }}><TextArea rows={2} /></Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={8}>
                        <Form.Item name="mainmark" label="正麥頭內容" style={{ marginBottom: '2px' }}><TextArea rows={2} /></Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="sidemark" label="側麥頭內容" style={{ marginBottom: '2px' }}><TextArea rows={2} /></Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="remark" label="客戶備註說明" style={{ marginBottom: '2px' }}><TextArea rows={2} /></Form.Item>
                      </Col>
                    </Row>
                  </TabPane>
                </Tabs>
              </div>

              {/* 📊 DETAIL SECTION (下半部，使用多頁籤展示細表) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '8px', backgroundColor: '#fff' }}>
                <Tabs defaultActiveKey="det1" size="small" style={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="inner-detail-tabs">
                  
                  {/* DET 1: 品牌 */}
                  <TabPane tab={<span><TagOutlined /> 經營授權品牌 (ba011)</span>} key="det1" style={{ height: '100%', overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#fa8c16', fontSize: '12px', fontWeight: 600 }}>🏷️ 客戶代理授權製造品牌</span>
                      <Space>
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddBrand} disabled={!isEditing}>增行</Button>
                        <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveBrands} disabled={!isEditing}>儲存</Button>
                      </Space>
                    </div>
                    <Table
                      columns={[
                        {
                          title: '授權品牌項目 (來自 ba009 主檔)',
                          dataIndex: 'ba009gkey',
                          render: (val, record) => (
                            <Select
                              value={val}
                              size="small"
                              options={brandList.map(b => ({ value: b.gkey, label: `${b.serialno} - ${b.cbrand}` }))}
                              style={{ width: '260px' }}
                              onChange={(v) => {
                                const item = { ...record, ba009gkey: v };
                                setBrands(brands.map(b => b.gkey === record.gkey ? item : b));
                                setEditedBrands(prev => ({ ...prev, [record.gkey]: item }));
                              }}
                            />
                          )
                        },
                        {
                          title: '操作',
                          key: 'action',
                          width: '60px',
                          align: 'center',
                          render: (_, rec) => (
                            <Popconfirm
                              title="確定要刪除此行授權品牌嗎？"
                              okText="確定"
                              cancelText="取消"
                              onConfirm={() => deleteBrand(rec)}
                              disabled={!isEditing}
                            >
                              <Button danger icon={<DeleteOutlined />} size="small" disabled={!isEditing} />
                            </Popconfirm>
                          )
                        }
                      ]}
                      dataSource={brands}
                      rowKey="gkey"
                      pagination={false}
                      size="small"
                      bordered
                      loading={loadingSub}
                    />
                  </TabPane>

                  {/* DET 2: QC */}
                  <TabPane tab={<span><UserOutlined /> 指定QC驗貨 (ba012)</span>} key="det2" style={{ height: '100%', overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#fa8c16', fontSize: '12px', fontWeight: 600 }}>🕵️‍♂️ 客戶指定 QC 檢驗人員名冊</span>
                      <Space>
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddQC} disabled={!isEditing}>增行</Button>
                        <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveQCs} disabled={!isEditing}>儲存</Button>
                      </Space>
                    </div>
                    <Table
                      columns={[
                        {
                          title: 'QC姓名',
                          dataIndex: 'qccontact',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, qccontact: e.target.value };
                              setQcs(qcs.map(q => q.gkey === r.gkey ? it : q));
                              setEditedQcs(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '聯絡電話',
                          dataIndex: 'tel',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, tel: e.target.value };
                              setQcs(qcs.map(q => q.gkey === r.gkey ? it : q));
                              setEditedQcs(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '聯絡Email',
                          dataIndex: 'email',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, email: e.target.value };
                              setQcs(qcs.map(q => q.gkey === r.gkey ? it : q));
                              setEditedQcs(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '操作',
                          width: '60px',
                          align: 'center',
                          render: (_, r) => (
                            <Popconfirm
                              title="確定要刪除此行指定QC嗎？"
                              okText="確定"
                              cancelText="取消"
                              onConfirm={() => deleteQC(r)}
                              disabled={!isEditing}
                            >
                              <Button danger icon={<DeleteOutlined />} size="small" disabled={!isEditing} />
                            </Popconfirm>
                          )
                        }
                      ]}
                      dataSource={qcs}
                      rowKey="gkey"
                      pagination={false}
                      size="small"
                      bordered
                      loading={loadingSub}
                    />
                  </TabPane>

                  {/* DET 3: 配件 */}
                  <TabPane tab={<span><SettingOutlined /> 自備配件提供 (ba013)</span>} key="det3" style={{ height: '100%', overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#fa8c16', fontSize: '12px', fontWeight: 600 }}>👟 客戶自備/客供料配件登記明細</span>
                      <Space>
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddAcc} disabled={!isEditing}>增行</Button>
                        <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveAccs} disabled={!isEditing}>儲存</Button>
                      </Space>
                    </div>
                    <Table
                      columns={[
                        {
                          title: '配件分類',
                          dataIndex: 'ba080gkey',
                          width: '200px',
                          render: (val, r) => (
                            <Select
                              value={val}
                              size="small"
                              options={accList.map(a => ({ value: a.gkey, label: `${a.serialno} - ${a.accessory}` }))}
                              style={{ width: '100%' }}
                              onChange={(v) => {
                                const it = { ...r, ba080gkey: v };
                                setCustAccs(custAccs.map(x => x.gkey === r.gkey ? it : x));
                                setEditedAccs(prev => ({ ...prev, [r.gkey]: it }));
                              }}
                            />
                          )
                        },
                        {
                          title: '規格描述',
                          dataIndex: 'description',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, description: e.target.value };
                              setCustAccs(custAccs.map(x => x.gkey === r.gkey ? it : x));
                              setEditedAccs(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '數量',
                          dataIndex: 'pairs',
                          width: '90px',
                          render: (val, r) => (
                            <InputNumber value={val} size="small" onChange={(v) => {
                              const it = { ...r, pairs: v };
                              setCustAccs(custAccs.map(x => x.gkey === r.gkey ? it : x));
                              setEditedAccs(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '單位',
                          dataIndex: 'unit',
                          width: '80px',
                          render: (val, r) => (
                            <Select value={val} size="small" style={{ width: '100%' }} onChange={(v) => {
                              const it = { ...r, unit: v };
                              setCustAccs(custAccs.map(x => x.gkey === r.gkey ? it : x));
                              setEditedAccs(prev => ({ ...prev, [r.gkey]: it }));
                            }} options={[{ value: '1', label: '雙' }, { value: '2', label: '箱' }, { value: '3', label: '其它' }]} />
                          )
                        },
                        {
                          title: '供應方式',
                          dataIndex: 'supplytype',
                          width: '110px',
                          render: (val, r) => (
                            <Select value={val} size="small" style={{ width: '100%' }} onChange={(v) => {
                              const it = { ...r, supplytype: v };
                              setCustAccs(custAccs.map(x => x.gkey === r.gkey ? it : x));
                              setEditedAccs(prev => ({ ...prev, [r.gkey]: it }));
                            }} options={[{ value: '1', label: '提供數量' }, { value: '2', label: '提供樣品' }]} />
                          )
                        },
                        {
                          title: '操作',
                          key: 'action',
                          width: '60px',
                          align: 'center',
                          render: (_, r) => (
                            <Popconfirm
                              title="確定要刪除此行自備配件嗎？"
                              okText="確定"
                              cancelText="取消"
                              onConfirm={() => deleteAcc(r)}
                              disabled={!isEditing}
                            >
                              <Button danger icon={<DeleteOutlined />} size="small" disabled={!isEditing} />
                            </Popconfirm>
                          )
                        }
                      ]}
                      dataSource={custAccs}
                      rowKey="gkey"
                      pagination={false}
                      size="small"
                      bordered
                      loading={loadingSub}
                    />
                  </TabPane>

                  {/* DET 4: 窗口 */}
                  <TabPane tab={<span><TeamOutlined /> 日常業務窗口 (ba014)</span>} key="det4" style={{ height: '100%', overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#fa8c16', fontSize: '12px', fontWeight: 600 }}>☎️ 客戶對應採購、業務聯絡名錄</span>
                      <Space>
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddContact} disabled={!isEditing}>增行</Button>
                        <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveContacts} disabled={!isEditing}>儲存</Button>
                      </Space>
                    </div>
                    <Table
                      columns={[
                        {
                          title: '姓名',
                          dataIndex: 'contact',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, contact: e.target.value };
                              setContacts(contacts.map(c => c.gkey === r.gkey ? it : c));
                              setEditedContacts(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '部門',
                          dataIndex: 'department',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, department: e.target.value };
                              setContacts(contacts.map(c => c.gkey === r.gkey ? it : c));
                              setEditedContacts(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '職稱',
                          dataIndex: 'jobposition',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, jobposition: e.target.value };
                              setContacts(contacts.map(c => c.gkey === r.gkey ? it : c));
                              setEditedContacts(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '聯絡電話',
                          dataIndex: 'tel',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, tel: e.target.value };
                              setContacts(contacts.map(c => c.gkey === r.gkey ? it : c));
                              setEditedContacts(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: 'Email',
                          dataIndex: 'email',
                          render: (val, r) => (
                            <Input value={val} size="small" onChange={(e) => {
                              const it = { ...r, email: e.target.value };
                              setContacts(contacts.map(c => c.gkey === r.gkey ? it : c));
                              setEditedContacts(prev => ({ ...prev, [r.gkey]: it }));
                            }} />
                          )
                        },
                        {
                          title: '操作',
                          key: 'action',
                          width: '60px',
                          align: 'center',
                          render: (_, r) => (
                            <Popconfirm
                              title="確定要刪除此行業務窗口嗎？"
                              okText="確定"
                              cancelText="取消"
                              onConfirm={() => deleteContact(r)}
                              disabled={!isEditing}
                            >
                              <Button danger icon={<DeleteOutlined />} size="small" disabled={!isEditing} />
                            </Popconfirm>
                          )
                        }
                      ]}
                      dataSource={contacts}
                      rowKey="gkey"
                      pagination={false}
                      size="small"
                      bordered
                      loading={loadingSub}
                    />
                  </TabPane>

                </Tabs>
              </div>

            </Form>
          </div>
        </TabPane>
      </Tabs>
      
      <style>{`
        .pb-sheet-root-tabs .ant-tabs-content { height: 100%; }
        .inner-detail-tabs .ant-tabs-content { flex: 1; overflow: auto; }
        .ant-table-row-selected td { background-color: #e6f7ff !important; }
        .ant-form-item-label > label { font-size: 12px !important; color: #595959 !important; }
        .ant-input-sm, .ant-select-sm, .ant-input-number-sm { font-size: 12px !important; }
      `}</style>
      <style>{`
        .modern-sheet-container { height: 100vh; overflow: hidden; background: #f0f2f5; }
        .modern-sheet-container .ant-table { font-size: 13px; }
        .modern-sheet-container .ant-table-thead > tr > th { background: #fafafa; font-weight: 600; padding: 12px 8px !important; }
        .modern-sheet-container .ant-table-tbody > tr > td { padding: 8px 8px !important; }
        .ant-table-row-selected td { background-color: #e6f7ff !important; }
        .pb-sheet-root-tabs { height: 100%; }
        .inner-detail-tabs .ant-select { width: 100% !important; min-width: 150px !important; }
        .inner-detail-tabs .ant-input, .inner-detail-tabs .ant-input-number { width: 100% !important; font-size: 14px; }
      `}</style>
    </div>
  );
}
