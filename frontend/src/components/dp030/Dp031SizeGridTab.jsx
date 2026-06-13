import React from 'react';
import { Table, Input, InputNumber, Button, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

export default function Dp031SizeGridTab({ rows, isEditing, onCellChange, onAddRow, onDeleteRow, replaceDetailRows }) {
  
  const updateColorCell = (gkey, field, val) => {
    onCellChange(gkey, field, val);
  };

  const deleteColorRow = (gkey) => {
    onDeleteRow(gkey);
  };

  const addColorRow = () => {
    onAddRow({ color: '', details_dp033: [] });
  };

  // ----- Dp033 Size Nested Grid Logic -----
  const addSizeRow = (colorRow) => {
    const newSizes = [...(colorRow.details_dp033 || [])];
    const maxSn = newSizes.reduce((m, item) => Math.max(m, item.serialno || 0), 0);
    newSizes.push({
      gkey: `temp_${Date.now()}_${Math.random()}`,
      serialno: maxSn + 1,
      size: '', custpairs: 0, keeppairs: 0, sentpairs: 0, finishpairs: 0
    });
    onCellChange(colorRow.gkey, 'details_dp033', newSizes);
  };

  const deleteSizeRow = (colorRow, sizeIndex) => {
    const newSizes = [...(colorRow.details_dp033 || [])];
    const sizeObj = newSizes[sizeIndex];
    if (sizeObj && !sizeObj.gkey.startsWith('temp_')) {
      // Must track deleted sizes so deep_save payload can have delete: [...] for dp033
      // We can store them in a deleted_dp033 array inside the colorRow
      const deletedArr = [...(colorRow.deleted_dp033 || []), sizeObj.gkey];
      onCellChange(colorRow.gkey, 'deleted_dp033', deletedArr);
    }
    newSizes.splice(sizeIndex, 1);
    onCellChange(colorRow.gkey, 'details_dp033', newSizes);
  };

  const updateSizeCell = (colorRow, sizeIndex, field, val) => {
    const newSizes = [...(colorRow.details_dp033 || [])];
    newSizes[sizeIndex] = { ...newSizes[sizeIndex], [field]: val };
    onCellChange(colorRow.gkey, 'details_dp033', newSizes);
  };

  const colorColumns = [
    { title: '顏色名稱 / 代號', dataIndex: 'color', width: 160, render: (v, r) => <Input size="small" disabled={!isEditing} value={v} onChange={e => updateColorCell(r.gkey, 'color', e.target.value)} /> },
    { title: '顏色代碼', dataIndex: 'colorcode', width: 110, render: (v, r) => <Input size="small" disabled={!isEditing} value={v} onChange={e => updateColorCell(r.gkey, 'colorcode', e.target.value)} /> },
    { title: '面部摘要', dataIndex: 'upper', render: (v, r) => <Input size="small" disabled={!isEditing} value={v} onChange={e => updateColorCell(r.gkey, 'upper', e.target.value)} /> },
    { title: '裡部摘要', dataIndex: 'lining', render: (v, r) => <Input size="small" disabled={!isEditing} value={v} onChange={e => updateColorCell(r.gkey, 'lining', e.target.value)} /> },
    { title: '墊腳摘要', dataIndex: 'sock', render: (v, r) => <Input size="small" disabled={!isEditing} value={v} onChange={e => updateColorCell(r.gkey, 'sock', e.target.value)} /> },
    { title: '大底摘要', dataIndex: 'bottom', render: (v, r) => <Input size="small" disabled={!isEditing} value={v} onChange={e => updateColorCell(r.gkey, 'bottom', e.target.value)} /> },
    { title: '', width: 50, render: (_, r) => <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={!isEditing} onClick={() => deleteColorRow(r.gkey)} /> }
  ];

  const sizeExpandedRowRender = (colorRow) => {
    const sizesData = colorRow.details_dp033 || [];
    const nestedCols = [
      { title: 'NO', dataIndex: 'serialno', width: 60 },
      { title: '尺碼 (Size)', dataIndex: 'size', width: 120, render: (v, r, idx) => <Input size="small" disabled={!isEditing} value={v} onChange={e => updateSizeCell(colorRow, idx, 'size', e.target.value)} /> },
      { title: '客戶打樣雙數', dataIndex: 'custpairs', width: 130, render: (v, r, idx) => <InputNumber size="small" disabled={!isEditing} min={0} value={v} onChange={val => updateSizeCell(colorRow, idx, 'custpairs', val || 0)} style={{ width: '100%' }} /> },
      { title: '工廠留樣雙數', dataIndex: 'keeppairs', width: 130, render: (v, r, idx) => <InputNumber size="small" disabled={!isEditing} min={0} value={v} onChange={val => updateSizeCell(colorRow, idx, 'keeppairs', val || 0)} style={{ width: '100%' }} /> },
      { title: '實際寄出雙數', dataIndex: 'sentpairs', width: 130, render: (v, r, idx) => <InputNumber size="small" disabled={!isEditing} min={0} value={v} onChange={val => updateSizeCell(colorRow, idx, 'sentpairs', val || 0)} style={{ width: '100%' }} /> },
      { title: '工廠完成雙數', dataIndex: 'finishpairs', width: 130, render: (v, r, idx) => <InputNumber size="small" disabled={!isEditing} min={0} value={v} onChange={val => updateSizeCell(colorRow, idx, 'finishpairs', val || 0)} style={{ width: '100%' }} /> },
      { title: '生產追蹤備註說明', dataIndex: 'scheduleremark', render: (v, r, idx) => <Input size="small" disabled={!isEditing} value={v} onChange={e => updateSizeCell(colorRow, idx, 'scheduleremark', e.target.value)} /> },
      { title: '', width: 50, render: (_, r, idx) => <Button size="small" disabled={!isEditing} type="text" danger icon={<DeleteOutlined />} onClick={() => deleteSizeRow(colorRow, idx)} /> }
    ];

    return (
      <div style={{ background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px dashed #d9d9d9', margin: '4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <span style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '12px' }}>📏 尺碼配比分佈明細 (Size Runner) for {colorRow.color || '未命名'}</span>
          <Button size="small" type="primary" ghost disabled={!isEditing} icon={<PlusOutlined />} onClick={() => addSizeRow(colorRow)}>新增打樣尺碼</Button>
        </div>
        <Table dataSource={sizesData} columns={nestedCols} size="small" rowKey="gkey" pagination={false} bordered />
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 8, textAlign: 'right' }}>
        <Button size="small" type="primary" disabled={!isEditing} icon={<PlusOutlined />} onClick={addColorRow}>新增配色</Button>
      </div>
      <Table 
        size="small" 
        dataSource={rows} 
        columns={colorColumns} 
        rowKey="gkey" 
        pagination={false} 
        bordered
        expandable={{
          expandedRowRender: sizeExpandedRowRender,
          defaultExpandAllRows: true
        }}
      />
    </div>
  );
}

export const validateDp031Rows = (rows) => {
  const errors = [];
  if (!rows || rows.length === 0) {
    errors.push(new Error('樣品明細配色至少需要一筆資料 (Dp031)'));
    return errors;
  }
  
  rows.forEach((row, i) => {
    if (!row.color) {
      errors.push(new Error(`第 ${i+1} 筆配色名稱不能為空`));
    }
    const sizes = row.details_dp033 || [];
    if (sizes.length === 0) {
      errors.push(new Error(`第 ${i+1} 筆配色 (${row.color || '未命名'}) 至少需要一筆尺碼數量`));
    }
    sizes.forEach((sz, j) => {
      if (sz.custpairs < 0 || sz.keeppairs < 0 || sz.sentpairs < 0 || sz.finishpairs < 0) {
        errors.push(new Error(`第 ${i+1} 筆配色之第 ${j+1} 筆尺碼，數量不能為負`));
      }
    });
  });
  return errors;
};
