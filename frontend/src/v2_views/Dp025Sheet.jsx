import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Input, Select, Checkbox, Radio, Space, Button, Table, Image, Modal, Spin, message, InputNumber,Card } from 'antd';
import { PlusOutlined, DeleteOutlined, ImportOutlined } from '@ant-design/icons';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import axios from 'axios';

// ── Tab 1: PRICE INFORMATION (dp026) ──────────────────────────────────
function Dp025PricesTab({
  rows,
  isEditing,
  loading,
  onCellChange,
  onAddRow,
  onDeleteRow,
}) {
  const handleAdd = () => {
    onAddRow({
      gkey: `temp_p_${Date.now()}`,
      ba010gkey: null,
      ba010_shortname: '',
      ba015gkey: null,
      ba015_shortname: '',
      stock: '',
      sizerun: '',
      ba060gkey: null,
      price: 0,
      cba060gkey: null,
      cost: 0,
      quotedate: new Date().toISOString().substring(0, 10),
      ba070gkey: null,
      term: '',
      remark: ''
    });
  };

  const handleCellChange = (rowKey, field, val, selectedRowObj = null) => {
    onCellChange(rowKey, field, val);
    
    // Auto-update display shortnames or codes on selection
    if (field === 'ba010gkey') {
      onCellChange(rowKey, 'ba010_shortname', selectedRowObj?.shortname || '');
      
      // Hook: When row 1 customer changes, check image recalculation trigger
      const firstRow = rows[0];
      const isFirstRow = firstRow && (firstRow.gkey === rowKey || firstRow.id === rowKey || firstRow.serialno === rowKey);
      if (isFirstRow) {
        console.log('[Hook] Recalculate master photopath because first row customer changed to:', selectedRowObj?.shortname);
      }
    } else if (field === 'ba015gkey') {
      onCellChange(rowKey, 'ba015_shortname', selectedRowObj?.shortname || '');
    } else if (field === 'ba060gkey') {
      onCellChange(rowKey, 'ba060_code', selectedRowObj?.currencyno || '');
    } else if (field === 'cba060gkey') {
      onCellChange(rowKey, 'cba060_code', selectedRowObj?.currencyno || '');
    } else if (field === 'ba070gkey') {
      onCellChange(rowKey, 'ba070_name', selectedRowObj?.termtype || '');
    }
  };

  const columns = [
    {
      title: '項次',
      dataIndex: 'serialno',
      width: 60,
      align: 'center',
      render: (val, _, index) => val || index + 1
    },
    {
      title: '客戶',
      dataIndex: 'ba010_shortname',
      width: 140,
      render: (val, record) =>
        isEditing ? (
          <ERPLookupField
            type="ba010"
            value={record.ba010gkey}
            onChange={(v, obj) => handleCellChange(record.gkey, 'ba010gkey', v, obj)}
          />
        ) : val
    },
    {
      title: '工廠',
      dataIndex: 'ba015_shortname',
      width: 140,
      render: (val, record) =>
        isEditing ? (
          <ERPLookupField
            type="ba015"
            queryParams={{ type: '1' }}
            value={record.ba015gkey}
            onChange={(v, obj) => handleCellChange(record.gkey, 'ba015gkey', v, obj)}
          />
        ) : val
    },
    {
      title: 'Stock#',
      dataIndex: 'stock',
      width: 120,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => handleCellChange(record.gkey, 'stock', e.target.value)}
          />
        ) : val
    },
    {
      title: '尺碼',
      dataIndex: 'sizerun',
      width: 100,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => handleCellChange(record.gkey, 'sizerun', e.target.value)}
          />
        ) : val
    },
    {
      title: '報價幣別',
      dataIndex: 'ba060_code',
      width: 100,
      render: (val, record) =>
        isEditing ? (
          <ERPLookupField
            type="ba060"
            value={record.ba060gkey}
            onChange={(v, obj) => handleCellChange(record.gkey, 'ba060gkey', v, obj)}
          />
        ) : val
    },
    {
      title: '報價',
      dataIndex: 'price',
      width: 100,
      align: 'right',
      render: (val, record) =>
        isEditing ? (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            step={0.01}
            precision={4}
            value={val}
            onChange={(v) => handleCellChange(record.gkey, 'price', v)}
          />
        ) : val
    },
    {
      title: '成本幣別',
      dataIndex: 'cba060_code',
      width: 100,
      render: (val, record) =>
        isEditing ? (
          <ERPLookupField
            type="ba060"
            value={record.cba060gkey}
            onChange={(v, obj) => handleCellChange(record.gkey, 'cba060gkey', v, obj)}
          />
        ) : val
    },
    {
      title: '成本',
      dataIndex: 'cost',
      width: 100,
      align: 'right',
      render: (val, record) =>
        isEditing ? (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            step={0.01}
            precision={4}
            value={val}
            onChange={(v) => handleCellChange(record.gkey, 'cost', v)}
          />
        ) : val
    },
    {
      title: '報價日期',
      dataIndex: 'quotedate',
      width: 120,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            type="date"
            value={val ? val.substring(0, 10) : ''}
            onChange={(e) => handleCellChange(record.gkey, 'quotedate', e.target.value)}
          />
        ) : (val ? val.substring(0, 10) : '')
    },
    {
      title: '貿易條件',
      dataIndex: 'ba070_name',
      width: 120,
      render: (val, record) =>
        isEditing ? (
          <ERPLookupField
            type="ba070"
            value={record.ba070gkey}
            onChange={(v, obj) => handleCellChange(record.gkey, 'ba070gkey', v, obj)}
          />
        ) : val
    },
    {
      title: 'Port / 口岸',
      dataIndex: 'term',
      width: 120,
      render: (val, record) =>
        isEditing ? (
          <ERPLookupField
            type="ba065"
            value={record.term}
            onChange={(v) => handleCellChange(record.gkey, 'term', v)}
          />
        ) : val
    },
    {
      title: '備註',
      dataIndex: 'remark',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            onChange={(e) => handleCellChange(record.gkey, 'remark', e.target.value)}
          />
        ) : val
    },
    ...(isEditing
      ? [{
          title: '',
          key: 'action',
          width: 50,
          align: 'center',
          render: (_, record) => (
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => onDeleteRow(record.gkey)}
            />
          )
        }]
      : [])
  ];

  return (
    <div
      style={{
        maxHeight: 340,
        overflow: 'hidden',
      }}
    >
      <Table
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        scroll={{ x: 'max-content', y: 280 }}
        locale={{ emptyText: '無報價資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={handleAdd}
        >
          新增報價資料
        </Button>
      )}
    </div>
  );
}

