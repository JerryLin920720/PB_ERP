import React, { useMemo } from 'react';
import { Row, Col, Form, Input, Select, InputNumber, Checkbox, Radio, Space, Button, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import ERPPivotMatrixTable from '../components/erp/ERPPivotMatrixTable';
import { getSizeColumnsFromRecord } from '../utils/sizerun';
import { buildPivotRows, flattenPivotRows, createDefaultPivotRow, isFullyEmptyRow } from '../utils/dp010Pivot';

// ── Custom Tab Component: 級放規格 ───────────────────────────────────
function Dp010MeasurementsTab({
  rows,
  isEditing,
  loading,
  onCellChange,
  onAddRow,
  onDeleteRow,
  activeRecord,
  detailStates,
}) {
  const sizeColumns = React.useMemo(
    () => getSizeColumnsFromRecord(activeRecord),
    [
      activeRecord?.startsize,
      activeRecord?.fullhalf,
      activeRecord?.endsize,
      activeRecord?.maxsize,
    ]
  );

  const dp012Rows = detailStates?.values?.rows || [];
  const pivotRows = React.useMemo(
    () => buildPivotRows(rows, dp012Rows),
    [rows, dp012Rows]
  );

  const handleCellChange = (rowKey, field, val) => {
    onCellChange(rowKey, field, val);
  };

  const handleAddRow = () => {
    const tempKey = `temp_d_${Date.now()}`;
    const newRow = createDefaultPivotRow(tempKey, sizeColumns);
    onAddRow(newRow);
  };

  const fixedColumns = [
    {
      title: '部位',
      dataIndex: 'parts',
      width: 120,
      fixed: 'left',
      cellType: 'text',
    },
    {
      title: '量法(Steps)',
      dataIndex: 'steps',
      width: 90,
      fixed: 'left',
      cellType: 'number',
      step: 0.01,
      precision: 4,
    },
    {
      title: '單位',
      dataIndex: 'unit',
      width: 60,
      cellType: 'text',
    },
  ];

  return (
    <ERPPivotMatrixTable
      rows={pivotRows}
      dynamicColumns={sizeColumns}
      fixedColumns={fixedColumns}
      rowKeyField="gkey"
      editable={isEditing}
      loading={loading}
      onCellChange={handleCellChange}
      onAddRow={handleAddRow}
      onDeleteRow={onDeleteRow}
      emptyText="尚無量法資料"
      addRowText="增加量法"
      scroll={{ x: 'max-content', y: 220 }}
    />
  );
}

// ── Custom Tab Component: 庫存狀況 ───────────────────────────────────
function Dp010StocksTab({
  rows,
  isEditing,
  loading,
  onCellChange,
  replaceDetailRows,
  activeRecord,
}) {
  const sizeColumns = React.useMemo(
    () => getSizeColumnsFromRecord(activeRecord),
    [
      activeRecord?.startsize,
      activeRecord?.fullhalf,
      activeRecord?.endsize,
      activeRecord?.maxsize,
    ]
  );

  const currentRows = React.useMemo(() => {
    return Array.isArray(rows) ? rows : [];
  }, [rows]);

  React.useEffect(() => {
    if (loading || !activeRecord || !replaceDetailRows) return;
    if (!Array.isArray(sizeColumns) || sizeColumns.length === 0) return;

    // Check if currentRows match sizeColumns exactly (size and order)
    const isMatched =
      currentRows.length === sizeColumns.length &&
      currentRows.every((row, idx) => String(row?.size || '') === String(sizeColumns[idx] || ''));

    if (!isMatched) {
      const nextRows = sizeColumns.map((sz, idx) => {
        const existing = currentRows.find((r) => String(r?.size || '') === String(sz));
        if (existing) {
          return {
            ...existing,
            serialno: idx + 1,
          };
        }
        return {
          gkey: `temp_s_${String(sz).replace(/[&]/g, '_')}`,
          size: sz,
          serialno: idx + 1,
          leftqty: 0,
          rightqty: 0,
          leftstockqty: 0,
          rightstockqty: 0,
        };
      });
      replaceDetailRows(nextRows);
    }
  }, [currentRows, sizeColumns, loading, activeRecord, replaceDetailRows]);

  const stockColumns = [
    { title: 'No', dataIndex: 'serialno', width: 55 },
    { title: '尺碼', dataIndex: 'size', width: 90 },
    {
      title: '左腳數量',
      dataIndex: 'leftqty',
      width: 100,
      render: (val, record) =>
        isEditing ? (
          <InputNumber
            size="small"
            value={val}
            style={{ width: '80px' }}
            onChange={(v) => onCellChange(record.gkey, 'leftqty', v)}
          />
        ) : (
          val
        ),
    },
    {
      title: '右腳數量',
      dataIndex: 'rightqty',
      width: 100,
      render: (val, record) =>
        isEditing ? (
          <InputNumber
            size="small"
            value={val}
            style={{ width: '80px' }}
            onChange={(v) => onCellChange(record.gkey, 'rightqty', v)}
          />
        ) : (
          val
        ),
    },
    { title: '左腳庫存量', dataIndex: 'leftstockqty', width: 110, align: 'right' },
    { title: '右腳庫存量', dataIndex: 'rightstockqty', width: 110, align: 'right' },
  ];

  return (
    <Table
      size="small"
      loading={loading}
      dataSource={currentRows}
      columns={stockColumns}
      rowKey="gkey"
      pagination={false}
      bordered
      scroll={{ y: 150, x: 'max-content' }}
      locale={{ emptyText: '無庫存資料' }}
    />
  );
}

export default createRecordWorkbenchSheet({
  sheetId: 'dp010',
  title: '楦頭基本資料管理',
  breadcrumb: ['開發管理', '楦頭基本資料'],

  api: {
    listUrl: 'http://localhost:8001/api/dp010/',
    deleteUrl: 'http://localhost:8001/api/dp010/',
    deepSaveUrl: 'http://localhost:8001/api/dp010/deep_save/',
  },

  masterKey: 'gkey',

  sidebar: {
    title: '楦頭列表',
    getDisplayText: (row) => row.lastno || row.gkey,
  },

  // ── Default new record ──────────────────────────────────────
  createDefaultRecord: (tempKey) => ({
    gkey: tempKey,
    year: String(new Date().getFullYear()),
    adopted: 'N',
    fullhalf: '2',
    issuedate: new Date().toISOString().substring(0, 10),
  }),

  // ── Query params builder ────────────────────────────────────
  query: {
    buildParams: (values) => ({ ...values }),
  },

  // ── List columns ────────────────────────────────────────────
  list: {
    columns: [
      { title: '年度', dataIndex: 'year', width: 70 },
      { title: '楦頭編號', dataIndex: 'lastno', width: 120, fixed: 'left' },
      { title: '發行日期', dataIndex: 'issuedate', width: 100, render: (v) => v ? v.substring(0, 10) : '' },
      { title: '客戶', dataIndex: 'ba010_shortname', width: 120 },
      { title: '楦頭廠', dataIndex: 'ba015_shortname', width: 120 },
      { title: '採用工廠', dataIndex: 'ba015_shortname1', width: 120 },
      { title: '大底', dataIndex: 'dp015_bottomno', width: 100 },
      { title: '跟型', dataIndex: 'dp020_heelno', width: 80 },
      { title: '採用', dataIndex: 'adopted', width: 55, align: 'center', render: (v) => v === 'Y' ? 'Y' : 'N' },
    ],
  },

  // ── Query form ──────────────────────────────────────────────
  renderQueryForm: ({ form }) => (
    <Row gutter={16}>
      <Col span={18}>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="year" label="年度"><Input placeholder="年度" /></Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba055gkey" label="季節">
              <ERPLookupField type="ba055" placeholder="季節 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="lastno" label="楦頭編號"><Input placeholder="楦頭編號" /></Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="ba010gkey" label="客戶">
              <ERPLookupField type="ba010" placeholder="客戶 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba015gkey" label="楦頭廠">
              <ERPLookupField type="ba015" placeholder="工廠 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="apba015gkey" label="採用工廠">
              <ERPLookupField type="ba015" placeholder="採用工廠 F2 Lookup" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="dp015gkey" label="大底">
              <ERPLookupField type="dp015" placeholder="大底 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="dp020gkey" label="跟型">
              <ERPLookupField type="dp020" placeholder="跟型 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba005gkey" label="歸屬公司">
              <ERPLookupField type="ba005" placeholder="公司 F2 Lookup" />
            </Form.Item>
          </Col>
        </Row>
      </Col>
      <Col span={6}>
        <div className="erp-rw-query-right-panel">
          <div className="erp-rw-query-right-panel-title">採用狀態</div>
          <Form.Item name="adopted" initialValue=" ">
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="Y">已採用</Radio>
                <Radio value="N">未採用</Radio>
                <Radio value=" ">全部</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </div>
      </Col>
    </Row>
  ),

  // ── Master form ─────────────────────────────────────────────
  renderMasterForm: ({ form, isEditing, activeRecord }) => (
    <>
      {/* Row 1: 識別欄位 */}
      <Row gutter={8}>
        <Col span={6}>
          <Form.Item name="lastno" label="楦頭編號" rules={[{ required: true, message: '楦頭編號為必填' }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="dp004gkey" label="性別/碼類">
            <ERPLookupField type="dp004" placeholder="F2 Lookup" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="year" label="年度"><Input /></Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="ba055gkey" label="季節">
            <ERPLookupField type="ba055" placeholder="F2 Lookup" />
          </Form.Item>
        </Col>
      </Row>

      {/* Row 2: 日期與尺碼相關 */}
      <Row gutter={8}>
        <Col span={6}>
          <Form.Item name="issuedate" label="發行日期">
            <Input type="date" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="cfmdate" label="確認日期">
            <Input type="date" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="dp015gkey" label="大底編號">
            <ERPLookupField type="dp015" placeholder="F2 Lookup" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="dp020gkey" label="跟型編號">
            <ERPLookupField type="dp020" placeholder="F2 Lookup" />
          </Form.Item>
        </Col>
      </Row>

      {/* Row 3: 廠商 */}
      <Row gutter={8}>
        <Col span={6}>
          <Form.Item name="ba010gkey" label="客戶對象">
            <ERPLookupField type="ba010" placeholder="F2 Lookup" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="ba015gkey" label="楦頭廠">
            <ERPLookupField type="ba015" placeholder="F2 Lookup" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="apba015gkey" label="採用工廠">
            <ERPLookupField type="ba015" placeholder="F2 Lookup" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="ba005gkey" label="歸屬公司">
            <ERPLookupField type="ba005" placeholder="F2 Lookup" />
          </Form.Item>
        </Col>
      </Row>

      {/* Row 4: 尺碼展開參數 */}
      <Row gutter={8}>
        <Col span={4}>
          <Form.Item name="startsize" label="起碼">
            <InputNumber style={{ width: '100%' }} step={0.5} precision={1} />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="fullhalf" label="全/半號">
            <Select options={[
              { value: '1', label: '全號 (-)' },
              { value: '2', label: '半號 (/)' },
              { value: '3', label: '連號 (&)' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="endsize" label="迄碼">
            <InputNumber style={{ width: '100%' }} step={0.5} precision={1} />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="maxsize" label="防呆碼">
            <InputNumber style={{ width: '100%' }} step={0.5} precision={1} />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="basicsize" label="基準碼">
            <InputNumber style={{ width: '100%' }} step={0.5} precision={1} />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="lasttype" label="楦頭類型"><Input /></Form.Item>
        </Col>
      </Row>

      {/* Row 5: 楦型描述欄位 */}
      <Row gutter={8}>
        <Col span={4}>
          <Form.Item name="palmrange" label="前掌寬度"><Input /></Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="waistline" label="腰圍"><Input /></Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="backrange" label="背圍"><Input /></Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="length" label="楦頭長度"><Input /></Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="girth" label="後跟總高度"><Input /></Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="toecharacter" label="頭型"><Input /></Form.Item>
        </Col>
      </Row>

      {/* Row 6: 更多楦型 + 輔助欄位 */}
      <Row gutter={8}>
        <Col span={4}>
          <Form.Item name="toespring" label="頭翹"><Input /></Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="heelsharp" label="跟形"><Input /></Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="midsoleno" label="中底編號"><Input /></Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="photopath" label="圖片路徑"><Input /></Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item name="adopted" label="已採用" valuePropName="checked"
            getValueFromEvent={(e) => e.target.checked ? 'Y' : 'N'}
            getValueProps={(v) => ({ checked: v === 'Y' || v === true })}>
            <Checkbox>已採用</Checkbox>
          </Form.Item>
        </Col>
      </Row>

      {/* Row 7: 備註文字 */}
      <Row gutter={8}>
        <Col span={12}>
          <Form.Item name="description" label="英文描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="remark" label="備註">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Col>
      </Row>
    </>
  ),

  // ── Detail Tabs ─────────────────────────────────────────────
  detailTabs: [
    // ── Tab 1: 級放規格 (dp011 + dp012 pivot) ─────────────────
    {
      key: 'measurements',
      title: '級放規格',
      parentKey: 'dp010gkey',
      apiUrl: 'http://localhost:8001/api/dp011/',
      renderer: Dp010MeasurementsTab,
    },

    // ── Tab 2: dp012 values (hidden — loaded alongside dp011) ──
    // We need dp012 in detailStates['values'] for the pivot renderer
    {
      key: 'values',
      title: '_dp012_hidden',   // hidden tab, not shown
      parentKey: 'dp010gkey',
      apiUrl: 'http://localhost:8001/api/dp012/',
      hidden: true,             // factory will skip rendering this tab
    },

    // ── Tab 3: 庫存狀況 (dp014 — leftqty/rightqty editable) ───
    {
      key: 'stocks',
      title: '庫存狀況',
      parentKey: 'dp010gkey',
      apiUrl: 'http://localhost:8001/api/dp014/',
      renderer: Dp010StocksTab,
    },

    // ── Tab 4: 變更歷史 (dp013 — 可新增/刪除) ─────────────────
    {
      key: 'histories',
      title: '變更歷史',
      parentKey: 'dp010gkey',
      apiUrl: 'http://localhost:8001/api/dp013/',
      renderer: ({ rows, isEditing, loading, onCellChange, onAddRow, onDeleteRow }) => {
        const historyColumns = [
          {
            title: '修改日期',
            dataIndex: 'modifydate',
            width: 130,
            render: (v) => v ? v.substring(0, 10) : '',
          },
          {
            title: '說明',
            dataIndex: 'description',
            render: (val, record) =>
              isEditing ? (
                <Input
                  size="small"
                  value={val ?? ''}
                  onChange={(e) => onCellChange(record.gkey, 'description', e.target.value)}
                />
              ) : val,
          },
          ...(isEditing
            ? [{
                title: '',
                key: 'action',
                width: 40,
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
          <div>
            <Table
              size="small"
              loading={loading}
              dataSource={rows}
              columns={historyColumns}
              rowKey="gkey"
              pagination={false}
              bordered
              locale={{ emptyText: '無變更歷史' }}
            />
            {isEditing && (
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                style={{ marginTop: 6 }}
                onClick={() => onAddRow({ description: '' })}
              >
                新增變更記錄
              </Button>
            )}
          </div>
        );
      },
    },
  ],

  // ── Deep Save Payload ───────────────────────────────────────
  buildDeepSavePayload: (activeRecord, detailStates) => {
    const cleanMaster = { ...activeRecord };
    // adopted: boolean → 'Y'/'N'
    if (cleanMaster.adopted === true) cleanMaster.adopted = 'Y';
    if (cleanMaster.adopted === false) cleanMaster.adopted = 'N';
    if (!cleanMaster.adopted) cleanMaster.adopted = 'N';

    // Drop temp gkey for new records
    if (cleanMaster.gkey && String(cleanMaster.gkey).startsWith('temp_')) {
      delete cleanMaster.gkey;
    }

    // Compute sizeColumns from master record (same logic as renderer)
    const sizeColumns = getSizeColumnsFromRecord(activeRecord);

    // Get pivot rows from measurements detail state
    const pivotRows = detailStates.measurements?.rows || [];

    // Flatten pivot → dp011 (measurements) + dp012 (values)
    const { measurements, values } = flattenPivotRows(pivotRows, sizeColumns);

    // Histories: send all rows (backend only saves temp_ gkeys as new)
    const histories = detailStates.histories?.rows || [];

    // Stocks: send all rows (leftqty/rightqty may have been edited)
    const stocks = detailStates.stocks?.rows || [];

    return {
      master: cleanMaster,
      measurements,
      values,
      histories,
      stocks,
    };
  },

  // ── Validation ──────────────────────────────────────────────
  validateAll: (record, detailStates) => {
    const sizeColumns = getSizeColumnsFromRecord(record);
    const pivotRows = detailStates.measurements?.rows || [];

    for (let i = 0; i < pivotRows.length; i++) {
      const row = pivotRows[i];
      if (isFullyEmptyRow(row, sizeColumns)) {
        continue;
      }
      if (!row.parts || !row.parts.trim()) {
        throw new Error(`級放規格第 ${i + 1} 列「部位」不可空白`);
      }
    }
  },

  validateMasterRow: (record) => {
    if (!record || !record.lastno || !record.lastno.trim()) {
      throw new Error('楦頭編號為必填');
    }
    if (!record.year) {
      throw new Error('年度為必填');
    }
    if (!record.issuedate) {
      throw new Error('發行日期為必填');
    }
  },
});
