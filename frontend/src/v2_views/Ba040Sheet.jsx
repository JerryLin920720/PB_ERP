import React from 'react';
import { Form, Input, Button, Row, Col, Divider, message } from 'antd';
import createGridFormSheet from '../components/erp/factory/createGridFormSheet';

const { TextArea } = Input;

/**
 * BA040Sheet - 銀行基本資料設定 (SingleTableSheet-GridForm 實作)
 */
export default createGridFormSheet({
  sheetId: 'ba040',
  title: '銀行基本資料設定',
  breadcrumb: ['基本資料管理', '銀行基本資料'],
  apiUrl: '/ba040/',
  rowKey: 'gkey',

  layout: {
    gridHeight: 180,
    gridFormGap: 8,
    compact: true
  },

  fieldLabels: {
    bankno: '銀行代號',
    shortname: '銀行簡稱',
    cbankname: '銀行名稱(中)',
    ebankname: '銀行名稱(英)',
    accountno: '銀行帳號',
    accountname: '銀行戶名',
    swift: 'SWIFT Code'
  },

  createDefaultRow: () => {
    return {
      bankno: '',
      shortname: '',
      cbankname: '',
      ebankname: '',
      tel: '',
      fax: '',
      swift: '',
      caddress: '',
      eaddress: '',
      cable: '',
      accountno: '',
      accountname: '',
      telex: '',
      lcdescription: '',
      bankinginformation: '',
      remark: ''
    };
  },

  buildPayload: (values) => {
    return {
      ...values,
      bankno: values.bankno?.toUpperCase()
    };
  },

  columns: [
    { title: '銀行代號', dataIndex: 'bankno', key: 'bankno', width: 120 },
    { title: '銀行簡稱', dataIndex: 'shortname', key: 'shortname', width: 200 },
    { title: '銀行名稱 (中)', dataIndex: 'cbankname', key: 'cbankname' }
  ],

  renderForm: ({ form, isEditing, selectedRow }) => {
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

    return (
      <>
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

        <Divider orientation="left" style={{ margin: '12px 0', fontSize: '13px' }}>信用狀與詳細資訊設定</Divider>

        <Form.Item name="lcdescription" label="L/C 信用狀條款">
          <TextArea rows={3} />
        </Form.Item>

        <Form.Item
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span>Banking Information (銀行詳細資訊匯總)</span>
              <Button 
                size="small" 
                type="dashed" 
                onClick={generateBankingInfo}
                disabled={!isEditing}
                style={{ fontSize: '11px', height: '20px' }}
              >
                ✨ 帶入表單資訊
              </Button>
            </div>
          }
          name="bankinginformation"
        >
          <TextArea rows={4} />
        </Form.Item>

        <Form.Item name="remark" label="備註">
          <TextArea rows={2} />
        </Form.Item>
      </>
    );
  }
});
