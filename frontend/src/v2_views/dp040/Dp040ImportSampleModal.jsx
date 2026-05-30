import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, Table, Space, message } from 'antd';
import axios from 'axios';

export default function Dp040ImportSampleModal({
  open,
  onCancel,
  onImport,
  customerGkey,
  existingDp033Keys = []
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  const handleSearch = useCallback(async () => {
    if (!customerGkey) {
      message.warning('請先在主檔選擇客戶！');
      return;
    }
    setLoading(true);
    try {
      const vals = form.getFieldsValue();
      const params = {
        ba010gkey: customerGkey,
        ...vals
      };
      // Remove empty params
      Object.keys(params).forEach(k => {
        if (!params[k]) delete params[k];
      });

      const res = await axios.get('http://localhost:8001/api/dp040/import_candidates/', { params });
      setData(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('搜尋可轉入樣品失敗：' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [customerGkey, form]);

  // Clear states when modal opens
  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setData([]);
        setSelectedRowKeys([]);
        setSelectedRows([]);
        form.resetFields();
        if (customerGkey) {
          handleSearch();
        }
      });
    }
  }, [open, customerGkey, form, handleSearch]);


  const handleImportSubmit = () => {
    if (selectedRows.length === 0) {
      message.warning('請先選擇要轉入的項目！');
      return;
    }

    // 防重複轉入
    const filtered = selectedRows.filter(row => !existingDp033Keys.includes(row.dp033gkey));
    if (filtered.length === 0) {
      message.warning('選取的項目已全部存在於出貨明細中！');
      return;
    }

    if (filtered.length < selectedRows.length) {
      message.info(`已過濾掉 ${selectedRows.length - filtered.length} 筆重複項目。`);
    }

    onImport(filtered);
  };

  const columns = [
    { title: '樣品單號', dataIndex: 'sampleno', width: 130 },
    { title: '款式 (Style)', dataIndex: 'styleno', width: 120 },
    { title: '型體名稱', dataIndex: 'stylename', width: 130 },
    { title: '品牌', dataIndex: 'brand_name', width: 100 },
    { title: '大底 (Outsole)', dataIndex: 'bottom', width: 120 },
    { title: '樣品類別', dataIndex: 'sampletype', width: 100 },
    { title: '配色 (Color)', dataIndex: 'color', width: 120 },
    { title: '尺碼 (Size)', dataIndex: 'size', width: 80 },
    { title: '客戶雙數', dataIndex: 'custpairs', width: 90, align: 'right' },
    { title: '留底雙數', dataIndex: 'keeppairs', width: 90, align: 'right' },
    { title: '已寄出雙數', dataIndex: 'sentpairs', width: 90, align: 'right' },
    { title: '出貨欠數', dataIndex: 'outstanding_to_send', width: 90, align: 'right', render: (val) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{val}</span> },
    { title: '客戶', dataIndex: 'customer', width: 100 },
    { title: '季節', dataIndex: 'season', width: 90 },
    { title: '年度', dataIndex: 'year', width: 80 },
    { title: '工廠', dataIndex: 'factory', width: 100 }
  ];

  return (
    <Modal
      title="轉入待出貨樣品"
      open={open}
      onCancel={onCancel}
      width={1000}
      onOk={handleImportSubmit}
      okText="確認轉入"
      cancelText="取消"
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="inline"
        size="small"
        style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        onFinish={handleSearch}
      >
        <Form.Item name="sampleno" label="樣品單號">
          <Input placeholder="單號" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="styleno" label="型體 (Style)">
          <Input placeholder="Style" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="stylename" label="名稱">
          <Input placeholder="Name" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="stock" label="Stock No">
          <Input placeholder="Stock" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="color" label="配色">
          <Input placeholder="Color" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="size" label="尺碼">
          <Input placeholder="Size" style={{ width: 80 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>查詢</Button>
            <Button onClick={() => form.resetFields()}>清空</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        rowKey="dp033gkey"
        rowSelection={{
          selectedRowKeys,
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
          }
        }}
        pagination={{ pageSize: 10, size: 'small' }}
        scroll={{ y: 350 }}
        bordered
      />
    </Modal>
  );
}
