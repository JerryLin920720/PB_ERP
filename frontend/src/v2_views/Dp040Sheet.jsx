/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-unused-vars */
import React from 'react';
import { Form, Row, Col, Input, InputNumber, Button, Space, Select } from 'antd';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import Dp040SampleTab from './dp040/Dp040SampleTab';
import Dp040PackingTab from './dp040/Dp040PackingTab';
import dayjs from 'dayjs';
import axios from 'axios';
import GuardedField from '../components/erp/auth/GuardedField';

// Dp040 (Invoice Master) workbench definition
export default createRecordWorkbenchSheet({
  sheetId: 'dp040',
  title: 'DP040 樣品寄出資料管理',
  breadcrumb: ['開發管理', 'DP040 樣品寄出資料管理'],
  mainClassName: 'dp040-main-scroll',
  layout: {
    contentScroll: true,
    contentHeight: 'calc(100vh - 150px)'
  },

  api: {
    listUrl: 'http://localhost:8001/api/dp040/',
    deleteUrl: 'http://localhost:8001/api/dp040/',
    deepSaveUrl: 'http://localhost:8001/api/dp040/deep_save/',
  },

  masterKey: 'gkey',

  sidebar: {
    title: '出貨單清單',
    getDisplayText: (row) => row.invoiceno || row.gkey,
  },

  createDefaultRecord: () => ({
    gkey: `temp_${Date.now()}`,
    invoiceno: `INV-${dayjs().format('YYMM')}-${Math.floor(1000 + Math.random() * 9000)}`,
    sentdate: dayjs().format('YYYY-MM-DD'),
    year: String(new Date().getFullYear()),
    approve: 'N',
    freightcost: 0,
    courier: '',
    awbno: '',
    attention: '',
    regards: '',
    freight: '',
    remark: '',
    banking: '',
  }),

  query: {
    buildParams: (values) => {
      const params = {};
      if (values.invoiceno) params.invoiceno = values.invoiceno;
      if (values.year) params.year = values.year;
      if (values.ba010gkey) params.ba010gkey = values.ba010gkey;
      if (values.ba055gkey) params.ba055gkey = values.ba055gkey;
      if (values.sentdate_start) params.sentdate_start = values.sentdate_start;
      if (values.sentdate_end) params.sentdate_end = values.sentdate_end;
      if (values.styleno) params.styleno = values.styleno;
      if (values.stylename) params.stylename = values.stylename;
      if (values.stock) params.stock = values.stock;
      if (values.dp002gkey) params.dp002gkey = values.dp002gkey;
      if (values.sampleno) params.sampleno = values.sampleno;
      if (values.awbno) params.awbno = values.awbno;
      if (values.es101gkey) params.es101gkey = values.es101gkey;
      if (values.approve) params.approve = values.approve;
      if (values.ba009gkey) params.ba009gkey = values.ba009gkey;
      return params;
    },
  },

  list: {
    columns: [
      { title: '出貨單號', dataIndex: 'invoiceno', width: 150 },
      {
        title: '出貨日期',
        dataIndex: 'sentdate',
        width: 120,
        render: (val) => (val ? dayjs(val).format('YYYY-MM-DD') : '-'),
      },
      { title: '客戶', dataIndex: 'ba010_shortname', width: 120 },
      { title: '快遞公司', dataIndex: 'courier', width: 120 },
      { title: '快遞單號 (AWB)', dataIndex: 'awbno', width: 150 },
      { title: '製單人', dataIndex: 'maker_name', width: 120 },
      { title: '年度', dataIndex: 'year', width: 80 },
      { title: '季節', dataIndex: 'ba055_code', width: 80 },
      {
        title: '總金額',
        dataIndex: 'amount',
        width: 100,
        align: 'right',
        render: (val) => (val ? parseFloat(val).toFixed(2) : '0.00'),
      },
      {
        title: '審核',
        dataIndex: 'approve',
        width: 80,
        align: 'center',
        render: (val) => (val === 'Y' ? '已審核' : '未審核'),
      },
    ],
  },

  validateMasterRow: (values) => {
    if (!values.invoiceno || !values.invoiceno.trim()) {
      throw new Error('Invoice No is required!');
    }
    if (!values.sentdate) {
      throw new Error('Sent Date is required!');
    }
    if (!values.ba010gkey) {
      throw new Error('Customer is required!');
    }
  },

  validateAll: (record, detailStates) => {
    // 1. Master validates
    if (!record.invoiceno || !record.invoiceno.trim()) {
      throw new Error('Invoice No is required!');
    }
    if (!record.sentdate) {
      throw new Error('Sent Date is required!');
    }
    if (!record.ba010gkey) {
      throw new Error('Customer is required!');
    }

    // 2. Samples / dp041 validates
    const samples = detailStates.samples?.rows || [];
    if (samples.length === 0) {
      throw new Error('Please add at least one sample item!');
    }

    samples.forEach((row, i) => {
      const idx = i + 1;
      const sentpairs = parseFloat(row.sentpairs || 0);
      const price = parseFloat(row.price || 0);
      if (sentpairs <= 0) {
        throw new Error(`Row ${idx}: SendPairs must be greater than 0!`);
      }
      if (price < 0) {
        throw new Error(`Row ${idx}: UnitPrice cannot be negative!`);
      }
      if (!row.dp033gkey) {
        throw new Error(`Row ${idx}: Missing sample size link (dp033)!`);
      }
    });

    // 3. Cartons / dp042 validates
    const cartons = detailStates.cartons?.rows || [];
    const cartonNames = new Set();
    cartons.forEach((c, i) => {
      const idx = i + 1;
      if (!c.carton || !c.carton.trim()) {
        throw new Error(`Row ${idx}: Carton number cannot be empty!`);
      }
      if (cartonNames.has(c.carton.trim())) {
        throw new Error(`Row ${idx}: Carton number [${c.carton.trim()}] is duplicated!`);
      }
      cartonNames.add(c.carton.trim());
    });

    // 4. Packing / dp043 validates
    const packing = detailStates.packing?.rows || [];
    packing.forEach((p, i) => {
      const idx = i + 1;
      const qty = parseFloat(p.qty || 0);
      if (qty <= 0) {
        throw new Error(`Row ${idx}: Packing Qty must be greater than 0!`);
      }
      if (!p.dp042gkey) {
        throw new Error(`Row ${idx}: Missing Carton link!`);
      }
      if (!p.dp041gkey) {
        throw new Error(`Row ${idx}: Missing Item link!`);
      }
    });

    // 5. Carton balance validations
    if (cartons.length === 0 && packing.length === 0) {
      return;
    }

    samples.forEach((sample) => {
      const sampleKey = sample.gkey;
      const matchPacking = packing.filter(
        (p) => p.dp041gkey === sampleKey
      );
      const packedQty = matchPacking.reduce((sum, p) => sum + parseFloat(p.qty || 0), 0);
      const sentpairs = parseFloat(sample.sentpairs || 0);

      if (Math.abs(packedQty - sentpairs) > 0.0001) {
        const styleno = sample.styleno || 'Unknown';
        const size = sample.size || 'Unknown';
        throw new Error(
          `Style ${styleno} Size ${size}: Sent pairs (${sentpairs}) and Packed pairs (${packedQty}) are unbalanced!`
        );
      }
    });
  },

  buildDeepSavePayload: (master, detailStates) => {
    const cleanMaster = { ...master };
    const readOnlyFields = [
      'ba010_shortname',
      'maker_name',
      'approver_name',
      'signer_name',
      'ba055_code',
      'currency_code',
      'payment_code',
      'company_name',
    ];
    readOnlyFields.forEach((f) => delete cleanMaster[f]);

    if (cleanMaster.gkey && String(cleanMaster.gkey).startsWith('temp_')) {
      delete cleanMaster.gkey;
    }

    if (cleanMaster.sentdate) {
      cleanMaster.sentdate = dayjs(cleanMaster.sentdate).toISOString();
    }
    if (cleanMaster.revisedate) {
      cleanMaster.revisedate = dayjs(cleanMaster.revisedate).toISOString();
    }

    return {
      master: cleanMaster,
      dp041: {
        upsert: detailStates.samples?.rows || [],
        delete: detailStates.samples?.deletedKeys || [],
      },
      dp042: {
        upsert: detailStates.cartons?.rows || [],
        delete: detailStates.cartons?.deletedKeys || [],
      },
      dp043: {
        upsert: detailStates.packing?.rows || [],
        delete: detailStates.packing?.deletedKeys || [],
      },
    };
  },

  detailTabs: [
    {
      key: 'samples',
      title: '出貨明細 (SAMPLE)',
      parentKey: 'dp040gkey',
      apiUrl: 'http://localhost:8001/api/dp041/',
      renderer: Dp040SampleTab,
    },
    {
      key: 'cartons',
      title: '_dp042_hidden',
      parentKey: 'dp040gkey',
      apiUrl: 'http://localhost:8001/api/dp042/',
      hidden: true,
    },
    {
      key: 'packing',
      title: '裝箱明細 (PACKING)',
      parentKey: 'dp040gkey',
      apiUrl: 'http://localhost:8001/api/dp043/',
      renderer: Dp040PackingTab,
    },
  ],

  renderQueryForm: ({ form }) => (
    <>
      <Row gutter={8}>
        <Col span={8}>
          <Form.Item name="invoiceno" label="出貨單號">
            <Input placeholder="出貨單號" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="year" label="年度">
            <Input placeholder="年度" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="ba055gkey" label="季節">
            <ERPLookupField type="ba055" placeholder="雙擊選擇季節" allowClear />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={12}>
          <Form.Item name="sentdate_start" label="出貨日期 (起)">
            <Input type="date" allowClear />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="sentdate_end" label="出貨日期 (迄)">
            <Input type="date" allowClear />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <Form.Item name="ba010gkey" label="客戶">
            <ERPLookupField type="ba010" placeholder="雙擊選擇客戶" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="ba009gkey" label="品牌">
            <ERPLookupField type="ba009" placeholder="雙擊選擇品牌" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="dp002gkey" label="樣品類別">
            <ERPLookupField type="dp002" placeholder="雙擊選擇樣品類別" allowClear />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <Form.Item name="styleno" label="型體編號">
            <Input placeholder="型體編號" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="stylename" label="型體名稱">
            <Input placeholder="型體名稱" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="stock" label="庫存編號">
            <Input placeholder="庫存編號" allowClear />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <Form.Item name="sampleno" label="樣品單號">
            <Input placeholder="樣品單號" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="awbno" label="快遞單號 (AWB)">
            <Input placeholder="快遞單號" allowClear />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="es101gkey" label="製單人">
            <ERPLookupField type="es101" placeholder="雙擊選擇製單人" allowClear />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={8}>
        <Col span={8}>
          <Form.Item name="approve" label="審核狀態">
            <Select placeholder="請選擇審核狀態" allowClear>
              <Select.Option value="Y">已審核 (Y)</Select.Option>
              <Select.Option value="N">未審核 (N)</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </>
  ),

  renderMasterForm: ({ form, isEditing, activeRecord, updateMasterField, isDirty, detailStates }) => {
    return (
      <div className="dp040-master-form">
        <Dp040MasterForm
          form={form}
          isEditing={isEditing}
          updateMasterField={updateMasterField}
          activeRecord={activeRecord}
          detailStates={detailStates}
        />
      </div>
    );
  },
});

