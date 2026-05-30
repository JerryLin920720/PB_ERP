/* eslint-disable no-unused-vars */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import axios from 'axios';
import createQueryListSheet from '../components/erp/factory/createQueryListSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import '../styles/erp-query-report-sheet.css';

const { Text } = Typography;

const API_BASE = 'http://localhost:8001/api';

const STATUS_LABEL = {
  '0': '作廢',
  '1': '進行中',
  '2': '已寄出',
  '3': '已完成',
};

const STATUS_COLOR = {
  '0': 'default',
  '1': 'processing',
  '2': 'warning',
  '3': 'success',
};

const DEFAULT_STATUS_CHECKS = {
  '1': true,
  '2': true,
  '3': true,
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data === 'string') return data;
  return fallback;
}

function computeSizeCompleted(row, mode = '1') {
  const sent = toNumber(row.sentpairs);
  const cust = toNumber(row.custpairs);
  const keep = toNumber(row.keeppairs);
  const rec = toNumber(row.receive ?? row.received);

  if (mode === '1') return sent >= cust + keep;
  if (mode === '2') return sent >= cust && rec >= keep;
  if (mode === '3') return sent + rec >= cust + keep;
  return sent >= cust;
}

function computeColorStatus(sizeRows, originalStatus, mode = '1') {
  if (String(originalStatus) === '0') return '0';

  const rows = Array.isArray(sizeRows) ? sizeRows : [];
  if (rows.length === 0) return '1';

  if (rows.every((row) => computeSizeCompleted(row, mode))) return '3';
  if (rows.some((row) => toNumber(row.sentpairs) > 0)) return '2';

  return '1';
}

