import React from 'react';
import { Table, Input, Radio, Checkbox, Row, Col, Form, Tag, Space } from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';
import createQueryListSheet from '../components/erp/factory/createQueryListSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import { DP_STATUS_MAP } from '../utils/dpStatus';
import '../styles/erp-query-report-sheet.css';

const API_BASE = 'http://localhost:8001/api';

function buildDp095Params(values) {
  const params = {};
  [
    'sampletype', 'customer', 'factory', 'styleno', 'sampleno', 'approve',
    'issuedate_from', 'issuedate_to', 'year', 'ba055gkey', 'stylename',
    'stock', 'group', 'lastno', 'bottomno', 'heelno', 'maker', 'custno',
    'factno', 'brand', 'ba005gkey', 'sentdate_from', 'sentdate_to', 'invoiceno'
  ].forEach((key) => {
    if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
      params[key] = values[key];
    }
  });

  if (values.status && values.status.length > 0) {
    if (!values.status.includes('all')) {
      params.status = values.status.join(',');
    }
  }

  params.limit = 500;
  return params;
}

const formatDate = (v) => v ? dayjs(v).format('YYYY-MM-DD') : '';

function QueryFormWrapper({ form }) {
  const [defaultLoaded, setDefaultLoaded] = React.useState(false);

  React.useEffect(() => {
    if (defaultLoaded) return;
    axios.get(`${API_BASE}/dp095/default_sample_type/`)
      .then(res => {
        if (res.data?.sampletype) {
          form.setFieldsValue({ sampletype: res.data.sampletype });
        }
      })
      .catch(() => {})
      .finally(() => setDefaultLoaded(true));
  }, [form, defaultLoaded]);

  const handleStatusGroupChange = (checkedList) => {
    const isAllCheckedBefore = form.getFieldValue('status')?.includes('all');
    const isAllCheckedNow = checkedList.includes('all');
    
    let nextList = checkedList;
    if (!isAllCheckedBefore && isAllCheckedNow) {
      nextList = ['1', '2', '3', '0', 'all'];
    } else if (isAllCheckedBefore && !isAllCheckedNow) {
      nextList = [];
    } else {
      const coreStatuses = checkedList.filter(x => x !== 'all');
      if (coreStatuses.length === 4) {
        nextList = ['1', '2', '3', '0', 'all'];
      } else {
        nextList = coreStatuses;
      }
    }
    form.setFieldsValue({ status: nextList });
  };

  return (
    <Row gutter={8}>
      {/* Row 1 */}
      <Col span={4}>
        <Form.Item name="sampleno" label="樣品單號" tooltip="PB: dp030.sampleno">
          <Input placeholder="請輸入單號" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="styleno" label="型體編號" tooltip="PB: dp030.styleno">
          <Input placeholder="請輸入型體" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="stylename" label="型體名稱" tooltip="PB: dp030.stylename">
          <Input placeholder="請輸入型體名稱" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="stock" label="庫存編號" tooltip="PB: dp030.stock">
          <Input placeholder="請輸入庫存編號" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="year" label="年度" tooltip="PB: dp030.year">
          <Input placeholder="YYYY" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="ba055gkey" label="季節" tooltip="PB: dp030.ba055gkey">
          <ERPLookupField type="ba055" placeholder="季節 F2" allowClear />
        </Form.Item>
      </Col>

      {/* Row 2 */}
      <Col span={4}>
        <Form.Item name="sampletype" label="樣品類別" tooltip="PB: dp030.dp002gkey">
          <ERPLookupField type="dp002" placeholder="類別 F2" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="customer" label="客戶簡稱" tooltip="PB: ba010.shortname">
          <ERPLookupField type="ba010" placeholder="客戶 F2" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="custno" label="客戶代號" tooltip="PB: ba010.custno">
          <Input placeholder="請輸入客戶代號" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="factory" label="工廠簡稱" tooltip="PB: ba015.shortname">
          <ERPLookupField type="ba015" placeholder="工廠 F2" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="factno" label="工廠代號" tooltip="PB: ba015.factno">
          <Input placeholder="請輸入工廠代號" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="ba005gkey" label="歸屬公司" tooltip="PB: dp030.ba005gkey">
          <ERPLookupField type="ba005" placeholder="歸屬公司 F2" allowClear />
        </Form.Item>
      </Col>

      {/* Row 3 */}
      <Col span={4}>
        <Form.Item name="brand" label="品牌" tooltip="PB: ba009.ebrand">
          <Input placeholder="請輸入品牌" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="group" label="組別" tooltip="PB: dp023.gkey">
          <ERPLookupField type="dp023" placeholder="組別 F2" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="maker" label="製單人" tooltip="PB: es101.englishname">
          <ERPLookupField type="es101" placeholder="製單人 F2" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="lastno" label="楦頭編號" tooltip="PB: dp010.lastno">
          <Input placeholder="請輸入楦頭" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="bottomno" label="大底編號" tooltip="PB: dp015.bottomno">
          <Input placeholder="請輸入大底" allowClear />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="heelno" label="鞋跟編號" tooltip="PB: dp020.heelno">
          <Input placeholder="請輸入鞋跟" allowClear />
        </Form.Item>
      </Col>

      {/* Row 4 */}
      <Col span={4}>
        <Form.Item name="issuedate_from" label="建單日期 (起)" tooltip="PB: dp030.issuedate">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="issuedate_to" label="建單日期 (迄)" tooltip="PB: dp030.issuedate1">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="sentdate_from" label="寄出日期 (起)" tooltip="PB: dp040.sentdate">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="sentdate_to" label="寄出日期 (迄)" tooltip="PB: dp040.sentdate1">
          <Input type="date" />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Form.Item name="invoiceno" label="發票號碼" tooltip="PB: dp040.invoiceno">
          <Input placeholder="請輸入發票號碼" allowClear />
        </Form.Item>
      </Col>

      {/* Row 5 */}
      <Col span={6}>
        <div className="erp-rw-query-right-panel" style={{ height: 'auto', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div className="erp-rw-query-right-panel-title" style={{ marginBottom: '4px', fontSize: '11px', fontWeight: 'bold', color: '#595959' }}>審核狀態</div>
          <Form.Item name="approve" initialValue="" style={{ marginBottom: '4px' }}>
            <Radio.Group size="small">
              <Space direction="horizontal" size={12}>
                <Radio value="">全部</Radio>
                <Radio value="Y">已審核</Radio>
                <Radio value="N">未審核</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </div>
      </Col>
      <Col span={10}>
        <div className="erp-rw-query-right-panel" style={{ height: 'auto', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div className="erp-rw-query-right-panel-title" style={{ marginBottom: '4px', fontSize: '11px', fontWeight: 'bold', color: '#595959' }}>樣品狀態</div>
          <Form.Item name="status" initialValue={['1']} style={{ marginBottom: 0 }}>
            <Checkbox.Group style={{ width: '100%' }} onChange={handleStatusGroupChange}>
              <Space direction="horizontal" size={8} style={{ flexWrap: 'wrap' }}>
                <Checkbox value="1">進行中</Checkbox>
                <Checkbox value="2">已寄出</Checkbox>
                <Checkbox value="3">已完成</Checkbox>
                <Checkbox value="0">取消</Checkbox>
                <Checkbox value="all">全部</Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>
        </div>
      </Col>
    </Row>
  );
}

function renderDp095TopRightPreview({ context }) {
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
      <span style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 'bold' }}>樣品圖片</span>
      {selectedImage ? (
        <img
          src={selectedImage}
          alt="樣品圖片"
          style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain', marginTop: '4px' }}
        />
      ) : (
        <div style={{ fontSize: '24px', color: '#ccc', marginTop: '4px' }}>👟</div>
      )}
    </div>
  );
}

function Dp095Result({ rows, loading, context, setContext }) {
  const { selectedRow = null } = context;

  const columns = [
    {
      title: '樣品單號',
      dataIndex: 'sampleno',
      key: 'sampleno',
      width: 130,
      fixed: 'left',
      sorter: (a, b) => (a.sampleno || '').localeCompare(b.sampleno || ''),
    },
    {
      title: '建單日期',
      dataIndex: 'issuedate',
      key: 'issuedate',
      width: 110,
      align: 'center',
      render: formatDate,
    },
    {
      title: '交期',
      dataIndex: 'duedate',
      key: 'duedate',
      width: 110,
      align: 'center',
      render: formatDate,
    },
    {
      title: '樣品類別',
      dataIndex: 'esampletype',
      key: 'esampletype',
      width: 120,
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
      width: 135,
    },
    {
      title: '庫存編號',
      dataIndex: 'stock',
      key: 'stock',
      width: 120,
    },
    {
      title: '客戶簡稱',
      dataIndex: 'customer_shortname',
      key: 'customer_shortname',
      width: 110,
    },
    {
      title: '工廠簡稱',
      dataIndex: 'factory_shortname',
      key: 'factory_shortname',
      width: 110,
    },
    {
      title: '英文顏色',
      dataIndex: 'color',
      key: 'color',
      width: 120,
    },
    {
      title: '面部材料',
      dataIndex: 'upper',
      key: 'upper',
      width: 140,
    },
    {
      title: '尺碼',
      dataIndex: 'size',
      key: 'size',
      width: 80,
      align: 'center',
    },
    {
      title: '客要雙數',
      dataIndex: 'custpairs',
      key: 'custpairs',
      width: 95,
      align: 'right',
      render: v => typeof v === 'number' ? v.toLocaleString() : '',
    },
    {
      title: '留底雙數',
      dataIndex: 'keeppairs',
      key: 'keeppairs',
      width: 95,
      align: 'right',
      render: v => typeof v === 'number' ? v.toLocaleString() : '',
    },
    {
      title: '已寄雙數',
      dataIndex: 'sentpairs',
      key: 'sentpairs',
      width: 95,
      align: 'right',
      render: v => typeof v === 'number' ? v.toLocaleString() : '',
    },
    {
      title: '預計寄出交期',
      dataIndex: 'sentduedate',
      key: 'sentduedate',
      width: 110,
      align: 'center',
      render: formatDate,
    },
    {
      title: '寄出日期',
      dataIndex: 'sentdate',
      key: 'sentdate',
      width: 110,
      align: 'center',
      render: formatDate,
    },
    {
      title: '核准日期',
      dataIndex: 'approvedate',
      key: 'approvedate',
      width: 110,
      align: 'center',
      render: v => v ? dayjs(v).format('YYYY-MM-DD') : <span style={{ color: '#bfbfbf' }}>未核准</span>
    },
    {
      title: '裝船樣',
      dataIndex: 'shipmentdt',
      key: 'shipmentdt',
      width: 110,
      align: 'center',
      render: formatDate,
    },
    {
      title: '發票編號',
      dataIndex: 'invoiceno',
      key: 'invoiceno',
      width: 120,
    },
    {
      title: '提單號碼(AWB)',
      dataIndex: 'awbno',
      key: 'awbno',
      width: 130,
    },
    {
      title: '排程備註',
      dataIndex: 'scheduleremark',
      key: 'scheduleremark',
      width: 150,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: v => {
        const cfg = DP_STATUS_MAP[v] || { text: v, color: 'default' };
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      }
    }
  ];

  return (
    <Table
      loading={loading}
      dataSource={rows}
      columns={columns}
      rowKey={(record, index) => `${record.sampleno}-${record.styleno}-${record.size}-${index}`}
      size="small"
      bordered
      pagination={{ pageSize: 50, showSizeChanger: true, size: 'small' }}
      scroll={{ y: 'calc(100vh - 480px)', x: 'max-content' }}
      rowClassName={(record) => record === selectedRow ? 'erp-qrs-selected-row' : ''}
      onRow={(record) => ({
        onClick: () => setContext(prev => ({ ...prev, selectedRow: record })),
      })}
      summary={(pageData) => {
        let totalCust = 0;
        let totalKeep = 0;
        let totalSent = 0;
        pageData.forEach(({ custpairs, keeppairs, sentpairs }) => {
          totalCust += Number(custpairs || 0);
          totalKeep += Number(keeppairs || 0);
          totalSent += Number(sentpairs || 0);
        });
        return (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0} colSpan={12}>TOTAL</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{totalCust.toLocaleString()}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">{totalKeep.toLocaleString()}</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">{totalSent.toLocaleString()}</Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={8}></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        );
      }}
      locale={{ emptyText: loading ? '載入中...' : '無確認樣品管控資料' }}
    />
  );
}

export default createQueryListSheet({
  sheetId: 'dp095',
  title: 'Confirmation Sample Control',
  breadcrumb: ['開發管理', 'Confirmation Sample Control'],
  mainClassName: 'dp095-query-list-shell',
  layout: {
    contentScroll: true,
    contentHeight: 'calc(100vh - 150px)',
  },
  api: {
    queryUrl: `${API_BASE}/dp095/query/`,
  },
  query: {
    buildParams: buildDp095Params,
  },
  renderQueryForm: (formProps) => <QueryFormWrapper {...formProps} />,
  renderTopRightPreview: renderDp095TopRightPreview,
  renderResult: Dp095Result,
});
