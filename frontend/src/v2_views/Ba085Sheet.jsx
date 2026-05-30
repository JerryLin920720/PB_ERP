import React from 'react';
import { Form, InputNumber, Select, Row, Col, Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import createGridFormSheet from '../components/erp/factory/createGridFormSheet';

/**
 * BA085Sheet - SIZERUN 尺碼設定 (SingleTableSheet-GridForm 實作)
 */
export default createGridFormSheet({
  sheetId: 'ba085',
  title: 'SIZERUN 尺碼設定',
  breadcrumb: ['基本資料管理', '尺碼序列設定'],
  apiUrl: '/ba085/',
  rowKey: 'gkey',
  sequenceField: 'serialno',
  autoRenumber: true,

  layout: {
    gridHeight: 180,
    gridFormGap: 8,
    compact: true
  },

  fieldLabels: {
    serialno: '序列號',
    startsize: '起始碼數',
    endsize: '結束碼數',
    fullhalf: '刻度增量模式',
    maxsize: '最大防呆保護上限'
  },

  createDefaultRow: () => {
    return {
      serialno: '',
      startsize: 0,
      endsize: 0,
      fullhalf: '1',
      maxsize: null
    };
  },

  // 跨邊界防呆驗證邏輯
  validateRow: (values) => {
    if (values.startsize > values.endsize) {
      if (values.maxsize === null || values.maxsize === undefined || values.maxsize < values.startsize) {
        return '🚨 跨界防呆警報：當起始碼大於結束碼時，最大防呆值不能為空且必須大於等於起始碼！';
      }
    }
    return null;
  },

  columns: [
    { title: '序列號', dataIndex: 'serialno', key: 'serialno', width: 90 },
    { title: '起始碼', dataIndex: 'startsize', key: 'startsize', width: 120 },
    { title: '結束碼', dataIndex: 'endsize', key: 'endsize', width: 120 },
    { 
      title: '增量模式', 
      dataIndex: 'fullhalf', 
      key: 'fullhalf',
      width: 150,
      render: (val) => val === '1' ? '全號 (+1.0)' : val === '2' ? '半號 (+0.5)' : '雙碼 (+1.0)'
    },
    { title: '最大防呆上限', dataIndex: 'maxsize', key: 'maxsize', width: 150 },
    { 
      title: '系統渲染尺碼帶', 
      dataIndex: 'sizerange', 
      key: 'sizerange',
      render: (val) => <strong style={{ color: 'var(--primary-color)' }}>{val}</strong>
    }
  ],

  renderForm: ({ form, isEditing, selectedRow }) => {
    // 監聽 Form 內部數值以決定是否顯示跨界警報
    return (
      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.startsize !== curr.startsize || prev.endsize !== curr.endsize}>
        {() => {
          const startVal = form.getFieldValue('startsize');
          const endVal = form.getFieldValue('endsize');
          const showMathAlert = startVal !== null && endVal !== null && Number(startVal) > Number(endVal);

          return (
            <>
              <Alert
                message="鞋業尺碼步進提示"
                description="尺碼步進 (fullhalf) 決定了工廠做工及排單的物理步進。半號增量為 +0.5；兩碼一組增量為 +1.0 且常用於室內拖鞋、雨靴的尺碼序列。"
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: '16px' }}
              />

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="serialno" label="序列號">
                    <InputNumber disabled style={{ width: '100%' }} placeholder="系統自動排定" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="startsize" label="📏 起始碼數 (StartSize)" rules={[{ required: true, message: '必填' }]}>
                    <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="endsize" label="📉 結束碼數 (EndSize)" rules={[{ required: true, message: '必填' }]}>
                    <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="fullhalf" label="🎛️ 刻度增量模式" rules={[{ required: true, message: '必填' }]}>
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
                  message="跨界防呆強制約束中"
                  description="您設置的 [起始碼] 大於 [結束碼]，這在跨年度越洋訂單中很常見。依據系統物理公式，您必須在此強制填寫 [最大防呆保護上限]，且其值必須大於等於起始碼。"
                  type="warning"
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              )}
            </>
          );
        }}
      </Form.Item>
    );
  }
});
