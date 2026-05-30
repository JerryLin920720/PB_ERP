import React from 'react';
import { Row, Col, Form, Input, Select, Switch, Tabs, Button, Table, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';

const API = 'http://localhost:8001/api/';

// Module-level cache for option selections
let companyList = [];
let defaultCompanyGkey = '';
let departmentList = [];
let positionList = [];
let areaList = [];
let listsLoaded = false;

function loadDropdownOptions(callback) {
  if (listsLoaded) {
    if (callback) callback();
    return;
  }
  Promise.all([
    axios.get(`${API}ba005/`),
    axios.get(`${API}ba045/`),
    axios.get(`${API}ba050/`),
    axios.get(`${API}ba004/`),
  ])
    .then(([res5, res45, res50, res4]) => {
      companyList = res5.data || [];
      const majorCompany = companyList.find((c) => c.major === 'Y');
      if (majorCompany) {
        defaultCompanyGkey = majorCompany.gkey;
      } else if (companyList.length > 0) {
        defaultCompanyGkey = companyList[0].gkey;
      }
      departmentList = res45.data || [];
      positionList = res50.data || [];
      areaList = res4.data || [];
      listsLoaded = true;
      if (callback) callback();
    })
    .catch((err) => {
      console.warn('Failed to load dropdown options:', err);
      if (callback) callback();
    });
}

// ─────────────────────────────────────────────────────────────────
// Detail Tab 1: 學歷背景 (educations -> es102)
// ─────────────────────────────────────────────────────────────────
function Es102EducationsTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow, activeRecord }) {
  const handleAdd = () => {
    onAddRow({
      schoolname: '',
      daterange: '',
      yearterm: null,
      daynight: '1',
      graduate: '1',
      es101gkey: activeRecord?.gkey || '',
    });
  };

  const columns = [
    {
      title: '學校名稱',
      dataIndex: 'schoolname',
      width: 250,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'schoolname', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '起迄修業時間',
      dataIndex: 'daterange',
      width: 200,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            placeholder="如：2020/09 - 2024/06"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'daterange', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '年制 / 年資',
      dataIndex: 'yearterm',
      width: 120,
      render: (val, record) =>
        isEditing ? (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={20}
            value={val}
            onChange={(num) => onCellChange(record.gkey, 'yearterm', num)}
          />
        ) : val || '-',
    },
    {
      title: '日間 / 夜間',
      dataIndex: 'daynight',
      width: 130,
      render: (val, record) =>
        isEditing ? (
          <Select
            size="small"
            style={{ width: '100%' }}
            value={val || '1'}
            onChange={(sel) => onCellChange(record.gkey, 'daynight', sel)}
          >
            <Select.Option value="1">1 - 日間部</Select.Option>
            <Select.Option value="2">2 - 夜間部</Select.Option>
          </Select>
        ) : val === '2' ? '夜間部' : '日間部',
    },
    {
      title: '畢 / 肄業',
      dataIndex: 'graduate',
      width: 130,
      render: (val, record) =>
        isEditing ? (
          <Select
            size="small"
            style={{ width: '100%' }}
            value={val || '1'}
            onChange={(sel) => onCellChange(record.gkey, 'graduate', sel)}
          >
            <Select.Option value="1">1 - 畢業</Select.Option>
            <Select.Option value="2">2 - 肄業</Select.Option>
          </Select>
        ) : val === '2' ? '肄業' : '畢業',
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
        locale={{ emptyText: '無學歷背景資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ width: '100%', marginTop: 8 }}
        >
          新增學歷背景
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Detail Tab 2: 工作經歷 (experiences -> es103)
// ─────────────────────────────────────────────────────────────────
function Es103ExperiencesTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow, activeRecord }) {
  const handleAdd = () => {
    onAddRow({
      companyname: '',
      jobposition: '',
      daterange: '',
      salary: null,
      es101gkey: activeRecord?.gkey || '',
    });
  };

  const columns = [
    {
      title: '公司名稱',
      dataIndex: 'companyname',
      width: 250,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'companyname', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '職務名稱',
      dataIndex: 'jobposition',
      width: 200,
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
      title: '歷時起迄期間',
      dataIndex: 'daterange',
      width: 200,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            placeholder="如：2016/03 - 2020/02"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'daterange', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '月薪資',
      dataIndex: 'salary',
      width: 150,
      render: (val, record) =>
        isEditing ? (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            value={val}
            onChange={(num) => onCellChange(record.gkey, 'salary', num)}
          />
        ) : val !== null && val !== undefined ? Number(val).toLocaleString() : '-',
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
        locale={{ emptyText: '無工作經歷資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ width: '100%', marginTop: 8 }}
        >
          新增工作經歷
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Detail Tab 3: 家庭成員 (families -> es104)
// ─────────────────────────────────────────────────────────────────
function Es104FamiliesTab({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow, activeRecord }) {
  const handleAdd = () => {
    onAddRow({
      relationship: '',
      familyname: '',
      birthday: null,
      companyname: '',
      es101gkey: activeRecord?.gkey || '',
    });
  };

  const columns = [
    {
      title: '親屬關係/稱謂',
      dataIndex: 'relationship',
      width: 150,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            placeholder="如：父、母、長子"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'relationship', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '眷屬姓名',
      dataIndex: 'familyname',
      width: 150,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'familyname', e.target.value)}
          />
        ) : val || '-',
    },
    {
      title: '出生日期',
      dataIndex: 'birthday',
      width: 160,
      render: (val, record) =>
        isEditing ? (
          <DatePicker
            size="small"
            style={{ width: '100%' }}
            value={val ? dayjs(val) : null}
            onChange={(d) => onCellChange(record.gkey, 'birthday', d ? d.toISOString() : null)}
            format="YYYY-MM-DD"
          />
        ) : val ? dayjs(val).format('YYYY-MM-DD') : '-',
    },
    {
      title: '眷屬服務單位 / 學校',
      dataIndex: 'companyname',
      width: 250,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => onCellChange(record.gkey, 'companyname', e.target.value)}
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
        locale={{ emptyText: '無家庭眷屬資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ width: '100%', marginTop: 8 }}
        >
          新增家庭眷屬
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Master Card: Es101MasterForm (3 sub-tabs)
// ─────────────────────────────────────────────────────────────────
function Es101MasterForm({ form, isEditing, activeRecord, updateMasterField }) {
  return (
    <Tabs defaultActiveKey="1" size="small" type="line" style={{ marginTop: -8 }}>
      <Tabs.TabPane tab="👤 基本人事個資" key="1">
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item
              name="employeeno"
              label="工號"
              rules={[{ required: true, message: '請輸入工號' }]}
              style={{ marginBottom: 4 }}
            >
              <Input
                maxLength={20}
                disabled={!isEditing || (activeRecord && !activeRecord.gkey.startsWith('temp_'))}
                placeholder="工號 (大寫, 唯一)"
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  form.setFieldsValue({ employeeno: val });
                  updateMasterField('employeeno', val);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="chinesename"
              label="中文姓名"
              rules={[{ required: true, message: '請輸入中文姓名' }]}
              style={{ marginBottom: 4 }}
            >
              <Input maxLength={20} disabled={!isEditing} placeholder="中文姓名" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="englishname"
              label="英文姓名"
              rules={[{ required: true, message: '請輸入英文姓名' }]}
              style={{ marginBottom: 4 }}
            >
              <Input maxLength={30} disabled={!isEditing} placeholder="英文姓名" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="idno"
              label="身分證字號"
              rules={[{ required: true, message: '請輸入身分證字號' }]}
              style={{ marginBottom: 4 }}
            >
              <Input maxLength={20} disabled={!isEditing} placeholder="身分證字號" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="sex" label="性別" style={{ marginBottom: 4 }}>
              <Select disabled={!isEditing}>
                <Select.Option value="M">M - 男</Select.Option>
                <Select.Option value="W">W - 女</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="birthday"
              label="生日"
              style={{ marginBottom: 4 }}
              getValueProps={(value) => ({
                value: value ? dayjs(value) : null,
              })}
              getValueFromEvent={(date) => (date ? date.toISOString() : null)}
            >
              <DatePicker style={{ width: '100%' }} disabled={!isEditing} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="birthplace" label="籍貫" style={{ marginBottom: 4 }}>
              <Input maxLength={20} disabled={!isEditing} placeholder="籍貫" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="bloodtype" label="血型" style={{ marginBottom: 4 }}>
              <Select disabled={!isEditing}>
                <Select.Option value="O">O 型</Select.Option>
                <Select.Option value="A">A 型</Select.Option>
                <Select.Option value="B">B 型</Select.Option>
                <Select.Option value="4">AB 型</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="marry" label="婚姻狀態" style={{ marginBottom: 4 }}>
              <Select disabled={!isEditing}>
                <Select.Option value="N">未婚</Select.Option>
                <Select.Option value="Y">已婚</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="military" label="兵役狀態" style={{ marginBottom: 4 }}>
              <Select disabled={!isEditing}>
                <Select.Option value="N">未役</Select.Option>
                <Select.Option value="Y">役畢</Select.Option>
                <Select.Option value="X">免役</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="height" label="身高 (cm)" style={{ marginBottom: 4 }}>
              <InputNumber style={{ width: '100%' }} min={0} max={300} disabled={!isEditing} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="weight" label="體重 (kg)" style={{ marginBottom: 4 }}>
              <InputNumber style={{ width: '100%' }} min={0} max={500} disabled={!isEditing} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="ba005gkey" label="所屬公司" style={{ marginBottom: 4 }}>
              <Select disabled={!isEditing}>
                {companyList.map((c) => (
                  <Select.Option key={c.gkey} value={c.gkey}>
                    {c.factno} - {c.shortname}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="ba045gkey" label="部門" style={{ marginBottom: 4 }}>
              <Select disabled={!isEditing} allowClear showSearch optionFilterProp="label">
                {departmentList.map((d) => (
                  <Select.Option key={d.gkey} value={d.gkey} label={`${d.deptno} - ${d.department}`}>
                    {d.deptno} - {d.department}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="ba050gkey" label="職稱" style={{ marginBottom: 4 }}>
              <Select disabled={!isEditing} allowClear showSearch optionFilterProp="label">
                {positionList.map((p) => (
                  <Select.Option key={p.gkey} value={p.gkey} label={`${p.jobcode} - ${p.jobposition}`}>
                    {p.jobcode} - {p.jobposition}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="ba004gkey" label="工作地點" style={{ marginBottom: 4 }}>
              <Select disabled={!isEditing} allowClear showSearch optionFilterProp="label">
                {areaList.map((a) => (
                  <Select.Option key={a.gkey} value={a.gkey} label={`${a.areacode} - ${a.areaname}`}>
                    {a.areacode} - {a.areaname}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item
              name="arrivaldate"
              label="到職日期"
              style={{ marginBottom: 4 }}
              getValueProps={(value) => ({
                value: value ? dayjs(value) : null,
              })}
              getValueFromEvent={(date) => (date ? date.toISOString() : null)}
            >
              <DatePicker style={{ width: '100%' }} disabled={!isEditing} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="leavedate"
              label="離職日期"
              style={{ marginBottom: 4 }}
              getValueProps={(value) => ({
                value: value ? dayjs(value) : null,
              })}
              getValueFromEvent={(date) => (date ? date.toISOString() : null)}
            >
              <DatePicker style={{ width: '100%' }} disabled={!isEditing} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
        </Row>
      </Tabs.TabPane>
      <Tabs.TabPane tab="📞 通訊聯絡與緊急救助" key="2">
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="tel" label="現住電話" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} placeholder="聯絡電話" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="mobilephone" label="行動電話" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} placeholder="行動電話" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="registertel" label="戶籍電話" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} placeholder="戶籍聯絡電話" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="extension" label="分機" style={{ marginBottom: 4 }}>
              <Input maxLength={10} disabled={!isEditing} placeholder="分機" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>
            <Form.Item name="email" label="電子信箱 (Email)" style={{ marginBottom: 4 }}>
              <Input maxLength={50} disabled={!isEditing} placeholder="Email (大小寫不限)" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="languageability" label="語言能力" style={{ marginBottom: 4 }}>
              <Input maxLength={100} disabled={!isEditing} placeholder="如：中文、英文" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="driverlicences" label="駕照機車/汽車" style={{ marginBottom: 4 }}>
              <Input maxLength={100} disabled={!isEditing} placeholder="汽車、重機" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={12}>
            <Form.Item name="contactaddress" label="現住地址" style={{ marginBottom: 4 }}>
              <Input maxLength={100} disabled={!isEditing} placeholder="聯絡現住地址" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="registeraddress" label="戶籍地址" style={{ marginBottom: 4 }}>
              <Input maxLength={100} disabled={!isEditing} placeholder="戶籍登記地址" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="liaison" label="緊急聯絡人" style={{ marginBottom: 4 }}>
              <Input maxLength={20} disabled={!isEditing} placeholder="聯絡人姓名" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="relationship" label="緊急聯絡人關係" style={{ marginBottom: 4 }}>
              <Input maxLength={20} disabled={!isEditing} placeholder="例如：父母、配偶" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="rmobilephone" label="緊急聯絡人手機" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} placeholder="聯絡人手機" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="rtel" label="緊急聯絡人電話" style={{ marginBottom: 4 }}>
              <Input maxLength={40} disabled={!isEditing} placeholder="聯絡人室內電話" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={24}>
            <Form.Item name="raddress" label="緊急聯絡人地址" style={{ marginBottom: 4 }}>
              <Input maxLength={100} disabled={!isEditing} placeholder="聯絡人通訊地址" />
            </Form.Item>
          </Col>
        </Row>
      </Tabs.TabPane>
      <Tabs.TabPane tab="🔒 安全系統帳戶與備註" key="3">
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item
              name="systemuser"
              label="是否為系統使用者"
              valuePropName="checked"
              getValueProps={(val) => ({ checked: val === 'Y' })}
              getValueFromEvent={(checked) => (checked ? 'Y' : 'N')}
              style={{ marginBottom: 4 }}
              help="勾選後存檔時，系統將自動同步並啟用其安全帳號 (預設帳密為工號)"
            >
              <Switch disabled={!isEditing} checkedChildren="Y" unCheckedChildren="N" />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item name="signpath" label="電子簽章路徑" style={{ marginBottom: 4 }}>
              <Input maxLength={200} disabled={!isEditing} placeholder="簽章檔路徑" />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item name="signerpic" label="簽章圖片路徑" style={{ marginBottom: 4 }}>
              <Input maxLength={200} disabled={!isEditing} placeholder="照片/圖檔路徑" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={24}>
            <Form.Item name="remark" label="公司綜合備註" style={{ marginBottom: 4 }}>
              <Input.TextArea rows={4} maxLength={4000} placeholder="人事備註與綜合評估..." disabled={!isEditing} />
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
  employeeno: '「工號」',
  idno: '「身分證字號」',
  chinesename: '「中文姓名」',
  englishname: '「英文姓名」',
};

// ─────────────────────────────────────────────────────────────────
// Factory: createRecordWorkbenchSheet
// ─────────────────────────────────────────────────────────────────
const InnerEs101V2Sheet = createRecordWorkbenchSheet({
  sheetId: 'es101',
  title: '員工基本資料管理',
  breadcrumb: ['基礎資料', '員工基本資料管理'],

  api: {
    listUrl: `${API}es101/`,
    deepSaveUrl: `${API}es101/deep_save/`,
    deleteUrl: `${API}es101/`,
  },

  masterKey: 'gkey',
  fieldLabels: FIELD_LABELS,

  sidebar: {
    title: '員工列表',
    getDisplayText: (row) => `[${row.employeeno || '?'}] ${row.chinesename || ''}`,
  },

  createDefaultRecord: (tempKey) => ({
    gkey: tempKey,
    employeeno: '',
    chinesename: '',
    englishname: '',
    idno: '',
    sex: 'M',
    bloodtype: 'O',
    marry: 'N',
    military: 'N',
    systemuser: 'N',
    ba005gkey: defaultCompanyGkey,
    arrivaldate: null,
    leavedate: null,
    birthday: null,
    height: null,
    weight: null,
  }),

  query: {
    buildParams: (values) => ({ ...values }),
  },

  list: {
    columns: [
      {
        title: '工號',
        dataIndex: 'employeeno',
        width: 120,
        fixed: 'left',
        sorter: (a, b) => (a.employeeno || '').localeCompare(b.employeeno || ''),
      },
      { title: '中文姓名', dataIndex: 'chinesename', width: 120 },
      { title: '英文姓名', dataIndex: 'englishname', width: 150 },
      {
        title: '部門',
        dataIndex: 'ba045gkey',
        width: 150,
        render: (val) => {
          const dept = departmentList.find((d) => d.gkey === val);
          return dept ? `${dept.deptno} - ${dept.department}` : val || '-';
        },
      },
      {
        title: '職稱',
        dataIndex: 'ba050gkey',
        width: 150,
        render: (val) => {
          const pos = positionList.find((p) => p.gkey === val);
          return pos ? `${pos.jobcode} - ${pos.jobposition}` : val || '-';
        },
      },
      {
        title: '工作地點',
        dataIndex: 'ba004gkey',
        width: 150,
        render: (val) => {
          const area = areaList.find((a) => a.gkey === val);
          return area ? `${area.areacode} - ${area.areaname}` : val || '-';
        },
      },
      {
        title: '在職狀態',
        dataIndex: 'leavedate',
        width: 100,
        render: (val) => {
          if (!val) return <span style={{ color: '#52c41a' }}>● 在職</span>;
          const leaveDate = new Date(val);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (leaveDate >= today) {
            return <span style={{ color: '#52c41a' }}>● 在職 (將離職)</span>;
          }
          return <span style={{ color: '#f5222d' }}>● 離職</span>;
        },
      },
      {
        title: '系統帳號',
        dataIndex: 'systemuser',
        width: 100,
        render: (val) => (val === 'Y' ? '啟用' : '停用'),
      },
    ],
  },

  renderQueryForm: ({ form: qForm }) => (
    <Row gutter={8}>
      <Col span={5}>
        <Form.Item name="employeeno" label="員工工號">
          <Input placeholder="輸入工號搜尋..." allowClear />
        </Form.Item>
      </Col>
      <Col span={5}>
        <Form.Item name="chinesename" label="中文姓名">
          <Input placeholder="輸入中文姓名搜尋..." allowClear />
        </Form.Item>
      </Col>
      <Col span={5}>
        <Form.Item name="englishname" label="英文姓名">
          <Input placeholder="輸入英文姓名搜尋..." allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="systemuser" label="系統使用者">
          <Select placeholder="全部" allowClear>
            <Select.Option value="Y">是</Select.Option>
            <Select.Option value="N">否</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={5}>
        <Form.Item name="status" label="在職狀態" initialValue="A">
          <Select placeholder="選擇狀態...">
            <Select.Option value="A">A - 全部</Select.Option>
            <Select.Option value="O">O - 在職</Select.Option>
            <Select.Option value="L">L - 離職</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="arrivaldate"
          label="到職日期起"
          getValueProps={(value) => ({
            value: value ? dayjs(value) : null,
          })}
          getValueFromEvent={(date) => (date ? date.format('YYYY-MM-DD') : null)}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="起始到職日" />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="arrivaldate2"
          label="到職日期迄"
          getValueProps={(value) => ({
            value: value ? dayjs(value) : null,
          })}
          getValueFromEvent={(date) => (date ? date.format('YYYY-MM-DD') : null)}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="截止到職日" />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="leavedate"
          label="離職日期起"
          getValueProps={(value) => ({
            value: value ? dayjs(value) : null,
          })}
          getValueFromEvent={(date) => (date ? date.format('YYYY-MM-DD') : null)}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="起始離職日" />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item
          name="leavedate2"
          label="離職日期迄"
          getValueProps={(value) => ({
            value: value ? dayjs(value) : null,
          })}
          getValueFromEvent={(date) => (date ? date.format('YYYY-MM-DD') : null)}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="截止離職日" />
        </Form.Item>
      </Col>
    </Row>
  ),

  renderMasterForm: (props) => <Es101MasterForm {...props} />,

  detailTabs: [
    {
      key: 'educations',
      title: '🎓 學歷背景 (es102)',
      parentKey: 'es101gkey',
      apiUrl: `${API}es102/`,
      renderer: Es102EducationsTab,
    },
    {
      key: 'experiences',
      title: '💼 工作經歷 (es103)',
      parentKey: 'es101gkey',
      apiUrl: `${API}es103/`,
      renderer: Es103ExperiencesTab,
    },
    {
      key: 'families',
      title: '👪 家庭成員 (es104)',
      parentKey: 'es101gkey',
      apiUrl: `${API}es104/`,
      renderer: Es104FamiliesTab,
    },
  ],

  buildDeepSavePayload: (master, detailStates) => {
    const educations = (detailStates.educations?.rows || [])
      .filter((r) => r.schoolname)
      .map((item) => ({
        ...item,
        es101gkey: master.gkey,
      }));

    const experiences = (detailStates.experiences?.rows || [])
      .filter((r) => r.companyname)
      .map((item) => ({
        ...item,
        es101gkey: master.gkey,
      }));

    const families = (detailStates.families?.rows || [])
      .filter((r) => r.relationship && r.familyname)
      .map((item) => ({
        ...item,
        es101gkey: master.gkey,
      }));

    return {
      master,
      educations,
      experiences,
      families,
    };
  },
});

export function Es101V2Sheet(props) {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listsLoaded = false;
    loadDropdownOptions(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>載入公司與人事選單中...</div>;
  }

  return <InnerEs101V2Sheet {...props} />;
}

export default Es101V2Sheet;
