import React from 'react';
import { Form, Input, Switch, Row, Col } from 'antd';
import createGridFormSheet from '../components/erp/factory/createGridFormSheet';

/**
 * BA005Sheet - 公司主體基本設定 (SingleTableSheet-GridForm 試點)
 */
export default createGridFormSheet({
  sheetId: 'ba005',
  title: '公司主體基本設定',
  breadcrumb: ['基本資料管理', '公司主體設定'],
  apiUrl: '/ba005/',
  rowKey: 'gkey',
  
  layout: {
    gridHeight: 140,
    gridFormGap: 8,
    compact: true
  },
  
  fieldLabels: {
    companycode: '公司代碼',
    shortname: '公司簡稱',
    cname: '公司名稱(中)',
    ename: '公司名稱(英)',
    tel1: '電話 1',
    fax1: '傳真 1',
    caddress: '中文地址',
    eaddress: '英文地址'
  },

  // 新增記錄時的預設值
  createDefaultRow: (existingRows) => {
    const isFirst = existingRows.length === 0;
    return {
      companycode: '',
      shortname: '',
      cname: '',
      ename: '',
      major: isFirst ? 'Y' : 'N',
      type: '1'
    };
  },

  // 載入 Form 前的資料處理 (將資料庫 Y/N 轉為開關需要的 Boolean)
  prepareFormValues: (record) => {
    return {
      ...record,
      major: record.major === 'Y'
    };
  },

  // 送出 Payload 前的資料處理 (將 Boolean 轉回 Y/N，並將公司代碼轉大寫)
  buildPayload: (values) => {
    return {
      ...values,
      companycode: values.companycode?.toUpperCase(),
      major: values.major ? 'Y' : 'N'
    };
  },

  // 即時計算防呆與欄位聯動
  onValuesChange: (changedValues, allValues, form) => {
    if ('eaddress' in changedValues) {
      if (!allValues.shipper || allValues.shipper.trim() === '') {
        form.setFieldsValue({ shipper: changedValues.eaddress });
      }
    }
  },

  columns: [
    { title: '公司代碼', dataIndex: 'companycode', key: 'companycode', width: 120 },
    { title: '公司簡稱', dataIndex: 'shortname', key: 'shortname', width: 150 },
    { title: '公司名稱(中)', dataIndex: 'cname', key: 'cname' },
    { 
      title: '主要公司', 
      dataIndex: 'major', 
      key: 'major', 
      width: 100,
      render: (text) => text === 'Y' ? <span style={{ color: '#52c41a', fontWeight: 'bold' }}>是</span> : '否'
    }
  ],

  // 表單渲染配置
  renderForm: ({ form, isEditing, selectedRow }) => {
    return (
      <>
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
            <Form.Item name="tel1" label="電話 1"><Input maxLength={40} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="tel2" label="電話 2"><Input maxLength={40} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="fax1" label="傳真 1"><Input maxLength={40} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="fax2" label="傳真 2"><Input maxLength={40} /></Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="caddress" label="中文地址"><Input maxLength={200} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="eaddress" label="英文地址"><Input maxLength={250} /></Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="shipper" label="出貨人抬頭"><Input maxLength={250} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="taxaddress" label="發票登記地址"><Input maxLength={250} /></Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="contact" label="聯絡人"><Input maxLength={30} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="boss" label="負責人"><Input maxLength={20} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="taxno" label="統一編號"><Input maxLength={20} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="email" label="電子信箱"><Input maxLength={50} /></Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="website" label="官方網站"><Input maxLength={100} /></Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="logopath" label="公司 LOGO (未實作檔案伺服器前暫存字串)">
              <Input maxLength={255} placeholder="Logo 檔案路徑" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  }
});
