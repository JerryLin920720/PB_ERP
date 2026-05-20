import React, { useState, useEffect } from 'react';
import { Table, Form, Input, Button, message, Space, Row, Col, Card, Divider } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const API_URL = 'http://localhost:8001/api/ba040/';

export default function Ba040Sheet() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // 🔒 編輯模式鎖
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setData(res.data);
      if (res.data.length > 0 && !activeRecord) {
        handleRowSelect(res.data[0]);
      }
      setIsEditing(false); // 檢索重設查詢模式
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
      if (targetSheet === 'ba040') {
        console.log(`⚡ [ba040] Bank Intercepted command: ${action}`);
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

  const handleRowSelect = (record) => {
    setSelectedRowKeys([record.gkey]);
    setActiveRecord(record);
    form.setFieldsValue(record);
  };

  const handleAdd = () => {
    const newRecord = { gkey: 'temp_' + Date.now(), bankno: '' };
    setActiveRecord(newRecord);
    setSelectedRowKeys([newRecord.gkey]);
    setIsEditing(true); // 新增操作解鎖編輯
    form.resetFields();
  };

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

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (activeRecord.gkey.startsWith('temp_')) {
        await axios.post(API_URL, values);
        message.success('新增成功');
      } else {
        await axios.put(`${API_URL}${activeRecord.gkey}/`, values);
        message.success('更新成功');
      }
      setIsEditing(false); // 存檔鎖定
      fetchData();
    } catch (err) {
      if (err.response) {
        message.error(`存檔失敗: ${JSON.stringify(err.response.data)}`);
      } else {
        message.error('表單驗證失敗');
      }
    }
  };

  // ✨ F2 隱性輔助功能 Web 化：一鍵組裝銀行資訊
  const generateBankingInfo = () => {
    const values = form.getFieldsValue();
    const infoLines = [];

    if (values.cbankname) infoLines.push(`Bank Name: ${values.cbankname}`);
    if (values.ebankname) infoLines.push(`Bank Name(E): ${values.ebankname}`);
    if (values.accountno) infoLines.push(`Account No: ${values.accountno}`);
    if (values.accountname) infoLines.push(`Account Name: ${values.accountname}`);
    if (values.swift) infoLines.push(`SWIFT Code: ${values.swift}`);
    if (values.eaddress) infoLines.push(`Address: ${values.eaddress}`);
    if (values.tel) infoLines.push(`Tel: ${values.tel}`);
    if (values.fax) infoLines.push(`Fax: ${values.fax}`);

    const formattedText = infoLines.join('\n');
    form.setFieldsValue({ bankinginformation: formattedText });
    message.success('已自動帶入銀行資訊範本');
  };

  const columns = [
    { title: '銀行代號', dataIndex: 'bankno', key: 'bankno', width: 100 },
    { title: '銀行簡稱', dataIndex: 'shortname', key: 'shortname' }
  ];

  return (
    <div className="modern-sheet-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: '#1890ff' }}>
          🏦 銀行設定檔管理
          {isEditing && <span style={{ fontSize: '13px', color: '#52c41a', marginLeft: '10px' }}>(✏️ 編輯中)</span>}
        </h3>
        <span style={{ color: '#8c8c8c', fontSize: '12.5px' }}>💡 點擊頂部【編輯】或【雙擊左側行】解開編輯鎖</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '16px', minHeight: 0 }}>
        {/* 上方 Grid (清單) */}
        <div style={{ height: '35%', flexShrink: 0, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: '8px', backgroundColor: '#fff' }}>
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
              onDoubleClick: () => setIsEditing(true) // 雙擊極速解鎖
            })}
          />
        </div>

        {/* 下方 Form (明細編輯) */}
        <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#fff', padding: '24px', border: '1px solid #d9d9d9', borderRadius: '8px' }}>
          <Form form={form} layout="vertical" disabled={!isEditing || !activeRecord}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="bankno" label="銀行代號" rules={[{ required: true }]}>
                  <Input maxLength={10} style={{ textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="shortname" label="銀行簡稱" rules={[{ required: true }]}>
                  <Input maxLength={20} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="cbankname" label="銀行名稱 (中)" rules={[{ required: true }]}>
                  <Input maxLength={80} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ebankname" label="銀行名稱 (英)">
                  <Input maxLength={150} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="accountno" label="銀行帳號"><Input maxLength={30} /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="accountname" label="銀行戶名"><Input maxLength={50} /></Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="tel" label="連絡電話"><Input maxLength={40} /></Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="fax" label="傳真號碼"><Input maxLength={40} /></Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="swift" label="SWIFT Code"><Input maxLength={100} /></Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="caddress" label="中文地址"><Input maxLength={100} /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="eaddress" label="英文地址"><Input maxLength={250} /></Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="cable" label="電報掛號 (Cable)"><Input maxLength={250} /></Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="telex" label="電傳號碼 (Telex)"><Input maxLength={100} /></Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">信用狀與詳細資訊設定</Divider>

            <Form.Item name="lcdescription" label="L/C 信用狀條款">
              <TextArea rows={4} />
            </Form.Item>

            <Form.Item
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>Banking Information (銀行詳細資訊匯總)</span>
                  <Button size="small" type="dashed" onClick={generateBankingInfo}>✨ 帶入表單資訊</Button>
                </div>
              }
              name="bankinginformation"
            >
              <TextArea rows={6} />
            </Form.Item>

            <Form.Item name="remark" label="備註">
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