// ── Tab 2: 技轉資訊 (dp027 Custom Brother Layout) ──────────────────────
function Dp025HandoverTab({
  rows,
  isEditing,
  loading,
  onCellChange,
  onAddRow,
  onDeleteRow,
}) {
  const [selectedRowKey, setSelectedRowKey] = useState(null);

  // Auto select first row if none is selected
  useEffect(() => {
    if (rows && rows.length > 0) {
      if (!selectedRowKey || !rows.some(r => r.gkey === selectedRowKey)) {
        setSelectedRowKey(rows[0].gkey);
      }
    } else {
      setSelectedRowKey(null);
    }
  }, [rows, selectedRowKey]);

  const selectedRow = rows.find(r => r.gkey === selectedRowKey);

  const handleAdd = () => {
    const tempKey = `temp_h_${Date.now()}`;
    onAddRow({
      gkey: tempKey,
      ba015gkey: null,
      ba015_shortname: '',
      ba015_factno: '',
      issuedate: new Date().toISOString().substring(0, 10),
      trandate: null,
      shipto: '',
      shipfrom: '',
      cc: '',
      tranfact: '',
      tranpattern: '',
      trandev: '',
      tranqc: '',
      tranmold: '',
      modifymemo: '',
      factcomment: '',
    });
    setSelectedRowKey(tempKey);
  };

  const handleDelete = () => {
    if (!selectedRowKey) return;
    onDeleteRow(selectedRowKey);
    const remaining = rows.filter(r => r.gkey !== selectedRowKey);
    if (remaining.length > 0) {
      setSelectedRowKey(remaining[0].gkey);
    } else {
      setSelectedRowKey(null);
    }
  };

  const listColumns = [
    {
      title: '技轉工廠',
      dataIndex: 'ba015_shortname',
      render: (val, record) => val || record.ba015_factno || '新廠房',
    },
    {
      title: '發行日期',
      dataIndex: 'issuedate',
      render: (v) => v ? v.substring(0, 10) : '',
    },
    {
      title: '技轉日期',
      dataIndex: 'trandate',
      render: (v) => v ? v.substring(0, 10) : '',
    }
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        height: 360,
        minHeight: 360,
        overflow: 'hidden',
      }}
    >
      {/* Left factory list */}
      <div
        style={{
          width: '30%',
          borderRight: '1px solid #f0f0f0',
          paddingRight: '16px',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>工廠清單 ({rows.length})</span>
          {isEditing && (
            <Space>
              <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增</Button>
              <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDelete} disabled={!selectedRowKey}>刪除</Button>
            </Space>
          )}
        </div>
        <Table
          size="small"
          dataSource={rows}
          columns={listColumns}
          rowKey="gkey"
          pagination={false}
          scroll={{ y: 260 }}
          onRow={(record) => ({
            onClick: () => setSelectedRowKey(record.gkey),
            style: { cursor: 'pointer', backgroundColor: selectedRowKey === record.gkey ? '#e6f7ff' : 'transparent' }
          })}
          locale={{ emptyText: '無技轉資料' }}
          bordered
        />
      </div>

      {/* Right details form */}
      <div
        style={{
          width: '70%',
          paddingLeft: '8px',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '8px',
        }}
      >
        {selectedRow ? (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '4px' }}>
              技轉詳細資料 ({selectedRow.ba015_shortname || '未命名工廠'})
            </div>
            <Row gutter={8}>
              <Col span={8}>
                <Form.Item label="技轉工廠" required>
                  <ERPLookupField
                    type="ba015"
                    queryParams={{ type: '1' }}
                    value={selectedRow.ba015gkey}
                    disabled={!isEditing}
                    onChange={(val, selectedRowObj) => {
                      onCellChange(selectedRow.gkey, 'ba015gkey', val);
                      onCellChange(selectedRow.gkey, 'ba015_shortname', selectedRowObj?.shortname || '');
                      onCellChange(selectedRow.gkey, 'ba015_factno', selectedRowObj?.factno || '');
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="發行日期">
                  <Input
                    type="date"
                    value={selectedRow.issuedate ? selectedRow.issuedate.substring(0, 10) : ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'issuedate', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="技轉日期">
                  <Input
                    type="date"
                    value={selectedRow.trandate ? selectedRow.trandate.substring(0, 10) : ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'trandate', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={8}>
              <Col span={8}>
                <Form.Item label="TO">
                  <Input
                    value={selectedRow.shipto || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'shipto', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="From">
                  <Input
                    value={selectedRow.shipfrom || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'shipfrom', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="C.C.">
                  <Input
                    value={selectedRow.cc || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'cc', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={8}>
              <Col span={12}>
                <Form.Item label="Attendees (工廠出席人員)">
                  <Input
                    value={selectedRow.tranfact || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'tranfact', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Pattern Div. (針車技術)">
                  <Input
                    value={selectedRow.tranpattern || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'tranpattern', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={8}>
              <Col span={8}>
                <Form.Item label="DEV Div. (開發部)">
                  <Input
                    value={selectedRow.trandev || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'trandev', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="QC Div. (驗貨部)">
                  <Input
                    value={selectedRow.tranqc || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'tranqc', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Mold Div. (模具部)">
                  <Input
                    value={selectedRow.tranmold || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'tranmold', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={8}>
              <Col span={12}>
                <Form.Item label="Modify Memo (修改記錄)">
                  <Input.TextArea
                    rows={3}
                    value={selectedRow.modifymemo || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'modifymemo', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="FTY Comment (工廠回饋)">
                  <Input.TextArea
                    rows={3}
                    value={selectedRow.factcomment || ''}
                    disabled={!isEditing}
                    onChange={(e) => onCellChange(selectedRow.gkey, 'factcomment', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999', border: '1px dashed #f0f0f0', borderRadius: '4px' }}>
            請點擊左側「新增」按鈕以建立技轉工廠詳細資料。
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: 技术资料 (dp028) ──────────────────────────────────────────
function Dp025AccessoriesTab({
  rows,
  isEditing,
  loading,
  onCellChange,
  onAddRow,
  onDeleteRow,
}) {
  const handleAdd = () => {
    onAddRow({
      gkey: `temp_a_${Date.now()}`,
      accessory: '',
      description: ''
    });
  };

  const columns = [
    {
      title: '序號',
      dataIndex: 'serialno',
      width: 80,
      align: 'center',
      render: (val, _, index) => val || index + 1
    },
    {
      title: '項目 (必填、不可重複)',
      dataIndex: 'accessory',
      width: 250,
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            placeholder="請輸入項目名稱"
            onChange={(e) => onCellChange(record.gkey, 'accessory', e.target.value)}
          />
        ) : val
    },
    {
      title: '項目標準',
      dataIndex: 'description',
      render: (val, record) =>
        isEditing ? (
          <Input
            size="small"
            value={val || ''}
            placeholder="請輸入項目標準"
            onChange={(e) => onCellChange(record.gkey, 'description', e.target.value)}
          />
        ) : val
    },
    ...(isEditing
      ? [{
          title: '',
          key: 'action',
          width: 50,
          align: 'center',
          render: (_, record) => (
            <Button
              size="small"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => onDeleteRow(record.gkey)}
            />
          )
        }]
      : [])
  ];

  return (
    <div
      style={{
        maxHeight: 340,
        overflow: 'hidden',
      }}
    >
      <Table
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        scroll={{ x: 'max-content', y: 280 }}
        locale={{ emptyText: '無技術資料' }}
      />
      {isEditing && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={handleAdd}
        >
          新增技術資料
        </Button>
      )}
    </div>
  );
}

// ── Sample Import modal ──────────────────────────────────────────────
function SampleImportModal({ visible, onClose, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState([]);
  const [sampleno, setSampleno] = useState('');
  const [styleno, setStyleno] = useState('');

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/dp031/', {
        params: {
          unconverted: 'true',
          sampleno: sampleno || undefined,
          styleno: styleno || undefined,
        }
      });
      setSamples(res.data || []);
    } catch (e) {
      message.error('載入樣品資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchSamples();
    }
  }, [visible]);

  const columns = [
    { title: '樣品單號', dataIndex: 'sampleno', width: 150 },
    { title: '樣品型體編號', dataIndex: 'styleno', width: 150 },
    { title: '樣品名稱', dataIndex: 'sample_stylename' },
    { title: '配色名稱', dataIndex: 'ecolor', width: 120 },
    {
      title: '發行日期',
      dataIndex: 'issuedate',
      width: 120,
      render: (v) => v ? v.substring(0, 10) : ''
    }
  ];

  return (
    <Modal
      title="選擇樣品配色明細進行轉單"
      visible={visible}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Input
          placeholder="樣品單號"
          value={sampleno}
          onChange={(e) => setSampleno(e.target.value)}
          style={{ width: 180 }}
          onPressEnter={fetchSamples}
        />
        <Input
          placeholder="樣品型體編號"
          value={styleno}
          onChange={(e) => setStyleno(e.target.value)}
          style={{ width: 180 }}
          onPressEnter={fetchSamples}
        />
        <Button type="primary" onClick={fetchSamples}>查詢</Button>
        <Button onClick={() => { setSampleno(''); setStyleno(''); }}>重置</Button>
      </div>

      <Table
        size="small"
        loading={loading}
        dataSource={samples}
        columns={columns}
        rowKey="gkey"
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onDoubleClick: () => onSelect(record.gkey),
        })}
        bordered
      />
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#999', textAlign: 'right' }}>
        💡 雙擊行即可選取並複製該筆樣品配色明細的開發屬性到當前型體基本資料。
      </div>
    </Modal>
  );
}

// ── MAIN WORKBENCH ───────────────────────────────────────────────────
export default createRecordWorkbenchSheet({
  sheetId: 'dp025',
  title: '型體基本資料管理',
  breadcrumb: ['開發管理', '型體基本資料'],

  mainClassName: 'dp025-main-scroll',
  layout: {
    contentScroll: true,
    contentHeight: 'calc(100vh - 150px)',
  },  
  api: {
    listUrl: '/api/dp025/',
    deepSaveUrl: '/api/dp025/deep_save/',
    deleteUrl: '/api/dp025/',
  },

  masterKey: 'gkey',

  fieldLabels: {
    styleno: '型體編號',
    stylename: '型體名稱',
    oldstyle: '舊型號',
    year: '年度',
    ba055gkey: '季節代號',
    dp003gkey: '鞋種類別',
    dp004gkey: '性別',
    sizerun: '尺碼',
    logo: 'Logo',
    adopted: '已採用',
    confirms: '已確認',
    colorname: '顏色',
    issuedate: '發行日期',
    es101gkey: '建立人',
  },

  sidebar: {
    title: '型體列表',
    getDisplayText: (row) => `[${row.styleno || '?'}] ${row.stylename || ''}`,
  },

  createDefaultRecord: (tempKey) => {
    return {
      gkey: tempKey,
      styleno: '',
      stylename: '',
      oldstyle: '',
      year: String(new Date().getFullYear()),
      ba055gkey: null,
      dp003gkey: null,
      dp004gkey: null,
      sizerun: '',
      logo: '',
      adopted: 'N',
      confirms: 'N',
      photopath: '',
      dp023gkey: null,
      dp010gkey: null,
      dp015gkey: null,
      dp020gkey: null,
      colorname: '',
      upper: '',
      lining: '',
      sock: '',
      bottom: '',
      heel: '',
      tongue: '',
      material: '',
      remark: '',
      issuedate: new Date().toISOString().substring(0, 10),
      es101gkey: null,
      // dates
      trandue: null,
      tranreal: null,
      cutcfmdue: null,
      cutcfmreal: null,
      baccfmdue: null,
      baccfmreal: null,
      cfmdate: null,
      lmscfmdue: null,
      lmscfmreal: null,
      newknifedue: null,
      newknifereal: null,
      fitknifedue: null,
      fitknifereal: null
    };
  },

  query: {
    buildParams: (values) => {
      const params = { ...values };
      if (params.adopted === 'A') {
        delete params.adopted;
      }
      if (params.confirms === 'A') {
        delete params.confirms;
      }
      return params;
    }
  },

  list: {
    columns: [
      { title: '年度', dataIndex: 'year', width: 70, align: 'center' },
      { title: '型體編號', dataIndex: 'styleno', width: 140, fixed: 'left', sorter: (a,b) => (a.styleno||'').localeCompare(b.styleno||'') },
      { title: '型體名稱', dataIndex: 'stylename', width: 160 },
      { title: '發行日期', dataIndex: 'issuedate', width: 100, align: 'center', render: (v) => v ? v.substring(0, 10) : '' },
      { title: '配色組別', dataIndex: 'dp023_groupname', width: 120 },
      { title: '鞋楦編號', dataIndex: 'dp010_lastno', width: 110 },
      { title: '大底編號', dataIndex: 'dp015_bottomno', width: 110 },
      { title: '鞋跟編號', dataIndex: 'dp020_heelno', width: 90 },
      { title: '採用', dataIndex: 'adopted', width: 60, align: 'center', render: (v) => v === 'Y' ? 'Y' : 'N' },
      { title: '確認', dataIndex: 'confirms', width: 60, align: 'center', render: (v) => v === 'Y' ? 'Y' : 'N' }
    ]
  },

  validateMasterRow: (values) => {
    if (!values.styleno || !values.styleno.trim()) {
      throw new Error('型體編號為必填');
    }
    if (!values.year || !values.year.trim()) {
      throw new Error('年度為必填');
    }
    if (!values.issuedate) {
      throw new Error('發行日期為必填');
    }
  },

  validateAll: (record, detailStates) => {
    // 檢查 accessories (dp028)
    const accessories = detailStates.accessories?.rows || [];
    const accList = [];
    for (let i = 0; i < accessories.length; i++) {
      const row = accessories[i];
      const acc = row.accessory?.trim();
      if (!acc) {
        throw new Error(`技術配件第 ${i + 1} 列項目名稱不可空白`);
      }
      if (accList.includes(acc)) {
        throw new Error(`技術配件項目「${acc}」重複，請勿輸入重複的項目`);
      }
      accList.push(acc);
    }
  },

  buildDeepSavePayload: (latestMaster, detailStates) => {
    const cleanMaster = { ...latestMaster };
    // Clear read-only fields
    const readonly_fields = [
      'ba010_shortname', 'ba015_shortname', 'ba015_factno', 'season_code',
      'shoetype_name', 'gender_name', 'dp010_lastno', 'dp015_bottomno',
      'dp020_heelno', 'es101_englishname', 'dp023_groupname', 'display_label'
    ];
    readonly_fields.forEach(f => delete cleanMaster[f]);

    // Normalize checkboxes
    cleanMaster.adopted = cleanMaster.adopted === 'Y' || cleanMaster.adopted === true ? 'Y' : 'N';
    cleanMaster.confirms = cleanMaster.confirms === 'Y' || cleanMaster.confirms === true ? 'Y' : 'N';

    if (cleanMaster.styleno) {
      cleanMaster.styleno = cleanMaster.styleno.toUpperCase().trim();
    }

    if (cleanMaster.gkey && String(cleanMaster.gkey).startsWith('temp_')) {
      delete cleanMaster.gkey;
    }

    return {
      master: cleanMaster,
      prices: detailStates.prices?.rows || [],
      handovers: detailStates.handovers?.rows || [],
      accessories: detailStates.accessories?.rows || []
    };
  },

  detailTabs: [
    {
      key: 'prices',
      title: 'PRICE INFORMATION',
      parentKey: 'dp025gkey',
      apiUrl: '/api/dp026/',
      renderer: Dp025PricesTab
    },
    {
      key: 'handovers',
      title: '技轉資訊',
      parentKey: 'dp025gkey',
      apiUrl: '/api/dp027/',
      renderer: Dp025HandoverTab
    },
    {
      key: 'accessories',
      title: '技术资料',
      parentKey: 'dp025gkey',
      apiUrl: '/api/dp028/',
      renderer: Dp025AccessoriesTab
    }
  ],

  renderQueryForm: ({ form }) => (
    <Row gutter={16}>
      {/* 左側查詢條件 */}
      <Col span={18}>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="styleno" label="型體編號">
              <Input placeholder="模糊查詢型體編號" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="stylename" label="型體名稱">
              <Input placeholder="模糊查詢型體名稱" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="year" label="年度">
              <Input placeholder="年度精確查詢" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="ba055gkey" label="季節">
              <ERPLookupField type="ba055" placeholder="F2 選擇季節" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba010gkey" label="客戶">
              <ERPLookupField type="ba010" placeholder="F2 選擇客戶" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba015gkey" label="工廠">
              <ERPLookupField type="ba015" queryParams={{ type: '1' }} placeholder="F2 選擇工廠" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="dp023gkey" label="配色組別">
              <ERPLookupField type="dp023" placeholder="F2 選擇組別" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="dp003gkey" label="鞋種類別">
              <ERPLookupField type="dp003" placeholder="F2 選擇類別" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="es101gkey" label="Maker">
              <ERPLookupField type="es101" placeholder="F2 選擇建立人" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={12}>
            <Form.Item name="issuedate_start" label="發行日期起">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="issuedate_end" label="發行日期迄">
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>
      </Col>

      {/* 右側狀態區 */}
      <Col span={6}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="erp-rw-query-right-panel" style={{ padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
            <div className="erp-rw-query-right-panel-title" style={{ fontWeight: 'bold', marginBottom: '8px' }}>採用狀態</div>
            <Form.Item name="adopted" initialValue="A" style={{ marginBottom: 0 }}>
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="Y">已採用</Radio>
                  <Radio value="N">未採用</Radio>
                  <Radio value="A">全部</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </div>

          <div className="erp-rw-query-right-panel" style={{ padding: '8px 12px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
            <div className="erp-rw-query-right-panel-title" style={{ fontWeight: 'bold', marginBottom: '8px' }}>確認狀態</div>
            <Form.Item name="confirms" initialValue="A" style={{ marginBottom: 0 }}>
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="Y">已確認</Radio>
                  <Radio value="N">未確認</Radio>
                  <Radio value="A">全部</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </div>
        </div>
      </Col>
    </Row>
  ),

  renderMasterForm: ({ form, isEditing, activeRecord, updateMasterField }) => {
    const photopath = Form.useWatch('photopath', form);
    const [importModalVisible, setImportModalVisible] = useState(false);

    const handleImportSelect = async (dp031gkey) => {
      try {
        const res = await axios.post('/api/dp025/import_from_sample/', { dp031gkey });
        if (res.data && res.data.success) {
          const importedData = res.data.data;
          
          // Force UPPERCASE on imported style
          if (importedData.styleno) {
            importedData.styleno = importedData.styleno.toUpperCase().trim();
          }

          // Populate form fields
          form.setFieldsValue(importedData);
          
          // Update CRUD state
          Object.entries(importedData).forEach(([key, val]) => {
            updateMasterField(key, val);
          });
          
          message.success('樣品轉單成功！');
          setImportModalVisible(false);
        } else {
          message.error(res.data?.detail || '轉單失敗');
        }
      } catch (e) {
        message.error(e.response?.data?.detail || e.message || '轉單出錯');
      }
    };

    return (
      <div
        className="dp025-master-form"
        style={{
          height: 'auto',
          overflow: 'visible',
          padding: '0 12px 16px 0',
        }}
      >
        {isEditing && (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 5,
              marginBottom: '12px',
              padding: '8px 0',
              background: '#fff',
              display: 'flex',
              justifyContent: 'flex-end',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={() => setImportModalVisible(true)}
            >
              樣品工藝轉單
            </Button>
          </div>
        )}

        <Row gutter={16} align="top">
          {/* Left: main editable information */}
          <Col span={16}>
            <Card
              size="small"
              title="型體基本屬性"
              style={{ marginBottom: 12, borderRadius: 6 }}
              headStyle={{ backgroundColor: '#fafafa', fontSize: 13, fontWeight: 'bold', color: '#1890ff' }}
              bodyStyle={{ padding: 12 }}
            >
              <Row gutter={8}>
                <Col span={6}>
                  <Form.Item name="styleno" label="型體編號" rules={[{ required: true, message: '型體編號為必填' }]}>
                    <Input
                      maxLength={60}
                      placeholder="大寫編號"
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        form.setFieldsValue({ styleno: val });
                        updateMasterField('styleno', val);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="stylename" label="型體名稱">
                    <Input placeholder="型體名稱" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="oldstyle" label="舊型號">
                    <Input placeholder="舊型號" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="year" label="年度" rules={[{ required: true, message: '年度為必填' }]}>
                    <Input placeholder="年度 YYYY" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={8}>
                <Col span={6}>
                  <Form.Item name="ba055gkey" label="季節">
                    <ERPLookupField type="ba055" placeholder="F2 選擇季節" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dp003gkey" label="鞋種類別">
                    <ERPLookupField type="dp003" placeholder="F2 選擇類別" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dp004gkey" label="性別">
                    <ERPLookupField type="dp004" placeholder="F2 選擇性別" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="sizerun" label="尺碼">
                    <Input placeholder="尺碼" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={8}>
                <Col span={6}>
                  <Form.Item name="logo" label="Logo">
                    <Input placeholder="Logo" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="colorname" label="顏色">
                    <Input placeholder="顏色" />
                  </Form.Item>
                </Col>
                <Col span={6} style={{ display: 'flex', alignItems: 'center', paddingTop: 10 }}>
                  <Form.Item
                    name="adopted"
                    valuePropName="checked"
                    getValueProps={(value) => ({ checked: value === 'Y' })}
                    normalize={(value) => (value ? 'Y' : 'N')}
                    style={{ margin: 0 }}
                  >
                    <Checkbox>已採用</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={6} style={{ display: 'flex', alignItems: 'center', paddingTop: 10 }}>
                  <Form.Item
                    name="confirms"
                    valuePropName="checked"
                    getValueProps={(value) => ({ checked: value === 'Y' })}
                    normalize={(value) => (value ? 'Y' : 'N')}
                    style={{ margin: 0 }}
                  >
                    <Checkbox>已確認</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card
              size="small"
              title="材料描述"
              style={{ marginBottom: 12, borderRadius: 6 }}
              headStyle={{ backgroundColor: '#fafafa', fontSize: 13, fontWeight: 'bold', color: '#1890ff' }}
              bodyStyle={{ padding: 12 }}
            >
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item name="upper" label="鞋面材料">
                    <Input placeholder="Upper Material" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="lining" label="內裡材料">
                    <Input placeholder="Lining Material" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="sock" label="鞋墊材料">
                    <Input placeholder="Sock Material" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item name="bottom" label="大底材料">
                    <Input placeholder="Outsole Material" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="heel" label="鞋跟材料">
                    <Input placeholder="Heel Material" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="tongue" label="鞋舌材料">
                    <Input placeholder="Tongue Material" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={24}>
                  <Form.Item name="material" label="綜合材料備註">
                    <Input.TextArea rows={3} placeholder="請輸入綜合材料備註說明" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Right: photo + spec. This column stays grouped and the outer edge scrolls. */}
          <Col span={8}>
            <div style={{ position: 'sticky', top: isEditing ? 54 : 0 }}>
              <Card
                size="small"
                title="型體外觀預覽 (Style Sketch)"
                style={{ marginBottom: 12, borderRadius: 6 }}
                headStyle={{ backgroundColor: '#fafafa', fontSize: 13, fontWeight: 'bold', color: '#1890ff' }}
                bodyStyle={{ padding: 12, textAlign: 'center' }}
              >
                <div
                  style={{
                    minHeight: 210,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {photopath ? (
                    <Image
                      src={photopath}
                      alt="型體示意圖"
                      fallback="https://placehold.co/260x190?text=No+Image+Found"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 190,
                        objectFit: 'contain',
                        borderRadius: 4,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 120,
                        height: 120,
                        border: '1px dashed #d9d9d9',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ccc',
                        fontSize: 36,
                      }}
                    >
                      👟
                    </div>
                  )}
                </div>
              </Card>

              <Card
                size="small"
                title="楦底配件規格"
                style={{ marginBottom: 12, borderRadius: 6 }}
                headStyle={{ backgroundColor: '#fafafa', fontSize: 13, fontWeight: 'bold', color: '#1890ff' }}
                bodyStyle={{ padding: 12 }}
              >
                <Row gutter={8}>
                  <Col span={24}>
                    <Form.Item name="dp023gkey" label="配色組別">
                      <ERPLookupField
                        type="dp023"
                        placeholder="F2 選擇組別"
                        onChange={(val, selectedRow) => {
                          updateMasterField('dp023gkey', val);
                          if (selectedRow) {
                            const updates = {
                              dp010gkey: selectedRow.dp010gkey || null,
                              dp010_lastno: selectedRow.lastno || '',
                              dp015gkey: selectedRow.dp015gkey || null,
                              dp015_bottomno: selectedRow.bottomno || '',
                              dp020gkey: selectedRow.dp020gkey || null,
                              dp020_heelno: selectedRow.heelno || '',
                            };
                            form.setFieldsValue(updates);
                            Object.entries(updates).forEach(([k, v]) => {
                              updateMasterField(k, v);
                            });
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name="dp010gkey" label="搭配楦頭">
                      <ERPLookupField
                        type="dp010"
                        placeholder="F2 選擇楦頭"
                        onChange={(val, selectedRow) => {
                          updateMasterField('dp010gkey', val);
                          if (selectedRow) {
                            form.setFieldsValue({ dp010_lastno: selectedRow.lastno });
                            updateMasterField('dp010_lastno', selectedRow.lastno);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="dp015gkey" label="搭配大底">
                      <ERPLookupField
                        type="dp015"
                        placeholder="F2 選擇大底"
                        onChange={(val, selectedRow) => {
                          updateMasterField('dp015gkey', val);
                          if (selectedRow) {
                            form.setFieldsValue({ dp015_bottomno: selectedRow.bottomno });
                            updateMasterField('dp015_bottomno', selectedRow.bottomno);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name="dp020gkey" label="搭配鞋跟">
                      <ERPLookupField
                        type="dp020"
                        placeholder="F2 選擇鞋跟"
                        onChange={(val, selectedRow) => {
                          updateMasterField('dp020gkey', val);
                          if (selectedRow) {
                            form.setFieldsValue({ dp020_heelno: selectedRow.heelno });
                            updateMasterField('dp020_heelno', selectedRow.heelno);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="issuedate" label="發行日期" rules={[{ required: true, message: '發行日期為必填' }]}>
                      <Input type="date" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={24}>
                    <Form.Item name="remark" label="英文描述">
                      <ERPLookupField
                        type="dp001"
                        placeholder="按 F2 檢索片語寫入"
                        onChange={(val) => {
                          form.setFieldsValue({ remark: val });
                          updateMasterField('remark', val);
                        }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name="es101gkey" label="Maker">
                      <ERPLookupField
                        type="es101"
                        disabled
                        placeholder="Maker"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="photopath" label="圖片路徑">
                      <Input placeholder="圖片 URL / 本地路徑" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </div>
          </Col>
        </Row>

        <SampleImportModal
          visible={importModalVisible}
          onClose={() => setImportModalVisible(false)}
          onSelect={handleImportSelect}
        />
      </div>
    );
  }
});
