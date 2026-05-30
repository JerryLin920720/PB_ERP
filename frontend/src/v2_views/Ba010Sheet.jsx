import React from 'react';
import { Row, Col, Form, Input, Select, InputNumber, Space, Button, Table, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

// BQ (邦奇) Customer configuration flag
const isBQ = false; 

// ── Detail Tab Component: 授權品牌 (ba011) ───────────────────────────
function Ba010BrandsTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow }) {
  const [brandList, setBrandList] = React.useState([]);

  React.useEffect(() => {
    axios.get('http://localhost:8001/api/ba009/')
      .then(res => setBrandList(res.data || []))
      .catch(err => console.warn('Failed to load brand options:', err));
  }, []);

  const columns = [
    {
      title: '授權品牌項目 (來自 ba009 主檔)',
      dataIndex: 'ba009gkey',
      render: (val, record) => (
        isEditing ? (
          <Select
            value={val || undefined}
            size="small"
            options={brandList.map(b => ({ value: b.gkey, label: `${b.serialno} - ${b.cbrand}` }))}
            style={{ width: '280px' }}
            placeholder="請選擇授權品牌..."
            onChange={(v) => onCellChange(record.gkey, 'ba009gkey', v)}
          />
        ) : (
          brandList.find(b => b.gkey === val)?.cbrand || val || '-'
        )
      )
    },
    {
      title: '品牌英文名稱',
      key: 'ebrand',
      render: (_, record) => {
        const val = record.ba009gkey;
        return brandList.find(b => b.gkey === val)?.ebrand || '-';
      }
    },
    ...(isEditing
      ? [{
          title: '操作',
          key: 'action',
          width: 60,
          align: 'center',
          render: (_, record) => (
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => onDeleteRow(record.gkey)}
            />
          ),
        }]
      : []),
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <Table
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        locale={{ emptyText: '無授權品牌資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={() => onAddRow({ ba009gkey: '' })}
        >
          新增授權品牌
        </Button>
      )}
    </div>
  );
}

// ── Detail Tab Component: 指定QC驗貨 (ba012) ───────────────────────────
function Ba010QcsTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow }) {
  const [employees, setEmployees] = React.useState([]);

  React.useEffect(() => {
    axios.get('http://localhost:8001/api/es101/')
      .then(res => setEmployees(res.data || []))
      .catch(err => console.warn('Failed to load employee list:', err));
  }, []);

  const columns = [
    {
      title: 'QC姓名',
      dataIndex: 'qccontact',
      width: '180px',
      render: (val, record) => (
        isEditing ? (
          <ERPLookupField
            type="es101"
            value={val}
            size="small"
            placeholder="雙擊或按 F2 檢索員工..."
            onChange={(v) => onCellChange(record.gkey, 'qccontact', v)}
          />
        ) : (
          employees.find(e => e.gkey === val)?.englishname || val || '-'
        )
      )
    },
    {
      title: '聯絡電話',
      dataIndex: 'tel',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'tel', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '傳真',
      dataIndex: 'fax',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'fax', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '行動電話',
      dataIndex: 'mobilephone',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'mobilephone', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '聯絡Email',
      dataIndex: 'email',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'email', e.target.value)}
          />
        ) : val || '-'
      )
    },
    ...(isEditing
      ? [{
          title: '操作',
          key: 'action',
          width: 60,
          align: 'center',
          render: (_, record) => (
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => onDeleteRow(record.gkey)}
            />
          ),
        }]
      : []),
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <Table
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        locale={{ emptyText: '無指定QC驗貨官資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={() => onAddRow({ qccontact: '', tel: '', fax: '', mobilephone: '', email: '' })}
        >
          新增指定QC驗貨官
        </Button>
      )}
    </div>
  );
}

