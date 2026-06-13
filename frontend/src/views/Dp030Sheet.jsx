import React from 'react';
import { getProgramConfig } from '../config/programRegistry';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import Dp031SizeGridTab, { validateDp031Rows } from '../components/dp030/Dp031SizeGridTab';
import { Form, Row, Col, Input, Select, DatePicker } from 'antd';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import dayjs from 'dayjs';

// Load config
const baseConfig = getProgramConfig('dp030');

// Inject the custom renderer component into the detailTabs config
baseConfig.detailTabs = baseConfig.detailTabs.map(tab => {
  if (tab.key === 'dp031') {
    return { ...tab, renderer: Dp031SizeGridTab };
  }
  return tab;
});

// DP030 Master Form Renderer
const renderMasterForm = ({ form, isEditing }) => (
  <Row gutter={16}>
    <Col span={6}>
      <Form.Item name="sampleno" label="指令號">
        <Input disabled />
      </Form.Item>
    </Col>
    <Col span={6}>
      <Form.Item name="styleno" label="型體編號" rules={[{ required: true }]}>
        <Input disabled={!isEditing} />
      </Form.Item>
    </Col>
    <Col span={6}>
      <Form.Item name="stylename" label="型體名稱">
        <Input disabled={!isEditing} />
      </Form.Item>
    </Col>
    <Col span={6}>
      <Form.Item name="status" label="狀態">
        <Select disabled>
          <Select.Option value="1">進行中</Select.Option>
          <Select.Option value="2">已寄出</Select.Option>
          <Select.Option value="3">已完成</Select.Option>
          <Select.Option value="0">已取消</Select.Option>
        </Select>
      </Form.Item>
    </Col>
    
    <Col span={6}>
      <Form.Item name="issuedate" label="開單日期">
        <DatePicker disabled={!isEditing} style={{ width: '100%' }} />
      </Form.Item>
    </Col>
    <Col span={6}>
      <Form.Item name="year" label="年度" rules={[{ required: true }]}>
        <Input disabled={!isEditing} />
      </Form.Item>
    </Col>
    <Col span={6}>
      <ERPLookupField
        name="ba010gkey"
        label="客戶"
        lookupKey="customers"
        disabled={!isEditing}
        required
      />
    </Col>
    <Col span={6}>
      <ERPLookupField
        name="ba015gkey"
        label="工廠"
        lookupKey="factories"
        disabled={!isEditing}
      />
    </Col>
    <Col span={6}>
      <ERPLookupField
        name="ba055gkey"
        label="季節"
        lookupKey="seasons"
        disabled={!isEditing}
      />
    </Col>
    <Col span={6}>
      <ERPLookupField
        name="dp002gkey"
        label="開發類別"
        lookupKey="sampleTypes"
        disabled={!isEditing}
      />
    </Col>
  </Row>
);

baseConfig.renderMasterForm = renderMasterForm;

baseConfig.validateAll = (master, detailStates) => {
  const dp031Rows = detailStates['dp031']?.rows || [];
  const errors = validateDp031Rows(dp031Rows);
  if (errors && errors.length > 0) {
    throw new Error(errors.map(e => e.message).join('\n'));
  }
};


// Build the component
const Dp030Sheet = createRecordWorkbenchSheet(baseConfig);
export default Dp030Sheet;
