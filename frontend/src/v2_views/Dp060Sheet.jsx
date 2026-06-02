import React from 'react';
import { Table, Input, Row, Col, Form, Select } from 'antd';
import createQueryListSheet from '../components/erp/factory/createQueryListSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import '../styles/erp-query-report-sheet.css';

const API_BASE = 'http://localhost:8001/api';

function buildDp060Params(values) {
  const params = {};
  [
    'bottomno', 'customer', 'factory', 'lastno', 'styleno', 'pono',
    'orddate_from', 'orddate_to', 'custno', 'factno', 'year', 'ba055gkey', 'gender_gkey'
  ].forEach((key) => {
    if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
      params[key] = values[key];
    }
  });
  params.limit = 500;
  return params;
}

function renderDp060QueryForm() {
  return (
    <Row gutter={8}>
      {/* Row 1 */}
      <Col span={4}>
        <Form.Item name="bottomno" label="大底編號" tooltip="PB: dp015.bottomno">
          <Input placeholder="請輸入大底編號" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="lastno" label="楦頭" tooltip="PB: dp010.lastno">
          <Input placeholder="請輸入楦頭" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="styleno" label="型體" tooltip="PB: sa031.styleno">
          <Input placeholder="請輸入型體" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="pono" label="訂單號" tooltip="PB: sa030.pono">
          <Input placeholder="請輸入訂單號" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="year" label="年度" tooltip="PB: sa030.year">
          <Input placeholder="YYYY" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="ba055gkey" label="季節" tooltip="PB: sa030.ba055gkey">
          <ERPLookupField type="ba055" placeholder="季節 F2" allowClear />
        </Form.Item>
      </Col>

      {/* Row 2 */}
      <Col span={4}>
        <Form.Item name="customer" label="客戶" tooltip="PB: ba010.shortname">
          <ERPLookupField type="ba010" placeholder="客戶 F2" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="custno" label="客戶代號" tooltip="PB: ba010.custno">
          <Input placeholder="請輸入客戶代號" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="factory" label="工廠" tooltip="PB: ba015.shortname">
          <ERPLookupField type="ba015" placeholder="工廠 F2" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="factno" label="工廠代號" tooltip="PB: ba015.factno">
          <Input placeholder="請輸入工廠代號" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="gender_gkey" label="性別" tooltip="PB: dp016.dp004gkey">
          <ERPLookupField type="dp004" placeholder="性別 F2" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="orddate_from" label="建單日期 (起)" tooltip="PB: sa030.orddate">
          <Input type="date" />
        </Form.Item>
      </Col>

      {/* Row 3 */}
      <Col span={4}>
        <Form.Item name="orddate_to" label="建單日期 (迄)" tooltip="PB: sa030.orddate1">
          <Input type="date" />
        </Form.Item>
      </Col>
    </Row>
  );
}

function renderDp060TopRightPreview({ context }) {
  const { selectedRow = null } = context;
  const selectedImage = selectedRow?.photopath || '';

  return (
    <div style={{
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      backgroundColor: '#fafafa',
      height: '100%',
      minHeight: '120px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '4px',
      boxSizing: 'border-box'
    }}>
      <span style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 'bold' }}>大底圖片</span>
      {selectedImage ? (
        <img
          src={selectedImage}
          alt="大底圖片"
          style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain', marginTop: '4px' }}
        />
      ) : (
        <div style={{ fontSize: '24px', color: '#ccc', marginTop: '4px' }}>👟</div>
      )}
    </div>
  );
}

function Dp060Result({ rows, loading, context, setContext }) {
  const { selectedRow = null } = context;

  const columns = [
    {
      title: '大底編號',
      dataIndex: 'bottomno',
      key: 'bottomno',
      width: 140,
      fixed: 'left',
      sorter: (a, b) => (a.bottomno || '').localeCompare(b.bottomno || ''),
    },
    {
      title: '楦頭',
      dataIndex: 'lastno',
      key: 'lastno',
      width: 120,
    },
    {
      title: '型體',
      dataIndex: 'styleno',
      key: 'styleno',
      width: 130,
    },
    {
      title: '客戶',
      dataIndex: 'customer_shortname',
      key: 'customer_shortname',
      width: 110,
    },
    {
      title: '工廠',
      dataIndex: 'factory_shortname',
      key: 'factory_shortname',
      width: 110,
    },
    {
      title: '性別',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
    },
    {
      title: '訂單號',
      dataIndex: 'pono',
      key: 'pono',
      width: 130,
    },
    {
      title: 'Size Run',
      dataIndex: 'sizerun',
      key: 'sizerun',
      width: 120,
    },
    {
      title: '雙數',
      dataIndex: 'totalpairs',
      key: 'totalpairs',
      width: 100,
      align: 'right',
      render: v => typeof v === 'number' ? v.toLocaleString() : '',
    }
  ];

  return (
    <Table
      loading={loading}
      dataSource={rows}
      columns={columns}
      rowKey={(record, index) => `${record.bottomno}-${record.pono}-${index}`}
      size="small"
      bordered
      pagination={{ pageSize: 50, showSizeChanger: true, size: 'small' }}
      scroll={{ y: 'calc(100vh - 430px)', x: 'max-content' }}
      rowClassName={(record) => record === selectedRow ? 'erp-qrs-selected-row' : ''}
      onRow={(record) => ({
        onClick: () => setContext(prev => ({ ...prev, selectedRow: record })),
      })}
      summary={(pageData) => {
        const total = pageData.reduce((sum, row) => sum + Number(row.totalpairs || 0), 0);
        return (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0} colSpan={8}>TOTAL</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{total.toLocaleString()}</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        );
      }}
      locale={{ emptyText: loading ? '統計中...' : '無量產出貨統計資料' }}
    />
  );
}

export default createQueryListSheet({
  sheetId: 'dp060',
  title: '大底量產統計查詢',
  breadcrumb: ['開發管理', '大底量產統計查詢'],
  mainClassName: 'dp060-query-list-shell',
  layout: {
    contentScroll: true,
    contentHeight: 'calc(100vh - 150px)',
  },
  api: {
    queryUrl: `${API_BASE}/dp060/query/`,
  },
  query: {
    buildParams: buildDp060Params,
  },
  renderQueryForm: renderDp060QueryForm,
  renderTopRightPreview: renderDp060TopRightPreview,
  renderResult: Dp060Result,
});
