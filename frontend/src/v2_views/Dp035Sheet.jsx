import React from 'react';
import { Card, Checkbox, Col, Form, Input, Row, Table, Button, Space, Modal, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import createQueryListSheet from '../components/erp/factory/createQueryListSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import '../styles/erp-query-report-sheet.css';

const API_BASE = 'http://localhost:8001/api';

function buildDp035Params(values, context) {
  const params = {};
  [
    'year',
    'ba055gkey',
    'dp002gkey',
    'sampleno',
    'styleno',
    'stock',
    'stylename',
    'groupname',
    'englishname',
    'ba009_ebrand',
    'dp030_ba005gkey',
    'ba010gkey',
    'ba015gkey',
    'issuedate_from',
    'issuedate_to',
  ].forEach((key) => {
    if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
      params[key] = values[key];
    }
  });

  const { chkStatus1, chkStatus2, chkStatus3, chkStatus0, chkStatusT } = context;
  if (chkStatusT) {
    params.statuses = 'all';
  } else {
    const list = [];
    if (chkStatus1) list.push('1');
    if (chkStatus2) list.push('2');
    if (chkStatus3) list.push('3');
    if (chkStatus0) list.push('0');
    params.statuses = list.length > 0 ? list.join(',') : '1';
  }

  params.limit = 500;
  return params;
}

function renderDp035QueryForm({ form, context, setContext }) {
  const patchContext = (patch) => {
    setContext((prev) => ({ ...prev, ...patch }));
  };

  const handleStatusCheckChange = (status, checked) => {
    const next = {
      chkStatus1: status === '1' ? checked : context.chkStatus1,
      chkStatus2: status === '2' ? checked : context.chkStatus2,
      chkStatus3: status === '3' ? checked : context.chkStatus3,
      chkStatus0: status === '0' ? checked : context.chkStatus0,
    };
    const allChecked = next.chkStatus1 && next.chkStatus2 && next.chkStatus3 && next.chkStatus0;
    patchContext({
      ...next,
      chkStatusT: allChecked,
    });
  };

  const handleStatusAllChange = (checked) => {
    patchContext({
      chkStatusT: checked,
      chkStatus1: checked,
      chkStatus2: checked,
      chkStatus3: checked,
      chkStatus0: checked,
    });
  };

  return (
    <Row gutter={16}>
      <Col span={18}>
        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="year" label="年度">
              <Input placeholder="年度" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="ba055gkey" label="季節">
              <ERPLookupField type="ba055" placeholder="季節 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="dp002gkey" label="樣品類別">
              <ERPLookupField type="dp002" placeholder="樣品類別 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="sampleno" label="樣品單號">
              <Input placeholder="樣品單號" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="styleno" label="型體編號">
              <Input placeholder="型體編號" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="stylename" label="型體名稱">
              <Input placeholder="型體名稱" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="stock" label="庫存編號">
              <Input placeholder="庫存編號" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="groupname" label="組別">
              <ERPLookupField type="dp023" placeholder="組別 F2 Lookup" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="ba010gkey" label="客戶">
              <ERPLookupField type="ba010" placeholder="客戶 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="ba015gkey" label="工廠">
              <ERPLookupField type="ba015" placeholder="工廠 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="englishname" label="開發人 (Maker)">
              <ERPLookupField type="es101" placeholder="開發人 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="ba009_ebrand" label="品牌">
              <ERPLookupField type="ba009" placeholder="品牌 F2 Lookup" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="dp030_ba005gkey" label="所屬代理">
              <ERPLookupField type="ba005" placeholder="所屬代理 F2 Lookup" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="issuedate_from" label="開單日期起">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="issuedate_to" label="開單日期迄">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>前置空白數 (kind)</span>
                <Input
                  type="number"
                  min={0}
                  value={context.kind}
                  onChange={(e) => patchContext({ kind: parseInt(e.target.value) || 0 })}
                  size="small"
                  style={{ marginTop: 4 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>列印日期 (ddate)</span>
                <Input
                  type="date"
                  value={context.ddate}
                  onChange={(e) => patchContext({ ddate: e.target.value })}
                  size="small"
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>
          </Col>
        </Row>
      </Col>

      <Col span={6}>
        <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 16, height: '100%' }}>
          <div style={{ marginBottom: 8, fontWeight: 'bold', fontSize: 12 }}>樣品單狀態</div>
          <Space direction="vertical" size={2}>
            <Checkbox checked={context.chkStatus1} onChange={(e) => handleStatusCheckChange('1', e.target.checked)}>
              進行中
            </Checkbox>
            <Checkbox checked={context.chkStatus2} onChange={(e) => handleStatusCheckChange('2', e.target.checked)}>
              已寄出
            </Checkbox>
            <Checkbox checked={context.chkStatus3} onChange={(e) => handleStatusCheckChange('3', e.target.checked)}>
              已完成
            </Checkbox>
            <Checkbox checked={context.chkStatus0} onChange={(e) => handleStatusCheckChange('0', e.target.checked)}>
              作廢
            </Checkbox>
            <Checkbox checked={context.chkStatusT} onChange={(e) => handleStatusAllChange(e.target.checked)}>
              全部
            </Checkbox>
          </Space>
        </div>
      </Col>
    </Row>
  );
}

