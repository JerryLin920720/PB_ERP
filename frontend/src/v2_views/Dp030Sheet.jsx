/* eslint-disable react-refresh/only-export-components */
/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { Form, Row, Col, Input, Table, Button, Card, Select, Checkbox, Space, Popconfirm, Tabs, Radio } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

const { Option } = Select;
const { TabPane } = Tabs;

const Dp030Context = React.createContext(null);

function Dp030FormCapturer({ form, updateMasterField }) {
  const contextRef = React.useContext(Dp030Context);
  React.useEffect(() => {
    if (contextRef) {
      contextRef.current.form = form;
      contextRef.current.updateMasterField = updateMasterField;
    }
  }, [form, updateMasterField, contextRef]);
  return null;
}

// ── TAB 1: 配色與尺碼雙 GRID 連動元件 ────────────────────────────────────
function Dp030ColorsTab({
  rows = [],
  isEditing,
  onCellChange,
  onAddRow,
  onDeleteRow,
  activeRecord,
}) {
  console.log('Dp030ColorsTab rows:', rows);

  React.useEffect(() => {
    if (activeRecord) {
      const mappedDp031Rows = rows.map(row => ({
        ...row,
        upper: row.upper,
        lining: row.lining,
        sock: row.sock,
        bottom: row.bottom,
        heel: row.heel,
        tongue: row.tongue,
        ornament: row.ornament,
        other: row.other,
        totalpairs: row.totalpairs,
        pono: row.pono,
      }));
      console.log("[DP030 DEBUG] loaded record:", activeRecord);
      console.log("[DP031 DEBUG] raw dp031 rows:", rows);
      console.log("[DP031 DEBUG] mapped dp031 rows:", mappedDp031Rows);
    }
  }, [activeRecord, rows]);

  const [selectedColorKey, setSelectedColorKey] = useState(null);

  // Derived selected color key to avoid setting state synchronously in an effect
  const activeColorKey = (selectedColorKey && rows.some(r => r.gkey === selectedColorKey))
    ? selectedColorKey
    : (rows[0]?.gkey || null);

  const selectedColorRow = rows.find(r => r.gkey === activeColorKey);
  const sizeRows = selectedColorRow?.details_dp033 || [];

  const handleAddColor = () => {
    const tempKey = `temp_d_${Date.now()}`;
    onAddRow({
      gkey: tempKey,
      colorcode: '',
      color: '',
      ecolor: '',
      styleno: activeRecord?.styleno || '',
      pono: '',
      photopath: '',
      pic: 'N',
      status: '1',
      totalpairs: 0,
      details_dp033: [],
      _sizes_deleted: []
    });
    setSelectedColorKey(tempKey);
  };

  const handleSizeCellChange = (sizeRowKey, field, val) => {
    const updatedSizes = sizeRows.map(sz => {
      const pk = sz.gkey || sz.id || sz.serialno;
      if (pk === sizeRowKey) {
        return { ...sz, [field]: val };
      }
      return sz;
    });
    onCellChange(activeColorKey, 'details_dp033', updatedSizes);
  };

  const handleAddSize = () => {
    if (!activeColorKey) return;
    const tempSizeKey = `temp_sz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newSize = {
      gkey: tempSizeKey,
      size: '',
      custpairs: 0,
      keeppairs: 0,
      sentpairs: 0,
      receive: 0,
      finishpairs: 0,
      barcode: ''
    };
    onCellChange(activeColorKey, 'details_dp033', [...sizeRows, newSize]);
  };

  const handleDeleteSize = (sizeRowKey) => {
    if (!activeColorKey) return;
    const updatedSizes = sizeRows.filter(sz => {
      const pk = sz.gkey || sz.id || sz.serialno;
      return pk !== sizeRowKey;
    });
    onCellChange(activeColorKey, 'details_dp033', updatedSizes);

    if (selectedColorRow && !String(sizeRowKey).startsWith('temp_')) {
      const deletedList = [...(selectedColorRow._sizes_deleted || [])];
      if (!deletedList.includes(sizeRowKey)) {
        deletedList.push(sizeRowKey);
        onCellChange(activeColorKey, '_sizes_deleted', deletedList);
      }
    }
  };

  // ── dp031 配色 Grid 欄位 (PB 對齊順序) ──
  const colorColumns = [
    {
      title: <span title="PB: NO">序號</span>,
      dataIndex: 'serialno',
      width: 50,
      align: 'center',
      render: (val, _, idx) => val || (idx + 1)
    },
    {
      title: <span title="PB: Status">狀態</span>,
      dataIndex: 'status',
      width: 100,
      render: (val, record) => isEditing ? (
        <Select value={val} onChange={v => onCellChange(record.gkey, 'status', v)} style={{ width: '100%' }}>
          <Option value="1">1-進行中</Option>
          <Option value="2">2-已寄出</Option>
          <Option value="3">3-已完成</Option>
          <Option value="0">0-取消</Option>
        </Select>
      ) : (
        val === '1' ? '1-進行中' : val === '2' ? '2-已寄出' : val === '3' ? '3-已完成' : val === '0' ? '0-取消' : val
      )
    },
    {
      title: <span title="PB: StyleNo">型體編號</span>,
      dataIndex: 'styleno',
      width: 120,
      render: (val) => <span>{val || activeRecord?.styleno || '-'}</span>
    },
    {
      title: <span title="PB: ColorCode">顏色代號</span>,
      dataIndex: 'colorcode',
      width: 100,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'colorcode', e.target.value)} />
      ) : val
    },
    {
      title: <span title="PB: Color">中文顏色</span>,
      dataIndex: 'color',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'color', e.target.value)} />
      ) : val
    },
    {
      title: <span title="PB: EColor">英文顏色</span>,
      dataIndex: 'ecolor',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'ecolor', e.target.value)} />
      ) : val
    },
    {
      title: <span title="PB: Upper MTL">面材</span>,
      dataIndex: 'upper',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'upper', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: Lining MTL">裡材</span>,
      dataIndex: 'lining',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'lining', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: Sock MTL">墊腳</span>,
      dataIndex: 'sock',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'sock', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: Outsole MTL">大底</span>,
      dataIndex: 'bottom',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'bottom', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: Heel MTL">跟材</span>,
      dataIndex: 'heel',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'heel', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: Tongue MTL">舌片</span>,
      dataIndex: 'tongue',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'tongue', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: Ornament">飾品</span>,
      dataIndex: 'ornament',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'ornament', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: Other">其他</span>,
      dataIndex: 'other',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'other', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: TotalPairs">總雙數</span>,
      dataIndex: 'totalpairs',
      width: 90,
      align: 'right',
      render: (val) => <span style={{ fontWeight: 'bold' }}>{val || 0}</span>
    },
    {
      title: <span title="PB: PONo">PONo</span>,
      dataIndex: 'pono',
      width: 120,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'pono', e.target.value)} />
      ) : (val || '-')
    },
    {
      title: <span title="PB: Show PIC">顯示圖片</span>,
      dataIndex: 'pic',
      width: 90,
      align: 'center',
      render: (val, record) => isEditing ? (
        <Select value={val || 'N'} onChange={v => onCellChange(record.gkey, 'pic', v)} style={{ width: '100%' }}>
          <Option value="Y">Y</Option>
          <Option value="N">N</Option>
        </Select>
      ) : (
        <span style={{ color: val === 'Y' ? '#52c41a' : '#bbb' }}>{val || 'N'}</span>
      )
    },
    {
      title: <span title="PB: Photopath">圖檔路徑</span>,
      dataIndex: 'photopath',
      width: 160,
      render: (val, record) => isEditing ? (
        <Input
          value={val}
          placeholder="圖檔路徑"
          onChange={e => onCellChange(record.gkey, 'photopath', e.target.value)}
        />
      ) : (val ? <span style={{ fontSize: '11px', color: '#1890ff' }}>{val}</span> : '-')
    },
  ];

  if (isEditing) {
    colorColumns.push({
      title: '刪除',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDeleteRow(record.gkey)}
        />
      )
    });
  }

  const totalWidth = colorColumns.reduce((sum, col) => sum + (col.width || 0), 0);

  // ── dp033 尺碼 Grid 欄位 (PB 對齊順序: NO / Size / CustPairs / KeepPairs / Barcode)
  // sentpairs / receive / finishpairs 在 PB 中為隱藏欄位，不顯示
  const sizeColumns = [
    {
      title: <span title="PB: NO">序號</span>,
      dataIndex: 'serialno',
      width: 50,
      align: 'center',
      render: (val, _, idx) => val || (idx + 1)
    },
    {
      title: <span title="PB: Size">尺碼</span>,
      dataIndex: 'size',
      width: 100,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => handleSizeCellChange(record.gkey || record.id || record.serialno, 'size', e.target.value)} />
      ) : val
    },
    {
      title: <span title="PB: CustPairs">客戶雙數</span>,
      dataIndex: 'custpairs',
      width: 100,
      align: 'right',
      render: (val, record) => isEditing ? (
        <Input
          type="number"
          value={val}
          onChange={e => handleSizeCellChange(record.gkey || record.id || record.serialno, 'custpairs', parseFloat(e.target.value) || 0)}
        />
      ) : val
    },
    {
      title: <span title="PB: KeepPairs">留樣雙數</span>,
      dataIndex: 'keeppairs',
      width: 100,
      align: 'right',
      render: (val, record) => isEditing ? (
        <Input
          type="number"
          value={val}
          onChange={e => handleSizeCellChange(record.gkey || record.id || record.serialno, 'keeppairs', parseFloat(e.target.value) || 0)}
        />
      ) : val
    },
    {
      title: <span title="PB: Barcode">條碼</span>,
      dataIndex: 'barcode',
      width: 160,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => handleSizeCellChange(record.gkey || record.id || record.serialno, 'barcode', e.target.value)} />
      ) : val
    }
  ];
  // ※ sentpairs / receive / finishpairs 保留在 data model 中但不顯示（PB 原畫面為隱藏欄位）

  if (isEditing) {
    sizeColumns.push({
      title: '刪除',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteSize(record.gkey || record.id || record.serialno)}
        />
      )
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
      {/* 上半部：配色明細 dp031 */}
      <Card
        size="small"
        title="1. 配色明細 (dp031) — 點選資料列以查看尺碼配比"
        extra={isEditing && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddColor}>
            新增配色
          </Button>
        )}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          size="small"
          dataSource={rows}
          columns={colorColumns}
          rowKey="gkey"
          pagination={false}
          bordered
          scroll={{ x: totalWidth }}
          onRow={(record) => ({
            onClick: () => setSelectedColorKey(record.gkey),
          })}
          rowClassName={(record) => record.gkey === activeColorKey ? 'row-active' : ''}
        />
      </Card>

      {/* 下半部：尺碼配比明細 dp033 */}
      <Card
        size="small"
        title={selectedColorRow
          ? `2. 尺碼明細 (dp033) — 顏色: [${selectedColorRow.colorcode || '?'}] ${selectedColorRow.color || ''}`
          : '2. 尺碼明細 (dp033)'}
        extra={isEditing && activeColorKey && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddSize}>
            新增尺碼
          </Button>
        )}
        bodyStyle={{ padding: 0 }}
      >
        {activeColorKey ? (
          <Table
            size="small"
            dataSource={sizeRows}
            columns={sizeColumns}
            rowKey={(r) => r.gkey || r.id || r.serialno}
            pagination={false}
            bordered
          />
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
            請點選上方配色以設定尺碼配比
          </div>
        )}
      </Card>
    </div>
  );
}


// ── TAB 3: 備註與修改紀錄頁籤 (拆分) ──────────────────────────────────────
function Dp030TextareaTab({
  activeRecord = {},
  isEditing,
  fieldName,
  label,
}) {
  const contextRef = React.useContext(Dp030Context);
  const [text, setText] = React.useState('');

  React.useEffect(() => {
    setText(activeRecord?.[fieldName] || '');
  }, [activeRecord?.gkey, activeRecord?.[fieldName], fieldName]);

  const handleChange = (e) => {
    const nextValue = e.target.value;
    setText(nextValue);

    if (contextRef?.current?.updateMasterField) {
      contextRef.current.updateMasterField(fieldName, nextValue);
    }

    if (contextRef?.current?.form) {
      contextRef.current.form.setFieldsValue({
        [fieldName]: nextValue,
      });
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <Input.TextArea
        rows={12}
        value={text}
        disabled={!isEditing}
        onChange={handleChange}
        placeholder={`請輸入${label}`}
        style={{ width: '100%', resize: 'vertical' }}
      />
    </div>
  );
}

function Dp030RemarkTab(props) {
  return (
    <Dp030TextareaTab
      {...props}
      fieldName="remark"
      label="備註"
    />
  );
}

function Dp030ReviseMemoTab(props) {
  return (
    <Dp030TextareaTab
      {...props}
      fieldName="revisememo"
      label="修改紀錄"
    />
  );
}



// ── TAB 2: 部位材料 BOM 元件 ──────────────────────────────────────────
// PB 欄位順序: NO / Parts(中) / Parts(英) / [Color1# → MaterialNo1 → Pantone1 → SupplierNo1] × 4 / 加工方式 / 單位 / 用量 / 損耗%
function Dp030MaterialsTab({
  rows = [],
  isEditing,
  onCellChange,
  onAddRow,
  onDeleteRow,
  detailStates,
}) {
  const [partGroups, setPartGroups] = React.useState([]);

  React.useEffect(() => {
    axios.get('/api/dp005/')
      .then(res => {
        if (Array.isArray(res.data)) {
          setPartGroups(res.data);
        }
      })
      .catch(err => console.error('Failed to load part groups:', err));
  }, []);

  const colors = detailStates.colors?.rows || [];
  const activeColors = colors.slice(0, 4);

  const handleAddPart = () => {
    onAddRow({
      gkey: `temp_d_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      parts: '',
      eparts: '',
      makedescription: '',
      unit: 'PRS',
      qprp: 1.0,
      loss: 0.0,
      dp005gkey: null,
      dp006gkey: null,
      costing: '0',
    });
  };

  // 定義固定左側欄位
  const columns = [
    {
      title: <span title="PB: NO">序號</span>,
      dataIndex: 'serialno',
      width: 50,
      align: 'center',
      fixed: 'left',
      render: (val, _, idx) => val || (idx + 1)
    },
    {
      title: <span title="PB: Parts">部位 (中)</span>,
      dataIndex: 'parts',
      width: 130,
      fixed: 'left',
      render: (val, record) => isEditing ? (
        <ERPLookupField
          type="dp006"
          value={record.dp006gkey}
          onChange={(v, obj) => {
            onCellChange(record.gkey, 'dp006gkey', v);
            onCellChange(record.gkey, 'parts', obj?.parts || '');
            onCellChange(record.gkey, 'eparts', obj?.eparts || '');
            onCellChange(record.gkey, 'dp005gkey', obj?.dp005gkey || null);
          }}
        />
      ) : val
    },
    {
      title: <span title="PB: Parts">部位 (英)</span>,
      dataIndex: 'eparts',
      width: 130,
      fixed: 'left',
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'eparts', e.target.value)} />
      ) : val
    },
  ];

  // 動態平鋪 4 組配色通道 — PB 順序：Color1# → MaterialNo1 → Pantone1 → SupplierNo1 → Supplier1
  for (let idx = 0; idx < 4; idx++) {
    const channelNum = idx + 1;
    const colorRow = activeColors[idx];
    const colorLabel = colorRow
      ? `配色${channelNum}: [${colorRow.colorcode || '?'}] ${colorRow.color || ''}`
      : `配色${channelNum} (未設定)`;

    columns.push({
      title: colorLabel,
      children: [
        {
          title: <span title={`PB: Color${channelNum}#`}>{`Color${channelNum}#`}</span>,
          dataIndex: `clrcode${channelNum}`,
          width: 140,
          render: (val, record) => isEditing ? (
            <ERPLookupField
              type="mr010"
              value={record[`mr010gkey${channelNum}`]}
              onChange={(v, obj) => {
                onCellChange(record.gkey, `mr010gkey${channelNum}`, v);
                onCellChange(record.gkey, `clrcode${channelNum}`, obj?.colorcode || '');
                onCellChange(record.gkey, `clrnm${channelNum}`, obj?.clrnm || '');
                onCellChange(record.gkey, `clrenm${channelNum}`, obj?.clrenm || '');
              }}
            />
          ) : (
            val ? `[${val}] ${record[`clrnm${channelNum}`] || ''}` : (record[`clrnm${channelNum}`] || '-')
          )
        },
        {
          title: <span title={`PB: MaterialNo${channelNum}`}>{`MaterialNo${channelNum}`}</span>,
          dataIndex: `mstkno${channelNum}`,
          width: 220,
          render: (val, record) => isEditing ? (
            <ERPLookupField
              type="mr035"
              value={record[`mr035gkey${channelNum}`]}
              onChange={(v, obj) => {
                onCellChange(record.gkey, `mr035gkey${channelNum}`, v);
                onCellChange(record.gkey, `mstkno${channelNum}`, obj?.mstkno || '');
                onCellChange(record.gkey, `cmaterial${channelNum}`, obj?.cmaterial || '');
                onCellChange(record.gkey, `ematerial${channelNum}`, obj?.ematerial || '');
              }}
            />
          ) : (
            val ? `[${val}] ${record[`cmaterial${channelNum}`] || ''}` : (record[`cmaterial${channelNum}`] || '-')
          )
        },
        {
          title: <span title={`PB: Pantone${channelNum}`}>{`Pantone${channelNum}`}</span>,
          dataIndex: `pantone${channelNum}`,
          width: 90,
          render: (val, record) => isEditing ? (
            <Input value={val} onChange={e => onCellChange(record.gkey, `pantone${channelNum}`, e.target.value)} />
          ) : (val || '-')
        },
        {
          title: <span title={`PB: SupplierNo${channelNum}`}>{`SupplierNo${channelNum}`}</span>,
          dataIndex: `supplierno${channelNum}`,
          width: 120,
          render: (val, record) => isEditing ? (
            <ERPLookupField
              type="ba015"
              value={record[`ba015gkey${channelNum}`]}
              onChange={(v, obj) => {
                onCellChange(record.gkey, `ba015gkey${channelNum}`, v);
                onCellChange(record.gkey, `supplierno${channelNum}`, obj?.factno || '');
                onCellChange(record.gkey, `shortname${channelNum}`, obj?.shortname || '');
              }}
            />
          ) : (val || '-')
        },
        {
          title: <span title={`PB: Supplier${channelNum}`}>{`Supplier${channelNum}`}</span>,
          dataIndex: `shortname${channelNum}`,
          width: 130,
          render: (val, record) => isEditing ? (
            <Input value={val} disabled style={{ color: '#000', backgroundColor: '#f5f5f5' }} />
          ) : (val || '-')
        },
      ]
    });
  }

  // 右側固定欄位
  columns.push(
    {
      title: <span title="PB: 加工方式">加工方式</span>,
      dataIndex: 'makedescription',
      width: 130,
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'makedescription', e.target.value)} />
      ) : val
    },
    {
      title: <span title="PB: 單位">單位</span>,
      dataIndex: 'unit',
      width: 80,
      align: 'center',
      render: (val, record) => isEditing ? (
        <Input value={val} onChange={e => onCellChange(record.gkey, 'unit', e.target.value)} />
      ) : val
    },
    {
      title: <span title="PB: 用量/每雙">用量/每雙</span>,
      dataIndex: 'qprp',
      width: 100,
      align: 'right',
      render: (val, record) => isEditing ? (
        <Input type="number" step="0.00001" value={val} onChange={e => onCellChange(record.gkey, 'qprp', parseFloat(e.target.value) || 0)} />
      ) : val
    },
    {
      title: <span title="PB: 損耗%">損耗%</span>,
      dataIndex: 'loss',
      width: 100,
      align: 'right',
      render: (val, record) => isEditing ? (
        <Input type="number" step="0.01" value={val} onChange={e => onCellChange(record.gkey, 'loss', parseFloat(e.target.value) || 0)} />
      ) : val
    },
    {
      title: <span title="PB: costing">是否計價</span>,
      dataIndex: 'costing',
      width: 95,
      align: 'center',
      render: (val, record) => isEditing ? (
        <Checkbox
          checked={val === '1'}
          onChange={e => onCellChange(record.gkey, 'costing', e.target.checked ? '1' : '0')}
        />
      ) : (
        <Checkbox checked={val === '1'} disabled />
      )
    },
    {
      title: <span title="PB: Group">Group</span>,
      dataIndex: 'dp005gkey',
      width: 200,
      render: (val, record) => {
        const found = partGroups.find(g => g.gkey === val);
        const displayName = found 
          ? `${found.partgroup || ''} (${found.epartgroup || ''})` 
          : (record.partgroup_name || val || '');
        return isEditing ? (
          <Input value={displayName} disabled style={{ color: '#000', backgroundColor: '#f5f5f5' }} />
        ) : (
          <span>{displayName}</span>
        );
      }
    }
  );

  // 操作欄位
  if (isEditing) {
    columns.push({
      title: '刪除',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDeleteRow(record.gkey)}
        />
      )
    });
  }

  const totalWidth = columns.reduce((sum, col) => {
    if (col.children) {
      return sum + col.children.reduce((s, child) => s + (child.width || 0), 0);
    }
    return sum + (col.width || 0);
  }, 0);

  return (
    <div style={{ padding: '4px' }}>
      <div style={{ marginBottom: '8px', textAlign: 'right' }}>
        {isEditing && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddPart}>
            新增部位列
          </Button>
        )}
      </div>
      <Table
        size="small"
        dataSource={rows}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        scroll={{ x: totalWidth, y: 'calc(100vh - 400px)' }}
      />
    </div>
  );
}


