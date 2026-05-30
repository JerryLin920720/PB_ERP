import React, { useState, useEffect, useMemo } from 'react';
import { Table, Form, Input, Button, Select, Space, Row, Col, Card, Checkbox, InputNumber, Image, Radio, Tag, message, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';
import { calculateSizeRun } from '../utils/sizerun';

// ── Helper to calculate SizeRun string for Tab 1 ──────────────────────────────
const getSizerunDisplay = (row) => {
  if (!row) return '';
  const start = row.startsize;
  const end = row.endsize;
  const max = row.maxsize;
  const fh = row.fullhalf;
  const conn = fh === '1' ? '-' : (fh === '2' ? '＼' : '&');
  return `${start || ''}${conn}${max || end || ''}`;
};

// ── Helper to expand size objects for Costs ──────────────────────────────────
function expandSizesForCostRow(costRow, existingSizes = []) {
  const { startsize, fullhalf, endsize, maxsize } = costRow;
  if (startsize == null || fullhalf == null || endsize == null) {
    return [];
  }
  const sizeLabels = calculateSizeRun(startsize, fullhalf, endsize, maxsize);

  let serial = 1;
  return sizeLabels.map((sz) => {
    const existing = (existingSizes || []).find((s) => String(s.size) === String(sz));
    return {
      gkey: existing?.gkey || `temp_sz_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      dp015gkey: costRow.dp015gkey,
      dp016gkey: costRow.dp016gkey,
      dp017gkey: costRow.gkey,
      serialno: serial++,
      size: sz,
      cvalue: existing ? (parseFloat(existing.cvalue) || 0) : 0,
    };
  });
}

// ── Tab 1: 大底明細 molds / dp016 Custom Grid ──────────────────────────────
function Dp015MoldsTab({
  rows,
  isEditing,
  loading,
  onCellChange,
  onAddRow,
  onDeleteRow,
}) {
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    if (rows && rows.length > 0 && !selectedKey) {
      setSelectedKey(rows[0].gkey);
      window.dp015_selectedMoldGkey = rows[0].gkey;
    }
  }, [rows, selectedKey]);

  const handleRowClick = (record) => {
    setSelectedKey(record.gkey);
    window.dp015_selectedMoldGkey = record.gkey;
  };

  const handleCellChange = (rowKey, field, val) => {
    onCellChange(rowKey, field, val);
  };

  const columns = [
    {
      title: 'No',
      dataIndex: 'serialno',
      width: 50,
      align: 'center',
      fixed: 'left',
    },
    {
      title: '底廠',
      dataIndex: 'bmba015gkey',
      width: 140,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="ba015"
          queryParams={{ type: '2' }}
          value={val}
          size="small"
          onChange={(v, record) => {
            handleCellChange(r.gkey, 'bmba015gkey', v);
            handleCellChange(r.gkey, 'bottom_fty_name', record?.shortname || '');
            handleCellChange(r.gkey, 'bottom_fty_no', record?.factno || '');
          }}
        />
      ) : r.bottom_fty_name || val,
    },
    {
      title: '模具廠',
      dataIndex: 'mdba015gkey',
      width: 140,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="ba015"
          queryParams={{ type: '2' }}
          value={val}
          size="small"
          onChange={(v, record) => {
            handleCellChange(r.gkey, 'mdba015gkey', v);
            handleCellChange(r.gkey, 'mold_fty_name', record?.shortname || '');
            handleCellChange(r.gkey, 'mold_fty_no', record?.factno || '');
          }}
        />
      ) : r.mold_fty_name || val,
    },
    {
      title: '材料說明',
      dataIndex: 'material',
      width: 160,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="mr035"
          value={val}
          size="small"
          onChange={(v, record) => {
            handleCellChange(r.gkey, 'material', record?.material || v);
            handleCellChange(r.gkey, 'mr035gkey', record?.gkey || v);
          }}
        />
      ) : val,
    },
    {
      title: '搭配楦頭',
      dataIndex: 'dp010gkey',
      width: 140,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="dp010"
          value={val}
          size="small"
          onChange={(v, record) => {
            handleCellChange(r.gkey, 'dp010gkey', v);
            handleCellChange(r.gkey, 'last_no', record?.lastno || '');
          }}
        />
      ) : r.last_no || val,
    },
    {
      title: '基準碼',
      dataIndex: 'size',
      width: 80,
      render: (val, r) => isEditing ? (
        <Input
          value={val || ''}
          size="small"
          onChange={(e) => handleCellChange(r.gkey, 'size', e.target.value)}
        />
      ) : val,
    },
    {
      title: '起碼',
      dataIndex: 'startsize',
      width: 90,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="ba085"
          value={val}
          size="small"
          onChange={(v, record) => {
            if (record) {
              handleCellChange(r.gkey, 'startsize', record.startsize);
              handleCellChange(r.gkey, 'fullhalf', record.fullhalf);
              handleCellChange(r.gkey, 'endsize', record.endsize);
              handleCellChange(r.gkey, 'maxsize', record.maxsize);
            }
          }}
        />
      ) : val,
    },
    {
      title: '全半號',
      dataIndex: 'fullhalf',
      width: 80,
      render: (val, r) => isEditing ? (
        <Select
          value={val || '2'}
          size="small"
          options={[
            { value: '1', label: '全號 (-)' },
            { value: '2', label: '半號 (/)' },
            { value: '3', label: '連號 (&)' },
          ]}
          onChange={(v) => handleCellChange(r.gkey, 'fullhalf', v)}
        />
      ) : (val === '1' ? '全號' : val === '2' ? '半號' : val === '3' ? '連號' : val),
    },
    {
      title: '迄碼',
      dataIndex: 'endsize',
      width: 80,
      render: (val, r) => isEditing ? (
        <InputNumber
          value={val}
          size="small"
          onChange={(v) => handleCellChange(r.gkey, 'endsize', v)}
        />
      ) : val,
    },
    {
      title: '防呆碼',
      dataIndex: 'maxsize',
      width: 80,
      render: (val, r) => isEditing ? (
        <InputNumber
          value={val}
          size="small"
          onChange={(v) => handleCellChange(r.gkey, 'maxsize', v)}
        />
      ) : val,
    },
    {
      title: 'SizeRun(展開)',
      dataIndex: 'sizerun',
      width: 120,
      render: (_, r) => {
        const str = getSizerunDisplay(r);
        return <span style={{ color: '#096dd9', fontWeight: 'bold' }}>{str}</span>;
      },
    },
    {
      title: '開模費',
      dataIndex: 'moldcharge',
      width: 100,
      render: (val, r) => isEditing ? (
        <InputNumber
          value={val}
          size="small"
          onChange={(v) => handleCellChange(r.gkey, 'moldcharge', v)}
        />
      ) : val,
    },
    {
      title: '單價',
      dataIndex: 'price',
      width: 90,
      render: (val, r) => isEditing ? (
        <InputNumber
          value={val}
          size="small"
          onChange={(v) => handleCellChange(r.gkey, 'price', v)}
        />
      ) : val,
    },
    {
      title: '單價2',
      dataIndex: 'price1',
      width: 90,
      render: (val, r) => isEditing ? (
        <InputNumber
          value={val}
          size="small"
          onChange={(v) => handleCellChange(r.gkey, 'price1', v)}
        />
      ) : val,
    },
    {
      title: '單價3',
      dataIndex: 'price2',
      width: 90,
      render: (val, r) => isEditing ? (
        <InputNumber
          value={val}
          size="small"
          onChange={(v) => handleCellChange(r.gkey, 'price2', v)}
        />
      ) : val,
    },
    {
      title: '單價4',
      dataIndex: 'price3',
      width: 90,
      render: (val, r) => isEditing ? (
        <InputNumber
          value={val}
          size="small"
          onChange={(v) => handleCellChange(r.gkey, 'price3', v)}
        />
      ) : val,
    },
    {
      title: '性別',
      dataIndex: 'dp004gkey',
      width: 110,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="dp004"
          value={val}
          size="small"
          onChange={(v, record) => {
            handleCellChange(r.gkey, 'dp004gkey', v);
            handleCellChange(r.gkey, 'gender_name', record?.gender || '');
          }}
        />
      ) : r.gender_name || val,
    },
    {
      title: '量產廠',
      dataIndex: 'apba015gkey',
      width: 140,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="ba015"
          queryParams={{ type: '1', parentgkey: '' }}
          value={val}
          size="small"
          onChange={(v, record) => {
            handleCellChange(r.gkey, 'apba015gkey', v);
            handleCellChange(r.gkey, 'prod_fty_name', record?.shortname || '');
            handleCellChange(r.gkey, 'prod_fty_no', record?.factno || '');
          }}
        />
      ) : r.prod_fty_name || val,
    },
    {
      title: '配件裝配廠',
      dataIndex: 'asba015gkey',
      width: 140,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="ba015"
          queryParams={{ type: '2' }}
          value={val}
          size="small"
          onChange={(v, record) => {
            handleCellChange(r.gkey, 'asba015gkey', v);
            handleCellChange(r.gkey, 'assembly_fty_name', record?.shortname || '');
            handleCellChange(r.gkey, 'assembly_fty_no', record?.factno || '');
          }}
        />
      ) : r.assembly_fty_name || val,
    },
    {
      title: '試模OK',
      dataIndex: 'testmoldok',
      width: 100,
      render: (val, r) => isEditing ? (
        <Input
          value={val || ''}
          size="small"
          onChange={(e) => handleCellChange(r.gkey, 'testmoldok', e.target.value)}
        />
      ) : val,
    },
    {
      title: '工程圖OK',
      dataIndex: 'cfmphotook',
      width: 100,
      render: (val, r) => isEditing ? (
        <Input
          value={val || ''}
          size="small"
          onChange={(e) => handleCellChange(r.gkey, 'cfmphotook', e.target.value)}
        />
      ) : val,
    },
    ...(isEditing ? [
      {
        title: '',
        key: 'action',
        width: 50,
        fixed: 'right',
        align: 'center',
        render: (_, r) => (
          <Button
            danger
            size="small"
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => onDeleteRow(r.gkey)}
          />
        ),
      },
    ] : []),
  ];

  return (
    <div>
      <Table
        size="small"
        loading={loading}
        dataSource={rows || []}
        columns={columns}
        rowKey="gkey"
        pagination={false}
        bordered
        scroll={{ x: 2300, y: 150 }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          className: record.gkey === selectedKey ? 'row-active' : '',
        })}
      />
      {isEditing && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => {
            const serial = (rows || []).length + 1;
            onAddRow({
              serialno: serial,
              startsize: 5.0,
              fullhalf: '2',
              endsize: 10.0,
              price: 0,
              price1: 0,
              price2: 0,
              price3: 0,
              moldcharge: 0,
            });
          }}
          style={{ marginTop: 6 }}
        >
          新增配模明細
        </Button>
      )}
    </div>
  );
}

// ── Tab 2: 模具種類 costs + sizes Custom Side-by-Side Renderer ──────────────
function Dp015CostsAndSizesTab({
  rows,
  isEditing,
  loading,
  onCellChange,
  onAddRow,
  onDeleteRow,
  replaceDetailRows,
  activeRecord,
  detailStates,
}) {
  const [activeCostKey, setActiveCostKey] = useState(null);
  const [hasMerged, setHasMerged] = useState(false);

  const sizesLoaded = !detailStates.sizes?.loading;
  const costsLoaded = !loading;

  // ── Sync/Merge flat sizes state into costs.sizes nested array once loaded ──
  useEffect(() => {
    if (!activeRecord) {
      setHasMerged(false);
      return;
    }
    if (String(activeRecord.gkey).startsWith('temp_')) {
      setHasMerged(true);
      return;
    }

    if (sizesLoaded && costsLoaded && !hasMerged && rows && rows.length > 0) {
      const alreadyMerged = rows.some((r) => Array.isArray(r.sizes));
      if (!alreadyMerged) {
        const merged = rows.map((costRow) => {
          const costSizes = (detailStates.sizes?.rows || [])
            .filter((s) => s.dp017gkey === costRow.gkey || s.dp018_cost === costRow.gkey)
            .map((s) => ({ ...s }));
          return {
            ...costRow,
            sizes: costSizes,
          };
        });
        replaceDetailRows(merged);
        setHasMerged(true);
        if (merged.length > 0) {
          setActiveCostKey(merged[0].gkey);
        }
      }
    }
  }, [sizesLoaded, costsLoaded, rows, detailStates.sizes?.rows, hasMerged, activeRecord, replaceDetailRows]);

  // Reset merge trigger on active record changes
  useEffect(() => {
    setHasMerged(false);
    setActiveCostKey(null);
  }, [activeRecord?.gkey]);

  const activeCostRow = useMemo(() => {
    return (rows || []).find((c) => c.gkey === activeCostKey) || (rows || [])[0] || null;
  }, [rows, activeCostKey]);

  // Highlight cost row
  useEffect(() => {
    if (activeCostRow && !activeCostKey) {
      setActiveCostKey(activeCostRow.gkey);
    }
  }, [activeCostRow, activeCostKey]);

  const handleCostCellChange = (rowKey, field, val) => {
    const targetRow = (rows || []).find((r) => r.gkey === rowKey);
    if (!targetRow) return;

    const updatedRow = { ...targetRow, [field]: val };

    if (['startsize', 'fullhalf', 'endsize', 'maxsize'].includes(field)) {
      const nextSizes = expandSizesForCostRow(updatedRow, targetRow.sizes || []);
      updatedRow.sizes = nextSizes;
      const totalPairs = nextSizes.reduce((sum, s) => sum + (parseFloat(s.cvalue) || 0), 0);
      updatedRow.fcpairs = totalPairs;
      updatedRow.amount = totalPairs * (parseFloat(updatedRow.cost) || 0);
    } else if (field === 'cost') {
      updatedRow.amount = (parseFloat(updatedRow.fcpairs) || 0) * (parseFloat(val) || 0);
    }

    onCellChange(rowKey, 'startsize', updatedRow.startsize);
    onCellChange(rowKey, 'fullhalf', updatedRow.fullhalf);
    onCellChange(rowKey, 'endsize', updatedRow.endsize);
    onCellChange(rowKey, 'maxsize', updatedRow.maxsize);
    onCellChange(rowKey, 'cost', updatedRow.cost);
    onCellChange(rowKey, 'fcpairs', updatedRow.fcpairs);
    onCellChange(rowKey, 'amount', updatedRow.amount);
    onCellChange(rowKey, 'sizes', updatedRow.sizes);
  };

  const handleCostMoldChange = (rowKey, moldGkey) => {
    const molds = detailStates.molds?.rows || [];
    const activeMold = molds.find((m) => m.gkey === moldGkey);
    if (!activeMold) return;

    const targetRow = (rows || []).find((r) => r.gkey === rowKey);
    if (!targetRow) return;

    const updatedRow = {
      ...targetRow,
      dp016gkey: moldGkey,
      dp004gkey: activeMold.dp004gkey,
      gender_name: activeMold.gender_name,
      startsize: activeMold.startsize,
      fullhalf: activeMold.fullhalf,
      endsize: activeMold.endsize,
      maxsize: activeMold.maxsize,
    };

    const nextSizes = expandSizesForCostRow(updatedRow, targetRow.sizes || []);
    updatedRow.sizes = nextSizes;
    const totalPairs = nextSizes.reduce((sum, s) => sum + (parseFloat(s.cvalue) || 0), 0);
    updatedRow.fcpairs = totalPairs;
    updatedRow.amount = totalPairs * (parseFloat(updatedRow.cost) || 0);

    onCellChange(rowKey, 'dp016gkey', moldGkey);
    onCellChange(rowKey, 'dp004gkey', updatedRow.dp004gkey);
    onCellChange(rowKey, 'gender_name', updatedRow.gender_name);
    onCellChange(rowKey, 'startsize', updatedRow.startsize);
    onCellChange(rowKey, 'fullhalf', updatedRow.fullhalf);
    onCellChange(rowKey, 'endsize', updatedRow.endsize);
    onCellChange(rowKey, 'maxsize', updatedRow.maxsize);
    onCellChange(rowKey, 'fcpairs', updatedRow.fcpairs);
    onCellChange(rowKey, 'amount', updatedRow.amount);
    onCellChange(rowKey, 'sizes', updatedRow.sizes);
  };

  // Add Cost Row - Copy details from the currently selected mold row
  const handleAddCostRow = () => {
    const molds = detailStates.molds?.rows || [];
    if (!molds || molds.length === 0) {
      message.warning('請先新增大底明細 (Tab 1 molds)！');
      return;
    }

    const selectedMoldGkey = window.dp015_selectedMoldGkey;
    const activeMold = molds.find((m) => m.gkey === selectedMoldGkey) || molds[0];

    const tempCostKey = `temp_17_${Date.now()}`;
    const nextCost = {
      gkey: tempCostKey,
      serialno: (rows || []).length + 1,
      dp015gkey: activeRecord.gkey,
      dp016gkey: activeMold.gkey,
      moldtype: '',
      dp004gkey: activeMold.dp004gkey,
      gender_name: activeMold.gender_name,
      startsize: activeMold.startsize,
      fullhalf: activeMold.fullhalf,
      endsize: activeMold.endsize,
      maxsize: activeMold.maxsize,
      cost: 0,
      exrate: 1.0,
      fcpairs: 0,
      amount: 0,
    };

    const nextSizes = expandSizesForCostRow(nextCost, []);
    nextCost.sizes = nextSizes;

    onAddRow(nextCost);
    setActiveCostKey(tempCostKey);
  };

  // Right Grid: size cvalue changed
  const handleSizePairsChange = (sizeKey, val) => {
    if (!activeCostRow) return;
    const num = parseFloat(val) || 0;

    const nextSizes = (activeCostRow.sizes || []).map((s) => {
      if (s.gkey === sizeKey) {
        return { ...s, cvalue: num };
      }
      return s;
    });

    const totalPairs = nextSizes.reduce((sum, s) => sum + (parseFloat(s.cvalue) || 0), 0);
    const amountVal = totalPairs * (parseFloat(activeCostRow.cost) || 0);

    onCellChange(activeCostRow.gkey, 'sizes', nextSizes);
    onCellChange(activeCostRow.gkey, 'fcpairs', totalPairs);
    onCellChange(activeCostRow.gkey, 'amount', amountVal);
  };

  const costColumns = [
    { title: 'No', dataIndex: 'serialno', width: 50, align: 'center' },
    {
      title: '對應明細',
      dataIndex: 'dp016gkey',
      width: 120,
      render: (val, r) => {
        const molds = detailStates.molds?.rows || [];
        if (isEditing) {
          return (
            <Select
              className="editable-cell-pb"
              size="small"
              value={val}
              onChange={(newMoldGkey) => handleCostMoldChange(r.gkey, newMoldGkey)}
              options={molds.map((m) => ({
                value: m.gkey,
                label: `明細#${m.serialno}`,
              }))}
            />
          );
        }
        const m = molds.find((x) => x.gkey === val);
        return m ? `明細#${m.serialno}` : '-';
      },
    },
    {
      title: 'MoldType',
      dataIndex: 'moldtype',
      width: 85,
      render: (val, r) => isEditing ? (
        <Input
          className="editable-cell-pb"
          size="small"
          maxLength={1}
          value={val || ''}
          onChange={(e) => handleCostCellChange(r.gkey, 'moldtype', e.target.value.toUpperCase())}
        />
      ) : val,
    },
    {
      title: '性別',
      dataIndex: 'dp004gkey',
      width: 90,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="dp004"
          value={val}
          size="small"
          onChange={(v, record) => {
            onCellChange(r.gkey, 'dp004gkey', v);
            onCellChange(r.gkey, 'gender_name', record?.gender || '');
          }}
        />
      ) : r.gender_name || val,
    },
    {
      title: '分攤廠商',
      dataIndex: 'ba015gkey',
      width: 120,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="ba015"
          queryParams={{ type: '1', parentgkey: '' }}
          value={val}
          size="small"
          onChange={(v, record) => {
            onCellChange(r.gkey, 'ba015gkey', v);
            onCellChange(r.gkey, 'factory_name', record?.shortname || '');
            onCellChange(r.gkey, 'factory_no', record?.factno || '');
          }}
        />
      ) : r.factory_name || val,
    },
    {
      title: '幣別',
      dataIndex: 'ba060gkey',
      width: 80,
      render: (val, r) => isEditing ? (
        <ERPLookupField
          type="ba060"
          value={val}
          size="small"
          onChange={(v, record) => {
            onCellChange(r.gkey, 'ba060gkey', v);
            if (record) {
              onCellChange(r.gkey, 'exrate', record.exrate || 1.0);
              onCellChange(r.gkey, 'currency_name', record.currencyno || '');
            }
          }}
        />
      ) : r.currency_name || val,
    },
    {
      title: '匯率',
      dataIndex: 'exrate',
      width: 80,
      render: (val, r) => isEditing ? (
        <InputNumber
          className="editable-cell-pb"
          size="small"
          value={val}
          onChange={(v) => onCellChange(r.gkey, 'exrate', v)}
        />
      ) : val,
    },
    {
      title: '起碼',
      dataIndex: 'startsize',
      width: 80,
      render: (val, r) => isEditing ? (
        <InputNumber
          className="editable-cell-pb"
          size="small"
          value={val}
          onChange={(v) => handleCostCellChange(r.gkey, 'startsize', v)}
        />
      ) : val,
    },
    {
      title: '全半號',
      dataIndex: 'fullhalf',
      width: 80,
      render: (val, r) => isEditing ? (
        <Select
          className="editable-cell-pb"
          size="small"
          value={val || '2'}
          options={[
            { value: '1', label: '全號 (-)' },
            { value: '2', label: '半號 (/)' },
            { value: '3', label: '連號 (&)' },
          ]}
          onChange={(v) => handleCostCellChange(r.gkey, 'fullhalf', v)}
        />
      ) : (val === '1' ? '全' : val === '2' ? '半' : val === '3' ? '連' : val),
    },
    {
      title: '迄碼',
      dataIndex: 'endsize',
      width: 80,
      render: (val, r) => isEditing ? (
        <InputNumber
          className="editable-cell-pb"
          size="small"
          value={val}
          onChange={(v) => handleCostCellChange(r.gkey, 'endsize', v)}
        />
      ) : val,
    },
    {
      title: '防呆碼',
      dataIndex: 'maxsize',
      width: 80,
      render: (val, r) => isEditing ? (
        <InputNumber
          className="editable-cell-pb"
          size="small"
          value={val}
          onChange={(v) => handleCostCellChange(r.gkey, 'maxsize', v)}
        />
      ) : val,
    },
    {
      title: '對數(合計)',
      dataIndex: 'fcpairs',
      width: 85,
      render: (v) => <span style={{ fontWeight: 'bold' }}>{v || 0}</span>,
    },
    {
      title: '單對成本',
      dataIndex: 'cost',
      width: 90,
      render: (val, r) => isEditing ? (
        <InputNumber
          className="editable-cell-pb"
          size="small"
          value={val}
          onChange={(v) => handleCostCellChange(r.gkey, 'cost', v)}
        />
      ) : val,
    },
    {
      title: '攤提總額',
      dataIndex: 'amount',
      width: 100,
      render: (v) => <span style={{ color: 'red', fontWeight: 'bold' }}>{v ? parseFloat(v).toFixed(2) : '0.00'}</span>,
    },
    ...(isEditing ? [
      {
        title: '',
        key: 'action',
        width: 50,
        align: 'center',
        render: (_, r) => (
          <Button
            danger
            size="small"
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => onDeleteRow(r.gkey)}
          />
        ),
      },
    ] : []),
  ];

  return (
    <Row gutter={8}>
      <Col span={17}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontWeight: 'bold', fontSize: 12 }}>攤提費用清單</span>
          {isEditing && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={handleAddCostRow}
            >
              新增費用攤提
            </Button>
          )}
        </div>
        <Table
          size="small"
          loading={loading}
          dataSource={rows || []}
          columns={costColumns}
          rowKey="gkey"
          pagination={false}
          bordered
          scroll={{ y: 220, x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => setActiveCostKey(record.gkey),
            className: record.gkey === activeCostKey ? 'row-active' : '',
          })}
        />
      </Col>
      <Col span={7}>
        <Card
          size="small"
          title={`尺寸展開配量 - Type: ${activeCostRow?.moldtype || '-'}`}
          style={{ borderLeft: '3px solid #096dd9', height: '100%' }}
        >
          {!activeCostRow ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: '11px' }}>
              請先選擇左側一筆費用項目
            </div>
          ) : (
            <Table
              size="small"
              bordered
              dataSource={activeCostRow.sizes || []}
              rowKey="gkey"
              pagination={false}
              scroll={{ y: 180 }}
              columns={[
                {
                  title: '尺寸 (Size)',
                  dataIndex: 'size',
                  width: 90,
                  align: 'center',
                  render: (v) => <b>{v}</b>,
                },
                {
                  title: '對數 (Pairs)',
                  dataIndex: 'cvalue',
                  render: (v, r) => isEditing ? (
                    <InputNumber
                      className="editable-cell-pb"
                      size="small"
                      min={0}
                      value={v}
                      onChange={(val) => handleSizePairsChange(r.gkey, val)}
                      style={{ width: '100%' }}
                    />
                  ) : v,
                },
              ]}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}