// ── Detail Tab Component: 自備配件提供 (ba013) ─────────────────────────
function Ba010AccessoriesTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow }) {
  const [accList, setAccList] = React.useState([]);

  React.useEffect(() => {
    axios.get('http://localhost:8001/api/ba080/')
      .then(res => setAccList(res.data || []))
      .catch(err => console.warn('Failed to load accessory list:', err));
  }, []);

  const columns = [
    {
      title: '配件分類',
      dataIndex: 'ba080gkey',
      width: '200px',
      render: (val, record) => (
        isEditing ? (
          <Select
            value={val || undefined}
            size="small"
            options={accList.map(a => ({ value: a.gkey, label: `${a.serialno} - ${a.accessory}` }))}
            style={{ width: '100%' }}
            placeholder="請選擇配件..."
            onChange={(v) => onCellChange(record.gkey, 'ba080gkey', v)}
          />
        ) : (
          accList.find(a => a.gkey === val)?.accessory || val || '-'
        )
      )
    },
    {
      title: '規格描述',
      dataIndex: 'description',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'description', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '數量',
      dataIndex: 'pairs',
      width: '100px',
      render: (val, record) => (
        isEditing ? (
          <InputNumber
            size="small"
            value={val || 0}
            style={{ width: '100%' }}
            onChange={(v) => onCellChange(record.gkey, 'pairs', v)}
          />
        ) : val || 0
      )
    },
    {
      title: '單位',
      dataIndex: 'unit',
      width: '90px',
      render: (val, record) => (
        isEditing ? (
          <Select
            value={val || '1'}
            size="small"
            style={{ width: '100%' }}
            onChange={(v) => onCellChange(record.gkey, 'unit', v)}
            options={[{ value: '1', label: '雙' }, { value: '2', label: '箱' }, { value: '3', label: '其它' }]}
          />
        ) : (
          val === '1' ? '雙' : val === '2' ? '箱' : val === '3' ? '其它' : '-'
        )
      )
    },
    {
      title: '供應方式',
      dataIndex: 'supplytype',
      width: '120px',
      render: (val, record) => (
        isEditing ? (
          <Select
            value={val || '1'}
            size="small"
            style={{ width: '100%' }}
            onChange={(v) => onCellChange(record.gkey, 'supplytype', v)}
            options={[{ value: '1', label: '提供數量' }, { value: '2', label: '提供樣品' }]}
          />
        ) : (
          val === '1' ? '提供數量' : val === '2' ? '提供樣品' : '-'
        )
      )
    },
    ...(isEditing
      ? [{
          title: '操作',
          key: 'action',
          width: 60,
          align: 'center',
          render: (_, record) => (
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => onDeleteRow(record.gkey)}
            />
          ),
        }]
      : []),
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <Table
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        locale={{ emptyText: '無客供配件提供資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={() => onAddRow({ ba080gkey: '', description: '', pairs: 0, unit: '1', supplytype: '1' })}
        >
          新增客供配件
        </Button>
      )}
    </div>
  );
}

// ── Detail Tab Component: 日常業務窗口 (ba014) ─────────────────────────
function Ba010ContactsTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow, activeRecord }) {
  const handleAdd = () => {
    // Dynamic default: copies tel1 & fax1 from master to new contact row
    const defaultTel = activeRecord?.tel1 || '';
    const defaultFax = activeRecord?.fax1 || '';
    onAddRow({
      contact: '',
      department: '',
      jobposition: '',
      tel: defaultTel,
      fax: defaultFax,
      mobilephone: '',
      email: ''
    });
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'contact',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'contact', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '部門',
      dataIndex: 'department',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'department', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '職稱',
      dataIndex: 'jobposition',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'jobposition', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '聯絡電話',
      dataIndex: 'tel',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'tel', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '傳真',
      dataIndex: 'fax',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'fax', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '行動電話',
      dataIndex: 'mobilephone',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'mobilephone', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'email', e.target.value)}
          />
        ) : val || '-'
      )
    },
    ...(isEditing
      ? [{
          title: '操作',
          key: 'action',
          width: 60,
          align: 'center',
          render: (_, record) => (
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => onDeleteRow(record.gkey)}
            />
          ),
        }]
      : []),
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <Table
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        locale={{ emptyText: '無日常業務窗口資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={handleAdd}
        >
          新增聯絡窗口
        </Button>
      )}
    </div>
  );
}