function Dp050Result({ rows, setRows, loading, context, setContext }) {
  const {
    sizeRowsByColor = {},
    selectedColorGkey = null,
    modifiedColors = {},
    modifiedSizes = {},
    samplestatus = '1',
  } = context;

  const [sizesLoading, setSizesLoading] = useState(false);

  const currentSizes = selectedColorGkey ? sizeRowsByColor[selectedColorGkey] || [] : [];
  const selectedColorRow = rows.find((row) => row.gkey === selectedColorGkey);
  const selectedColorIsCancelled = String(selectedColorRow?._original_status || selectedColorRow?.status || '') === '0';
  const selectedImage = selectedColorRow?.image_url || selectedColorRow?.photopath || '';

  const patchContext = useCallback(
    (patch) => {
      setContext((prev) => ({ ...prev, ...patch }));
    },
    [setContext]
  );

  const loadSizes = useCallback(
    async (dp031gkey, force = false) => {
      if (!dp031gkey) return;
      if (!force && sizeRowsByColor[dp031gkey]) return;

      setSizesLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/dp033/dp050_sizes/`, {
          params: { dp031gkey },
        });

        const sizeRows = normalizeRows(res.data).map((row) => {
          const originalReceive = toNumber(row.received ?? row.receive);
          const dirty = modifiedSizes[row.gkey];

          return {
            ...row,
            key: row.gkey,
            _original_receive: originalReceive,
            thisreceive: dirty?.thisreceive ?? 0,
            receive: dirty?.receive ?? originalReceive,
            finishpairs: dirty?.finishpairs ?? toNumber(row.finishpairs),
          };
        });

        patchContext({
          sizeRowsByColor: {
            ...sizeRowsByColor,
            [dp031gkey]: sizeRows,
          },
        });
      } catch (error) {
        message.error(`讀取尺碼明細失敗：${getApiErrorMessage(error, '請重新查詢後再試')}`);
      } finally {
        setSizesLoading(false);
      }
    },
    [sizeRowsByColor, modifiedSizes, patchContext]
  );

  const handleColorRowClick = useCallback(
    async (record) => {
      patchContext({ selectedColorGkey: record.gkey });
      await loadSizes(record.gkey);
    },
    [loadSizes, patchContext]
  );

  const updateColorRow = useCallback(
    (gkey, patch, markDirty = true) => {
      setRows((prev) => prev.map((row) => (row.gkey === gkey ? { ...row, ...patch } : row)));

      if (!markDirty) return;

      const current = rows.find((row) => row.gkey === gkey) || {};
      patchContext({
        modifiedColors: {
          ...modifiedColors,
          [gkey]: {
            gkey,
            status: patch.status ?? modifiedColors[gkey]?.status ?? current.status,
            remark: patch.remark ?? modifiedColors[gkey]?.remark ?? current.remark ?? '',
          },
        },
      });
    },
    [rows, setRows, modifiedColors, patchContext]
  );

  const recalcColorStatus = useCallback(
    (dp031gkey, nextSizeRows) => {
      const color = rows.find((row) => row.gkey === dp031gkey);
      if (!color || color._manualStatusOverride) return;

      const nextStatus = computeColorStatus(
        nextSizeRows,
        color._original_status || color.status,
        samplestatus
      );

      updateColorRow(dp031gkey, { status: nextStatus }, true);
    },
    [rows, samplestatus, updateColorRow]
  );

  const updateSizeRow = useCallback(
    (dp031gkey, sizeGkey, patch, options = {}) => {
      const baseRows = sizeRowsByColor[dp031gkey] || [];
      const nextRows = baseRows.map((row) => (row.gkey === sizeGkey ? { ...row, ...patch } : row));
      const current = baseRows.find((row) => row.gkey === sizeGkey) || {};
      const merged = { ...current, ...patch };

      patchContext({
        sizeRowsByColor: {
          ...sizeRowsByColor,
          [dp031gkey]: nextRows,
        },
        modifiedSizes: {
          ...modifiedSizes,
          [sizeGkey]: {
            gkey: sizeGkey,
            thisreceive: merged.thisreceive ?? 0,
            receive: merged.receive ?? merged._original_receive ?? merged.received ?? 0,
            finishpairs: merged.finishpairs ?? 0,
          },
        },
      });

      if (options.recalcStatus) {
        recalcColorStatus(dp031gkey, nextRows);
      }
    },
    [sizeRowsByColor, modifiedSizes, patchContext, recalcColorStatus]
  );

  const handleThisReceiveChange = useCallback(
    (record, rawValue) => {
      const thisreceive = toNumber(rawValue);
      if (thisreceive < 0) {
        message.warning('本次點收不可為負數');
        return;
      }

      const receive = toNumber(record._original_receive ?? record.received ?? record.receive) + thisreceive;

      updateSizeRow(
        selectedColorGkey,
        record.gkey,
        { thisreceive, receive },
        { recalcStatus: true }
      );
    },
    [selectedColorGkey, updateSizeRow]
  );

  const handleFinishPairsChange = useCallback(
    (record, rawValue) => {
      const finishpairs = toNumber(rawValue);
      if (finishpairs < 0) {
        message.warning('完成雙數不可為負數');
        return;
      }

      updateSizeRow(
        selectedColorGkey,
        record.gkey,
        { finishpairs },
        { recalcStatus: false }
      );
    },
    [selectedColorGkey, updateSizeRow]
  );

  const colorColumns = useMemo(
    () => [
      { title: '樣品單號', dataIndex: 'sampleno', width: 120, fixed: 'left' },
      { title: '類別', dataIndex: 'sampletype', width: 85 },
      { title: '季節', dataIndex: 'season', width: 80 },
      { title: '型體編號', dataIndex: 'styleno', width: 130 },
      { title: '型體名稱', dataIndex: 'stylename', width: 150 },
      { title: '庫存編號', dataIndex: 'stock', width: 110 },
      { title: '配色', dataIndex: 'color', width: 130, render: (_, row) => row.color || row.ecolor || '' },
      { title: '客戶', dataIndex: 'customer', width: 110 },
      { title: '工廠', dataIndex: 'factory', width: 110 },
      { title: '開單日期', dataIndex: 'issuedate', width: 110, render: (v) => (v ? String(v).slice(0, 10) : '') },
      {
        title: '狀態',
        dataIndex: 'status',
        width: 120,
        render: (value, record) => {
          const disabled = String(record._original_status || record.status) === '0';

          return (
            <Select
              size="small"
              value={String(value || '1')}
              disabled={disabled}
              style={{ width: 100 }}
              options={[
                { value: '0', label: '作廢' },
                { value: '1', label: '進行中' },
                { value: '2', label: '已寄出' },
                { value: '3', label: '已完成' },
              ]}
              onChange={(nextStatus) =>
                updateColorRow(record.gkey, { status: nextStatus, _manualStatusOverride: true }, true)
              }
            />
          );
        },
      },
      {
        title: '備註',
        dataIndex: 'remark',
        width: 180,
        render: (value, record) => (
          <Input
            size="small"
            value={value || ''}
            onChange={(event) => updateColorRow(record.gkey, { remark: event.target.value }, true)}
          />
        ),
      },
      { title: '修改人', dataIndex: 'modify_name', width: 100 },
      { title: '修改日期', dataIndex: 'editdate', width: 115, render: (v) => (v ? String(v).slice(0, 10) : '') },
      {
        title: '預覽狀態',
        width: 105,
        align: 'center',
        render: (_, record) => {
          const status = computeColorStatus(
            sizeRowsByColor[record.gkey] || [],
            record._original_status || record.status,
            samplestatus
          );
          return <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>;
        },
      },
    ],
    [samplestatus, sizeRowsByColor, updateColorRow]
  );

  const sizeColumns = useMemo(
    () => [
      { title: '尺碼', dataIndex: 'size', width: 70, fixed: 'left', align: 'center' },
      { title: '客戶雙數', dataIndex: 'custpairs', width: 90, align: 'right' },
      { title: '留底雙數', dataIndex: 'keeppairs', width: 90, align: 'right' },
      { title: '已寄出', dataIndex: 'sentpairs', width: 90, align: 'right' },
      { title: '歷史已收', dataIndex: 'received', width: 90, align: 'right' },
      {
        title: '本次點收',
        dataIndex: 'thisreceive',
        width: 115,
        align: 'right',
        render: (value, record) => (
          <InputNumber
            size="small"
            min={0}
            disabled={selectedColorIsCancelled}
            value={value ?? 0}
            style={{ width: 88 }}
            onChange={(nextValue) => handleThisReceiveChange(record, nextValue)}
          />
        ),
      },
      { title: '累計已收', dataIndex: 'receive', width: 90, align: 'right' },
      {
        title: '完成雙數',
        dataIndex: 'finishpairs',
        width: 115,
        align: 'right',
        render: (value, record) => (
          <InputNumber
            size="small"
            min={0}
            disabled={selectedColorIsCancelled}
            value={value ?? 0}
            style={{ width: 88 }}
            onChange={(nextValue) => handleFinishPairsChange(record, nextValue)}
          />
        ),
      },
    ],
    [handleFinishPairsChange, handleThisReceiveChange, selectedColorIsCancelled]
  );

  return (
    <div className="erp-qrs-result-split">
      <div className="erp-qrs-upper-area">
        <div className="erp-qrs-upper-grid">
          <Card
            size="small"
            className="erp-qrs-grid-card"
            title={
              <span>
                樣品配色列表
                {rows.length > 0 && <Text type="secondary">（共 {rows.length} 筆）</Text>}
                {(Object.keys(modifiedColors).length > 0 || Object.keys(modifiedSizes).length > 0) && (
                  <Text type="warning">　尚有未儲存修改</Text>
                )}
              </span>
            }
          >
            <Table
              rowKey="gkey"
              size="small"
              bordered
              loading={loading}
              columns={colorColumns}
              dataSource={rows}
              pagination={false}
              scroll={{ x: 1550, y: 260 }}
              rowClassName={(record) => {
                const classes = [];
                if (record.gkey === selectedColorGkey) classes.push('erp-qrs-selected-row');
                if (modifiedColors[record.gkey]) classes.push('erp-qrs-dirty-row');
                if (String(record.status) === '0') classes.push('erp-qrs-cancelled-row');
                return classes.join(' ');
              }}
              onRow={(record) => ({
                onClick: () => handleColorRowClick(record),
              })}
              locale={{ emptyText: loading ? '查詢中...' : '尚無資料，請先執行查詢' }}
            />
          </Card>
        </div>

        <div className="erp-qrs-side-panel">
          <Card size="small" className="erp-qrs-image-card" title="樣品圖片">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="樣品圖片"
                className="erp-qrs-preview-image"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="erp-qrs-image-placeholder">
                <div>樣品圖片</div>
                <div>尚無圖片</div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="erp-qrs-lower-grid">
        <Card
          size="small"
          className="erp-qrs-grid-card"
          title={
            selectedColorRow
              ? `尺碼點收明細：${selectedColorRow.sampleno || ''} / ${selectedColorRow.styleno || ''} / ${selectedColorRow.color || selectedColorRow.ecolor || ''}`
              : '尺碼點收明細'
          }
        >
          <Table
            rowKey="gkey"
            size="small"
            bordered
            loading={sizesLoading}
            columns={sizeColumns}
            dataSource={currentSizes}
            pagination={false}
            scroll={{ x: 850, y: 210 }}
            rowClassName={(record) => (modifiedSizes[record.gkey] ? 'erp-qrs-dirty-row' : '')}
            locale={{ emptyText: selectedColorGkey ? '無尺碼資料' : '請先選擇上方配色' }}
          />
        </Card>
      </div>
    </div>
  );
}

function buildDp050Params(values, context) {
  const params = {};

  [
    'issuedate_start',
    'issuedate_end',
    'year',
    'ba055gkey',
    'dp002gkey',
    'sampleno',
    'styleno',
    'stylename',
    'stock',
    'ba010gkey',
    'ba015gkey',
    'group_name',
  ].forEach((key) => {
    if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
      params[key] = values[key];
    }
  });

  const { statusChecks = DEFAULT_STATUS_CHECKS, statusAll = false } = context || {};

  if (statusAll) {
    params.status_all = 'true';
  } else {
    const selected = Object.keys(statusChecks).filter((key) => statusChecks[key]);
    if (selected.length > 0) params.status_list = selected.join(',');
  }

  params.limit = 500;
  return params;
}

function renderDp050QueryForm({ context, setContext }) {
  const statusChecks = context.statusChecks || DEFAULT_STATUS_CHECKS;
  const statusAll = context.statusAll || false;

  const patchContext = (patch) => {
    setContext((prev) => ({ ...prev, ...patch }));
  };

  const handleStatusCheckChange = (status, checked) => {
    const next = { ...statusChecks, [status]: checked };
    patchContext({
      statusChecks: next,
      statusAll: ['0', '1', '2', '3'].every((key) => next[key]),
    });
  };

  const handleStatusAllChange = (checked) => {
    patchContext({
      statusAll: checked,
      statusChecks: checked ? { '0': true, '1': true, '2': true, '3': true } : DEFAULT_STATUS_CHECKS,
    });
  };

  return (
    <Row gutter={16}>
      <Col span={18}>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="year" label="年度">
              <Input placeholder="年度" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba055gkey" label="季節">
              <ERPLookupField type="ba055" placeholder="季節 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="dp002gkey" label="樣品類別">
              <ERPLookupField type="dp002" placeholder="樣品類別 F2 Lookup" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="sampleno" label="樣品單號">
              <Input placeholder="樣品單號" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="styleno" label="型體編號">
              <Input placeholder="型體編號" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="stylename" label="型體名稱">
              <Input placeholder="型體名稱" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="ba010gkey" label="客戶">
              <ERPLookupField type="ba010" placeholder="客戶 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba015gkey" label="工廠">
              <ERPLookupField type="ba015" placeholder="工廠 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="stock" label="庫存編號">
              <Input placeholder="庫存編號" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="issuedate_start" label="開單日期起">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="issuedate_end" label="開單日期迄">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="group_name" label="組別">
              <Input placeholder="組別" />
            </Form.Item>
          </Col>
        </Row>
      </Col>

      <Col span={6}>
        <div className="erp-qrs-query-right-panel">
          <div className="erp-qrs-query-right-panel-title">樣品單狀態</div>
          <Space direction="vertical" size={4}>
            <Checkbox checked={statusChecks['1']} disabled={statusAll} onChange={(e) => handleStatusCheckChange('1', e.target.checked)}>
              進行中
            </Checkbox>
            <Checkbox checked={statusChecks['2']} disabled={statusAll} onChange={(e) => handleStatusCheckChange('2', e.target.checked)}>
              已寄出
            </Checkbox>
            <Checkbox checked={statusChecks['3']} disabled={statusAll} onChange={(e) => handleStatusCheckChange('3', e.target.checked)}>
              已完成
            </Checkbox>
            <Checkbox checked={statusChecks['0']} disabled={statusAll} onChange={(e) => handleStatusCheckChange('0', e.target.checked)}>
              作廢
            </Checkbox>
            <Checkbox checked={statusAll} onChange={(e) => handleStatusAllChange(e.target.checked)}>
              全部
            </Checkbox>
          </Space>
        </div>
      </Col>
    </Row>
  );
}

async function saveDp050({ context, setContext, retrieve }) {
  const modifiedColors = context.modifiedColors || {};
  const modifiedSizes = context.modifiedSizes || {};

  const dp031Updates = Object.values(modifiedColors).map((row) => ({
    gkey: row.gkey,
    status: row.status,
    remark: row.remark ?? '',
  }));

  const dp033Updates = Object.values(modifiedSizes).map((row) => ({
    gkey: row.gkey,
    thisreceive: row.thisreceive ?? 0,
    receive: row.receive ?? 0,
    finishpairs: row.finishpairs ?? 0,
  }));

  if (dp031Updates.length === 0 && dp033Updates.length === 0) {
    message.info('沒有修改的資料需要儲存');
    return;
  }

  await axios.post(`${API_BASE}/dp031/batch_save/`, {
    dp031_updates: dp031Updates,
    dp033_updates: dp033Updates,
  });

  message.success('批次儲存成功');

  setContext((prev) => ({
    ...prev,
    sizeRowsByColor: {},
    selectedColorGkey: null,
    modifiedColors: {},
    modifiedSizes: {},
  }));

  await retrieve();
}

export default createQueryListSheet({
  sheetId: 'dp050',
  title: '樣品單狀態審核',
  breadcrumb: ['開發管理', '樣品單狀態審核'],
  mainClassName: 'dp050-query-list-shell',
  layout: {
    contentScroll: true,
    contentHeight: 'calc(100vh - 150px)',
  },

  api: {
    queryUrl: `${API_BASE}/dp031/dp050_query/`,
  },

  initialContext: () => ({
    statusChecks: DEFAULT_STATUS_CHECKS,
    statusAll: false,
    sizeRowsByColor: {},
    selectedColorGkey: null,
    modifiedColors: {},
    modifiedSizes: {},
    samplestatus: '1',
  }),

  query: {
    buildParams: buildDp050Params,
  },

  renderQueryForm: renderDp050QueryForm,
  renderResult: Dp050Result,
  onSave: saveDp050,

  onReset: ({ setRows, setContext }) => {
    setRows([]);
    setContext({
      statusChecks: DEFAULT_STATUS_CHECKS,
      statusAll: false,
      sizeRowsByColor: {},
      selectedColorGkey: null,
      modifiedColors: {},
      modifiedSizes: {},
      samplestatus: '1',
    });
  },
});
