import React from 'react';
import { getProgramConfig } from '../config/programRegistry';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import { Form, Input, Row, Col, Select } from 'antd';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

// BA015 Master Form Renderer
const renderMasterForm = (form, isEditing) => (
  <Form form={form} layout="vertical">
    <Row gutter={16}>
      <Col span={6}>
        <Form.Item name="factno" label="工廠代號" rules={[{ required: true }]}>
          <Input disabled={!isEditing} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item name="shortname" label="簡稱" rules={[{ required: true }]}>
          <Input disabled={!isEditing} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="factname" label="工廠全名">
          <Input disabled={!isEditing} />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={6}>
        <Form.Item name="type" label="類別" rules={[{ required: true }]}>
          <Select disabled={!isEditing}>
            <Select.Option value="1">工廠</Select.Option>
            <Select.Option value="2">材料商</Select.Option>
            <Select.Option value="3">供應商</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item name="tel1" label="電話">
          <Input disabled={!isEditing} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="caddress" label="中文地址">
          <Input disabled={!isEditing} />
        </Form.Item>
      </Col>
    </Row>
  </Form>
);

const Ba015SheetConfig = {
  sheetId: 'ba015',
  title: '工廠資料管理 (Golden Sample)',
  breadcrumb: ['基本資料', 'BA015 工廠資料管理'],
  masterKey: 'gkey',
  api: {
    list: '/api/ba/ba015/',
    get: (id) => `/api/ba/ba015/${id}/`,
    create: '/api/ba/ba015/deep_save/',
    update: (id) => `/api/ba/ba015/deep_save/`,
    delete: (id) => `/api/ba/ba015/${id}/`
  },
  createDefaultRecord: () => ({ type: '1' }),
  buildDeepSavePayload: (master, details) => ({
    master,
    details: { ba016: details.ba016 }
  }),
  renderMasterForm,
  detailTabs: [
    {
      key: 'ba016',
      tabLabel: '聯絡人',
      apiEndpoint: '/api/ba/ba016/',
      columns: [
        { dataIndex: 'cname', title: '聯絡人姓名', width: 150, editable: true },
        { dataIndex: 'tel', title: '電話', width: 150, editable: true },
        { dataIndex: 'email', title: '電子郵件', width: 250, editable: true },
        { dataIndex: 'remark', title: '備註', width: 300, editable: true },
      ],
      defaultRow: { cname: '' }
    }
  ]
};

export default createRecordWorkbenchSheet(Ba015SheetConfig);