export default createRecordWorkbenchSheet({
  sheetId: 'ba010',
  title: '客戶基本資料管理',
  breadcrumb: ['基礎資料', '客戶基本資料管理'],

  api: {
    listUrl: 'http://localhost:8001/api/ba010/',
    deleteUrl: 'http://localhost:8001/api/ba010/',
    deepSaveUrl: 'http://localhost:8001/api/ba010/deep_save/',
  },

  masterKey: 'gkey',
  
  fieldLabels: {
    custno: '「客戶代號」',
    shortname: '「客戶簡稱」',
    custname: '「中文全稱」',
    engcustname: '「英文全稱」',
    tel1: '「辦公電話 1」',
    fax1: '「傳真 1」',
    email: '「電子郵件」',
    ba002gkey: '「國家代碼」',
    caddress: '「中文地址」',
    eaddress: '「英文地址」',
    ba060gkey: '「交易幣別」',
    ba075gkey: '「付款類別」',
    payment: '「自訂付款描述」',
    ba070gkey: '「貿易條件類別」',
    term: '「貿易條件描述」',
    remark: '「備註」',
  },

  sidebar: {
    title: '客戶列表',
    getDisplayText: (row) => `[${row.custno}] ${row.shortname}`,
  },

  // ── Default new record ──────────────────────────────────────
  createDefaultRecord: (tempKey) => ({
    gkey: tempKey,
    custno: '',
    shortname: '',
    ebcomm: isBQ ? 3 : 0,
    cusebcomm: 0,
    othencost: 0,
    laprice: 0,
    unitprice: 0,
  }),

  // ── Query params builder ────────────────────────────────────
  query: {
    buildParams: (values) => ({ ...values }),
  },

  // ── List columns ────────────────────────────────────────────
  list: {
    columns: [
      { title: '客戶代號', dataIndex: 'custno', width: 120, fixed: 'left', sorter: (a, b) => a.custno.localeCompare(b.custno) },
      { title: '客戶簡稱', dataIndex: 'shortname', width: 150 },
      { title: '中文全稱', dataIndex: 'custname', width: 220 },
      { title: '英文全稱', dataIndex: 'engcustname', width: 250 },
      { title: '辦公電話 1', dataIndex: 'tel1', width: 130 },
      { title: '電子郵件', dataIndex: 'email', width: 180 },
    ],
  },

  // ── Query form ──────────────────────────────────────────────
  renderQueryForm: ({ form }) => (
    <Row gutter={8}>
      <Col span={8}>
        <Form.Item name="custno" label="客戶代號">
          <Input placeholder="輸入客戶代碼搜尋..." />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="shortname" label="客戶簡稱">
          <Input placeholder="輸入客戶簡稱搜尋..." />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="engcustname" label="英文全稱">
          <Input placeholder="輸入英文全稱搜尋..." />
        </Form.Item>
      </Col>
    </Row>
  ),

  // ── Master form ─────────────────────────────────────────────
  renderMasterForm: ({ form, isEditing, activeRecord, updateMasterField }) => {
    const [countries, setCountries] = React.useState([]);
    const [currencies, setCurrencies] = React.useState([]);
    const [payments, setPayments] = React.useState([]);
    const [terms, setTerms] = React.useState([]);
    const [ports, setPorts] = React.useState([]);

    React.useEffect(() => {
      const loadOpts = async () => {
        try {
          const [resC, resCur, resP, resT, resPort] = await Promise.all([
            axios.get('http://localhost:8001/api/ba002/'),
            axios.get('http://localhost:8001/api/ba060/'),
            axios.get('http://localhost:8001/api/ba075/'),
            axios.get('http://localhost:8001/api/ba070/'),
            axios.get('http://localhost:8001/api/ba065/')
          ]);
          setCountries(resC.data || []);
          setCurrencies(resCur.data || []);
          setPayments(resP.data || []);
          setTerms(resT.data || []);
          setPorts(resPort.data || []);
        } catch (e) {
          console.warn('Failed to load master dropdown options:', e);
        }
      };
      loadOpts();
    }, []);

    // Clear custom payment description if Payment Category changes
    const prevBa075Ref = React.useRef(activeRecord?.ba075gkey);
    React.useEffect(() => {
      if (prevBa075Ref.current !== activeRecord?.ba075gkey) {
        prevBa075Ref.current = activeRecord?.ba075gkey;
        if (isEditing) {
          form.setFieldsValue({ payment: '' });
          if (updateMasterField) {
            updateMasterField('payment', '');
          }
        }
      }
    }, [activeRecord?.ba075gkey, form, isEditing, updateMasterField]);

    return (
      <Tabs type="line" size="small" style={{ marginBottom: 0 }}>
        {/* SUBTAB 1: 基本資料與通訊 */}
        <Tabs.TabPane tab="基本資料與通訊" key="sub1">
          <Row gutter={8}>
            <Col span={4}>
              <Form.Item name="custno" label="客戶代號" rules={[{ required: true, message: '客戶代號為必填' }]}>
                <Input maxLength={20} style={{ textTransform: 'uppercase' }} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="shortname" label="客戶簡稱" rules={[{ required: true, message: '客戶簡稱為必填' }]}>
                <Input maxLength={30} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="custname" label="中文全稱">
                <Input maxLength={50} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="engcustname" label="英文全稱">
                <Input maxLength={60} disabled={!isEditing} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="ba010gkey" label="代理商 (Agent)">
                <ERPLookupField
                  type="ba010"
                  disabled={!isEditing}
                  queryParams={{ ba010gkey__isnull: 'true' }}
                  placeholder="雙擊或按 F2 檢索代理商..."
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba002gkey" label="所屬國家">
                <Select
                  disabled={!isEditing}
                  options={countries.map(c => ({ value: c.gkey, label: `${c.serialno} - ${c.ccountry}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba060gkey" label="結算幣別">
                <Select
                  disabled={!isEditing}
                  options={currencies.map(c => ({ value: c.gkey, label: `${c.currencyno} - ${c.currency}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="boss" label="負責人">
                <Input maxLength={20} disabled={!isEditing} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="tel1" label="辦公電話 1">
                <Input maxLength={40} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="tel2" label="辦公電話 2">
                <Input maxLength={40} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fax1" label="傳真 1">
                <Input maxLength={40} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fax2" label="傳真 2">
                <Input maxLength={40} disabled={!isEditing} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="email" label="聯絡 Email">
                <Input maxLength={50} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="website" label="客戶官網 (WebSite)">
                <Input maxLength={100} disabled={!isEditing} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="caddress" label={isBQ ? "Sample Invoice Add." : "中文地址"}>
                <Input maxLength={100} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="eaddress" label={isBQ ? "Sample Delivery Add." : "英文通訊地址"}>
                <Input.TextArea rows={1} maxLength={2000} disabled={!isEditing} />
              </Form.Item>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* SUBTAB 2: 財務交易與提列比率 */}
        <Tabs.TabPane tab="財務交易與提列比率" key="sub2">
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="ba075gkey" label="付款大類">
                <Select
                  disabled={!isEditing}
                  options={payments.map(p => ({ value: p.gkey, label: `${p.serialno} - ${p.paymenttype}` }))}
                  onChange={(val) => form.setFieldsValue({ payment: '' })}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="payment" label="自訂付款描述">
                <ERPLookupField
                  type="ba076"
                  disabled={!isEditing}
                  queryParams={{ ba075gkey: activeRecord?.ba075gkey || '' }}
                  placeholder="F2 檢索付款細節..."
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba070gkey" label="貿易條件">
                <Select
                  disabled={!isEditing}
                  options={terms.map(t => ({ value: t.gkey, label: `${t.serialno} - ${t.termtype}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="term" label="貿易港口描述 (Term)">
                <ERPLookupField
                  type="ba065"
                  disabled={!isEditing}
                  placeholder="F2 檢索交易港口..."
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="ba065gkey" label="指定港口">
                <Select
                  disabled={!isEditing}
                  options={ports.map(p => ({ value: p.gkey, label: `${p.serialno} - ${p.term}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="express" label="快遞公司">
                <Input maxLength={20} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="accountno" label="快遞到付帳號">
                <Input maxLength={20} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="shipto" label="目的港口 (ShipTo)">
                <Input maxLength={60} disabled={!isEditing} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={4}>
              <Form.Item name="unitprice" label="單價控制系數">
                <InputNumber style={{ width: '100%' }} precision={4} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="ebcomm" label="EB佣金比率 (%)">
                <InputNumber style={{ width: '100%' }} precision={4} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="cusebcomm" label="客戶預扣佣金比率 (%)">
                <InputNumber style={{ width: '100%' }} precision={4} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="othencost" label="其他費用提列比率 (%)">
                <InputNumber style={{ width: '100%' }} precision={3} disabled={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="laprice" label="LA地區附加率 (%)">
                <InputNumber style={{ width: '100%' }} precision={4} disabled={!isEditing} />
              </Form.Item>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* SUBTAB 3: 船代與通知人 (Forwarder) */}
        <Tabs.TabPane tab="船代與通知人" key="sub3">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="forwarder" label="船務代理 (Forwarder)">
                <Input.TextArea rows={3} disabled={!isEditing} placeholder="船代地址、聯絡電話、代碼資訊..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="notify" label="通知方 (Notify Party)">
                <Input.TextArea rows={3} disabled={!isEditing} placeholder="通知人地址、聯絡人資訊..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="factname" label="Consignee (出貨工廠指示名稱)">
                <Input.TextArea rows={2} disabled={!isEditing} placeholder="出貨工廠指示..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lcstipulation" label={isBQ ? "Ship To (信用狀特別條款)" : "信用狀特別條款 (L/C Stipulation)"}>
                <Input.TextArea rows={2} disabled={!isEditing} placeholder="信用狀 (L/C) 各項特別條款登打..." />
              </Form.Item>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* SUBTAB 4: 包裝與麥頭 (Packing) */}
        <Tabs.TabPane tab="包裝與麥頭" key="sub4">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="mainmark" label="正麥頭內容 (Main Mark)">
                <Input.TextArea rows={3} disabled={!isEditing} placeholder="正麥文字內容說明..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sidemark" label="側麥頭內容 (Side Mark)">
                <Input.TextArea rows={3} disabled={!isEditing} placeholder="側麥文字內容說明..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="mainmarkpath" label="正麥圖檔路徑">
                <Input disabled={!isEditing} placeholder="正麥圖檔伺服器物理路徑..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sidemarkpath" label="側麥圖檔路徑">
                <Input disabled={!isEditing} placeholder="側麥圖檔伺服器物理路徑..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="packingpath" label="包裝指示書路徑">
                <Input disabled={!isEditing} placeholder="包裝指示 PDF 檔案物理路徑..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="packinginstruction" label="包裝指示 (Packing Instruction)">
                <Input.TextArea rows={2} disabled={!isEditing} placeholder="包裝裝箱規格特殊指示..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="packingremark" label="包裝備註 (Packing Remark)">
                <Input.TextArea rows={2} disabled={!isEditing} placeholder="包裝裝箱其它備註說明..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={24}>
              <Form.Item name="specialinstruction" label="裝運特殊指示 (Special Instruction)">
                <Input.TextArea rows={2} disabled={!isEditing} placeholder="裝運航線、指定快遞、特殊交期等指示..." />
              </Form.Item>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* SUBTAB 5: 綜合備註 */}
        <Tabs.TabPane tab="綜合備註" key="sub5">
          <Row gutter={8}>
            <Col span={24}>
              <Form.Item name="remark" label={isBQ ? "Invoice To (綜合備註說明)" : "綜合備註說明"}>
                <Input.TextArea rows={5} disabled={!isEditing} placeholder="客戶信用評等、交易限制、其它備註說明..." />
              </Form.Item>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>
    );
  },

  // ── Detail Tabs ─────────────────────────────────────────────
  detailTabs: [
    {
      key: 'brands',
      title: '經營授權品牌 (ba011)',
      parentKey: 'ba010gkey',
      apiUrl: 'http://localhost:8001/api/ba011/',
      renderer: Ba010BrandsTab,
    },
    {
      key: 'qcs',
      title: '指定QC驗貨 (ba012)',
      parentKey: 'ba010gkey',
      apiUrl: 'http://localhost:8001/api/ba012/',
      renderer: Ba010QcsTab,
    },
    {
      key: 'accessories',
      title: '自備配件提供 (ba013)',
      parentKey: 'ba010gkey',
      apiUrl: 'http://localhost:8001/api/ba013/',
      renderer: Ba010AccessoriesTab,
    },
    {
      key: 'contacts',
      title: '日常業務窗口 (ba014)',
      parentKey: 'ba010gkey',
      apiUrl: 'http://localhost:8001/api/ba014/',
      renderer: Ba010ContactsTab,
    },
  ],

  // ── Deep Save Payload ───────────────────────────────────────
  buildDeepSavePayload: (activeRecord, detailStates) => {
    const cleanMaster = { ...activeRecord };
    
    // Auto capitalize custno
    if (cleanMaster.custno) {
      cleanMaster.custno = cleanMaster.custno.toUpperCase();
    }

    // Drop temp gkey for new master record
    if (cleanMaster.gkey && String(cleanMaster.gkey).startsWith('temp_')) {
      delete cleanMaster.gkey;
    }

    const brands = detailStates.brands?.rows || [];
    const qcs = detailStates.qcs?.rows || [];
    const accessories = detailStates.accessories?.rows || [];
    const contacts = detailStates.contacts?.rows || [];

    return {
      master: cleanMaster,
      brands,
      qcs,
      accessories,
      contacts
    };
  },

  // ── Validation ──────────────────────────────────────────────
  validateMasterRow: (record) => {
    if (!record || !record.custno || !record.custno.trim()) {
      throw new Error('客戶代號為必填欄位');
    }
    if (!record.shortname || !record.shortname.trim()) {
      throw new Error('客戶簡稱為必填欄位');
    }
  },
});