// ── WORKBENCH DEFINITION ──────────────────────────────────────────────
const RawDp030Sheet = createRecordWorkbenchSheet({
  sheetId: 'dp030',
  title: '樣品單資料管理',
  breadcrumb: ['開發管理', '樣品單資料管理'],

  mainClassName: 'dp030-main-scroll',
  layout: {
    contentScroll: true,
    contentHeight: 'calc(100vh - 150px)',
  },
  api: {
    listUrl: '/api/dp030/',
    deepSaveUrl: '/api/dp030/deep_save/',
    deleteUrl: '/api/dp030/',
  },

  masterKey: 'gkey',

  fieldLabels: {
    sampleno: '樣品單號',
    year: '年度',
    styleno: '型體編號',
    stylename: '型體名稱',
    status: '樣品狀態',
  },

  sidebar: {
    title: '樣品單清單',
    getDisplayText: (row) => `[${row.sampleno || '?'}] ${row.styleno || ''}`,
  },

  createDefaultRecord: (tempKey) => {
    return {
      gkey: tempKey,
      sampleno: '自動產生',
      year: String(new Date().getFullYear()),
      issuedate: new Date().toISOString().substring(0, 10),
      styleno: '',
      stylename: '',
      stock: '',
      size: '',
      logo: '',
      construction: '',
      packing: '',
      status: '1',
      charge: 'N',
      cost: 'N',
      approve: 'N',
      versions: '1',
      amount: 0.0,
      remark: '',
      ba055gkey: null,
      ba010gkey: null,
      ba015gkey: null,
      dp002gkey: null,
      dp003gkey: null,
      dp004gkey: null,
      dp010gkey: null,
      dp015gkey: null,
      dp020gkey: null,
      dp023gkey: null,
      agentgkey: null,
    };
  },

  query: {
    buildParams: (values) => {
      const params = { ...values };
      if (params.status) {
        if (params.status.includes('all')) {
          delete params.status;
        } else if (Array.isArray(params.status)) {
          params.status = params.status.join(',');
        }
      }
      return params;
    }
  },

  list: {
    columns: [
      { title: <span title="PB: SampleNo">樣品單號</span>, dataIndex: 'sampleno', width: 140, fixed: 'left', sorter: (a,b) => (a.sampleno||'').localeCompare(b.sampleno||'') },
      { title: <span title="PB: SampleType">樣品類別</span>, dataIndex: 'dp002_code', width: 100 },
      { title: <span title="PB: IssueDate">建單日期</span>, dataIndex: 'issuedate', width: 100, align: 'center', render: (v) => v ? v.substring(0, 10) : '' },
      { title: <span title="PB: StyleNo">型體編號</span>, dataIndex: 'styleno', width: 130 },
      { title: <span title="PB: StyleName">型體名稱</span>, dataIndex: 'stylename', width: 160 },
      { title: <span title="PB: Brand">品牌</span>, dataIndex: 'ba009_brand', width: 120 },
      { title: <span title="PB: Stock#">型體庫存號 / 模具號</span>, dataIndex: 'stock', width: 150 },
      { title: <span title="PB: Cust">客戶</span>, dataIndex: 'ba010_shortname', width: 120 },
      { title: <span title="PB: FTY">工廠</span>, dataIndex: 'ba015_shortname', width: 120 },
      { title: <span title="PB: LastNo">楦頭編號</span>, dataIndex: 'dp010_lastno', width: 120 },
      { title: <span title="PB: OutsoleNo">大底編號</span>, dataIndex: 'dp015_bottomno', width: 120 },
      { title: <span title="PB: HeelNo">鞋跟編號</span>, dataIndex: 'dp020_heelno', width: 120 },
      { title: <span title="PB: Size">尺碼範圍</span>, dataIndex: 'size', width: 100 },
      { title: <span title="PB: RqstBy">要樣者</span>, dataIndex: 'rqstby', width: 100 },
      { title: <span title="PB: Designer">設計師</span>, dataIndex: 'designer', width: 100 }
    ]
  },

  validateMasterRow: (values) => {
    const isNew = !values.gkey || String(values.gkey).startsWith('temp_');
    if (isNew) {
      if (!values.year || !values.year.trim()) {
        throw new Error('年度 為必填');
      }
      if (!values.ba055gkey) {
        throw new Error('季節 為必選以自動產生樣品單號');
      }
    } else {
      if (!values.sampleno || !values.sampleno.trim() || values.sampleno === '自動產生') {
        throw new Error('樣品單號 為必填');
      }
    }
    if (!values.styleno || !values.styleno.trim()) {
      throw new Error('型體編號 為必填');
    }
    if (!values.issuedate) {
      throw new Error('建單日期 為必填');
    }
    if (!values.ba010gkey) {
      throw new Error('客戶 為必選');
    }
    if (!values.ba015gkey) {
      throw new Error('工廠 為必選');
    }
  },

  validateAll: () => {},

  buildDeepSavePayload: (latestMaster, detailStates) => {
    const cleanMaster = { ...latestMaster };
    const readonly_fields = [
      'ba010_shortname', 'ba015_shortname', 'ba010_custno', 'ba015_factno',
      'es101_englishname', 'es101_englishname1', 'es101_englishname2',
      'dp010_lastno', 'dp015_bottomno', 'dp020_heelno', 'dp023_groupname',
      'ba009_brand', 'ba003_origin', 'dp008_label',
      'mes101_englishname', 'aes101_englishname', 'aba060_code', 'agent_shortname'
    ];
    readonly_fields.forEach(f => delete cleanMaster[f]);

    // Force UPPERCASE on style code
    if (cleanMaster.styleno) {
      cleanMaster.styleno = cleanMaster.styleno.toUpperCase().trim();
    }
    if (cleanMaster.sampleno) {
      cleanMaster.sampleno = cleanMaster.sampleno.toUpperCase().trim();
    }

    if (cleanMaster.gkey && String(cleanMaster.gkey).startsWith('temp_')) {
      delete cleanMaster.gkey;
    }

    // Process Color details (nesting Sizes details)
    const colorsUpsert = [];
    const colorsDelete = detailStates.colors?.deletedKeys || [];

    (detailStates.colors?.rows || []).forEach(colorRow => {
      const isNew = String(colorRow.gkey).startsWith('temp_');
      const isDirty = !!detailStates.colors.dirtyRows[colorRow.gkey];

      // If either color row is modified, or if nested sizes are modified/deleted, we upsert this color row
      if (isNew || isDirty || colorRow.details_dp033?.length > 0 || colorRow._sizes_deleted?.length > 0) {
        const cleanColor = { ...colorRow };
        cleanColor.styleno = cleanMaster.styleno || '';
        const rawSizes = cleanColor.details_dp033 || [];
        const deletedSizes = cleanColor._sizes_deleted || [];

        cleanColor.details_dp033 = {
          upsert: rawSizes.map(sz => {
            const cleanSz = { ...sz };
            if (String(cleanSz.gkey).startsWith('temp_')) {
              delete cleanSz.gkey;
            }
            delete cleanSz.serialno;
            return cleanSz;
          }),
          delete: deletedSizes
        };

        delete cleanColor._sizes_deleted;
        if (isNew) {
          delete cleanColor.gkey;
        }
        delete cleanColor.serialno;

        colorsUpsert.push(cleanColor);
      }
    });

    // Process Materials (flattened structure, no sub-nesting needed)
    const materialsUpsert = (detailStates.materials?.rows || [])
      .filter(r => String(r.gkey).startsWith('temp_') || detailStates.materials.dirtyRows[r.gkey])
      .map(r => {
        const cleanRow = { ...r };
        if (String(cleanRow.gkey).startsWith('temp_')) {
          delete cleanRow.gkey;
        }
        delete cleanRow.serialno;
        
        // Strip out read-only display helper fields
        for (let i = 1; i <= 4; i++) {
          delete cleanRow[`clrcode${i}`];
          delete cleanRow[`mstkno${i}`];
          delete cleanRow[`supplierno${i}`];
          delete cleanRow[`shortname${i}`];
        }
        delete cleanRow.partgroup_name;

        return cleanRow;
      });
    const materialsDelete = detailStates.materials?.deletedKeys || [];

    return {
      master: cleanMaster,
      dp031: {
        upsert: colorsUpsert,
        delete: colorsDelete
      },
      dp032: {
        upsert: materialsUpsert,
        delete: materialsDelete
      }
    };
  },

  detailTabs: [
    {
      key: 'colors',
      title: '配色與尺碼明細 (dp031/dp033)',
      parentKey: 'dp030gkey',
      apiUrl: '/api/dp031/',
      renderer: Dp030ColorsTab,
    },
    {
      key: 'materials',
      title: '部位材料 BOM 明細 (dp032)',
      parentKey: 'dp030gkey',
      apiUrl: '/api/dp032/',
      renderer: Dp030MaterialsTab,
    },
    {
      key: 'remark',
      title: '備註',
      renderer: Dp030RemarkTab,
    },
    {
      key: 'revisememo',
      title: '修改紀錄',
      renderer: Dp030ReviseMemoTab,
    }
  ],

  // ── Query Panel ────────────────────────────────────────────────────────
  // PB 原始查詢欄位對照 (d_dp030_query_where.srd):
  // IssueDate(起/迄) / Year / Season / status1~statust Checkbox群組 / SampleNo / Group
  // StyleNo / StyleName / Stock# / LastNo / OutsoleNo / HeelNo / Cust / FTY / Approve
  renderQueryForm: ({ form }) => {
    const handleStatusGroupChange = (checkedList) => {
      const isAllCheckedBefore = form.getFieldValue('status')?.includes('all');
      const isAllCheckedNow = checkedList.includes('all');
      
      let nextList = checkedList;
      if (!isAllCheckedBefore && isAllCheckedNow) {
        // "全部" was checked: check everything
        nextList = ['1', '2', '3', '0', 'all'];
      } else if (isAllCheckedBefore && !isAllCheckedNow) {
        // "全部" was unchecked: uncheck everything
        nextList = [];
      } else {
        // One of the other checkboxes was toggled
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
      <Row gutter={16}>
        {/* 左側與中間：18 個高密度查詢條件 */}
        <Col span={18}>
          {/* Row 1 */}
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="sampleno" label="樣品單號" tooltip="SampleNo">
                <Input placeholder="樣品單號 (模糊)" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="year" label="年度" tooltip="Year">
                <Input placeholder="年度" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ba055gkey" label="季節" tooltip="Season">
                <ERPLookupField type="ba055" placeholder="季節" allowClear />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 2 */}
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="styleno" label="型體編號" tooltip="StyleNo">
                <Input placeholder="型體編號 (模糊)" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stylename" label="型體名稱" tooltip="StyleName">
                <Input placeholder="型體名稱 (模糊)" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stock" label="型體庫存號 / 模具號" tooltip="Stock#">
                <Input placeholder="庫存號 / 模具號 (模糊)" allowClear />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3 */}
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="dp002gkey" label="樣品類別" tooltip="SampleType">
                <ERPLookupField type="dp002" placeholder="樣品類別" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ba009gkey" label="品牌" tooltip="Brand">
                <ERPLookupField type="ba009" placeholder="品牌" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ba005gkey" label="歸屬" tooltip="BelongTo">
                <ERPLookupField type="ba005" placeholder="歸屬公司" allowClear />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4 */}
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="ba010gkey" label="客戶" tooltip="Cust">
                <ERPLookupField type="ba010" placeholder="客戶" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ba015gkey" label="工廠" tooltip="FTY">
                <ERPLookupField type="ba015" queryParams={{ type: '1' }} placeholder="工廠" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dp023gkey" label="研發組別" tooltip="Group">
                <ERPLookupField type="dp023" placeholder="研發組別" allowClear />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 5 */}
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="dp010gkey" label="楦頭編號" tooltip="LastNo">
                <ERPLookupField type="dp010" placeholder="楦頭" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dp015gkey" label="大底編號" tooltip="OutsoleNo">
                <ERPLookupField type="dp015" placeholder="大底" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dp020gkey" label="鞋跟編號" tooltip="HeelNo">
                <ERPLookupField type="dp020" placeholder="鞋跟" allowClear />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 6 */}
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="issuedate_from" label="建單日期 (起)" tooltip="IssueDate (From)">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="issuedate_to" label="建單日期 (迄)" tooltip="IssueDate (To)">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="es101gkey" label="製單人 / 建單人" tooltip="Maker">
                <ERPLookupField type="es101" placeholder="製單人 (Maker)" allowClear />
              </Form.Item>
            </Col>
          </Row>
        </Col>

        {/* 右側：狀態控制面板 (審核與樣品狀態) */}
        <Col span={6}>
          <div className="erp-rw-query-right-panel" style={{ height: 'auto', padding: '6px 10px' }}>
            <div className="erp-rw-query-right-panel-title" style={{ marginBottom: '4px' }}>審核狀態</div>
            <Form.Item name="approve" initialValue="" style={{ marginBottom: '8px' }}>
              <Radio.Group size="small">
                <Space direction="horizontal" size={12}>
                  <Radio value="">全部</Radio>
                  <Radio value="Y">已審核</Radio>
                  <Radio value="N">未審核</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <div className="erp-rw-query-right-panel-title" style={{ marginBottom: '4px', marginTop: '4px' }}>樣品狀態</div>
            <Form.Item name="status" initialValue={['1']} style={{ marginBottom: 0 }}>
              <Checkbox.Group style={{ width: '100%' }} onChange={handleStatusGroupChange}>
                <Space direction="vertical" size={2}>
                  <Space direction="horizontal" size={8}>
                    <Checkbox value="1">進行中</Checkbox>
                    <Checkbox value="2">已寄出</Checkbox>
                    <Checkbox value="3">已完成</Checkbox>
                  </Space>
                  <Space direction="horizontal" size={8}>
                    <Checkbox value="0">取消</Checkbox>
                    <Checkbox value="all">全部</Checkbox>
                  </Space>
                </Space>
              </Checkbox.Group>
            </Form.Item>
          </div>
        </Col>
      </Row>
    );
  },

  // ── Master Form ─────────────────────────────────────────────────────────
  // PB 原始排版 (d_dp030_master.srd Y 座標順序):
  // Row 1: SampleType / SampleNo / Year / Cust(代號+簡稱) / FTY(代號+簡稱) / Season / Agent / Brand / RqstBy
  // Row 2: StyleNo / StyleName / IssueDate / Stock# / ShoeType / DueDate / Gender / Size / CustDate / Group / Logo / BelongTo
  // Row 3: LastNo / OutsoleNo / SockLabel / Origin / Packing / HeelNo / Status / Revise / ReviseDate / Construction / Charge / Currency / Amount / Designer / Manager / Approve / Maker / Remark
  renderMasterForm: ({ form, isEditing, activeRecord, updateMasterField }) => {
    return (
      <div
        className="dp030-master-form"
        style={{
          height: 'auto',
          overflow: 'visible',
          padding: '4px 12px 16px 0',
        }}
      >
        <Dp030FormCapturer form={form} updateMasterField={updateMasterField} />
        {/* Top block: Left 3 rows (5 fields each) + Right Image (spans 3 rows) */}
        <Row gutter={16}>
          {/* Left Fields Area */}
          <Col span={19}>
            {/* Row 1: 樣品類別 / 樣品單號 / 年度 / 季節 / 品牌 */}
            <Row gutter={8}>
              <Col span={5}>
                <Form.Item name="dp002gkey" label="樣品類別" tooltip="SampleType">
                  <ERPLookupField type="dp002" placeholder="樣品類別" />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="sampleno" label="樣品單號" tooltip="SampleNo">
                  <Input
                    disabled={true}
                    placeholder="儲存後自動產生"
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="year" label="年度" tooltip="Year" rules={[{ required: true, message: '年度 必填' }]}>
                  <Input placeholder="YYYY" />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="ba055gkey" label="季節" tooltip="Season" rules={[{ required: true, message: '季節 必選' }]}>
                  <ERPLookupField type="ba055" placeholder="季節" />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="ba009gkey" label="品牌" tooltip="Brand">
                  <ERPLookupField
                    type="ba009"
                    placeholder="品牌"
                    onChange={(val, selectedRow) => {
                      updateMasterField('ba009gkey', val);
                      form.setFieldsValue({ ba009_brand: selectedRow?.brand || '' });
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 2: 客戶 / 客戶簡稱 / 工廠 / 工廠簡稱 / 代理商 */}
            <Row gutter={8}>
              <Col span={5}>
                <Form.Item name="ba010gkey" label="客戶" tooltip="Cust" rules={[{ required: true, message: '客戶 必選' }]}>
                  <ERPLookupField
                    type="ba010"
                    placeholder="客戶"
                    onChange={(val, selectedRow) => {
                      updateMasterField('ba010gkey', val);
                      form.setFieldsValue({
                        ba010_shortname: selectedRow?.shortname || '',
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="ba010_shortname" label="客戶簡稱" tooltip="Cust Name">
                  <Input disabled placeholder="客戶簡稱" />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="ba015gkey" label="工廠" tooltip="FTY" rules={[{ required: true, message: '工廠 必選' }]}>
                  <ERPLookupField
                    type="ba015"
                    queryParams={{ type: '1' }}
                    placeholder="工廠"
                    onChange={(val, selectedRow) => {
                      updateMasterField('ba015gkey', val);
                      form.setFieldsValue({
                        ba015_shortname: selectedRow?.shortname || '',
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="ba015_shortname" label="工廠簡稱" tooltip="FTY Name">
                  <Input disabled placeholder="工廠簡稱" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="agentgkey" label="代理商" tooltip="Agent">
                  <ERPLookupField
                    type="ba010"
                    placeholder="代理商"
                    onChange={(val, selectedRow) => {
                      updateMasterField('agentgkey', val);
                      form.setFieldsValue({ agent_shortname: selectedRow?.shortname || '' });
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 3: 型體編號 / 型體名稱 / 客戶型體 / 鞋種類別 / 性別 */}
            <Row gutter={8}>
              <Col span={5}>
                <Form.Item name="styleno" label="型體編號" tooltip="StyleNo" rules={[{ required: true, message: '型體編號 必填' }]}>
                  <Input
                    maxLength={60}
                    placeholder="請輸入型體編號"
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      form.setFieldsValue({ styleno: val });
                      updateMasterField('styleno', val);
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="stylename" label="型體名稱" tooltip="StyleName">
                  <Input placeholder="型體名稱" />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="stock" label="客戶型體" tooltip="Stock#">
                  <Input placeholder="客戶型體" />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="dp003gkey" label="鞋種類別" tooltip="ShoeType">
                  <ERPLookupField type="dp003" placeholder="鞋種類別" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="dp004gkey" label="性別" tooltip="Gender">
                  <ERPLookupField type="dp004" placeholder="性別" />
                </Form.Item>
              </Col>
            </Row>
          </Col>

          {/* Right Preview Image Box */}
          <Col span={5}>
            <div style={{
              border: '1px solid #d9d9d9',
              borderRadius: '2px',
              backgroundColor: '#fafafa',
              height: '100%',
              minHeight: '136px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '4px',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: '11px', color: '#8c8c8c', fontWeight: 'bold' }}>樣品圖</span>
              {activeRecord?.photopath ? (
                <img
                  src={activeRecord.photopath}
                  alt="樣品圖"
                  style={{ maxWidth: '100%', maxHeight: '105px', objectFit: 'contain', marginTop: '4px' }}
                />
              ) : (
                <div style={{ fontSize: '28px', color: '#ccc', marginTop: '4px' }}>👟</div>
              )}
            </div>
          </Col>
        </Row>

        {/* Row 4: 代理商簡稱 / 尺碼範圍 / Logo / 製法/結構 / 包裝方式 / 訂單號 */}
        <Row gutter={8}>
         {/*  <Col span={4}>
            <Form.Item name="agent_shortname" label="代理商簡稱" tooltip="Agent Name">
              <Input disabled placeholder="代理商簡稱" />
            </Form.Item>
          </Col> */}
          <Col span={4}>
            <Form.Item name="size" label="尺碼範圍" tooltip="Size">
              <Input placeholder="尺碼範圍" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="logo" label="Logo" tooltip="Logo">
              <Input placeholder="Logo" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="construction" label="製法 / 結構" tooltip="Construction">
              <Input placeholder="製法 / 結構" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="packing" label="包裝方式" tooltip="Packing">
              <Input placeholder="包裝方式" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="orderno" label="訂單號 / PONo" tooltip="PONo">
              <Input placeholder="訂單號 / PONo" />
            </Form.Item>
          </Col>
        </Row>

        {/* Row 5: 樣品狀態 / 楦頭編號 / 大底編號 / 鞋跟編號 / 鞋墊標籤 / 產地 */}
        <Row gutter={8}>
          <Col span={4}>
            <Form.Item name="status" label="樣品狀態" tooltip="Status" rules={[{ required: true }]}>
              <Select placeholder="樣品狀態">
                <Option value="1">1-進行中</Option>
                <Option value="2">2-已寄出</Option>
                <Option value="3">3-已完成</Option>
                <Option value="0">0-取消</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="dp010gkey" label="楦頭編號" tooltip="LastNo">
              <ERPLookupField
                type="dp010"
                placeholder="楦頭"
                onChange={(val, selectedRow) => {
                  updateMasterField('dp010gkey', val);
                  form.setFieldsValue({ dp010_lastno: selectedRow?.lastno || '' });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="dp015gkey" label="大底編號" tooltip="OutsoleNo">
              <ERPLookupField
                type="dp015"
                placeholder="大底"
                onChange={(val, selectedRow) => {
                  updateMasterField('dp015gkey', val);
                  form.setFieldsValue({ dp015_bottomno: selectedRow?.bottomno || '' });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="dp020gkey" label="鞋跟編號" tooltip="HeelNo">
              <ERPLookupField
                type="dp020"
                placeholder="鞋跟"
                onChange={(val, selectedRow) => {
                  updateMasterField('dp020gkey', val);
                  form.setFieldsValue({ dp020_heelno: selectedRow?.heelno || '' });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="dp008gkey" label="鞋墊標籤" tooltip="SockLabel">
              <ERPLookupField
                type="dp008"
                placeholder="鞋墊標籤"
                onChange={(val, selectedRow) => {
                  updateMasterField('dp008gkey', val);
                  form.setFieldsValue({ dp008_label: selectedRow?.socklabel || '' });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="ba003gkey" label="產地" tooltip="Origin">
              <ERPLookupField
                type="ba003"
                placeholder="產地"
                onChange={(val, selectedRow) => {
                  updateMasterField('ba003gkey', val);
                  form.setFieldsValue({ ba003_origin: selectedRow?.origin || '' });
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Row 6: 歸屬公司 / 預計交期 / 要求交期 / 建單日期 / 修改次數 / 修改日期 */}
        <Row gutter={8}>
          <Col span={4}>
            <Form.Item name="ba005gkey" label="歸屬公司" tooltip="BelongTo">
              <ERPLookupField type="ba005" placeholder="歸屬公司" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="duedate" label="預計交期" tooltip="DueDate">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="custdate" label="要求交期" tooltip="CustDate">
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="issuedate" label="建單日期" tooltip="IssueDate" rules={[{ required: true, message: '建單日期 必填' }]}>
              <Input type="date" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="revise" label="修改次數" tooltip="Revise">
              <Input placeholder="修改次數" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="revisedate" label="修改日期" tooltip="ReviseDate">
              <Input type="date" />
            </Form.Item>
          </Col>
        </Row>

        {/* Row 7: 版本 / 申請人員 / 設計人員 / 研發主管 / 建單技術員 / 審核人員 */}
        <Row gutter={8}>
          <Col span={4}>
            <Form.Item name="versions" label="版本" tooltip="Version">
              <Input placeholder="版本" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="rqstby" label="要樣者" tooltip="RqstBy">
              <Input placeholder="要樣者" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="designer" label="設計師" tooltip="Designer">
              <Input placeholder="設計師" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="mes101gkey" label="經理" tooltip="Manager">
              <ERPLookupField
                type="es101"
                placeholder="經理"
                onChange={(val, selectedRow) => {
                  updateMasterField('mes101gkey', val);
                  form.setFieldsValue({ mes101_englishname: selectedRow?.englishname || '' });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="es101gkey" label="製單人" tooltip="Maker">
              <ERPLookupField
                type="es101"
                placeholder="製單人"
                onChange={(val, selectedRow) => {
                  updateMasterField('es101gkey', val);
                  form.setFieldsValue({ es101_englishname: selectedRow?.englishname || '' });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="aes101gkey" label="審核人員" tooltip="Approve">
              <ERPLookupField
                type="es101"
                placeholder="審核人員"
                onChange={(val, selectedRow) => {
                  updateMasterField('aes101gkey', val);
                  form.setFieldsValue({ aes101_englishname: selectedRow?.englishname || '' });
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Row 8: 已審核 / 收費 / 核成本 / 結算幣別 / 樣品金額 / 工資成本 / 管理費用 / 目標利潤 */}
        <Row gutter={8}>
          <Col span={2} style={{ display: 'flex', alignItems: 'center', paddingTop: 10 }}>
            <Form.Item
              name="approve"
              valuePropName="checked"
              getValueProps={(value) => ({ checked: value === 'Y' })}
              normalize={(value) => (value ? 'Y' : 'N')}
              tooltip="Approve"
              style={{ margin: 0 }}
            >
              <Checkbox disabled>已審核</Checkbox>
            </Form.Item>
          </Col>
          <Col span={2} style={{ display: 'flex', alignItems: 'center', paddingTop: 10 }}>
            <Form.Item
              name="charge"
              valuePropName="checked"
              getValueProps={(value) => ({ checked: value === 'Y' })}
              normalize={(value) => (value ? 'Y' : 'N')}
              tooltip="Charge"
              style={{ margin: 0 }}
            >
              <Checkbox>收費</Checkbox>
            </Form.Item>
          </Col>
          <Col span={2} style={{ display: 'flex', alignItems: 'center', paddingTop: 10 }}>
            <Form.Item
              name="cost"
              valuePropName="checked"
              getValueProps={(value) => ({ checked: value === 'Y' })}
              normalize={(value) => (value ? 'Y' : 'N')}
              tooltip="Cost"
              style={{ margin: 0 }}
            >
              <Checkbox>核成本</Checkbox>
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="aba060gkey" label="結算幣別" tooltip="Currency">
              <ERPLookupField
                type="ba060"
                placeholder="幣別"
                onChange={(val, selectedRow) => {
                  updateMasterField('aba060gkey', val);
                  form.setFieldsValue({ aba060_code: selectedRow?.currency || '' });
                }}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="amount" label="樣品金額" tooltip="Amount">
              <Input type="number" placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="wagescost" label="工資成本" tooltip="WagesCost">
              <Input type="number" placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col span={3}>
            <Form.Item name="managecost" label="管理費用" tooltip="ManageCost">
              <Input type="number" placeholder="0.00" />
            </Form.Item>
          </Col>
          <Col span={3}>
            <Form.Item name="profit" label="目標利潤" tooltip="Profit%">
              <Input type="number" placeholder="0.00" />
            </Form.Item>
          </Col>
        </Row>

        {/* Hidden fields to preserve remark and revisememo in form store */}
        <Form.Item name="remark" noStyle><Input type="hidden" /></Form.Item>
        <Form.Item name="revisememo" noStyle><Input type="hidden" /></Form.Item>
      </div>
    );
  }
});

export default function Dp030Sheet(props) {
  const contextRef = React.useRef({ form: null, updateMasterField: null });
  return (
    <Dp030Context.Provider value={contextRef}>
      <RawDp030Sheet {...props} />
    </Dp030Context.Provider>
  );
}
