import React from 'react';
import { Row, Col, Form, Input, InputNumber, Select, Switch, Tabs, Button, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

const API = 'http://localhost:8001/api/';

// ─────────────────────────────────────────────────────────────────
// Detail Tab: 聯絡人 (ba016)
// ─────────────────────────────────────────────────────────────────
function Ba015ContactsTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow, activeRecord, detailStates }) {
  const handleAdd = () => {
    onAddRow({
      parentgkey: activeRecord?.gkey || '',
      contact: '',
      department: '',
      jobposition: '',
      tel: activeRecord?.tel1 || '',
      fax: activeRecord?.fax1 || '',
      mobilephone: '',
      email: '',
    });
  };

  const branchOptions = React.useMemo(() => {
    const opts = [];
    if (activeRecord) {
      opts.push({
        value: activeRecord.gkey,
        label: `[主廠] ${activeRecord.shortname || activeRecord.factno || '主廠'}`,
      });
    }
    const branches = detailStates?.branches?.rows || [];
    branches.forEach((b) => {
      opts.push({
        value: b.gkey,
        label: `[分廠] ${b.shortname || b.factno || '分廠'}`,
      });
    });
    return opts;
  }, [activeRecord, detailStates?.branches?.rows]);

  const columns = [
    {
      title: '所屬實體',
      dataIndex: 'parentgkey',
      width: 220,
      render: (val, record) => {
        if (isEditing) {
          return (
            <Select
              size="small"
              value={val || undefined}
              placeholder="選擇所屬工廠..."
              style={{ width: '100%' }}
              options={branchOptions}
              onChange={(v) => {
                onCellChange(record.gkey, 'parentgkey', v);
                // 若選取目前主廠，預設自動帶入主檔 tel1 / fax1
                if (activeRecord && v === activeRecord.gkey) {
                  onCellChange(record.gkey, 'tel', activeRecord.tel1 || '');
                  onCellChange(record.gkey, 'fax', activeRecord.fax1 || '');
                }
              }}
            />
          );
        }
        const opt = branchOptions.find((o) => o.value === val);
        return opt ? opt.label : '-';
      },
    },
    {
      title: '姓名',
      dataIndex: 'contact',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'contact', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '部門',
      dataIndex: 'department',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'department', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '職稱',
      dataIndex: 'jobposition',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'jobposition', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '聯絡電話',
      dataIndex: 'tel',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'tel', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '傳真',
      dataIndex: 'fax',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'fax', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '行動電話',
      dataIndex: 'mobilephone',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'mobilephone', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'email', e.target.value)}
          />
        ) : val || '-',
    },
    ...(isEditing
      ? [
          {
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
          },
        ]
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
        locale={{ emptyText: '無聯絡窗口資料' }}
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

// ─────────────────────────────────────────────────────────────────
// Detail Tab: 分廠 (ba015 self-ref, type='1' only)
// ─────────────────────────────────────────────────────────────────
function Ba015BranchesTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow }) {
  const [countries, setCountries] = React.useState([]);

  React.useEffect(() => {
    axios.get(`${API}ba003/`)
      .then(res => setCountries(res.data || []))
      .catch(e => console.warn('Failed to load countries in BranchesTab:', e));
  }, []);

  const handleAdd = () => {
    onAddRow({
      factno: '',
      shortname: '',
      factname: '',
      engfactname: '',
      ba003gkey: null,
      monthqty: 0,
      fmonthqty: 0,
    });
  };

  const columns = [
    {
      title: '分廠編號',
      dataIndex: 'factno',
      width: 130,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            style={{ textTransform: 'uppercase' }}
            onChange={(e) => onCellChange(record.gkey, 'factno', e.target.value.toUpperCase())}
          />
        ) : val || '-',
    },
    {
      title: '分廠簡稱',
      dataIndex: 'shortname',
      width: 150,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'shortname', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '分廠全名',
      dataIndex: 'factname',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'factname', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '分廠英文全名',
      dataIndex: 'engfactname',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'engfactname', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '產地國別',
      dataIndex: 'ba003gkey',
      width: 180,
      render: (val, record) => {
        if (isEditing) {
          return (
            <Select
              size="small"
              value={val || undefined}
              placeholder="選擇產地..."
              allowClear
              style={{ width: '100%' }}
              options={countries.map((c) => ({
                value: c.gkey,
                label: `${c.serialno} - ${c.corigin}`,
              }))}
              onChange={(v) => onCellChange(record.gkey, 'ba003gkey', v)}
            />
          );
        }
        const country = countries.find((c) => c.gkey === val);
        return country ? `${country.serialno} - ${country.corigin}` : '-';
      },
    },
    {
      title: '月產能',
      dataIndex: 'monthqty',
      width: 100,
      render: (val, record) =>
        isEditing ? (
          <InputNumber
            size="small"
            value={val ?? 0}
            style={{ width: '100%' }}
            controls={false}
            onChange={(v) => onCellChange(record.gkey, 'monthqty', v)}
          />
        ) : (val ?? 0),
    },
    {
      title: '分配產能',
      dataIndex: 'fmonthqty',
      width: 100,
      render: (val, record) =>
        isEditing ? (
          <InputNumber
            size="small"
            value={val ?? 0}
            style={{ width: '100%' }}
            controls={false}
            onChange={(v) => onCellChange(record.gkey, 'fmonthqty', v)}
          />
        ) : (val ?? 0),
    },
    ...(isEditing
      ? [
          {
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
          },
        ]
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
        locale={{ emptyText: '無分廠資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={handleAdd}
        >
          新增分廠
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Master Form Renderer (共用，由 type 控制欄位顯示)
// ─────────────────────────────────────────────────────────────────
function makeMasterFormRenderer(entityType) {
  return function Ba015MasterForm({ form, isEditing, activeRecord, updateMasterField }) {
    const [countries, setCountries] = React.useState([]);
    const [currencies, setCurrencies] = React.useState([]);
    const [terms, setTerms] = React.useState([]);
    const [payments, setPayments] = React.useState([]);
    const [categories, setCategories] = React.useState([]);

    React.useEffect(() => {
      const safeGet = async (url) => {
        try {
          const res = await axios.get(url);
          return res.data || [];
        } catch (e) {
          console.warn(`Failed to load from ${url}:`, e);
          return [];
        }
      };
      Promise.all([
        safeGet(`${API}ba003/`),
        safeGet(`${API}ba060/`),
        safeGet(`${API}ba070/`),
        safeGet(`${API}ba075/`),
        safeGet(`${API}ba020/`),
      ]).then(([resC, resCur, resT, resP, resCat]) => {
        setCountries(resC);
        setCurrencies(resCur);
        setTerms(resT);
        setPayments(resP);
        setCategories(resCat);
      });
    }, []);

    // ba075gkey 變動時清空 payment
    const prevBa075Ref = React.useRef(activeRecord?.ba075gkey);
    React.useEffect(() => {
      if (prevBa075Ref.current !== activeRecord?.ba075gkey) {
        prevBa075Ref.current = activeRecord?.ba075gkey;
        if (isEditing) {
          form.setFieldsValue({ payment: '' });
          updateMasterField && updateMasterField('payment', '');
        }
      }
    }, [activeRecord?.ba075gkey, form, isEditing, updateMasterField]);

    return (
      <Tabs type="line" size="small" style={{ marginBottom: 0 }}>
        {/* ── Sub-Tab 1: 基本與通訊 ── */}
        <Tabs.TabPane tab="基本與通訊" key="sub1">
          <Row gutter={8}>
            <Col span={3}>
              <Form.Item
                name="factno"
                label="實體編號"
                rules={[{ required: true, message: '實體編號為必填' }]}
                style={{ marginBottom: 4 }}
              >
                <Input
                  maxLength={20}
                  style={{ textTransform: 'uppercase' }}
                  onBlur={(e) =>
                    form.setFieldsValue({ factno: e.target.value.toUpperCase() })
                  }
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item
                name="shortname"
                label="廠商簡稱"
                rules={[{ required: true, message: '廠商簡稱為必填' }]}
                style={{ marginBottom: 4 }}
              >
                <Input maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="boss" label="負責人" style={{ marginBottom: 4 }}>
                <Input maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="factname"
                label="中文全名"
                rules={[{ required: true, message: '中文全名為必填' }]}
                style={{ marginBottom: 4 }}
              >
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="engfactname" label="英文全名" style={{ marginBottom: 4 }}>
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item
                name="yesno"
                label="使用中"
                valuePropName="checked"
                style={{ marginBottom: 4 }}
                getValueProps={(v) => ({ checked: v === 'Y' || v === true })}
                getValueFromEvent={(checked) => (checked ? 'Y' : 'N')}
              >
                <Switch checkedChildren="Y" unCheckedChildren="N" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={3}>
              <Form.Item name="tel1" label="主要電話" style={{ marginBottom: 4 }}>
                <Input maxLength={40} />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="tel2" label="電話2" style={{ marginBottom: 4 }}>
                <Input maxLength={40} />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="fax1" label="傳真號碼" style={{ marginBottom: 4 }}>
                <Input maxLength={40} />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="fax2" label="傳真2" style={{ marginBottom: 4 }}>
                <Input maxLength={40} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="email" label="聯絡Email" style={{ marginBottom: 4 }}>
                <Input maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="website" label="公司網站" style={{ marginBottom: 4 }}>
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="idno" label="統一編號" style={{ marginBottom: 4 }}>
                <Input maxLength={30} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={4}>
              <Form.Item name="ba003gkey" label="產地國別" style={{ marginBottom: 4 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  options={countries.map((c) => ({
                    value: c.gkey,
                    label: `${c.serialno} - ${c.corigin}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="caddress" label="中文地址" style={{ marginBottom: 4 }}>
                <Input maxLength={200} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="eaddress" label="英文地址" style={{ marginBottom: 4 }}>
                <Input maxLength={250} />
              </Form.Item>
            </Col>
            {/* type='1': 月產能 / 分配產能 */}
            {entityType === '1' && (
              <>
                <Col span={2}>
                  <Form.Item name="monthqty" label="月產能" style={{ marginBottom: 4 }}>
                    <InputNumber style={{ width: '100%' }} controls={false} />
                  </Form.Item>
                </Col>
                <Col span={2}>
                  <Form.Item name="fmonthqty" label="分配產能" style={{ marginBottom: 4 }}>
                    <InputNumber style={{ width: '100%' }} controls={false} />
                  </Form.Item>
                </Col>
              </>
            )}
            {/* type='2' or type='3': 材料/採購分類 */}
            {(entityType === '2' || entityType === '3') && (
              <Col span={4}>
                <Form.Item name="ba020gkey" label={entityType === '2' ? '材料分類' : '採購分類'} style={{ marginBottom: 4 }}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    allowClear
                    options={categories.map((cat) => ({
                      value: cat.gkey,
                      label: `${cat.code} - ${cat.category}`,
                    }))}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Tabs.TabPane>

        {/* ── Sub-Tab 2: 財務與備註 ── */}
        <Tabs.TabPane tab="財務與備註" key="sub2">
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="ba060gkey" label="交易結算幣別" style={{ marginBottom: 4 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  options={currencies.map((c) => ({
                    value: c.gkey,
                    label: `${c.currencyno} - ${c.currency}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba075gkey" label="付款條件" style={{ marginBottom: 4 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  options={payments.map((p) => ({
                    value: p.gkey,
                    label: `${p.serialno} - ${p.paymenttype}`,
                  }))}
                  onChange={() => {
                    form.setFieldsValue({ payment: '' });
                    updateMasterField && updateMasterField('payment', '');
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment" label="自訂付款描述" style={{ marginBottom: 4 }}>
                <ERPLookupField
                  type="ba076"
                  queryParams={{ ba075gkey: activeRecord?.ba075gkey || '' }}
                  placeholder="F2 檢索付款細節..."
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="ba070gkey" label="交易條件類別" style={{ marginBottom: 4 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  options={terms.map((t) => ({
                    value: t.gkey,
                    label: `${t.serialno} - ${t.termtype}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="bosstel" label="負責人電話" style={{ marginBottom: 4 }}>
                <Input maxLength={40} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="term" label="自訂交易條件描述" style={{ marginBottom: 4 }}>
                <ERPLookupField
                  type="ba065"
                  placeholder="F2 檢索交易港口..."
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="bankinfo" label="匯款銀行詳細資料" style={{ marginBottom: 4 }}>
                <ERPLookupField
                  type="ba040"
                  placeholder="F2 檢索銀行資料..."
                  disabled={!isEditing}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remark" label="公司綜合備註" style={{ marginBottom: 4 }}>
                <Input.TextArea rows={2} maxLength={2000} placeholder="綜合備註..." />
              </Form.Item>
            </Col>
          </Row>
        </Tabs.TabPane>
      </Tabs>
    );
  };
}

// ─────────────────────────────────────────────────────────────────
// Type-specific title / label maps
// ─────────────────────────────────────────────────────────────────
const TYPE_META = {
  '1': {
    title: '工廠基本資料管理',
    sidebarTitle: '工廠列表',
    breadcrumb: ['基礎資料', '工廠基本資料管理'],
    queryLabel: { no: '工廠編號', name: '中文全名' },
  },
  '2': {
    title: '材料商基本資料管理',
    sidebarTitle: '材料商列表',
    breadcrumb: ['基礎資料', '材料商基本資料管理'],
    queryLabel: { no: '材料商編號', name: '中文全名' },
  },
  '3': {
    title: '供應商基本資料管理',
    sidebarTitle: '供應商列表',
    breadcrumb: ['基礎資料', '供應商基本資料管理'],
    queryLabel: { no: '供應商編號', name: '中文全名' },
  },
};

const FIELD_LABELS = {
  factno: '「實體編號」',
  shortname: '「廠商簡稱」',
  factname: '「中文全名」',
  engfactname: '「英文全名」',
  boss: '「負責人」',
  bosstel: '「負責人電話」',
  tel1: '「主要電話」',
  tel2: '「電話2」',
  fax1: '「傳真號碼」',
  fax2: '「傳真2」',
  email: '「聯絡Email」',
  website: '「公司網站」',
  idno: '「統一編號」',
  ba003gkey: '「產地國別」',
  caddress: '「中文地址」',
  eaddress: '「英文地址」',
  ba020gkey: '「材料分類」',
  monthqty: '「月產能」',
  fmonthqty: '「分配產能」',
  ba060gkey: '「交易結算幣別」',
  ba075gkey: '「付款條件」',
  payment: '「自訂付款描述」',
  ba070gkey: '「交易條件類別」',
  term: '「自訂交易條件描述」',
  bankinfo: '「匯款銀行詳細資料」',
  remark: '「公司綜合備註」',
  yesno: '「使用中」',
};

// ─────────────────────────────────────────────────────────────────
// Helper Component: Dynamic Category Select for Query Form (type 2/3)
// ─────────────────────────────────────────────────────────────────
function CategoryQuerySelect(props) {
  const [categories, setCategories] = React.useState([]);
  React.useEffect(() => {
    axios.get(`${API}ba020/`)
      .then(res => setCategories(res.data || []))
      .catch(e => console.warn('Failed to load categories for query form:', e));
  }, []);
  return (
    <Select
      showSearch
      optionFilterProp="label"
      options={categories.map(c => ({ value: c.gkey, label: `${c.code} - ${c.category}` }))}
      {...props}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// Factory: createBa015Sheet(type) → createRecordWorkbenchSheet(config)
// ─────────────────────────────────────────────────────────────────
function createBa015Sheet(entityType) {
  const meta = TYPE_META[entityType] || TYPE_META['1'];

  // detail tabs 依 type 決定
  const detailTabs = [
    {
      key: 'contacts',
      title: '👥 聯絡窗口 (ba016)',
      parentKey: 'ba015gkey',
      apiUrl: `${API}ba016/`,
      renderer: Ba015ContactsTab,
    },
    ...(entityType === '1'
      ? [
          {
            key: 'branches',
            title: '🏭 分廠 (ba015)',
            parentKey: 'parentgkey',
            apiUrl: `${API}ba015/?type=1`,
            renderer: Ba015BranchesTab,
          },
        ]
      : []),
  ];

  return createRecordWorkbenchSheet({
    sheetId: entityType === '1' ? 'ba015' : entityType === '2' ? 'ba025' : 'ba030',
    title: meta.title,
    breadcrumb: meta.breadcrumb,

    api: {
      listUrl: `${API}ba015/?type=${entityType}`,
      deepSaveUrl: `${API}ba015/deep_save/?type=${entityType}`,
      deleteUrl: `${API}ba015/`,
    },

    masterKey: 'gkey',
    fieldLabels: FIELD_LABELS,

    sidebar: {
      title: meta.sidebarTitle,
      getDisplayText: (row) => `[${row.factno || '?'}] ${row.shortname || ''}`,
    },

    createDefaultRecord: (tempKey) => ({
      gkey: tempKey,
      factno: '',
      shortname: '',
      factname: '',
      yesno: 'Y',
      monthqty: 0,
      fmonthqty: 0,
    }),

    query: {
      buildParams: (values) => ({ ...values }),
    },

    list: {
      columns: [
        {
          title: meta.queryLabel.no,
          dataIndex: 'factno',
          width: 130,
          fixed: 'left',
          sorter: (a, b) => (a.factno || '').localeCompare(b.factno || ''),
        },
        { title: '廠商簡稱', dataIndex: 'shortname', width: 160 },
        { title: meta.queryLabel.name, dataIndex: 'factname', width: 220 },
        { title: '主要電話', dataIndex: 'tel1', width: 130 },
        { title: '聯絡Email', dataIndex: 'email', width: 180 },
        {
          title: '狀態',
          dataIndex: 'yesno',
          width: 80,
          render: (val) =>
            val === 'Y' ? (
              <span style={{ color: '#52c41a' }}>● 使用中</span>
            ) : (
              <span style={{ color: '#f5222d' }}>● 停用</span>
            ),
        },
      ],
    },

    renderQueryForm: ({ form: qForm }) => (
      <Row gutter={8}>
        <Col span={entityType === '1' ? 8 : 6}>
          <Form.Item name="factno" label={meta.queryLabel.no}>
            <Input placeholder={`輸入${meta.queryLabel.no}搜尋...`} />
          </Form.Item>
        </Col>
        <Col span={entityType === '1' ? 8 : 6}>
          <Form.Item name="shortname" label="廠商簡稱">
            <Input placeholder="輸入廠商簡稱搜尋..." />
          </Form.Item>
        </Col>
        <Col span={entityType === '1' ? 8 : 6}>
          <Form.Item name="factname" label={meta.queryLabel.name}>
            <Input placeholder={`輸入${meta.queryLabel.name}搜尋...`} />
          </Form.Item>
        </Col>
        {(entityType === '2' || entityType === '3') && (
          <Col span={6}>
            <Form.Item name="ba020gkey" label={entityType === '2' ? '材料分類' : '採購分類'}>
              <CategoryQuerySelect placeholder="選擇分類搜尋..." allowClear />
            </Form.Item>
          </Col>
        )}
      </Row>
    ),

    renderMasterForm: makeMasterFormRenderer(entityType),

    detailTabs,

    buildDeepSavePayload: (master, detailStates) => {
      const activeBranchGkeys = (detailStates.branches?.rows || []).map((b) => b.gkey);
      const contacts = (detailStates.contacts?.rows || [])
        .filter((r) => r.contact)
        .filter((c) => {
          // 若 parentgkey 是主表，保留
          if (c.parentgkey === master.gkey) return true;
          // 若 parentgkey 存在於目前的 branches 中，保留；否則（該 branch 被刪了）則丟棄
          return activeBranchGkeys.includes(c.parentgkey);
        });

      return {
        master,
        contacts,
        branches: detailStates.branches?.rows || [],
      };
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Named exports — BA015 (工廠), BA025 (材料商), BA030 (供應商)
// BA025 / BA030 are defined here but routes not yet wired in App.jsx
// ─────────────────────────────────────────────────────────────────
export const Ba015V2Sheet = createBa015Sheet('1');
export const Ba025V2Sheet = createBa015Sheet('2');
export const Ba030V2Sheet = createBa015Sheet('3');

// Default export = 工廠 (type='1') for Ba015 route
export default Ba015V2Sheet;