// ── Main Workbench Configuration ─────────────────────────────────────────────
export default createRecordWorkbenchSheet({
  sheetId: 'dp015',
  title: '大底基本資料管理',
  breadcrumb: ['開發管理', '大底基本資料'],

  api: {
    listUrl: '/api/dp015/',
    deepSaveUrl: '/api/dp015/deep_save/',
    deleteUrl: '/api/dp015/',
  },

  masterKey: 'gkey',

  fieldLabels: {
    bottomno: '大底編號',
    bottomname: '大底名稱',
    year: '年度',
    molddate: '發行日期',
    ba010gkey: '客戶對象',
    ba055gkey: '季節代號',
    adopted: '已採用',
    photopath: '圖片路徑',
    remark: '備註說明',
    ba005gkey: '歸屬公司',
  },

  sidebar: {
    title: '大底列表',
    getDisplayText: (row) => `[${row.bottomno || '?'}] ${row.bottomname || ''}`,
  },

  createDefaultRecord: (tempKey) => {
    return {
      gkey: tempKey,
      bottomno: '',
      bottomname: '',
      year: String(new Date().getFullYear()),
      molddate: new Date().toISOString().substring(0, 10),
      adopted: 'N',
      photopath: '',
      remark: '',
      ba055gkey: null,
      ba010gkey: null,
      ba005gkey: null,
    };
  },

  query: {
    buildParams: (values) => {
      const params = { ...values };
      // Ignore adopted='A' (all)
      if (params.adopted === 'A') {
        delete params.adopted;
      }
      return params;
    },
  },

  list: {
    columns: [
      { title: '年度', dataIndex: 'year', width: 70, align: 'center' },
      {
        title: '大底編號',
        dataIndex: 'bottomno',
        width: 140,
        fixed: 'left',
        sorter: (a, b) => (a.bottomno || '').localeCompare(b.bottomno || ''),
      },
      { title: '大底名稱', dataIndex: 'bottomname', width: 180 },
      { title: '季節', dataIndex: 'season_name', width: 100 },
      { title: '客戶', dataIndex: 'ba010_shortname', width: 140 },
      { title: '主要廠商', dataIndex: 'ba015_shortname', width: 140 },
      { title: '性別', dataIndex: 'gender', width: 80, align: 'center' },
      { title: '歸屬公司', dataIndex: 'belong_to_name', width: 140 },
      {
        title: '採用',
        dataIndex: 'adopted',
        width: 55,
        align: 'center',
        render: (val) => (val === 'Y' ? 'Y' : 'N'),
      },
    ],
  },

  // ── Validation ──────────────────────────────────────────────
  validateMasterRow: (record) => {
    if (!record.bottomno || !record.bottomno.trim()) {
      throw new Error('大底編號為必填');
    }
    if (!record.year || !record.year.trim()) {
      throw new Error('年度為必填');
    }
    if (!record.ba005gkey) {
      throw new Error('歸屬公司為必填');
    }
  },

  validateAll: (record, detailStates) => {
    const costs = detailStates.costs?.rows || [];
    for (let i = 0; i < costs.length; i++) {
      const costRow = costs[i];
      const nestedSizes = costRow.sizes || [];
      if (nestedSizes.length === 0) {
        throw new Error(`費用明細第 ${i + 1} 列 (MoldType: ${costRow.moldtype || '空'}) 未展開尺寸`);
      }
      for (let j = 0; j < nestedSizes.length; j++) {
        const sizeRow = nestedSizes[j];
        const val = parseFloat(sizeRow.cvalue);
        if (isNaN(val) || val <= 0) {
          throw new Error(`費用明細第 ${i + 1} 列 (MoldType: ${costRow.moldtype || '空'}) 的尺寸 ${sizeRow.size} 對數必須大於 0`);
        }
      }
    }
  },

  // ── Deep Save Payload Builder ────────────────────────────────
  buildDeepSavePayload: (latestMaster, detailStates) => {
    const cleanMaster = { ...latestMaster };
    // Force uppercase outsole code
    if (cleanMaster.bottomno) {
      cleanMaster.bottomno = cleanMaster.bottomno.toUpperCase();
    }
    // Remove display-only read-only attributes
    delete cleanMaster.ba010_custno;
    delete cleanMaster.ba010_shortname;
    delete cleanMaster.cust_no;
    delete cleanMaster.season_name;
    delete cleanMaster.belong_to_name;
    delete cleanMaster.ba015_shortname;
    delete cleanMaster.gender;

    // Drop temp master keys
    if (cleanMaster.gkey && String(cleanMaster.gkey).startsWith('temp_')) {
      delete cleanMaster.gkey;
    }

    const rawMolds = detailStates.molds?.rows || [];
    const molds = rawMolds.map((m) => {
      const clean = { ...m };
      delete clean.bottom_fty_name;
      delete clean.bottom_fty_no;
      delete clean.mold_fty_name;
      delete clean.mold_fty_no;
      delete clean.prod_fty_name;
      delete clean.prod_fty_no;
      delete clean.assembly_fty_name;
      delete clean.assembly_fty_no;
      delete clean.last_no;
      delete clean.gender_name;
      return clean;
    });

    const rawCosts = detailStates.costs?.rows || [];
    const costs = [];
    const sizes = [];

    rawCosts.forEach((c) => {
      const cleanCost = { ...c };
      const nestedSizes = cleanCost.sizes || [];
      delete cleanCost.sizes;

      delete cleanCost.gender_name;
      delete cleanCost.factory_name;
      delete cleanCost.factory_no;
      delete cleanCost.currency_name;

      costs.push(cleanCost);

      nestedSizes.forEach((s) => {
        const cleanSize = { ...s };
        // Bind correct keys
        cleanSize.dp015gkey = latestMaster.gkey;
        cleanSize.dp016gkey = cleanCost.dp016gkey;
        cleanSize.dp017gkey = cleanCost.gkey;
        sizes.push(cleanSize);
      });
    });

    return {
      master: cleanMaster,
      molds,
      costs,
      sizes,
    };
  },

  detailTabs: [
    {
      key: 'molds',
      title: '大底明細',
      parentKey: 'dp015gkey',
      apiUrl: '/api/dp016/',
      renderer: Dp015MoldsTab,
    },
    {
      key: 'costs',
      title: '模具種類',
      parentKey: 'dp015gkey',
      apiUrl: '/api/dp017/',
      renderer: Dp015CostsAndSizesTab,
    },
    {
      key: 'sizes',
      title: '_sizes_hidden',
      parentKey: 'dp015gkey',
      apiUrl: '/api/dp018/',
      hidden: true,
    },
  ],

  // ── Render Query Form ─────────────────────────────────────────
  renderQueryForm: ({ form }) => (
    <Row gutter={16}>
      <Col span={18}>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="year" label="年度">
              <Input placeholder="年度精確查詢..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba055gkey" label="季節">
              <ERPLookupField type="ba055" placeholder="F2 選擇季節..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="bottomno" label="大底編號">
              <Input placeholder="大底編號模糊查詢..." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="bottomname" label="大底名稱">
              <Input placeholder="大底名稱模糊查詢..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="molddate"
              label="發行日期起"
              getValueProps={(value) => ({
                value: value ? dayjs(value) : null,
              })}
              getValueFromEvent={(date) => (date ? date.format('YYYY-MM-DD') : null)}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="請選擇開始日期" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="molddate2"
              label="發行日期迄"
              getValueProps={(value) => ({
                value: value ? dayjs(value) : null,
              })}
              getValueFromEvent={(date) => (date ? date.format('YYYY-MM-DD') : null)}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="請選擇結束日期" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="ba005gkey" label="歸屬公司">
              <ERPLookupField type="ba005" placeholder="F2 選擇公司..." />
            </Form.Item>
          </Col>
        </Row>
      </Col>
      <Col span={6}>
        <div className="erp-rw-query-right-panel">
          <div className="erp-rw-query-right-panel-title">採用狀態</div>
          <Form.Item name="adopted" initialValue="A">
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="Y">已採用</Radio>
                <Radio value="N">未採用</Radio>
                <Radio value="A">全部</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </div>
      </Col>
    </Row>
  ),

  // ── Render Master Form ────────────────────────────────────────
  renderMasterForm: ({ form, isEditing, activeRecord, updateMasterField }) => {
    const photopath = Form.useWatch('photopath', form);

    return (
      <Row gutter={16}>
        {/* Left columns */}
        <Col span={18}>
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item
                name="bottomno"
                label="大底編號"
                rules={[
                  { required: true, message: '大底編號為必填' },
                  {
                    pattern: /^[a-zA-Z0-9_-]+$/,
                    message: '編號只能包含英數字與中線/底線',
                  },
                ]}
              >
                <Input
                  maxLength={20}
                  placeholder="請輸入大底編號"
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    form.setFieldsValue({ bottomno: val });
                    updateMasterField('bottomno', val);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bottomname" label="大底名稱">
                <Input maxLength={30} placeholder="請輸入大底名稱" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="year" label="年度" rules={[{ required: true, message: '年度為必填' }]}>
                <Input maxLength={4} placeholder="YYYY" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="ba005gkey" label="歸屬公司" rules={[{ required: true, message: '歸屬公司為必填' }]}>
                <ERPLookupField type="ba005" placeholder="F2 選擇公司..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="molddate" label="發行日期">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba010gkey" label="客戶對象">
                <ERPLookupField type="ba010" placeholder="F2 檢索客戶..." />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ba055gkey" label="季節">
                <ERPLookupField type="ba055" placeholder="F2 檢索季節..." />
              </Form.Item>
            </Col>
            <Col span={6} style={{ display: 'flex', alignItems: 'center', paddingTop: 10 }}>
              <Form.Item
                name="adopted"
                valuePropName="checked"
                getValueProps={(value) => ({ checked: value === 'Y' })}
                normalize={(value) => (value ? 'Y' : 'N')}
              >
                <Checkbox>已採用</Checkbox>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={16}>
              <Form.Item name="remark" label="備註說明">
                <ERPLookupField
                  type="dp001"
                  title="關聯作業：DP001 開發片語字庫"
                  placeholder="請輸入備註說明或雙擊 F2 選擇片語..."
                  onChange={(val) => {
                    form.setFieldsValue({ remark: val });
                    updateMasterField('remark', val);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="photopath" label="圖片路徑">
                <Input placeholder="請輸入圖片 URL 或路徑..." />
              </Form.Item>
            </Col>
          </Row>
        </Col>

        {/* Right Preview */}
        <Col span={6} style={{ display: 'flex', flexDirection: 'column', paddingTop: 28 }}>
          <div
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              padding: '12px',
              backgroundColor: 'var(--app-bg-panel)',
              textAlign: 'center',
              minHeight: '170px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
              📸 大底外觀預覽 (Outsole Sketch)
            </span>
            {photopath ? (
              <Image
                src={photopath}
                alt="大底示意圖"
                fallback="https://placehold.co/200x150?text=No+Image+Found"
                style={{
                  maxWidth: '100%',
                  maxHeight: '110px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '32px',
                }}
              >
                👟
              </div>
            )}
          </div>
        </Col>
      </Row>
    );
  },
});
