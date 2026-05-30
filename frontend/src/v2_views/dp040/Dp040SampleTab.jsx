import React, { useState, useEffect } from 'react';
import { Table, Button, Input, InputNumber, message, Popconfirm, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import Dp040ImportSampleModal from './Dp040ImportSampleModal';
import ERPLookupField from '../../components/erp/lookup/ERPLookupField';

export default function Dp040SampleTab({
  rows,
  isEditing,
  loading,
  onCellChange,
  onDeleteRow,
  replaceDetailRows,
  activeRecord,
  detailStates,
  globalDeleteDetailRow,
  updateMasterField,
  form
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const safeRows = Array.isArray(rows) ? rows : [];

  useEffect(() => {
    if (updateMasterField && form) {
      const totalAmount = safeRows.reduce((sum, r) => {
        // Calculate amount dynamically as sentpairs * price to be safe, or read r.amount
        const sentpairs = parseFloat(r.sentpairs || 0);
        const price = parseFloat(r.price || 0);
        const amt = sentpairs * price;
        return sum + amt;
      }, 0);
      
      form.setFieldsValue({ amount: totalAmount });
      updateMasterField('amount', totalAmount);
    }
  }, [safeRows, updateMasterField, form]);
  const safeDetailStates = detailStates || {};

  const handleOpenImport = () => {
    if (!activeRecord?.ba010gkey) {
      message.warning('請先選擇客戶！');
      return;
    }
    setModalOpen(true);
  };

  const handleImport = (candidates) => {
    const safeCandidates = Array.isArray(candidates) ? candidates : [];
    const existingKeys = safeRows.map(r => r.dp033gkey);
    const newRows = [...safeRows];
    
    safeCandidates.forEach((cand, idx) => {
      if (existingKeys.includes(cand.dp033gkey)) {
        message.warning(`樣品 [${cand.sampleno}] 尺碼 ${cand.size} 已存在於出貨明細中，略過不轉入！`);
        return;
      }
      
      const tempKey = `temp_41_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`;
      const sentpairs = cand.outstanding_to_send || 0;
      const price = cand.price || 0;
      
      newRows.push({
        gkey: tempKey,
        dp040gkey: activeRecord?.gkey,
        dp033gkey: cand.dp033gkey,
        serialno: newRows.length + 1,
        sentpairs,
        price,
        amount: sentpairs * price,
        sample_no: cand.sampleno,
        styleno: cand.styleno,
        stylename: cand.stylename,
        color: cand.color,
        ecolor: cand.ecolor,
        size: cand.size,
        barcode: cand.barcode,
        remark: '',
        dp002gkey: cand.dp002gkey || '',
        esampletype: cand.sampletype || '',
        brand_name: cand.brand_name || '',
        stock: cand.stock || '',
        devorderno: cand.devorderno || '',
        dprefno: cand.dprefno || '',
        description: cand.color || '',
        material: cand.material || '',
        bottom: cand.bottom || '',
        custpairs: cand.custpairs || 0,
        unit: 'PRS',
        charge: '2',
        consignee: '',
        photopath: cand.photopath || ''
      });
    });
    
    if (replaceDetailRows) {
      replaceDetailRows(newRows);
    }
    setModalOpen(false);
    message.success(`成功轉入 ${safeCandidates.length} 筆樣品資料！`);
  };

  const handleDelete = (rowKey) => {
    if (onDeleteRow) {
      onDeleteRow(rowKey);
    }
    
    // 同步刪除 packing 中關聯該 dp041 的 dp043 rows (使用 globalDeleteDetailRow 以便記錄 deletedKeys)
    const packingRows = safeDetailStates.packing?.rows;
    if (Array.isArray(packingRows) && globalDeleteDetailRow) {
      packingRows.forEach(r => {
        if (r.dp041gkey === rowKey) {
          globalDeleteDetailRow('packing', r.gkey);
        }
      });
    }
  };

  const columns = [
    {
      title: '序號',
      dataIndex: 'serialno',
      width: 70,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <InputNumber
            size="small"
            value={val}
            style={{ width: '100%' }}
            onChange={v => onCellChange(record.gkey, 'serialno', v || 1)}
          />
        ) : val
      )
    },
    {
      title: '樣品類別',
      dataIndex: 'dp002gkey',
      width: 130,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <ERPLookupField
            size="small"
            type="dp002"
            value={val}
            onChange={(v, rec) => {
              onCellChange(record.gkey, 'dp002gkey', v);
              if (rec) {
                onCellChange(record.gkey, 'esampletype', rec.samplename || rec.sampletype || '');
              }
            }}
          />
        ) : (record.esampletype || val || '-')
      )
    },
    { title: '樣品單號', dataIndex: 'sample_no', width: 130, render: (v, r) => v || r.sampleno || '-' },
    { title: '品牌', dataIndex: 'brand_name', width: 100, render: (v, r) => v || r.brand_name || '-' },
    {
      title: '款式 (Style)',
      dataIndex: 'styleno',
      width: 120,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'styleno', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '型體名稱',
      dataIndex: 'stylename',
      width: 130,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'stylename', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '庫存編號',
      dataIndex: 'stock',
      width: 120,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'stock', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '開發單號',
      dataIndex: 'devorderno',
      width: 120,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'devorderno', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: 'Ref.No',
      dataIndex: 'dprefno',
      width: 120,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'dprefno', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '配色 (Color)',
      dataIndex: 'color',
      width: 120,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'color', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '顏色描述',
      dataIndex: 'description',
      width: 150,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'description', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '材料配比',
      dataIndex: 'material',
      width: 180,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'material', e.target.value)}
          />
        ) : val
      )
    },
    { title: '大底 (Outsole)', dataIndex: 'bottom', width: 120, render: (v) => v || '-' },
    { title: '尺碼 (Size)', dataIndex: 'size', width: 80 },
    { title: '需求雙數', dataIndex: 'req_custpairs', width: 90, align: 'right', render: (v, r) => r.req_custpairs || r.custpairs || '0' },
    {
      title: '本次出貨 (Pairs)',
      dataIndex: 'sentpairs',
      width: 120,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <InputNumber
            size="small"
            min={0.1}
            precision={2}
            value={val}
            style={{ width: '100%' }}
            onChange={v => {
              const numVal = v || 0;
              onCellChange(record.gkey, 'sentpairs', numVal);
              onCellChange(record.gkey, 'amount', numVal * (record.price || 0));
            }}
          />
        ) : val
      )
    },
    {
      title: '單位',
      dataIndex: 'unit',
      width: 80,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val || 'PRS'}
            onChange={e => onCellChange(record.gkey, 'unit', e.target.value)}
          />
        ) : (val || 'PRS')
      )
    },
    {
      title: '單價 (Price)',
      dataIndex: 'price',
      width: 120,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <InputNumber
            size="small"
            min={0}
            precision={4}
            value={val}
            style={{ width: '100%' }}
            onChange={v => {
              const numVal = v || 0;
              onCellChange(record.gkey, 'price', numVal);
              onCellChange(record.gkey, 'amount', (record.sentpairs || 0) * numVal);
            }}
          />
        ) : val
      )
    },
    {
      title: '金額 (Amount)',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (val, record) => {
        const calculated = (record.sentpairs || 0) * (record.price || 0);
        return calculated.toFixed(4);
      }
    },
    {
      title: '收費標記',
      dataIndex: 'charge',
      width: 100,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Select
            size="small"
            value={val || '2'}
            style={{ width: '100%' }}
            onChange={v => onCellChange(record.gkey, 'charge', v)}
          >
            <Select.Option value="1">1-收費</Select.Option>
            <Select.Option value="2">2-免費</Select.Option>
            <Select.Option value="3">3-其他</Select.Option>
          </Select>
        ) : (
          val === '1' ? '1-收費' : val === '3' ? '3-其他' : '2-免費'
        )
      )
    },
    {
      title: '收件人',
      dataIndex: 'consignee',
      width: 120,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'consignee', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '備註 (Remark)',
      dataIndex: 'remark',
      width: 150,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'remark', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '圖檔路徑',
      dataIndex: 'photopath',
      width: 180,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => {
              const pathVal = e.target.value;
              onCellChange(record.gkey, 'photopath', pathVal);
              window.dispatchEvent(new CustomEvent('dp040-sample-focused', {
                detail: { photopath: pathVal }
              }));
            }}
          />
        ) : val
      )
    },
    {
      title: '操作',
      width: 70,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        isEditing ? (
          <Popconfirm title="確定要刪除此出貨項目及相關裝箱明細嗎？" onConfirm={() => handleDelete(record.gkey)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        ) : null
      )
    }
  ];

  return (
    <div className="dp040-sample-tab" style={{ gap: '8px' }}>
      <div style={{ textAlign: 'right' }}>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleOpenImport}
          disabled={!isEditing}
        >
          轉入待出貨樣品
        </Button>
      </div>

      <Table
        size="small"
        loading={loading}
        dataSource={safeRows}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        scroll={{ x: 2200, y: 350 }}
        onRow={(record) => ({
          onClick: () => {
            window.dispatchEvent(new CustomEvent('dp040-sample-focused', {
              detail: { photopath: record.photopath }
            }));
          }
        })}
      />

      <Dp040ImportSampleModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onImport={handleImport}
        customerGkey={activeRecord?.ba010gkey}
        existingDp033Keys={safeRows.map(r => r.dp033gkey)}
      />
    </div>
  );
}