// A sub-component to handle couriers list and form structure
function Dp040MasterForm({ form, isEditing, updateMasterField, activeRecord, detailStates }) {
  const [couriers, setCouriers] = React.useState([]);
  const [selectedPhoto, setSelectedPhoto] = React.useState('');

  React.useEffect(() => {
    axios
      .get('http://localhost:8001/api/ba090/')
      .then((res) => {
        setCouriers(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load couriers list in Dp040MasterForm:', err);
      });
  }, []);

  React.useEffect(() => {
    if (isEditing && activeRecord && String(activeRecord.gkey).startsWith('temp_') && String(activeRecord.invoiceno || '').startsWith('INV-')) {
      axios
        .get('http://localhost:8001/api/dp040/next_invoice_no/')
        .then((res) => {
          if (res.data && res.data.invoiceno) {
            form.setFieldsValue({ invoiceno: res.data.invoiceno });
            updateMasterField('invoiceno', res.data.invoiceno);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch next invoice number in Dp040MasterForm:', err);
        });
    }
  }, [activeRecord, form, updateMasterField, isEditing]);

  // Listen to sample row focus event to dynamically update image sketch
  React.useEffect(() => {
    const handleFocus = (e) => {
      setSelectedPhoto(e.detail.photopath || '');
    };
    window.addEventListener('dp040-sample-focused', handleFocus);
    return () => window.removeEventListener('dp040-sample-focused', handleFocus);
  }, []);

  // Sync initial photo from first sample row when details load
  React.useEffect(() => {
    const samples = detailStates?.samples?.rows || [];
    if (samples.length > 0 && !selectedPhoto) {
      const firstPhoto = samples.find((s) => s.photopath)?.photopath || '';
      setSelectedPhoto(firstPhoto);
    }
  }, [detailStates, selectedPhoto]);

  return (
    <div style={{ padding: '8px 12px 8px 0' }}>
      <Row gutter={16}>
        {/* Left Form Area */}
        <Col span={18}>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item
                name="invoiceno"
                label="出貨單號"
                rules={[{ required: true, message: '出貨單號 為必填' }]}
              >
                <Input maxLength={20} placeholder="出貨單號" readOnly />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="sentdate"
                label="出貨日期"
                rules={[{ required: true, message: '出貨日期 為必填' }]}
              >
                <Input type="date" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="year" label="年度">
                <Input maxLength={4} placeholder="年度" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ba055gkey" label="季節">
                <ERPLookupField type="ba055" placeholder="雙擊選擇季節" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item
                name="ba010gkey"
                label="客戶代號"
                rules={[{ required: true, message: '客戶 為必選' }]}
              >
                <ERPLookupField type="ba010" placeholder="雙擊選擇客戶" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="客戶簡稱">
                <Input disabled value={activeRecord?.ba010_shortname || ''} placeholder="客戶簡稱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="engcustname" label="客戶英文名稱">
                <Input maxLength={60} placeholder="客戶英文名稱" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="address" label="寄送地址">
                <Input maxLength={250} placeholder="寄送地址" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="tel" label="電話">
                <Input maxLength={40} placeholder="電話" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fax" label="傳真">
                <Input maxLength={40} placeholder="傳真" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="attention" label="收件人 / Attn">
                <Input maxLength={300} placeholder="收件人" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="shipto" label="目的地 (Ship To)">
                <Input maxLength={50} placeholder="目的地" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="shipfrom" label="出貨地 (Ship From)">
                <Input maxLength={50} placeholder="出貨地" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba005gkey" label="出貨公司">
                <ERPLookupField type="ba005" placeholder="雙擊選擇出貨公司" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="courier" label="快遞公司">
                <Select placeholder="選擇快遞公司" allowClear>
                  {couriers.map((c) => (
                    <Select.Option key={c.gkey} value={c.express}>
                      {c.express}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="accountno" label="快遞帳號">
                <Input maxLength={20} placeholder="快遞帳號" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="awbno" label="快遞單號 (AWB)">
                <Input maxLength={50} placeholder="快遞單號" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="carton" label="總箱數">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="總箱數" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="freight" label="運費條件">
                <Input maxLength={120} placeholder="運費條件" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="freightcost" label="運費金額">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="運費金額" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba060gkey" label="幣別">
                <ERPLookupField type="ba060" placeholder="雙擊選擇幣別" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba075gkey" label="付款條件">
                <ERPLookupField type="ba075" placeholder="雙擊選擇付款條件" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="revise" label="修改版次">
                <Input maxLength={2} placeholder="修改版次" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="revisedate" label="修改日期">
                <Input type="date" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="invoiceof" label="報關品名">
                <Input maxLength={150} placeholder="報關品名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="es101gkey" label="製單人">
                <ERPLookupField type="es101" placeholder="雙擊選擇製單人" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="approve" label="審核狀態">
                <Select disabled>
                  <Select.Option value="Y">已審核 (Y)</Select.Option>
                  <Select.Option value="N">未審核 (N)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="審核人">
                <Input disabled value={activeRecord?.approver_name || ''} placeholder="審核人" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="printsigner" label="列印簽署">
                <Select placeholder="列印簽署">
                  <Select.Option value="Y">是 (Y)</Select.Option>
                  <Select.Option value="N">否 (N)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item label="簽署人">
                <Input disabled value={activeRecord?.signer_name || ''} placeholder="簽署人" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <GuardedField sheetId="dp040" fieldName="amount">
                <Form.Item name="amount" label="總金額">
                  <InputNumber disabled style={{ width: '100%' }} placeholder="0.00" precision={2} />
                </Form.Item>
              </GuardedField>
            </Col>
            <Col span={12}>
              <Form.Item name="regards" label="問候語 / Regards">
                <Input maxLength={250} placeholder="問候語" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="banking" label="銀行資訊">
                <Input.TextArea rows={3} maxLength={500} placeholder="銀行帳戶資訊" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <GuardedField sheetId="dp040" fieldName="remark">
                <Form.Item name="remark" label="備註">
                  <Input.TextArea rows={3} maxLength={500} placeholder="備註" />
                </Form.Item>
              </GuardedField>
            </Col>
          </Row>
        </Col>

        {/* Right Style Sketch Preview Panel */}
        <Col span={6}>
          <div
            style={{
              border: '1px dashed #d9d9d9',
              borderRadius: '4px',
              padding: '12px',
              height: '320px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fafafa',
              position: 'sticky',
              top: '8px',
            }}
          >
            <strong style={{ fontSize: '12px', color: '#595959', marginBottom: '12px' }}>
              款式圖片預覽
            </strong>
            {selectedPhoto ? (
              <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={
                    selectedPhoto.startsWith('http')
                      ? selectedPhoto
                      : `http://localhost:8001/media/${selectedPhoto}`
                  }
                  alt="款式圖片"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '2px' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none', color: '#999' }}>⚠️ 圖片載入失敗 ({selectedPhoto})</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#bbb' }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>📷</span>
                <span style={{ fontSize: '12px' }}>尚無款式圖片</span>
              </div>
            )}
            {selectedPhoto && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#bbb',
                  marginTop: '8px',
                  wordBreak: 'break-all',
                  textAlign: 'center',
                }}
              >
                路徑: {selectedPhoto}
              </div>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
}

