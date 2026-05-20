import React, { useState, useEffect } from 'react';
import { Table, Form, Input, InputNumber, Button, Select, Space, Tabs, Row, Col, Divider, Switch, message, Popconfirm, DatePicker, Card, Alert, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined, UserOutlined, HomeOutlined, BookOutlined, TeamOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { TabPane } = Tabs;
const API_URL = 'http://localhost:8001/api/';

export default function Es101Sheet() {
  const [form] = Form.useForm();

  // Core state
  const [employees, setEmployees] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // 🔒 編輯模式鎖定
  const [sheetTabKey, setSheetTabKey] = useState('1'); // 🗂️ PB 二頁式基類
  const [loadingLeft, setLoadingLeft] = useState(false);
  
  // 🔍 F3 檢索條件緩存
  const [queryFilters, setQueryFilters] = useState({ employeeno: '', chinesename: '', deptgkey: '' });

  // Sub-details states
  const [educations, setEducations] = useState([]);   // es102
  const [experiences, setExperiences] = useState([]); // es103
  const [families, setFamilies] = useState([]);       // es104
  const [loadingRight, setLoadingRight] = useState(false);

  // Dropdown Options
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);

  const fetchLookups = async () => {
    const safeGet = async (url) => {
      try {
        const res = await axios.get(url);
        return res.data;
      } catch (e) {
        console.warn(`Failed to load dictionary from ${url}:`, e);
        return [];
      }
    };

    const [resD, resP, resC, resL] = await Promise.all([
      safeGet(`${API_URL}ba045/`),
      safeGet(`${API_URL}ba050/`),
      safeGet(`${API_URL}ba005/`),
      safeGet(`${API_URL}ba004/`)
    ]);
    
    setDepartments(resD);
    setPositions(resP);
    setCompanies(resC);
    setLocations(resL);
  };

  const fetchEmployees = async () => {
    setLoadingLeft(true);
    try {
      const res = await axios.get(`${API_URL}es101/`);
      setEmployees(res.data);
      if (res.data.length > 0 && !activeRecord) {
        handleRowSelect(res.data[0]);
      }
      setIsEditing(false); // 重新獲取，自動設回查詢唯讀模式
      setSheetTabKey('1'); // 強制返回查詢列表首頁
    } catch (err) { message.error('載入員工清單失敗'); }
    finally { setLoadingLeft(false); }
  };

  const fetchSubGrids = async (empGkey) => {
    setLoadingRight(true);
    try {
      const [resEdu, resExp, resFam] = await Promise.all([
        axios.get(`${API_URL}es102/?es101gkey=${empGkey}`),
        axios.get(`${API_URL}es103/?es101gkey=${empGkey}`),
        axios.get(`${API_URL}es104/?es101gkey=${empGkey}`)
      ]);
      setEducations(resEdu.data);
      setExperiences(resExp.data);
      setFamilies(resFam.data);
    } catch (err) { message.error('載入學經歷失敗'); }
    finally { setLoadingRight(false); }
  };

  useEffect(() => {
    fetchLookups();
    fetchEmployees();
  }, []);

  // ⚡ 全域 MDI 廣播指令接收器 (物理連動)
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'es101') {
        console.log(`⚡ [es101] Employee Intercepted command: ${action}`);
        if (action === 'retrieve') fetchEmployees();
        else if (action === 'edit') {
          setIsEditing(true); 
          setSheetTabKey('2'); // 跳轉編輯明細頁
        }
        else if (action === 'insert') handleAdd();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [employees, activeRecord]);

  const handleRowSelect = (record) => {
    setSelectedRowKeys([record.gkey]);
    setActiveRecord(record);
    
    // Handle Date conversions for Antd DatePicker
    form.setFieldsValue({
      ...record,
      birthday: record.birthday ? dayjs(record.birthday) : null,
      arrivaldate: record.arrivaldate ? dayjs(record.arrivaldate) : null,
      leavedate: record.leavedate ? dayjs(record.leavedate) : null,
      systemuser: record.systemuser === 'Y'
    });

    if (!record.gkey.startsWith('temp_')) {
      fetchSubGrids(record.gkey);
    } else {
      setEducations([]);
      setExperiences([]);
      setFamilies([]);
    }
  };

  // Action Handlers
  const handleAdd = () => {
    const tempGkey = `temp_${Date.now()}`;
    const rec = { gkey: tempGkey, employeeno: '', chinesename: '', englishname: '', idno: '', systemuser: 'N' };
    setEmployees([...employees, rec]);
    setActiveRecord(rec);
    setSelectedRowKeys([tempGkey]);
    setIsEditing(true); // 新增操作自動開啟編輯
    setSheetTabKey('2'); // 強制跳轉二頁編輯卡
    form.resetFields();
    form.setFieldsValue({ systemuser: false });
    setEducations([]);
    setExperiences([]);
    setFamilies([]);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      const payload = {
        ...vals,
        birthday: vals.birthday ? vals.birthday.toISOString() : null,
        arrivaldate: vals.arrivaldate ? vals.arrivaldate.toISOString() : null,
        leavedate: vals.leavedate ? vals.leavedate.toISOString() : null,
        systemuser: vals.systemuser ? 'Y' : 'N'
      };

      let savedGkey = activeRecord.gkey;
      if (activeRecord.gkey.startsWith('temp_')) {
        const res = await axios.post(`${API_URL}es101/`, payload);
        savedGkey = res.data.gkey;
        message.success('🎉 員工建立完成！' + (payload.systemuser === 'Y' ? '已自動啟用 ERP 帳戶。' : ''));
      } else {
        await axios.put(`${API_URL}es101/${activeRecord.gkey}/`, payload);
        message.success('員工主檔存檔成功！');
      }
      
      setIsEditing(false); // 存檔完閉鎖

      const resList = await axios.get(`${API_URL}es101/`);
      setEmployees(resList.data);
      const saved = resList.data.find(e => e.gkey === savedGkey);
      if (saved) {
        setActiveRecord(saved);
        setSelectedRowKeys([savedGkey]);
        form.setFieldsValue({
          ...saved,
          birthday: saved.birthday ? dayjs(saved.birthday) : null,
          arrivaldate: saved.arrivaldate ? dayjs(saved.arrivaldate) : null,
          leavedate: saved.leavedate ? dayjs(saved.leavedate) : null,
          systemuser: saved.systemuser === 'Y'
        });
      }
    } catch (err) {
      message.error('儲存失敗: ' + JSON.stringify(err.response?.data || err.message));
    }
  };

  const handleDelete = async () => {
    if (activeRecord.gkey.startsWith('temp_')) {
      setEmployees(employees.filter(e => e.gkey !== activeRecord.gkey));
      setActiveRecord(null);
      return;
    }
    try {
      await axios.delete(`${API_URL}es101/${activeRecord.gkey}/`);
      message.success('員工刪除成功。');
      setActiveRecord(null);
      fetchEmployees();
    } catch (err) { message.error('刪除失敗'); }
  };

  // Inline Grid Actions for Sub-tabs (Es102, 103, 104)
  const handleAddEdu = async () => {
    if (activeRecord.gkey.startsWith('temp_')) return message.warning('請先儲存員工基本資料');
    const item = { es101gkey: activeRecord.gkey, schoolname: '新學校項目', yearterm: 4, daynight: '1', graduate: '1' };
    try {
      await axios.post(`${API_URL}es102/`, item);
      fetchSubGrids(activeRecord.gkey);
    } catch (err) { message.error('新增學歷失敗'); }
  };

  const handleAddExp = async () => {
    if (activeRecord.gkey.startsWith('temp_')) return message.warning('請先儲存員工基本資料');
    const item = { es101gkey: activeRecord.gkey, companyname: '新公司經歷', jobposition: '', salary: 0 };
    try {
      await axios.post(`${API_URL}es103/`, item);
      fetchSubGrids(activeRecord.gkey);
    } catch (err) { message.error('新增經歷失敗'); }
  };

  const handleAddFam = async () => {
    if (activeRecord.gkey.startsWith('temp_')) return message.warning('請先儲存員工基本資料');
    const item = { es101gkey: activeRecord.gkey, relationship: '家屬', familyname: '姓名' };
    try {
      await axios.post(`${API_URL}es104/`, item);
      fetchSubGrids(activeRecord.gkey);
    } catch (err) { message.error('新增家屬失敗'); }
  };

  const deleteSubItem = async (endpoint, gkey) => {
    try {
      await axios.delete(`${API_URL}${endpoint}/${gkey}/`);
      fetchSubGrids(activeRecord.gkey);
    } catch (err) { message.error('刪除失敗'); }
  };

  const updateSubItem = async (endpoint, record, field, val) => {
    const payload = { ...record, [field]: val };
    try {
      await axios.put(`${API_URL}${endpoint}/${record.gkey}/`, payload);
      const res = await axios.get(`${API_URL}${endpoint}/?es101gkey=${activeRecord.gkey}`);
      if (endpoint === 'es102') setEducations(res.data);
      else if (endpoint === 'es103') setExperiences(res.data);
      else if (endpoint === 'es104') setFamilies(res.data);
    } catch (err) { message.error('存檔失敗'); }
  };

  const queryColumns = [
    { title: '員工工號', dataIndex: 'employeeno', width: '120px', sorter: (a,b)=>a.employeeno.localeCompare(b.employeeno) },
    { title: '中文姓名', dataIndex: 'chinesename', key: 'chinesename', width: '140px' },
    { title: '英文姓名', dataIndex: 'englishname', key: 'englishname', width: '160px' },
    { 
      title: '所屬部門', 
      dataIndex: 'ba045gkey', 
      key: 'ba045gkey',
      render: val => {
        const dept = departments.find(d => d.gkey === val);
        return dept ? dept.deptname : '-';
      }
    },
    { 
      title: '職位職稱', 
      dataIndex: 'ba050gkey', 
      key: 'ba050gkey',
      render: val => {
        const pos = positions.find(p => p.gkey === val);
        return pos ? pos.position : '-';
      }
    },
    { 
      title: 'ERP帳戶', 
      dataIndex: 'systemuser', 
      width: '100px',
      render: (v) => v === 'Y' ? <Tag color="cyan">有帳號</Tag> : <Tag color="default">無權限</Tag>
    }
  ];

  // Client-side Employee filtering
  const filteredEmployees = employees.filter(emp => {
    const matchNo = !queryFilters.employeeno || emp.employeeno.toLowerCase().includes(queryFilters.employeeno.toLowerCase());
    const matchName = !queryFilters.chinesename || emp.chinesename.toLowerCase().includes(queryFilters.chinesename.toLowerCase());
    const matchDept = !queryFilters.deptgkey || emp.ba045gkey === queryFilters.deptgkey;
    return matchNo && matchName && matchDept;
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
          
          {/* 🔍 頂部查詢條件面板 (dw_where) */}
          <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '12px' }}>
            <Row gutter={12} align="bottom">
              <Col span={5}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>員工工號</div>
                <Input size="small" placeholder="搜尋工號..." value={queryFilters.employeeno} onChange={e => setQueryFilters({...queryFilters, employeeno: e.target.value})} allowClear />
              </Col>
              <Col span={5}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>中文姓名</div>
                <Input size="small" placeholder="搜尋姓名..." value={queryFilters.chinesename} onChange={e => setQueryFilters({...queryFilters, chinesename: e.target.value})} allowClear />
              </Col>
              <Col span={6}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>所屬部門</div>
                <Select size="small" showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="選擇部門篩選" value={queryFilters.deptgkey} onChange={val => setQueryFilters({...queryFilters, deptgkey: val})} allowClear 
                  options={departments.map(d => ({ value: d.gkey, label: `${d.serialno} - ${d.department}` }))} 
                />
              </Col>
              <Col span={4}>
                <Button size="small" danger onClick={() => setQueryFilters({ employeeno: '', chinesename: '', deptgkey: undefined })}>清空條件</Button>
              </Col>
            </Row>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontWeight: 600, color: '#13c2c2' }}>👤 HR 人事員工總管理名冊</h4>
            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>💡 提示：連按兩下，直接載入學經歷並開啟人事卡片</span>
          </div>
          <Table
            columns={queryColumns}
            dataSource={filteredEmployees}
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

        {/* 🚀 第二頁：編輯明細 (Tabpage 2) - Master On Top, Detail On Bottom */}
        <TabPane tab="2. 編輯人事主細" key="2" style={{ height: 'calc(100vh - 210px)', backgroundColor: '#fff', padding: '12px', border: '1px solid #d9d9d9', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
            <h4 style={{ margin: 0, color: '#fa8c16' }}>
              🏷️ 目前人事卡片: {activeRecord ? `[${activeRecord.employeeno || 'NEW'}] ${activeRecord.chinesename || ''}` : '請先回第一頁選取員工'}
              {isEditing && <span style={{ color: '#52c41a', fontSize: '12px', marginLeft: '10px' }}>(✏️ 編輯鎖已解除)</span>}
            </h4>
            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>💡 佈局提示：上半部為員工基本資訊表頭，下半部為學、經歷與眷屬名單</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Form form={form} layout="vertical" disabled={!isEditing || !activeRecord} size="small" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              {/* 📋 MASTER SECTION (上半部卡片式 freeform) */}
              <div style={{ flexShrink: 0, padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', marginBottom: '12px', backgroundColor: '#fafafa' }}>
                <Tabs type="line" size="small" style={{ marginBottom: 0 }}>
                  <TabPane tab="基本人事個資" key="sub1">
                    <Row gutter={8}>
                      <Col span={4}>
                        <Form.Item name="employeeno" label="員工工號" rules={[{ required: true }]} style={{ marginBottom: '4px' }}>
                          <Input maxLength={20} style={{ textTransform: 'uppercase' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="chinesename" label="中文姓名" rules={[{ required: true }]} style={{ marginBottom: '4px' }}>
                          <Input maxLength={20} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="englishname" label="英文姓名 / Display" style={{ marginBottom: '4px' }}>
                          <Input maxLength={30} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="idno" label="身分證 / 護照號碼" rules={[{ required: true }]} style={{ marginBottom: '4px' }}>
                          <Input maxLength={20} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="ba005gkey" label="所屬公司/法人" style={{ marginBottom: '4px' }}>
                          <Select options={companies.map(c => ({ value: c.gkey, label: `${c.companycode} - ${c.cname}` }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={5}>
                        <Form.Item name="ba045gkey" label="隸屬部門" style={{ marginBottom: '4px' }}>
                          <Select options={departments.map(d => ({ value: d.gkey, label: `${d.serialno} - ${d.department}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="ba050gkey" label="擔當職稱" style={{ marginBottom: '4px' }}>
                          <Select options={positions.map(p => ({ value: p.gkey, label: `${p.serialno} - ${p.jobpositon}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="ba004gkey" label="工作地點" style={{ marginBottom: '4px' }}>
                          <Select options={locations.map(l => ({ value: l.gkey, label: `${l.areacode || l.serialno} - ${l.carea}` }))} />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name="sex" label="性別" style={{ marginBottom: '4px' }}>
                          <Select options={[{ value: 'M', label: '👨 男' }, { value: 'W', label: '👩 女' }]} />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name="marry" label="婚姻狀態" style={{ marginBottom: '4px' }}>
                          <Select options={[{ value: 'Y', label: '已婚' }, { value: 'N', label: '未婚' }]} />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name="bloodtype" label="血型" style={{ marginBottom: '4px' }}>
                          <Select options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'O', label: 'O' }, { value: '4', label: 'AB' }]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={4}>
                        <Form.Item name="birthday" label="出生日期" style={{ marginBottom: '2px' }}><DatePicker style={{ width: '100%' }} /></Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="birthplace" label="籍貫/省份" style={{ marginBottom: '2px' }}><Input maxLength={20} /></Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="arrivaldate" label="到職日期" style={{ marginBottom: '2px' }}><DatePicker style={{ width: '100%' }} /></Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="leavedate" label="離職日期" style={{ marginBottom: '2px' }}><DatePicker style={{ width: '100%' }} /></Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="height" label="身高 (cm)" style={{ marginBottom: '2px' }}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="weight" label="體重 (kg)" style={{ marginBottom: '2px' }}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                      </Col>
                    </Row>
                  </TabPane>

                  <TabPane tab="通訊聯絡與緊急救助" key="sub2">
                    <Row gutter={8}>
                      <Col span={5}>
                        <Form.Item name="tel" label="現住通訊電話" style={{ marginBottom: '4px' }}><Input maxLength={40} /></Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="mobilephone" label="行動電話手機" style={{ marginBottom: '4px' }}><Input maxLength={40} /></Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="email" label="聯絡 Email" style={{ marginBottom: '4px' }}><Input maxLength={50} /></Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item name="extension" label="分機號" style={{ marginBottom: '4px' }}><Input maxLength={10} /></Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="languageability" label="外語能力" style={{ marginBottom: '4px' }}><Input maxLength={100} /></Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item name="contactaddress" label="現住址" style={{ marginBottom: '4px' }}><Input maxLength={100} /></Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="registeraddress" label="戶籍登記地址" style={{ marginBottom: '4px' }}><Input maxLength={100} /></Form.Item>
                      </Col>
                    </Row>
                    <Divider style={{ margin: '4px 0' }} />
                    <Row gutter={8}>
                      <Col span={4}>
                        <Form.Item name="liaison" label="🚑 緊急聯絡人" style={{ marginBottom: '2px' }}><Input maxLength={20} /></Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="relationship" label="關係" style={{ marginBottom: '2px' }}><Input maxLength={20} /></Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item name="rmobilephone" label="聯絡人手機" style={{ marginBottom: '2px' }}><Input maxLength={40} /></Form.Item>
                      </Col>
                      <Col span={11}>
                        <Form.Item name="raddress" label="聯絡人地址" style={{ marginBottom: '2px' }}><Input maxLength={100} /></Form.Item>
                      </Col>
                    </Row>
                  </TabPane>

                  <TabPane tab="🔐 安全系統帳號聯動" key="sub3">
                    <div style={{ padding: '8px', border: '1px dashed #faad14', borderRadius: '4px', backgroundColor: '#fffbe6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h5 style={{ margin: 0, color: '#d46b08' }}><LockOutlined /> 身份供應與 ERP 權限系統關聯</h5>
                        <p style={{ fontSize: '12px', margin: '2px 0 0 0', color: '#595959' }}>啟用時後端將對齊 <strong>sys_accounts</strong>。預設密碼與 <strong>工號</strong> 物理相同。刪除此員工將完全撤銷所有 ERP 權力。</p>
                      </div>
                      <div style={{ paddingRight: '24px' }}>
                        <Form.Item name="systemuser" valuePropName="checked" noStyle>
                          <Switch checkedChildren="已開立ERP帳戶" unCheckedChildren="暫無權限" style={{ transform: 'scale(1.1)' }} />
                        </Form.Item>
                      </div>
                    </div>
                  </TabPane>
                </Tabs>
              </div>

              {/* 📊 DETAIL SECTION (下半部自適應) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e8e8e8', borderRadius: '4px', padding: '8px', backgroundColor: '#fff' }}>
                <Tabs defaultActiveKey="det1" size="small" style={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="inner-detail-tabs">
                  
                  {/* DET 1: 學歷 */}
                  <TabPane tab={<span><BookOutlined /> 學歷背景 (es102)</span>} key="det1" style={{ height: '100%', overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#13c2c2', fontSize: '12px', fontWeight: 600 }}>🎓 學位、教育程度歷程明細</span>
                      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddEdu} disabled={!isEditing}>增行</Button>
                    </div>
                    <Table
                      dataSource={educations}
                      rowKey="gkey"
                      pagination={false}
                      size="small"
                      bordered
                      loading={loadingRight}
                      columns={[
                        { title: '學校名稱', dataIndex: 'schoolname', render: (v, r) => <Input value={v} size="small" onChange={e => updateSubItem('es102', r, 'schoolname', e.target.value)} /> },
                        { title: '起迄修業時間', dataIndex: 'daterange', render: (v, r) => <Input value={v} size="small" placeholder="e.g. 2010-2014" onChange={e => updateSubItem('es102', r, 'daterange', e.target.value)} /> },
                        { title: '年資(年)', dataIndex: 'yearterm', width: '100px', render: (v, r) => <InputNumber value={v} size="small" onChange={val => updateSubItem('es102', r, 'yearterm', val)} /> },
                        { title: '學制', dataIndex: 'daynight', width: '120px', render: (v, r) => <Select value={v} size="small" style={{ width: '100%' }} options={[{ value: '1', label: '日間部' }, { value: '2', label: '夜間部' }]} onChange={val => updateSubItem('es102', r, 'daynight', val)} /> },
                        { title: '畢/肄業', dataIndex: 'graduate', width: '110px', render: (v, r) => <Select value={v} size="small" style={{ width: '100%' }} options={[{ value: '1', label: '畢業' }, { value: '2', label: '肄業' }]} onChange={val => updateSubItem('es102', r, 'graduate', val)} /> },
                        { title: '操作', width: '60px', render: (_, r) => <Button danger icon={<DeleteOutlined />} onClick={() => deleteSubItem('es102', r.gkey)} size="small" /> }
                      ]}
                    />
                  </TabPane>

                  {/* DET 2: 經歷 */}
                  <TabPane tab={<span><BookOutlined /> 服務經歷 (es103)</span>} key="det2" style={{ height: '100%', overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#13c2c2', fontSize: '12px', fontWeight: 600 }}>💼 過往任職公司、服務經歷明細</span>
                      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddExp} disabled={!isEditing}>增行</Button>
                    </div>
                    <Table
                      dataSource={experiences}
                      rowKey="gkey"
                      pagination={false}
                      size="small"
                      bordered
                      loading={loadingRight}
                      columns={[
                        { title: '服務機關/公司名稱', dataIndex: 'companyname', render: (v, r) => <Input value={v} size="small" onChange={e => updateSubItem('es103', r, 'companyname', e.target.value)} /> },
                        { title: '任職職務', dataIndex: 'jobposition', render: (v, r) => <Input value={v} size="small" onChange={e => updateSubItem('es103', r, 'jobposition', e.target.value)} /> },
                        { title: '歷時起迄期間', dataIndex: 'daterange', render: (v, r) => <Input value={v} size="small" placeholder="e.g. 2018.05 - 2021.03" onChange={e => updateSubItem('es103', r, 'daterange', e.target.value)} /> },
                        { title: '月薪資', dataIndex: 'salary', width: '120px', render: (v, r) => <InputNumber value={v} size="small" style={{ width: '100%' }} onChange={val => updateSubItem('es103', r, 'salary', val)} /> },
                        { title: '操作', width: '60px', render: (_, r) => <Button danger icon={<DeleteOutlined />} onClick={() => deleteSubItem('es103', r.gkey)} size="small" /> }
                      ]}
                    />
                  </TabPane>

                  {/* DET 3: 眷屬 */}
                  <TabPane tab={<span><TeamOutlined /> 家庭成員 (es104)</span>} key="det3" style={{ height: '100%', overflow: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#13c2c2', fontSize: '12px', fontWeight: 600 }}>👨‍👩‍👧 員工直系、旁系家屬眷屬登記清單</span>
                      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddFam} disabled={!isEditing}>增行</Button>
                    </div>
                    <Table
                      dataSource={families}
                      rowKey="gkey"
                      pagination={false}
                      size="small"
                      bordered
                      loading={loadingRight}
                      columns={[
                        { title: '親屬關係', dataIndex: 'relationship', width: '150px', render: (v, r) => <Input value={v} size="small" onChange={e => updateSubItem('es104', r, 'relationship', e.target.value)} /> },
                        { title: '眷屬姓名', dataIndex: 'familyname', width: '180px', render: (v, r) => <Input value={v} size="small" onChange={e => updateSubItem('es104', r, 'familyname', e.target.value)} /> },
                        { title: '家屬目前服務機關 / 學業單位', dataIndex: 'companyname', render: (v, r) => <Input value={v} size="small" onChange={e => updateSubItem('es104', r, 'companyname', e.target.value)} /> },
                        { title: '操作', width: '60px', render: (_, r) => <Button danger icon={<DeleteOutlined />} onClick={() => deleteSubItem('es104', r.gkey)} size="small" /> }
                      ]}
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
        .ant-input-sm, .ant-select-sm, .ant-input-number-sm, .ant-picker-small { font-size: 12px !important; }
      `}</style>
    </div>
  );
}