function Dp035Result({ rows, setRows, loading, context }) {
  const [previewVisible, setPreviewVisible] = React.useState(false);
  const { kind = 0, ddate = '' } = context;

  const updateLocalCell = (idx, field, val) => {
    const copy = [...rows];
    copy[idx][field] = val;
    setRows(copy);
  };

  const handlePrint = () => {
    const selected = rows.filter((r) => r.chk === 'Y');
    if (selected.length === 0) {
      message.warning('請先在 Grid 中勾選需要列印標籤的項次！');
      return;
    }
    setPreviewVisible(true);
  };

  const executePrint = () => {
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const renderLabels = () => {
    const labels = [];
    const blankCount = parseInt(kind) || 0;
    for (let b = 0; b < blankCount; b++) {
      labels.push(
        <div
          className="label-card empty-label"
          key={`blank_${b}`}
          style={{
            height: '240px',
            border: '1px dashed #d9d9d9',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#bfbfbf',
            fontSize: '11px',
          }}
        >
          (空白格 #{b + 1})
        </div>
      );
    }

    const selected = rows.filter((r) => r.chk === 'Y');
    selected.forEach((row) => {
      const copies = parseInt(row.computeqty) || 0;
      const materialsText = `${row.dp031_color || ''} \\ ${row.dp031_upper || ''}`;

      for (let c = 0; c < copies; c++) {
        labels.push(
          <div
            className="label-card"
            key={`${row.gkey}_label_${c}`}
            style={{
              backgroundColor: '#fff',
              border: '2px solid #000',
              borderRadius: '4px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Arial, sans-serif',
              height: '240px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px dashed #ccc',
                paddingBottom: '2px',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>BRAND: {row.ba009_ebrand || 'Default'}</span>
              <span style={{ fontSize: '9px', color: '#bfbfbf' }}>
                #{c + 1} / {copies}
              </span>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <Row gutter={8}>
                <Col span={14}>
                  <div style={{ fontSize: '8px', color: '#666' }}>SAMPLE NO</div>
                  <div style={{ fontWeight: 'bold', fontSize: '11px', wordBreak: 'break-all' }}>
                    {row.dp030_sampleno}
                  </div>
                </Col>
                <Col span={10} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '8px', color: '#666' }}>SIZE</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f5222d' }}>{row.dp033_size || '-'}</div>
                </Col>
              </Row>

              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '8px', color: '#666' }}>STYLE / COLOR</div>
                <div style={{ fontSize: '10px', fontWeight: '600' }}>
                  {row.dp031_styleno} / {row.dp031_color}
                </div>
              </div>

              <div style={{ marginTop: '4px', height: '34px', overflow: 'hidden' }}>
                <div style={{ fontSize: '8px', color: '#666' }}>MATERIALS</div>
                <div style={{ fontSize: '9px', lineHeight: '1.2' }}>{materialsText}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '8px', color: '#555' }}>
                <span>PO: {row.dp031_pono || '-'}</span>
                <span>OrderNo: {row.dp030_stock || '-'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '8px', color: '#555' }}>
                <span>CLIENT: {row.ba010_shortname || ''}</span>
                <span>DATE: {ddate}</span>
              </div>
            </div>

            <div style={{ marginTop: '4px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '2px' }}>
              <div className="scannable-barcode">{row.dp033_barcode || row.dp030_sampleno}</div>
              <div style={{ fontSize: '8px', letterSpacing: '1px', fontWeight: '600' }}>
                {row.dp033_barcode || row.dp030_sampleno}
              </div>
            </div>
          </div>
        );
      }
    });

    return labels;
  };

  const columns = [
    {
      title: '選取',
      dataIndex: 'chk',
      key: 'chk',
      width: 60,
      align: 'center',
      fixed: 'left',
      render: (v, r, idx) => (
        <Checkbox checked={v === 'Y'} onChange={(e) => updateLocalCell(idx, 'chk', e.target.checked ? 'Y' : 'N')} />
      ),
    },
    {
      title: '張數',
      dataIndex: 'computeqty',
      key: 'computeqty',
      width: 85,
      fixed: 'left',
      render: (v, r, idx) => (
        <Input
          type="number"
          value={v}
          onChange={(e) => updateLocalCell(idx, 'computeqty', parseInt(e.target.value) || 0)}
          size="small"
        />
      ),
    },
    {
      title: '客戶',
      dataIndex: 'ba010_shortname',
      key: 'ba010_shortname',
      width: 100,
    },
    {
      title: '工廠',
      dataIndex: 'ba015_shortname',
      key: 'ba015_shortname',
      width: 100,
    },
    {
      title: '樣品類別',
      dataIndex: 'dp002_esampletype',
      key: 'dp002_esampletype',
      width: 100,
    },
    {
      title: '樣品單號',
      dataIndex: 'dp030_sampleno',
      key: 'dp030_sampleno',
      width: 130,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp030_sampleno', e.target.value)} size="small" />,
    },
    {
      title: '型體編號',
      dataIndex: 'dp031_styleno',
      key: 'dp031_styleno',
      width: 130,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_styleno', e.target.value)} size="small" />,
    },
    {
      title: '型體名稱',
      dataIndex: 'dp030_stylename',
      key: 'dp030_stylename',
      width: 140,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp030_stylename', e.target.value)} size="small" />,
    },
    {
      title: '客戶型體 / Stock#',
      dataIndex: 'dp030_stock',
      key: 'dp030_stock',
      width: 150,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp030_stock', e.target.value)} size="small" />,
    },
    {
      title: '組別',
      dataIndex: 'dp023_groupname',
      key: 'dp023_groupname',
      width: 100,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp023_groupname', e.target.value)} size="small" />,
    },
    {
      title: '中文顏色',
      dataIndex: 'dp031_color',
      key: 'dp031_color',
      width: 120,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_color', e.target.value)} size="small" />,
    },
    {
      title: '英文顏色',
      dataIndex: 'dp031_ecolor',
      key: 'dp031_ecolor',
      width: 120,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_ecolor', e.target.value)} size="small" />,
    },
    {
      title: '面材',
      dataIndex: 'dp031_upper',
      key: 'dp031_upper',
      width: 150,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_upper', e.target.value)} size="small" />,
    },
    {
      title: '裡材',
      dataIndex: 'dp031_lining',
      key: 'dp031_lining',
      width: 150,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_lining', e.target.value)} size="small" />,
    },
    {
      title: '墊腳',
      dataIndex: 'dp031_sock',
      key: 'dp031_sock',
      width: 150,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_sock', e.target.value)} size="small" />,
    },
    {
      title: '大底',
      dataIndex: 'dp031_bottom',
      key: 'dp031_bottom',
      width: 150,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_bottom', e.target.value)} size="small" />,
    },
    {
      title: '跟材',
      dataIndex: 'dp031_heel',
      key: 'dp031_heel',
      width: 150,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_heel', e.target.value)} size="small" />,
    },
    {
      title: '舌片',
      dataIndex: 'dp031_tongue',
      key: 'dp031_tongue',
      width: 150,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp031_tongue', e.target.value)} size="small" />,
    },
    {
      title: '品牌',
      dataIndex: 'ba009_ebrand',
      key: 'ba009_ebrand',
      width: 110,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'ba009_ebrand', e.target.value)} size="small" />,
    },
    {
      title: 'Logo',
      dataIndex: 'dp030_logo',
      key: 'dp030_logo',
      width: 110,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp030_logo', e.target.value)} size="small" />,
    },
    {
      title: 'PONo',
      dataIndex: 'dp031_pono',
      key: 'dp031_pono',
      width: 110,
      render: (v, r, idx) => <Input value={v || ''} onChange={(e) => updateLocalCell(idx, 'dp031_pono', e.target.value)} size="small" />,
    },
    {
      title: '楦頭編號',
      dataIndex: 'dp010_lastno',
      key: 'dp010_lastno',
      width: 110,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp010_lastno', e.target.value)} size="small" />,
    },
    {
      title: '尺碼',
      dataIndex: 'dp033_size',
      key: 'dp033_size',
      width: 80,
      render: (v, r, idx) => <Input value={v} onChange={(e) => updateLocalCell(idx, 'dp033_size', e.target.value)} size="small" />,
    },
    {
      title: '客戶雙數',
      dataIndex: 'custpairs',
      key: 'custpairs',
      width: 90,
      align: 'right',
      render: (v) => (typeof v === 'number' ? v.toFixed(1) : ''),
    },
    {
      title: '留樣雙數',
      dataIndex: 'keeppairs',
      key: 'keeppairs',
      width: 90,
      align: 'right',
      render: (v) => (typeof v === 'number' ? v.toFixed(1) : ''),
    },
    {
      title: '條碼',
      dataIndex: 'dp033_barcode',
      key: 'dp033_barcode',
      width: 130,
      render: (v, r, idx) => <Input value={v || ''} onChange={(e) => updateLocalCell(idx, 'dp033_barcode', e.target.value)} size="small" />,
    },
    {
      title: '其他1',
      dataIndex: 'other1',
      key: 'other1',
      width: 100,
      render: (v, r, idx) => <Input value={v || ''} onChange={(e) => updateLocalCell(idx, 'other1', e.target.value)} size="small" />,
    },
    {
      title: '其他2',
      dataIndex: 'other2',
      key: 'other2',
      width: 100,
      render: (v, r, idx) => <Input value={v || ''} onChange={(e) => updateLocalCell(idx, 'other2', e.target.value)} size="small" />,
    },
    {
      title: '其他3',
      dataIndex: 'other3',
      key: 'other3',
      width: 100,
      render: (v, r, idx) => <Input value={v || ''} onChange={(e) => updateLocalCell(idx, 'other3', e.target.value)} size="small" />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
        .scannable-barcode {
          font-family: 'Libre Barcode 128', cursive;
          font-size: 38px;
          line-height: 1;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 10px !important;
          }
          .label-card {
            page-break-inside: avoid;
            border: 1px solid #000 !important;
            height: 240px !important;
          }
          .empty-label {
            visibility: hidden !important;
          }
        }
      `,
        }}
      />

      <Card
        size="small"
        title={
          <span>
            樣品標籤明細
            {rows.length > 0 && <span style={{ color: '#8c8c8c', marginLeft: 8 }}>（共 {rows.length} 筆）</span>}
          </span>
        }
        extra={
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}
            onClick={handlePrint}
          >
            列印選中標籤 (Print)
          </Button>
        }
      >
        <Table
          loading={loading}
          dataSource={rows}
          columns={columns}
          rowKey="gkey"
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: true, size: 'small' }}
          bordered
          scroll={{ y: 'calc(100vh - 430px)', x: '180%' }}
        />
      </Card>

      <Modal
        title="樣品條碼標籤列印預覽 (A4 貼紙格式)"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            關閉預覽
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={executePrint}
            style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}
          >
            送至印表機 (Print)
          </Button>,
        ]}
      >
        <div style={{ maxHeight: '600px', overflowY: 'auto', padding: '15px', backgroundColor: '#fafafa' }}>
          <div
            className="print-container"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}
          >
            {renderLabels()}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default createQueryListSheet({
  sheetId: 'dp035',
  title: '樣品 Label 資料管理',
  breadcrumb: ['開發管理', '樣品 Label 資料管理'],
  mainClassName: 'dp035-query-list-shell',
  layout: {
    contentScroll: true,
    contentHeight: 'calc(100vh - 150px)',
  },
  api: {
    queryUrl: `${API_BASE}/dp030/label_samples/`,
  },
  initialContext: () => ({
    kind: 0,
    ddate: dayjs().format('YYYY-MM-DD'),
    chkStatus1: true,
    chkStatus2: false,
    chkStatus3: false,
    chkStatus0: false,
    chkStatusT: false,
  }),
  query: {
    buildParams: buildDp035Params,
  },
  afterRetrieve: ({ rows, setRows }) => {
    const hydrated = rows.map((row) => ({
      ...row,
      chk: 'N',
      computeqty: row.qty,
    }));
    setRows(hydrated);
  },
  renderQueryForm: renderDp035QueryForm,
  renderResult: Dp035Result,
});
