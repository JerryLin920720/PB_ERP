import React, { useState, useEffect } from 'react';
import { Table, Form, Input, InputNumber, Button, Select, Space, Card, message, Popconfirm, Row, Col, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = 'http://localhost:8001/api/ba085/';

export default function Ba085Sheet() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  
  // For dynamic locking display
  const [startVal, setStartVal] = useState(null);
  const [endVal, setEndVal] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setData(res.data);
      if (res.data.length > 0 && !activeRecord) {
        handleRowSelect(res.data[0]);
      }
    } catch (err) {
      message.error('載入尺碼組失敗');
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
      if (targetSheet === 'ba085') {
        console.log(`⚡ [ba085] Sizerun Intercepted command: ${action}`);
        if (action === 'retrieve') fetchData();
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
    setStartVal(record.startsize);
    setEndVal(record.endsize);
  };

  const handleAdd = () => {
    const tempGkey = `temp_${Date.now()}`;
    const newRec = { gkey: tempGkey, startsize: 0, endsize: 0, fullhalf: '1', maxsize: null };
    setData([...data, newRec]);
    setActiveRecord(newRec);
    setSelectedRowKeys([tempGkey]);
    form.resetFields();
    form.setFieldsValue(newRec);
    setStartVal(0);
    setEndVal(0);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // Frontend Math Validation per wf_check_last_sizerun
      if (values.startsize > values.endsize) {
        if (values.maxsize === null || values.maxsize === undefined || values.maxsize < values.startsize) {
          message.error('🚨 跨界防呆警報：當起始碼大於結束碼時，最大防呆值不能為空且必須大於等於起始碼！');
          return;
        }
      }

      let savedGkey = activeRecord.gkey;
      if (activeRecord.gkey.startsWith('temp_')) {
        const res = await axios.post(API_URL, values);
        savedGkey = res.data.gkey;
        message.success('新增尺碼序列成功');
      } else {
        await axios.put(`${API_URL}${activeRecord.gkey}/`, values);
        message.success('尺碼序列修改存檔成功');
      }
      
      // Refresh list & preserve
      const resList = await axios.get(API_URL);
      setData(resList.data);
      const saved = resList.data.find(d => d.gkey === savedGkey);
      if (saved) {
        setActiveRecord(saved);
        setSelectedRowKeys([savedGkey]);
        form.setFieldsValue(saved);
      }
    } catch (err) {
      message.error('儲存失敗: ' + (err.response?.data?.non_field_errors || err.response?.data?.detail || JSON.stringify(err.response?.data)));
    }
  };

  const handleDelete = async () => {
    if (activeRecord.gkey.startsWith('temp_')) {
      setData(data.filter(d => d.gkey !== activeRecord.gkey));
      setActiveRecord(null);
      return;
    }
    try {
      await axios.delete(`${API_URL}${activeRecord.gkey}/`);
      message.success('刪除成功');
      setActiveRecord(null);
      form.resetFields();
      fetchData();
    } catch (err) { message.error('刪除失敗'); }
  };

  // Show warning warning box dynamically if start > end and maxsize lacks
  const showMathAlert = startVal !== null && endVal !== null && Number(startVal) > Number(endVal);

  const columns = [
    { title: '序列號', dataIndex: 'serialno', width: '80px' },
    { title: '起始碼', dataIndex: 'startsize' },
    { title: '結束碼', dataIndex: 'endsize' },
    { 
      title: '增量模式', 
      dataIndex: 'fullhalf',
      render: (val) => val === '1' ? '全號 (+1.0)' : val === '2' ? '半號 (+0.5)' : '雙碼 (+1.0)'
    },
    { title: '最大防呆上限', dataIndex: 'maxsize' },
    { 
      title: '系統渲染尺碼帶', 
      dataIndex: 'sizerange',
      render: (val) => <strong style={{ color: '#1890ff' }}>{val}</strong>
    }
  ];

  return (
    <div className="modern-sheet-container">
      
      {/* 左側：SIZERUN清單表格 */}
      <div style={{ width: '450px', flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontWeight: 600 }}>🧬 SIZE RUN 生命矩陣清單</h4>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="gkey"
            loading={loading}
            pagination={false}
            size="small"
            rowSelection={{
              type: 'radio',
              selectedRowKeys,
              onChange: (keys, rows) => handleRowSelect(rows[0])
            }}
            onRow={(record) => ({
              onClick: () => handleRowSelect(record)
            })}
          />
        </div>
      </div>

      {/* 右側：卡片式詳細資料維護面板 */}
      <div style={{ flex: 1 }}>
        <Card
          title={<span style={{ fontWeight: 600, color: '#722ed1' }}>🎛️ 尺碼刻度增量編輯器</span>}
          extra={<span style={{ color: '#8c8c8c', fontSize: '12.5px' }}>💡 請使用頂部工具列進行操作</span>}
          style={{ height: '100%', borderRadius: '8px', border: '1px solid #d9d9d9' }}
        >
          {activeRecord ? (
            <Form form={form} layout="vertical" onValuesChange={(c) => {
              if ('startsize' in c) setStartVal(c.startsize);
              if ('endsize' in c) setEndVal(c.endsize);
            }}>
              
              <Alert
                message="鞋業尺碼步進提示"
                description="尺碼步進 (fullhalf) 決定了工廠做工及排單的物理步進。半號增量為 +0.5；兩碼一組增量為 +1.0 且常用於室內拖鞋、雨靴的尺碼序列。"
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: '20px' }}
              />

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="startsize" label="📏 起始碼數 (StartSize)" rules={[{ required: true, message: '必填' }]}>
                    <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="endsize" label="📉 結束碼數 (EndSize)" rules={[{ required: true, message: '必填' }]}>
                    <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="fullhalf" label="🎛️ 刻度增量模式" rules={[{ required: true }]}>
                    <Select options={[
                      { value: '1', label: '全號 (Whole Sizes: - )' },
                      { value: '2', label: '半號 (Half Sizes: ／ )' },
                      { value: '3', label: '兩碼一組 (Double Sizes: & )' }
                    ]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="maxsize" label="⚠️ 最大防呆保護上限 (MaxSize)" tooltip="當跨邊界尺碼（起始碼大於結束碼）時必填">
                    <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="若起始>結束則必填" />
                  </Form.Item>
                </Col>
              </Row>

              {showMathAlert && (
                <Alert
                  message="跨界防呆強制约束中"
                  description="您設置的 [起始碼] 大於 [結束碼]，這在跨年度越洋訂單中很常見。依據系統物理公式，您必須在此強制填寫 [最大防呆保護上限]，且其值必須大於等於起始碼。"
                  type="warning"
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              )}

            </Form>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px', color: '#bfbfbf' }}>
              請點擊左側清單或按「新增」按鈕開始維護尺碼組
            </div>
          )}
        </Card>
      </div>
      
      <style>{`
        .ant-table-row-selected td {
          background-color: #f9f0ff !important;
        }
      `}</style>
    </div>
  );
}
