import React from 'react';
import { Row, Col, Form, Input, Select, Switch, Tabs, Button, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

const API = 'http://localhost:8001/api/';

// Cache categories for list mapping
let categoryMap = {};
let categoryList = [];
let categoriesLoaded = false;
let categoriesListeners = [];

function loadCategories(callback) {
  if (categoriesLoaded) {
    if (callback) callback(categoryList);
    return;
  }
  if (callback) categoriesListeners.push(callback);
  if (categoriesListeners.length > 1) return; // already fetching

  axios.get(`${API}ba020/`)
    .then(res => {
      const data = res.data || [];
      categoryList = data;
      categoryMap = {};
      data.forEach(c => {
        categoryMap[c.gkey] = `${c.code} - ${c.category}`;
      });
      categoriesLoaded = true;
      const listeners = [...categoriesListeners];
      categoriesListeners = [];
      listeners.forEach(cb => cb(data));
    })
    .catch(e => {
      console.warn('Failed to load categories:', e);
      categoriesListeners = [];
    });
}

function CategoryName({ gkey }) {
  const [name, setName] = React.useState(gkey || '-');
  React.useEffect(() => {
    if (!gkey) return;
    loadCategories(() => {
      setName(categoryMap[gkey] || gkey);
    });
  }, [gkey]);
  return <span>{name}</span>;
}

// ─────────────────────────────────────────────────────────────────
// Detail Tab: 聯絡窗口 (ba016)
// ─────────────────────────────────────────────────────────────────
function Ba030ContactsTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow, activeRecord }) {
  const handleAdd = () => {
    onAddRow({
      ba015gkey: activeRecord?.gkey || '',
      contact: '',
      department: '',
      jobposition: '',
      tel: activeRecord?.tel1 || '',
      fax: activeRecord?.fax1 || '',
      mobilephone: '',
      email: '',
      parentgkey: null,
    });
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'contact',
      width: 150,
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
      width: 130,
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
      width: 130,
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
      width: 150,
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
      width: 150,
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
      width: 150,
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
// Master Form Renderer
// ─────────────────────────────────────────────────────────────────
function Ba030MasterForm({ form, isEditing, activeRecord, updateMasterField }) {
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
    ]).then(([resC, resCur, resT, resP]) => {
      setCountries(resC);
      setCurrencies(resCur);
      setTerms(resT);
      setPayments(resP);
    });

    loadCategories((cats) => {
      setCategories(cats);
    });
  }, []);

  // ba075gkey (付款條件) 變動時清空 payment
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
              label="供應商編號"
              rules={[{ required: true, message: '供應商編號為必填' }]}
              style={{ marginBottom: 4 }}
            >
              <Input
                maxLength={10}
                style={{ textTransform: 'uppercase' }}
                onBlur={(e) =>
                  form.setFieldsValue({ factno: e.target.value.toUpperCase() })
                }
                disabled={!isEditing}
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
              <Input maxLength={50} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={3}>
            <Form.Item name="boss" label="負責人" style={{ marginBottom: 4 }}>
              <Input maxLength={20} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="factname"
              label="中文全名"
              rules={[{ required: true, message: '中文全名為必填' }]}
              style={{ marginBottom: 4 }}
            >
              <Input maxLength={100} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="engfactname" label="英文全名" style={{ marginBottom: 4 }}>
              <Input maxLength={60} disabled={!isEditing} />
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
              <Switch checkedChildren="Y" unCheckedChildren="N" disabled={!isEditing} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={3}>
            <Form.Item name="tel1" label="主要電話" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={3}>
            <Form.Item name="tel2" label="電話2" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={3}>
            <Form.Item name="fax1" label="傳真號碼" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={3}>
            <Form.Item name="fax2" label="傳真2" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="email" label="聯絡Email" style={{ marginBottom: 4 }}>
              <Input maxLength={50} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="website" label="公司網站" style={{ marginBottom: 4 }}>
              <Input maxLength={100} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="idno" label="統一編號" style={{ marginBottom: 4 }}>
              <Input maxLength={30} disabled={!isEditing} />
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
                disabled={!isEditing}
                options={countries.map((c) => ({
                  value: c.gkey,
                  label: `${c.serialno} - ${c.corigin}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="caddress" label="中文地址" style={{ marginBottom: 4 }}>
              <Input maxLength={200} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="eaddress" label="英文地址" style={{ marginBottom: 4 }}>
              <Input maxLength={250} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item
              name="ba020gkey"
              label="採購分類"
              rules={[{ required: true, message: '採購分類為必填' }]}
              style={{ marginBottom: 4 }}
            >
              <Select
                showSearch
                optionFilterProp="label"
                allowClear
                disabled={!isEditing}
                options={categories.map((cat) => ({
                  value: cat.gkey,
                  label: `${cat.code} - ${cat.category}`,
                }))}
              />
            </Form.Item>
          </Col>
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
                disabled={!isEditing}
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
                disabled={!isEditing}
                options={payments.map((p) => ({
                  value: p.gkey,
                  label: `${p.serialno} - ${p.paymenttype}`,
                }))}
                onChange={(v) => {
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
                disabled={!isEditing}
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
                disabled={!isEditing}
                options={terms.map((t) => ({
                  value: t.gkey,
                  label: `${t.serialno} - ${t.termtype}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="bosstel" label="負責人電話" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="term" label="自訂交易條件描述" style={{ marginBottom: 4 }}>
              <ERPLookupField
                type="ba065"
                placeholder="F2 檢索交易港口..."
                disabled={!isEditing}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>
            <Form.Item name="bankinfo" label="匯款銀行詳細資料 (BANK INFO)" style={{ marginBottom: 4 }}>
              <ERPLookupField
                type="ba040"
                placeholder="F2 檢索銀行資料..."
                disabled={!isEditing}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="remark" label="公司綜合備註" style={{ marginBottom: 4 }}>
              <Input.TextArea rows={2} maxLength={2000} placeholder="綜合備註..." disabled={!isEditing} />
            </Form.Item>
          </Col>
        </Row>
      </Tabs.TabPane>
    </Tabs>
  );
}

// ─────────────────────────────────────────────────────────────────
// Field labels translation mapping for error validation
// ─────────────────────────────────────────────────────────────────
const FIELD_LABELS = {
  factno: '「供應商編號」',
  shortname: '「廠商簡稱」',
  factname: '「中文全名」',
  ba020gkey: '「採購分類」',
};

// ─────────────────────────────────────────────────────────────────
// Helper Component: Dynamic Category Select for Query Form
// ─────────────────────────────────────────────────────────────────
function CategoryQuerySelect(props) {
  const [categories, setCategories] = React.useState([]);
  React.useEffect(() => {
    loadCategories((cats) => {
      setCategories(cats);
    });
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
// Factory: createRecordWorkbenchSheet
// ─────────────────────────────────────────────────────────────────
const InnerBa030V2Sheet = createRecordWorkbenchSheet({
  sheetId: 'ba030',
  title: '供應商基本資料管理',
  breadcrumb: ['基礎資料', '供應商基本資料管理'],

  api: {
    listUrl: `${API}ba015/?type=3`,
    deepSaveUrl: `${API}ba015/deep_save/?type=3`,
    deleteUrl: `${API}ba015/`,
  },

  masterKey: 'gkey',
  fieldLabels: FIELD_LABELS,

  sidebar: {
    title: '供應商列表',
    getDisplayText: (row) => `[${row.factno || '?'}] ${row.shortname || ''}`,
  },

  createDefaultRecord: (tempKey) => ({
    gkey: tempKey,
    type: '3',
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
        title: '採購分類',
        dataIndex: 'ba020gkey',
        width: 150,
        render: (val) => <CategoryName gkey={val} />,
      },
      {
        title: '供應商編號',
        dataIndex: 'factno',
        width: 130,
        fixed: 'left',
        sorter: (a, b) => (a.factno || '').localeCompare(b.factno || ''),
      },
      { title: '廠商簡稱', dataIndex: 'shortname', width: 160 },
      { title: '中文全名', dataIndex: 'factname', width: 220 },
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
      <Col span={5}>
        <Form.Item name="factno" label="供應商編號">
          <Input placeholder="輸入供應商編號搜尋..." />
        </Form.Item>
      </Col>
      <Col span={5}>
        <Form.Item name="shortname" label="廠商簡稱">
          <Input placeholder="輸入廠商簡稱搜尋..." />
        </Form.Item>
      </Col>
      <Col span={5}>
        <Form.Item name="ba020gkey" label="採購分類">
          <CategoryQuerySelect placeholder="選擇採購分類搜尋..." allowClear />
        </Form.Item>
      </Col>
      <Col span={5}>
        <Form.Item name="remark" label="備註">
          <Input placeholder="輸入備註搜尋..." />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="factname" label="中文全名">
          <Input placeholder="輸入中文全名搜尋..." />
        </Form.Item>
      </Col>
    </Row>
  ),

  renderMasterForm: (props) => <Ba030MasterForm {...props} />,

  detailTabs: [
    {
      key: 'contacts',
      title: '👥 聯絡窗口 (ba016)',
      parentKey: 'ba015gkey',
      apiUrl: `${API}ba016/`,
      renderer: Ba030ContactsTab,
    },
  ],

  buildDeepSavePayload: (master, detailStates) => {
    const contacts = (detailStates.contacts?.rows || [])
      .filter((r) => r.contact)
      .map((c) => ({
        ...c,
        ba015gkey: master.gkey,
        parentgkey: null, // No branches exist for BA030
      }));

    return {
      master,
      contacts,
    };
  },
});

export function Ba030V2Sheet(props) {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Whenever Ba030V2Sheet mounts, force reload categories from backend
    categoriesLoaded = false;
    loadCategories(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>載入採購分類中...</div>;
  }

  return <InnerBa030V2Sheet {...props} />;
}

export default Ba030V2Sheet;
