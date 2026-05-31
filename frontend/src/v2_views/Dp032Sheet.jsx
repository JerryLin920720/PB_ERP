import React from 'react';
import { Table, Input, Radio, Row, Col, Form } from 'antd';
import dayjs from 'dayjs';
import createQueryListSheet from '../components/erp/factory/createQueryListSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import '../styles/erp-query-report-sheet.css';

const API_BASE = 'http://localhost:8001/api';

function buildDp032Params(values) {
  const params = {};
  [
    'year',
    'ba055gkey',
    'dp002gkey',
    'sampleno',
    'styleno',
    'stylename',
    'stock',
    'groupname',
    'ba010gkey',
    'ba015gkey',
    'lastno',
    'bottomno',
    'heelno',
    'englishname',
    'approve',
    'issuedate_from',
    'issuedate_to',
  ].forEach((key) => {
    if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
      params[key] = values[key];
    }
  });
  params.limit = 500;
  return params;
}

function renderDp032QueryForm() {
  return (
    <Row gutter={16}>
      <Col span={24}>
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
              <Input placeholder="組別" />
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
            <Form.Item name="lastno" label="楦頭編號">
              <Input placeholder="楦頭編號" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="englishname" label="開發人 (Maker)">
              <Input placeholder="開發人姓名" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={6}>
            <Form.Item name="bottomno" label="大底編號">
              <Input placeholder="大底編號" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="heelno" label="鞋跟編號">
              <Input placeholder="鞋跟編號" />
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
        </Row>

        <Row gutter={8}>
          <Col span={12}>
            <Form.Item name="approve" label="審核狀態" initialValue="">
              <Radio.Group>
                <Radio value="">全部</Radio>
                <Radio value="Y">已審核 (Approve)</Radio>
                <Radio value="N">未審核 (UnApprove)</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </Col>
    </Row>
  );
}

function Dp032Result({ rows, loading }) {
  const columns = [
    {
      title: '樣品編號',
      dataIndex: 'sampleno',
      key: 'sampleno',
      width: 130,
      sorter: (a, b) => (a.sampleno || '').localeCompare(b.sampleno || ''),
      fixed: 'left',
    },
    {
      title: '樣品類別',
      dataIndex: 'sampletype',
      key: 'sampletype',
      width: 100,
    },
    {
      title: '建單日期',
      dataIndex: 'issuedate',
      key: 'issuedate',
      width: 110,
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : ''
    },
    {
      title: '型體編號',
      dataIndex: 'styleno',
      key: 'styleno',
      width: 120,
    },
    {
      title: '型體名稱',
      dataIndex: 'stylename',
      key: 'stylename',
      width: 140,
    },
    {
      title: '客戶型體',
      dataIndex: 'stock',
      key: 'stock',
      width: 110,
    },
    {
      title: '客戶名稱',
      dataIndex: 'customer',
      key: 'customer',
      width: 100,
    },
    {
      title: '工廠',
      dataIndex: 'factory',
      key: 'factory',
      width: 100,
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 130,
    },
    {
      title: '尺碼',
      dataIndex: 'size',
      key: 'size',
      width: 80,
    },
    {
      title: '客要數量',
      dataIndex: 'custpairs',
      key: 'custpairs',
      width: 90,
      align: 'right',
      render: v => typeof v === 'number' ? v.toFixed(1) : ''
    },
    {
      title: '留底數量',
      dataIndex: 'keeppairs',
      key: 'keeppairs',
      width: 90,
      align: 'right',
      render: v => typeof v === 'number' ? v.toFixed(1) : ''
    },
    {
      title: '寄出日期',
      dataIndex: 'sentdate',
      key: 'sentdate',
      width: 110,
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : <span style={{ color: '#bfbfbf' }}>未出貨</span>
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstanding',
      key: 'outstanding',
      width: 100,
      align: 'right',
      render: v => typeof v === 'number' ? v.toFixed(1) : ''
    },
    {
      title: 'Completion Rate',
      dataIndex: 'completion_rate',
      key: 'completion_rate',
      width: 120,
      align: 'right',
      render: v => typeof v === 'number' ? `${v.toFixed(2)}%` : ''
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Table
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey="gkey"
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: true, size: 'small' }}
        bordered
        scroll={{ y: 'calc(100vh - 430px)', x: 'max-content' }}
        summary={(pageData) => {
          let totalCust = 0;
          let totalKeep = 0;
          pageData.forEach(({ custpairs, keeppairs }) => {
            totalCust += Number(custpairs || 0);
            totalKeep += Number(keeppairs || 0);
          });
          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0} colSpan={10} align="left">TOTAL</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">{totalCust.toFixed(1)}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">{totalKeep.toFixed(1)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={3} />
              </Table.Summary.Row>
            </Table.Summary>
          );
        }}
      />
    </div>
  );
}

export default createQueryListSheet({
  sheetId: 'dp032',
  title: '未完樣品催交清單',
  breadcrumb: ['開發管理', '未完樣品催交清單'],
  mainClassName: 'dp032-query-list-shell',
  layout: {
    contentScroll: true,
    contentHeight: 'calc(100vh - 150px)',
  },
  api: {
    queryUrl: `${API_BASE}/dp030/outstanding_samples/`,
  },
  query: {
    buildParams: buildDp032Params,
  },
  renderQueryForm: renderDp032QueryForm,
  renderResult: Dp032Result,
});
