import React, { useState, useEffect } from 'react';
import { Table, Form, Input, Button, Switch, Upload, message, Divider, Space, Row, Col, Card } from 'antd';
import { UploadOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api/ba005/';

export default function Ba005Sheet() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // 🔒 專屬編輯鎖
  const [form] = Form.useForm();
  
  // 載入資料
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setData(res.data);
      if (res.data.length > 0 && !activeRecord) {
        handleRowSelect(res.data[0]);
      }
      setIsEditing(false); // 檢索自動重設為查詢模式
    } catch (err) {
      message.error('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ⚡ 全域 MDI 廣播指令接收器
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'ba005') {
        console.log(`⚡ [ba005] Company Intercepted command: ${action}`);
        if (action === 'retrieve') fetchData();
        else if (action === 'edit') setIsEditing(true); // 進入編輯模式
        else if (action === 'insert') handleAdd();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [data, activeRecord]);

  // 選擇列，觸發表單聯動
  const handleRowSelect = (record) => {
    setSelectedRowKeys([record.gkey]);
    setActiveRecord(record);
    form.setFieldsValue({
      ...record,
      major: record.major === 'Y'
    });
  };

  // 新增記錄
  const handleAdd = () => {
    const isFirst = data.length === 0;
    const newRecord = { 
      gkey: 'temp_' + Date.now(), 
      companycode: '', 
      major: isFirst // 若為第一筆，自動設為主要公司
    };
    setActiveRecord(newRecord);
    setSelectedRowKeys([newRecord.gkey]);
    setIsEditing(true); // 新增操作解除編輯鎖
    form.resetFields();
    form.setFieldsValue({ major: isFirst });
  };

  // 刪除記錄
  const handleDelete = async () => {
    if (!activeRecord || activeRecord.gkey.startsWith('temp_')) {
      message.warning('請選擇有效的資料刪除');
      return;
    }
    try {
      await axios.delete(`${API_URL}${activeRecord.gkey}/`);
      message.success('刪除成功');
      setActiveRecord(null);
      form.resetFields();
      fetchData();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  // 儲存記錄
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        major: values.major ? 'Y' : 'N'
      };

      if (activeRecord.gkey.startsWith('temp_')) {
        // Create
        await axios.post(API_URL, payload);
        message.success('新增成功');
      } else {
        // Update
        await axios.put(`${API_URL}${activeRecord.gkey}/`, payload);
        message.success('更新成功');
      }
      setIsEditing(false); // 存檔閉鎖
      fetchData();
    } catch (err) {
      if (err.response) {
        message.error(`存檔失敗: ${JSON.stringify(err.response.data)}`);
      } else {
        message.error('表單驗證失敗');
      }
    }
  };

  // 即時計算防呆邏輯
  const handleValuesChange = (changedValues, allValues) => {
    if ('eaddress' in changedValues) {
      if (!allValues.shipper || allValues.shipper.trim() === '') {
        form.setFieldsValue({ shipper: changedValues.eaddress });
      }
    }
  };

  const columns = [
    { title: '公司代碼', dataIndex: 'companycode', key: 'companycode', width: 120 },
    { title: '公司簡稱', dataIndex: 'shortname', key: 'shortname', width: 150 },
    { title: '公司名稱(中)', dataIndex: 'cname', key: 'cname' },
    { 
      title: '主要公司', 
      dataIndex: 'major', 
      key: 'major', 
      width: 100,
      render: (text) => text === 'Y' ? <span style={{color: 'green'}}>是</span> : '否'
    }
  ];

  return (
    <div className="modern-sheet-container">
      {/* 工具列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#1890ff' }}>
          🏢 公司主體基本設定
          {isEditing && <span style={{ fontSize: '13px', color: '#52c41a', marginLeft: '10px' }}>(✏️ 編輯中)</span>}
        </h3>
        <span style={{ color: '#8c8c8c', fontSize: '12.5px' }}>💡 點擊頂部【編輯】或【雙擊上表行】可解除輸入格鎖定</span>
      </div>

      {/* Grid 區域 (上半部) */}
      <div style={{ flex: '0 0 35%', overflow: 'auto', marginBottom: '16px', border: '1px solid #d9d9d9', borderRadius: '8px' }}>
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="gkey"
          size="small"
          pagination={false}
          loading={loading}
          rowSelection={{
            type: 'radio',
            selectedRowKeys,
            onChange: (keys, rows) => handleRowSelect(rows[0])
          }}
          onRow={(record) => ({
            onClick: () => handleRowSelect(record),
            onDoubleClick: () => setIsEditing(true) // 雙擊極速開鎖
          })}
        />
      </div>

      {/* Form 區域 (下半部) */}
      <div style={{ flex: '1', overflow: 'auto', backgroundColor: '#fff', padding: '24px', border: '1px solid #d9d9d9', borderRadius: '8px' }}>
        <Form 
          form={form} 
          layout="vertical" 
          onValuesChange={handleValuesChange}
          disabled={!isEditing || !activeRecord}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="companycode" label="公司代碼" rules={[{ required: true }]}>
                <Input maxLength={10} style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="shortname" label="公司簡稱" rules={[{ required: true }]}>
                <Input maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="major" label="主要公司" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cname" label="公司名稱 (中)" rules={[{ required: true }]}>
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ename" label="公司名稱 (英)" rules={[{ required: true }]}>
                <Input maxLength={60} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="tel1" label="電話 1"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="tel2" label="電話 2"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fax1" label="傳真 1"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fax2" label="傳真 2"><Input /></Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="caddress" label="中文地址"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="eaddress" label="英文地址"><Input /></Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="shipper" label="出貨人抬頭"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="taxaddress" label="發票登記地址"><Input /></Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="contact" label="聯絡人"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="boss" label="負責人"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="taxno" label="統一編號"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="email" label="電子信箱"><Input /></Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
             <Col span={12}>
              <Form.Item name="website" label="官方網站"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="logopath" label="公司 LOGO (未實作檔案伺服器前暫存字串)">
                <Input placeholder="Logo 檔案路徑" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
}
