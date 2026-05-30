import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Table, Button, Input, InputNumber, Select, message, Popconfirm, Badge } from 'antd';
import { PlusOutlined, DeleteOutlined, AlertOutlined } from '@ant-design/icons';

export default function Dp040PackingTab({
  rows, // This represents dp043 (packing allocation) rows
  isEditing,
  loading,
  onCellChange,
  onAddRow,
  onDeleteRow,
  activeRecord,
  detailStates,
  globalDeleteDetailRow,
  globalUpdateDetailRow,
  globalAddDetailRow
}) {
  const [selectedCartonKey, setSelectedCartonKey] = useState(null);

  const safeRows = Array.isArray(rows) ? rows : [];
  const safeDetailStates = detailStates || {};

  // Extract cartons and samples rows
  const cartonsRows = useMemo(() => safeDetailStates.cartons?.rows || [], [safeDetailStates.cartons?.rows]);
  const samplesRows = useMemo(() => safeDetailStates.samples?.rows || [], [safeDetailStates.samples?.rows]);

  // Automatically select the first carton when list loads or is updated
  useEffect(() => {
    if (cartonsRows.length > 0 && !selectedCartonKey) {
      Promise.resolve().then(() => {
        setSelectedCartonKey(cartonsRows[0].gkey);
      });
    } else if (cartonsRows.length === 0 && selectedCartonKey) {
      Promise.resolve().then(() => {
        setSelectedCartonKey(null);
      });
    }
  }, [cartonsRows, selectedCartonKey]);


  // DP042 (Cartons) handlers
  const handleAddCarton = () => {
    const tempKey = `temp_42_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newCartonNum = String(cartonsRows.length + 1);
    
    const newCarton = {
      gkey: tempKey,
      dp040gkey: activeRecord?.gkey,
      carton: newCartonNum,
      grossweight: 0,
      netweight: 0,
      unit: 'KGS'
    };
    
    if (globalAddDetailRow) {
      globalAddDetailRow('cartons', newCarton);
      setSelectedCartonKey(tempKey);
    }
  };

  const handleUpdateCarton = (cartonKey, field, val) => {
    if (globalUpdateDetailRow) {
      globalUpdateDetailRow('cartons', cartonKey, field, val);
    }
  };

  const handleDeleteCarton = (cartonKey) => {
    if (globalDeleteDetailRow) {
      // 1. 刪除箱號
      globalDeleteDetailRow('cartons', cartonKey);
      
      // 2. 同步刪除所有關聯該箱的裝箱分配行
      safeRows.forEach(p => {
        if (p.dp042gkey === cartonKey) {
          globalDeleteDetailRow('packing', p.gkey);
        }
      });

      const remainingCartons = cartonsRows.filter(c => c.gkey !== cartonKey);
      if (selectedCartonKey === cartonKey) {
        setSelectedCartonKey(remainingCartons.length > 0 ? remainingCartons[0].gkey : null);
      }
    }
  };

  // DP043 (Packing Allocation) handlers
  const handleAddPacking = () => {
    if (!selectedCartonKey) {
      message.warning('請先新增或選擇一個箱號！');
      return;
    }
    const tempKey = `temp_43_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newPacking = {
      gkey: tempKey,
      dp040gkey: activeRecord?.gkey,
      dp042gkey: selectedCartonKey,
      dp041gkey: '',
      styleno: '',
      size: '',
      qty: 0,
      unit: 'PRS',
      price: 0,
      amount: 0,
      description: '',
      material: '',
      ctnsize: '',
      consignee: '',
      remark: ''
    };
    if (onAddRow) {
      onAddRow(newPacking);
    }
  };

  const handleSelectSample = (rowKey, sampleGkey, row) => {
    const sample = samplesRows.find(s => s.gkey === sampleGkey);
    if (sample && onCellChange) {
      onCellChange(rowKey, 'dp041gkey', sampleGkey);
      onCellChange(rowKey, 'styleno', sample.styleno || '');
      onCellChange(rowKey, 'size', sample.size || '');
      onCellChange(rowKey, 'price', sample.price || 0);
      onCellChange(rowKey, 'unit', sample.unit || 'PRS');
      onCellChange(rowKey, 'description', sample.description || '');
      onCellChange(rowKey, 'material', sample.material || '');
      onCellChange(rowKey, 'consignee', sample.consignee || '');
      onCellChange(rowKey, 'amount', (row.qty || 0) * (sample.price || 0));
    }
  };

  // Cumulative allocation helper
  const getSampleAllocatedQty = (sampleGkey, currentPackingKey, inputVal = 0) => {
    const otherAllocated = safeRows
      .filter(p => p.dp041gkey === sampleGkey && p.gkey !== currentPackingKey)
      .reduce((sum, p) => sum + parseFloat(p.qty || 0), 0);
    return otherAllocated + inputVal;
  };

  // Columns definition
  const cartonsColumns = [
    {
      title: '箱號',
      dataIndex: 'carton',
      width: 80,
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val}
            onChange={e => handleUpdateCarton(record.gkey, 'carton', e.target.value)}
          />
        ) : val
      )
    },
    {
      title: '淨重 (N.W)',
      dataIndex: 'netweight',
      width: 100,
      render: (val, record) => (
        isEditing ? (
          <InputNumber
            size="small"
            precision={2}
            value={val}
            style={{ width: '100%' }}
            onChange={v => handleUpdateCarton(record.gkey, 'netweight', v || 0)}
          />
        ) : val
      )
    },
    {
      title: '毛重 (G.W)',
      dataIndex: 'grossweight',
      width: 100,
      render: (val, record) => (
        isEditing ? (
          <InputNumber
            size="small"
            precision={2}
            value={val}
            style={{ width: '100%' }}
            onChange={v => handleUpdateCarton(record.gkey, 'grossweight', v || 0)}
          />
        ) : val
      )
    },
    {
      title: '重量單位',
      dataIndex: 'unit',
      width: 90,
      render: (val, record) => (
        isEditing ? (
          <Input
            size="small"
            value={val || 'KGS'}
            onChange={e => handleUpdateCarton(record.gkey, 'unit', e.target.value)}
          />
        ) : (val || 'KGS')
      )
    },
    {
      title: '操作',
      width: 60,
      align: 'center',
      render: (_, record) => (
        isEditing ? (
          <Popconfirm title="刪除箱號將同步刪除該箱內所有樣品分配，確定嗎？" onConfirm={() => handleDeleteCarton(record.gkey)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        ) : null
      )
    }
  ];

  const packingFilteredRows = safeRows.filter(r => r.dp042gkey === selectedCartonKey);

  const packingColumns = [
    {
      title: '出貨樣品項目 (Item Link)',
      dataIndex: 'dp041gkey',
      width: 250,
      render: (val, record) => (
        isEditing ? (
          <Select
            size="small"
            showSearch
            style={{ width: '100%' }}
            value={val || undefined}
            onChange={v => handleSelectSample(record.gkey, v, record)}
            placeholder="請選擇出貨明細樣品..."
            options={samplesRows.map(s => ({
              value: s.gkey,
              label: `[${s.sample_no || s.sampleno || '新項目'}] ${s.styleno} 配色:${s.color} 碼:${s.size} (寄:${s.sentpairs})`
            }))}
          />
        ) : (
          (() => {
            const match = samplesRows.find(s => s.gkey === val);
            return match ? `[${match.sample_no || match.sampleno}] ${match.styleno} (尺碼:${match.size})` : '未選擇';
          })()
        )
      )
    },
    { title: '型體 Style', dataIndex: 'styleno', width: 110 },
    { title: '顏色描述', dataIndex: 'description', width: 120, render: (v) => v || '-' },
    { title: '材料配比', dataIndex: 'material', width: 140, render: (v) => v || '-' },
    { title: '尺碼 Size', dataIndex: 'size', width: 80 },
    {
      title: '箱規 (CtnSize)',
      dataIndex: 'ctnsize',
      width: 110,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'ctnsize', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '裝箱數量 (Qty)',
      dataIndex: 'qty',
      width: 110,
      render: (val, record) => {
        const sample = samplesRows.find(s => s.gkey === record.dp041gkey);
        const limitPairs = sample ? parseFloat(sample.sentpairs || 0) : 0;
        const currentSum = getSampleAllocatedQty(record.dp041gkey, record.gkey, val || 0);
        const isOver = currentSum > limitPairs;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isEditing && onCellChange ? (
              <InputNumber
                size="small"
                min={0.1}
                precision={2}
                value={val}
                style={{ width: '100%' }}
                onChange={v => {
                  const numVal = v || 0;
                  onCellChange(record.gkey, 'qty', numVal);
                  onCellChange(record.gkey, 'amount', numVal * (record.price || 0));
                }}
              />
            ) : val}
            {isOver && (
              <Badge count={<AlertOutlined style={{ color: '#ff4d4f' }} />} title={`警告：此樣品寄出 ${limitPairs} 雙，但所有箱內累計分配已達 ${currentSum} 雙！`} />
            )}
          </div>
        );
      }
    },
    { title: '單位', dataIndex: 'unit', width: 70, render: (v) => v || 'PRS' },
    { title: '單價', dataIndex: 'price', width: 90, align: 'right', render: (v) => (v ? parseFloat(v).toFixed(4) : '0.0000') },
    {
      title: '金額',
      dataIndex: 'amount',
      width: 100,
      align: 'right',
      render: (val, record) => {
        const calculated = (record.qty || 0) * (record.price || 0);
        return calculated.toFixed(4);
      }
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
        ) : val || '-'
      )
    },
    {
      title: '裝箱備註',
      dataIndex: 'remark',
      width: 150,
      render: (val, record) => (
        isEditing && onCellChange ? (
          <Input
            size="small"
            value={val}
            onChange={e => onCellChange(record.gkey, 'remark', e.target.value)}
          />
        ) : val || '-'
      )
    },
    {
      title: '操作',
      width: 60,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        isEditing && onDeleteRow ? (
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onDeleteRow(record.gkey)} />
        ) : null
      )
    }
  ];

  return (
    <div className="dp040-packing-tab">
      {/* Left Carton List */}
      <div className="dp040-packing-left" style={{ width: '33%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <strong style={{ fontSize: '13px' }}>重量箱號維護 (DP042)</strong>
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddCarton}
            disabled={!isEditing}
          >
            新增箱號
          </Button>
        </div>
        <Table
          size="small"
          loading={loading}
          dataSource={cartonsRows}
          columns={cartonsColumns}
          rowKey="gkey"
          pagination={false}
          bordered
          scroll={{ y: 350 }}
          onRow={record => ({
            onClick: () => setSelectedCartonKey(record.gkey),
            style: {
              cursor: 'pointer',
              backgroundColor: selectedCartonKey === record.gkey ? '#e6f4ff' : 'transparent'
            }
          })}
        />
      </div>

      {/* Right Packing Allocations */}
      <div className="dp040-packing-right" style={{ width: '67%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <strong style={{ fontSize: '13px' }}>
            {selectedCartonKey 
              ? `箱號 [${cartonsRows.find(c => c.gkey === selectedCartonKey)?.carton || ''}] 分配明細 (DP043)` 
              : '裝箱分配明細 (DP043)'
            }
          </strong>
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddPacking}
            disabled={!isEditing || !selectedCartonKey}
          >
            新增分配
          </Button>
        </div>
        <Table
          size="small"
          loading={loading}
          dataSource={packingFilteredRows}
          columns={packingColumns}
          rowKey="gkey"
          pagination={false}
          bordered
          scroll={{ x: 1500, y: 350 }}
        />
      </div>
    </div>
  );
}

