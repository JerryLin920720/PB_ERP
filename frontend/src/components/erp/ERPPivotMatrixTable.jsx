import React from 'react';
import { Table, Input, InputNumber, Button, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

/**
 * ERPPivotMatrixTable
 * 通用 Pattern B Pivot Matrix Table UI 元件
 *
 * 專門處理「固定欄位 + 動態矩陣欄位 + 動作按鈕」的表格 UI 渲染與編輯互動。
 * 不寫死任何 Domain 資料欄位，完全透過 Props 組態化定義。
 */
export default function ERPPivotMatrixTable({
  rows = [],
  dynamicColumns = [],
  fixedColumns = [],
  rowKeyField = 'gkey',
  editable = false,
  readOnly = false,
  cellType = 'number', // 'number' | 'text' - 動態矩陣單元格的預設編輯元件
  onRowsChange,        // (newRows) => void
  onCellChange,        // (rowKey, field, value) => void
  onAddRow,            // () => void
  onDeleteRow,         // (rowKey) => void
  emptyText = '無資料',
  className = '',
  scroll = { x: 'max-content', y: 220 },
  loading = false,
  addRowText = '新增列',
  precision = 2,
  step = 0.01,
}) {
  const isEditing = editable && !readOnly;

  // 處理儲存格值異動並回呼
  const handleCellChange = (rowKey, field, value) => {
    if (onCellChange) {
      onCellChange(rowKey, field, value);
    }
    if (onRowsChange) {
      const nextRows = rows.map((r) => {
        if (r[rowKeyField] === rowKey) {
          return { ...r, [field]: value };
        }
        return r;
      });
      onRowsChange(nextRows);
    }
  };

  // 處理刪除列並回呼
  const handleDeleteRow = (rowKey) => {
    if (onDeleteRow) {
      onDeleteRow(rowKey);
    }
    if (onRowsChange) {
      const nextRows = rows.filter((r) => r[rowKeyField] !== rowKey);
      onRowsChange(nextRows);
    }
  };

  // 1. 建立固定欄位
  const tableColumns = fixedColumns.map((col) => ({
    title: col.title,
    dataIndex: col.dataIndex,
    key: col.dataIndex,
    width: col.width,
    align: col.align,
    fixed: col.fixed,
    render: (val, record) => {
      if (isEditing) {
        const fieldType = col.cellType || 'text';
        if (fieldType === 'number') {
          return (
            <InputNumber
              size="small"
              value={val ?? ''}
              step={col.step ?? 0.01}
              precision={col.precision}
              style={{ width: '100%' }}
              onChange={(v) => handleCellChange(record[rowKeyField], col.dataIndex, v)}
            />
          );
        } else {
          return (
            <Input
              size="small"
              value={val ?? ''}
              style={{ width: '100%' }}
              onChange={(e) => handleCellChange(record[rowKeyField], col.dataIndex, e.target.value)}
            />
          );
        }
      }
      return <span>{val ?? ''}</span>;
    },
  }));

  // 2. 建立動態矩陣欄位 (例如各個尺碼)
  dynamicColumns.forEach((sz) => {
    tableColumns.push({
      title: sz,
      dataIndex: sz,
      key: sz,
      width: 68,
      align: 'right',
      render: (val, record) => {
        if (isEditing) {
          if (cellType === 'number') {
            return (
              <InputNumber
                size="small"
                value={val ?? ''}
                precision={precision}
                step={step}
                style={{ width: '62px' }}
                onChange={(v) => handleCellChange(record[rowKeyField], sz, v)}
              />
            );
          } else {
            return (
              <Input
                size="small"
                value={val ?? ''}
                style={{ width: '100%' }}
                onChange={(e) => handleCellChange(record[rowKeyField], sz, e.target.value)}
              />
            );
          }
        }
        return (
          <span>
            {val != null && val !== '' ? (
              val
            ) : (
              <span style={{ color: '#ccc' }}>—</span>
            )}
          </span>
        );
      },
    });
  });

  // 3. 建立操作動作欄位
  if (isEditing && onDeleteRow) {
    tableColumns.push({
      title: '',
      key: 'action',
      width: 40,
      fixed: 'right',
      render: (_, record) => (
        <Button
          size="small"
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteRow(record[rowKeyField])}
        />
      ),
    });
  }

  const showWarning = !loading && dynamicColumns.length === 0;

  return (
    <div className={className} style={{ padding: '4px 0' }}>
      {showWarning && (
        <div style={{ color: '#999', marginBottom: 8, fontSize: 12 }}>
          ⚠️ 請先在主檔設定起碼 / 全半號 / 迄碼，以展開尺碼欄位。
        </div>
      )}

      <Spin spinning={loading}>
        <Table
          size="small"
          dataSource={rows}
          columns={tableColumns}
          rowKey={rowKeyField}
          pagination={false}
          bordered
          scroll={scroll}
          locale={{ emptyText }}
        />
      </Spin>

      {isEditing && dynamicColumns.length > 0 && onAddRow && (
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          style={{ marginTop: 6 }}
          onClick={onAddRow}
        >
          {addRowText}
        </Button>
      )}
    </div>
  );
}
