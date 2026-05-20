import React, { useState, useEffect } from 'react';
import { Table, Form, Input, InputNumber, Button, Select, Space, Tabs, Row, Col, Card, Switch, message, Divider, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined, UserOutlined, BankOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { TabPane } = Tabs;
const API_URL = 'http://localhost:8001/api/';

export default function Ba015BaseSheet({ type, title, sheetId }) {
  const [form] = Form.useForm();
  
  // Main data state
  const [entities, setEntities] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // 🔒 編輯狀態鎖
  const [loadingLeft, setLoadingLeft] = useState(false);
  
  // 🗂️ PB 二頁式系統基類架構
  const [sheetTabKey, setSheetTabKey] = useState('1'); 
  const [queryFilters, setQueryFilters] = useState({ factno: '', shortname: '', factname: '' });
  
  // Detail contact state
  const [contacts, setContacts] = useState([]);
  const [loadingRight, setLoadingRight] = useState(false);
  const [editedContacts, setEditedContacts] = useState({}); // Track inline contact edits
  
  // Dropdowns state (FK collections)
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [terms, setTerms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);

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

    const [resC, resCur, resT, resP, resCat] = await Promise.all([
      safeGet(`${API_URL}ba003/`),
      safeGet(`${API_URL}ba060/`),
      safeGet(`${API_URL}ba070/`),
      safeGet(`${API_URL}ba075/`),
      safeGet(`${API_URL}ba020/`)
    ]);
    
    setCountries(resC);
    setCurrencies(resCur);
    setTerms(resT);
    setPayments(resP);
    setCategories(resCat);
  };

  const fetchEntities = async () => {
    setLoadingLeft(true);
    try {
      const res = await axios.get(`${API_URL}ba015/?type=${type}`);
      setEntities(res.data);
      if (res.data.length > 0 && !activeRecord) {
        handleRowSelect(res.data[0]);
      }
      setIsEditing(false); // 檢索恢復查詢模式
      setSheetTabKey('1'); // 強制折返至第 1 頁查詢首頁
    } catch (err) {
      message.error('載入資料失敗');
    } finally {
      setLoadingLeft(false);
    }
  };

  const fetchContacts = async (entityGkey) => {
    setLoadingRight(true);
    try {
      const res = await axios.get(`${API_URL}ba016/?ba015gkey=${entityGkey}`);
      setContacts(res.data);
      setEditedContacts({});
    } catch (err) {
      message.error('載入聯絡人明細失敗');
    } finally {
      setLoadingRight(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchEntities();
  }, [type]);

  // ⚡ 全域 MDI 廣播指令接收器 (精準捕獲本體物理代碼)
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === sheetId) {
        console.log(`⚡ [${sheetId}] Entity Base Intercepted command: ${action}`);
        if (action === 'retrieve') fetchEntities();
        else if (action === 'edit') {
          setIsEditing(true); 
          setSheetTabKey('2'); // 切入編輯明細
        }
        else if (action === 'insert') handleAdd();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [entities, activeRecord, type, sheetId]);

  // 📡 參數接收監聽
  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === sheetId && params.factno) {
        setQueryFilters(prev => ({ ...prev, factno: params.factno }));
        // Immediate fetch to avoid stale state
        setLoadingLeft(true);
        axios.get(`${API_URL}ba015/?type=${type}`, { params: { factno: params.factno } })
          .then(res => { setEntities(res.data); if(res.data.length>0) handleRowSelect(res.data[0]); })
          .finally(() => setLoadingLeft(false));
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, [type, sheetId]);

  const handleRowSelect = (record) => {
    setSelectedRowKeys([record.gkey]);
    setActiveRecord(record);
    form.setFieldsValue({
      ...record,
      yesno: record.yesno === 'Y'
    });
    if (!record.gkey.startsWith('temp_')) {
      fetchContacts(record.gkey);
    } else {
      setContacts([]);
    }
  };

  const handleAdd = () => {
    const tempGkey = `temp_${Date.now()}`;
    const newRecord = { gkey: tempGkey, factno: '', shortname: '', factname: '', yesno: 'Y' };
    setEntities([...entities, newRecord]);
    setActiveRecord(newRecord);
    setSelectedRowKeys([tempGkey]);
    setIsEditing(true); // 新增操作自動開啟編輯
    setSheetTabKey('2'); // 自動跳轉卡片頁
    form.resetFields();
    form.setFieldsValue({ yesno: true });
    setContacts([]);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        yesno: values.yesno ? 'Y' : 'N'
      };
      let savedGkey = activeRecord.gkey;
      setIsEditing(false); // 存檔鎖定
      
      if (activeRecord.gkey.startsWith('temp_')) {
        const res = await axios.post(`${API_URL}ba015/?type=${type}`, payload);
        message.success('新增成功');
        savedGkey = res.data.gkey;
      } else {
        const res = await axios.put(`${API_URL}ba015/${activeRecord.gkey}/?type=${type}`, payload);
        message.success('存檔成功');
        savedGkey = res.data.gkey;
      }
      
      // Refresh & Preserve selection
      const listRes = await axios.get(`${API_URL}ba015/?type=${type}`);
      setEntities(listRes.data);
      const saved = listRes.data.find(e => e.gkey === savedGkey);
      if (saved) {
        setActiveRecord(saved);
        setSelectedRowKeys([saved.gkey]);
        form.setFieldsValue({ ...saved, yesno: saved.yesno === 'Y' });
      }
    } catch (err) {
      message.error('儲存失敗：' + JSON.stringify(err.response?.data || err.message));
    }
  };

  const handleDelete = async () => {
    if (!activeRecord || activeRecord.gkey.startsWith('temp_')) {
      setEntities(entities.filter(e => e.gkey !== activeRecord.gkey));
      setActiveRecord(null);
      return;
    }
    try {
      await axios.delete(`${API_URL}ba015/${activeRecord.gkey}/`);
      message.success('刪除成功');
      setActiveRecord(null);
      form.resetFields();
      fetchEntities();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  // Contact Grid Inline Actions
  const handleAddContact = () => {
    if (!activeRecord || activeRecord.gkey.startsWith('temp_')) {
      message.warning('請先儲存主檔廠商資訊');
      return;
    }
    const tempGkey = `temp_${Date.now()}`;
    const newContact = { gkey: tempGkey, ba015gkey: activeRecord.gkey, contact: '', department: '', tel: '', email: '' };
    setContacts([...contacts, newContact]);
    setEditedContacts(prev => ({ ...prev, [tempGkey]: newContact }));
  };

  const handleContactFieldChange = (gkey, field, val) => {
    const updated = contacts.map(c => {
      if (c.gkey === gkey) {
        const item = { ...c, [field]: val };
        setEditedContacts(prev => ({ ...prev, [gkey]: item }));
        return item;
      }
      return c;
    });
    setContacts(updated);
  };

  const saveContacts = async () => {
    const toSave = Object.values(editedContacts);
    if (toSave.length === 0) {
      message.info('無修改聯絡人');
      return;
    }
    try {
      for (let c of toSave) {
        if (!c.contact) {
          message.warning('請輸入聯絡人姓名');
          return;
        }
        if (c.gkey.startsWith('temp_')) {
          const { gkey, ...rest } = c;
          await axios.post(`${API_URL}ba016/`, rest);
        } else {
          await axios.put(`${API_URL}ba016/${c.gkey}/`, c);
        }
      }
      message.success('聯絡人存檔成功');
      fetchContacts(activeRecord.gkey);
    } catch (err) {
      message.error('聯絡人存檔失敗');
    }
  };

  const deleteContact = async (record) => {
    if (record.gkey.startsWith('temp_')) {
      setContacts(contacts.filter(c => c.gkey !== record.gkey));
      return;
    }
    try {
      await axios.delete(`${API_URL}ba016/${record.gkey}/`);
      message.success('刪除成功');
      fetchContacts(activeRecord.gkey);
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  // 📐 原生 PB 查詢條件過濾器 (Client-Side)
  const filteredEntities = entities.filter(ent => {
    const fno = ent.factno || '';
    const sname = ent.shortname || '';
    const fname = ent.factname || '';
    const matchNo = !queryFilters.factno || fno.toLowerCase().includes(queryFilters.factno.toLowerCase());
    const matchShort = !queryFilters.shortname || sname.toLowerCase().includes(queryFilters.shortname.toLowerCase());
    const matchName = !queryFilters.factname || fname.toLowerCase().includes(queryFilters.factname.toLowerCase());
    return matchNo && matchShort && matchName;
  });

  const queryColumns = [
    { title: `${title}編號`, dataIndex: 'factno', key: 'factno', width: '130px', sorter: (a,b)=>(a.factno || '').localeCompare(b.factno || '') },
    { title: '簡稱', dataIndex: 'shortname', key: 'shortname', width: '180px' },
    { title: '中文全稱', dataIndex: 'factname', key: 'factname' },
    { title: '通訊電話', dataIndex: 'tel1', key: 'tel1', width: '150px' },
    { title: '通訊Email', dataIndex: 'email', key: 'email', width: '180px' },
    { 
      title: '狀態', 
      dataIndex: 'yesno', 
      key: 'yesno', 
      width: '80px',
      render: val => val === 'Y' ? <span style={{color:'#52c41a'}}>● 使用中</span> : <span style={{color:'#f5222d'}}>● 停用</span>
    }
  ];

  const contactColumns = [
    {
      title: '姓名',
      dataIndex: 'contact',
      key: 'contact',
      render: (val, record) => (
        <Input value={val} onChange={(e) => handleContactFieldChange(record.gkey, 'contact', e.target.value)} size="small" />
      )
    },
    {
      title: '部門',
      dataIndex: 'department',
      key: 'department',
      render: (val, record) => (
        <Input value={val} onChange={(e) => handleContactFieldChange(record.gkey, 'department', e.target.value)} size="small" />
      )
    },
    {
      title: '職位',
      dataIndex: 'jobposition',
      key: 'jobposition',
      render: (val, record) => (
        <Input value={val} onChange={(e) => handleContactFieldChange(record.gkey, 'jobposition', e.target.value)} size="small" />
      )
    },
    {
      title: '行動電話',
      dataIndex: 'mobilephone',
      key: 'mobilephone',
      render: (val, record) => (
        <Input value={val} onChange={(e) => handleContactFieldChange(record.gkey, 'mobilephone', e.target.value)} size="small" />
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (val, record) => (
        <Input value={val} onChange={(e) => handleContactFieldChange(record.gkey, 'email', e.target.value)} size="small" />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: '60px',
      render: (_, record) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => deleteContact(record)} size="small" />
      )
    }
  ];

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
        <TabPane tab={`1. 查詢列表 (F3 檢索)`} key="1" style={{ height: 'calc(100vh - 210px)', overflow: 'auto', backgroundColor: '#fff', padding: '12px', border: '1px solid #d9d9d9', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          
          {/* 🔍 PB 原生風格：頂部查詢面板 */}
          <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '12px' }}>
            <Row gutter={12} align="bottom">
              <Col span={5}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>實體編號</div>
                <Input size="small" placeholder="輸入編號..." value={queryFilters.factno} onChange={e => setQueryFilters({...queryFilters, factno: e.target.value})} allowClear />
              </Col>
              <Col span={5}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>簡稱搜尋</div>
                <Input size="small" placeholder="輸入簡稱..." value={queryFilters.shortname} onChange={e => setQueryFilters({...queryFilters, shortname: e.target.value})} allowClear />
              </Col>
              <Col span={6}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>中文全名</div>
                <Input size="small" placeholder="輸入中文名..." value={queryFilters.factname} onChange={e => setQueryFilters({...queryFilters, factname: e.target.value})} allowClear />
              </Col>
              <Col span={4}>
                <Button size="small" danger onClick={() => setQueryFilters({ factno: '', shortname: '', factname: '' })}>清空條件</Button>
              </Col>
            </Row>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontWeight: 600, color: '#1890ff' }}>📁 {title} 彙總清單</h4>
            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>💡 提示：在清單列上「連按兩下」，可直接進入主從編輯詳情</span>
          </div>
          <Table
            columns={queryColumns}
            dataSource={filteredEntities}
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

        {/* 🚀 第二頁：編輯明細 (Tabpage 2) - Master on Top, Detail on Bottom */}
        <TabPane tab="2. 編輯主細明細" key="2" style={{ height: 'calc(100vh - 210px)', backgroundColor: '#fff', padding: '12px', border: '1px solid #d9d9d9', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
            <h4 style={{ margin: 0, color: '#fa8c16' }}>
              🌐 目前維護項目: {activeRecord ? `[${activeRecord.factno || 'NEW'}] ${activeRecord.shortname || ''}` : '請先回第一頁點選資料'}
              {isEditing && <span style={{ color: '#52c41a', fontSize: '12px', marginLeft: '10px' }}>(✏️ 編輯鎖已開)</span>}
            </h4>
            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>💡 操作指引：上半部為 Master 表頭欄位，下半部為 Detail 細表</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Form form={form} layout="vertical" disabled={!isEditing || !activeRecord} size="small" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              {/* 📋 MASTER SECTION (上半部固定 - 表頭卡片) */}
              <div style={{ flexShrink: 0, padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', marginBottom: '12px', backgroundColor: '#fafafa' }}>
                <Tabs type="line" size="small" style={{ marginBottom: '0' }}>
                  <TabPane tab="基本與通訊" key="sub1">
                    <Row gutter={8}>
                      <Col span={4}>
                        <Form.Item name="factno" label="實體編號" rules={[{ required: true }]} style={{ marginBottom: '4px' }}>
                          <Input style={{ textTransform: 'uppercase' }} maxLength={20} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="shortname" label="廠商簡稱" rules={[{ required: true }]} style={{ marginBottom: '4px' }}>
                          <Input maxLength={50} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="factname" label="中文全名" rules={[{ required: true }]} style={{ marginBottom: '4px' }}>
                          <Input maxLength={100} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="engfactname" label="英文全名" style={{ marginBottom: '4px' }}>
                          <Input maxLength={60} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="yesno" label="使用中" valuePropName="checked" style={{ marginBottom: '4px' }}>
                          <Switch checkedChildren="Y" unCheckedChildren="N" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={4}>
                        <Form.Item name="tel1" label="主要電話" style={{ marginBottom: '4px' }}>
                          <Input maxLength={40} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="fax1" label="傳真號碼" style={{ marginBottom: '4px' }}>
                          <Input maxLength={40} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="email" label="聯絡Email" style={{ marginBottom: '4px' }}>
                          <Input maxLength={50} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="idno" label="統一編號" style={{ marginBottom: '4px' }}>
                          <Input maxLength={30} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="ba003gkey" label="產地國別" style={{ marginBottom: '4px' }}>
                          <Select showSearch optionFilterProp="label" options={countries.map(c => ({ value: c.gkey, label: `${c.serialno} - ${c.corigin}` }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={10}>
                        <Form.Item name="caddress" label="中文地址" style={{ marginBottom: '2px' }}>
                          <Input maxLength={200} />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item name="eaddress" label="英文地址" style={{ marginBottom: '2px' }}>
                          <Input maxLength={250} />
                        </Form.Item>
                      </Col>
                      {type === '2' && (
                        <Col span={4}>
                          <Form.Item name="ba020gkey" label="材料分類" style={{ marginBottom: '2px' }}>
                            <Select options={categories.map(cat => ({ value: cat.gkey, label: `${cat.code} - ${cat.category}` }))} />
                          </Form.Item>
                        </Col>
                      )}
                      {type === '1' && (
                        <>
                          <Col span={2}>
                            <Form.Item name="monthqty" label="月產能" style={{ marginBottom: '2px' }}>
                              <InputNumber style={{ width: '100%' }} controls={false} />
                            </Form.Item>
                          </Col>
                          <Col span={2}>
                            <Form.Item name="fmonthqty" label="分配產能" style={{ marginBottom: '2px' }}>
                              <InputNumber style={{ width: '100%' }} controls={false} />
                            </Form.Item>
                          </Col>
                        </>
                      )}
                    </Row>
                  </TabPane>

                  <TabPane tab="財務與備註" key="sub2">
                    <Row gutter={8}>
                      <Col span={6}>
                        <Form.Item name="ba060gkey" label="交易結算幣別" style={{ marginBottom: '4px' }}>
                          <Select options={currencies.map(c => ({ value: c.gkey, label: `${c.currencyno} - ${c.currency}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="ba075gkey" label="付款條件" style={{ marginBottom: '4px' }}>
                          <Select options={payments.map(p => ({ value: p.gkey, label: `${p.serialno} - ${p.paymenttype}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="payment" label="自訂付款描述" style={{ marginBottom: '4px' }}>
                          <Input maxLength={100} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item name="bankinfo" label="匯款銀行詳細資料 Blob" style={{ marginBottom: '4px' }}>
                          <TextArea rows={2} placeholder="開戶行、帳號、SWIFT..." />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="remark" label="公司綜合備註 Blob" style={{ marginBottom: '4px' }}>
                          <TextArea rows={2} placeholder="綜合備註..." />
                        </Form.Item>
                      </Col>
                    </Row>
                  </TabPane>
                </Tabs>
              </div>

              {/* 📊 DETAIL SECTION (下半部自適應 - 表身 Grid) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '8px', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexShrink: 0 }}>
                  <h5 style={{ margin: 0, fontWeight: 600, color: '#fa8c16' }}>👥 外部窗口與聯絡人名冊 (Detail)</h5>
                  <Space>
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddContact} disabled={!isEditing}>增行</Button>
                    <Button type="primary" size="small" icon={<SaveOutlined />} onClick={saveContacts} disabled={!isEditing}>儲存聯絡人</Button>
                  </Space>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <Table
                    columns={contactColumns}
                    dataSource={contacts}
                    rowKey="gkey"
                    loading={loadingRight}
                    pagination={false}
                    size="small"
                    bordered
                  />
                </div>
              </div>

            </Form>
          </div>
        </TabPane>
      </Tabs>
      
      <style>{`
        .modern-sheet-container { height: 100vh; overflow: hidden; background: #f0f2f5; }
        .modern-sheet-container .ant-table { font-size: 13px; }
        .modern-sheet-container .ant-table-thead > tr > th { background: #fafafa; font-weight: 600; padding: 12px 8px !important; }
        .modern-sheet-container .ant-table-tbody > tr > td { padding: 8px 8px !important; }
        .ant-table-row-selected td { background-color: #e6f7ff !important; }
        .pb-sheet-root-tabs .ant-tabs-content { height: 100%; }
        .ant-form-item-label > label { font-size: 12px !important; color: #595959 !important; }
        .ant-input-sm, .ant-select-sm, .ant-input-number-sm { font-size: 12px !important; }
      `}</style>
    </div>
  );
}
