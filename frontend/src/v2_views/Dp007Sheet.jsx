import React, { useState, useEffect } from 'react';
import { Form, Input, Table, Button, Space, Modal, Transfer, Tag, message } from 'antd';
import { BlockOutlined, ImportOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';
import ERPMasterDetailLayout from '../components/erp/master-detail/ERPMasterDetailLayout';
import useMdiCrud from '../hooks/useMdiCrud';
import '../styles/erp-master-detail.css';

// API base builder aligning with V2 standard hooks
const getFullUrl = (path) => {
  let cleanPath = path.trim().replace(/^\/|\/$/g, '');
  if (cleanPath.startsWith('api/')) {
    cleanPath = cleanPath.substring(4);
  }
  return `http://localhost:8001/api/${cleanPath}/`;
};

export default function Dp007Sheet() {
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [shoeKinds, setShoeKinds] = useState([]);
  const [allPartsPool, setAllPartsPool] = useState([]);
  const [selectedKind, setSelectedKind] = useState(null);
  const [assignedParts, setAssignedParts] = useState([]);
  const [tempTargetKeys, setTempTargetKeys] = useState([]);
  const [selectedDetailKey, setSelectedDetailKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Search fields for local filtering (Master Grid)
  const [searchChinese, setSearchChinese] = useState('');
  const [searchEnglish, setSearchEnglish] = useState('');

  // 2. Fetch parts assigned to the selected shoe kind
  const fetchDetailForKind = async (gkey) => {
    if (!gkey) {
      setAssignedParts([]);
      setTempTargetKeys([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${getFullUrl('dp007')}?dp003gkey=${gkey}`);
      const rawDetail = res.data || [];
      const cleanDetail = rawDetail.filter(item => {
        if (!item || !item.dp006gkey) return false;
        const hasPartsName = typeof item.parts_name === 'string' ? item.parts_name.trim() !== '' : !!item.parts_name;
        const hasEpartsName = typeof item.eparts_name === 'string' ? item.eparts_name.trim() !== '' : !!item.eparts_name;
        return hasPartsName || hasEpartsName;
      });
      // Sort detail list by serialno ascending
      cleanDetail.sort((a, b) => (Number(a.serialno) || 0) - (Number(b.serialno) || 0));
      setAssignedParts(cleanDetail);
      setTempTargetKeys(cleanDetail.map(d => d.dp006gkey));
    } catch (e) {
      message.error('讀取關聯部位失敗');
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch base lists (dp003, dp006)
  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [kindsRes, partsRes] = await Promise.all([
        axios.get(getFullUrl('dp003')),
        axios.get(getFullUrl('dp006'))
      ]);
      const rawKinds = kindsRes.data || [];
      const cleanKinds = rawKinds.filter(item => {
        if (!item || !item.gkey) return false;
        const hasShoetype = typeof item.shoetype === 'string' ? item.shoetype.trim() !== '' : !!item.shoetype;
        const hasEshoetype = typeof item.eshoetype === 'string' ? item.eshoetype.trim() !== '' : !!item.eshoetype;
        return hasShoetype || hasEshoetype;
      });
      
      const rawParts = partsRes.data || [];
      const cleanParts = rawParts.filter(item => {
        if (!item || !item.gkey) return false;
        const hasParts = typeof item.parts === 'string' ? item.parts.trim() !== '' : !!item.parts;
        const hasEparts = typeof item.eparts === 'string' ? item.eparts.trim() !== '' : !!item.eparts;
        return hasParts || hasEparts;
      });

      setShoeKinds(cleanKinds);
      setAllPartsPool(cleanParts);
      setMode('view');
      
      // Auto-select first item if exists and nothing is selected
      if (cleanKinds.length > 0) {
        let nextSelected = null;
        if (selectedKind) {
          nextSelected = cleanKinds.find(k => k.gkey === selectedKind.gkey) || cleanKinds[0];
        } else {
          nextSelected = cleanKinds[0];
        }
        setSelectedKind(nextSelected);
        await fetchDetailForKind(nextSelected.gkey);
      } else {
        setSelectedKind(null);
        setAssignedParts([]);
        setTempTargetKeys([]);
      }
    } catch (e) {
      message.error('讀取資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  const handleSelectKind = (kind) => {
    setSelectedKind(kind);
  };

  useEffect(() => {
    if (!selectedKind?.gkey) {
      setAssignedParts([]);
      setTempTargetKeys([]);
      return;
    }
    fetchDetailForKind(selectedKind.gkey);
  }, [selectedKind?.gkey]);

  // 3. Save sync via sync_parts API (Atomic sync)
  const handleSaveSync = async () => {
    if (!selectedKind) return;
    setLoading(true);
    try {
      await axios.post(getFullUrl('dp007/sync_parts'), {
        dp003gkey: selectedKind.gkey,
        assigned_dp006_keys: tempTargetKeys,
        dp006gkeys: tempTargetKeys // Compatibility fallback
      });
      message.success('存檔成功');
      setMode('view');
      // Reload parts mapping
      await fetchDetailForKind(selectedKind.gkey);
    } catch (e) {
      message.error('保存失敗');
    } finally {
      setLoading(false);
    }
  };

  // 4. Hook up to the global MDI Toolbar commands
  useMdiCrud({
    sheetId: 'dp007',
    onRetrieve: () => {
      fetchBaseData();
    },
    onEdit: () => {
      if (!selectedKind) {
        message.warning('請先選擇一個鞋種類別！');
        return;
      }
      setMode('edit');
      setTempTargetKeys(assignedParts.map(p => p.dp006gkey));
    },
    onSave: () => {
      if (mode !== 'edit') {
        message.warning('非編輯狀態下無法存檔！');
        return;
      }
      handleSaveSync();
    },
    onCancel: () => {
      setMode('view');
      setTempTargetKeys(assignedParts.map(p => p.dp006gkey));
    },
    onDelete: () => {
      if (mode !== 'edit') {
        message.warning('請先進入編輯狀態後再移除部位！');
        return;
      }
      if (!selectedDetailKey) {
        message.warning('請先選擇要移除的部位');
        return;
      }
      const newKeys = tempTargetKeys.filter(k => k !== selectedDetailKey);
      setTempTargetKeys(newKeys);
      setSelectedDetailKey(null);
      message.info('已自明細中移除該部位，請點擊存檔以儲存變更');
    },
    onInsert: () => {
      if (!selectedKind) {
        message.warning('請先選擇一個鞋種類別！');
        return;
      }
      if (mode !== 'edit') {
        message.warning('請先點選全域「修改」按鈕進入編輯狀態！');
        return;
      }
      setModalVisible(true);
    }
  });

  // Local filtering in memory for shoe kinds (Master Grid)
  // Rigorously filter out any empty objects, objects with falsy/missing gkeys, or placeholder rows
  const filteredKinds = shoeKinds.filter(item => {
    if (!item || !item.gkey) return false;
    // Check for empty or placeholder shoetype/eshoetype values
    const hasShoetype = typeof item.shoetype === 'string' ? item.shoetype.trim() !== '' : !!item.shoetype;
    const hasEshoetype = typeof item.eshoetype === 'string' ? item.eshoetype.trim() !== '' : !!item.eshoetype;
    if (!hasShoetype && !hasEshoetype) return false;

    const matchChinese = !searchChinese || (item.shoetype && item.shoetype.toLowerCase().includes(searchChinese.toLowerCase()));
    const matchEnglish = !searchEnglish || (item.eshoetype && item.eshoetype.toLowerCase().includes(searchEnglish.toLowerCase()));
    return matchChinese && matchEnglish;
  });

  // Calculate displayed list in real-time when in edit mode
  // Rigorously filter out any empty, placeholder, or invalid objects
  const rawDisplayedDetailParts = mode === 'edit'
    ? allPartsPool
        .filter(p => p && p.gkey && tempTargetKeys.includes(p.gkey))
        .map(p => ({
          gkey: p.gkey,
          dp006gkey: p.gkey,
          parts_name: p.parts,
          eparts_name: p.eparts,
          dp005_name: p.dp005_name,
          serialno: p.serialno
        }))
    : assignedParts;

  const displayedDetailParts = rawDisplayedDetailParts.filter(item => {
    if (!item) return false;
    // Key must be present
    const key = item.dp006gkey || item.gkey;
    if (!key) return false;
    // Must have at least parts_name or eparts_name populated (not empty placeholders)
    const hasPartsName = typeof item.parts_name === 'string' ? item.parts_name.trim() !== '' : !!item.parts_name;
    const hasEpartsName = typeof item.eparts_name === 'string' ? item.eparts_name.trim() !== '' : !!item.eparts_name;
    if (!hasPartsName && !hasEpartsName) return false;
    return true;
  });

  // Sort displayed parts by serialno ascending
  displayedDetailParts.sort((a, b) => (Number(a.serialno) || 0) - (Number(b.serialno) || 0));

  const isDirty = mode === 'edit' && (
    JSON.stringify([...tempTargetKeys].sort()) !== JSON.stringify(assignedParts.map(p => p.dp006gkey).sort())
  );

  const statusMsg = `共 ${shoeKinds.length} 筆鞋種類別，已載入 ${allPartsPool.length} 筆部位資料。`;

  // Master columns definition
  const masterColumns = [
    { 
      title: '序號', 
      key: 'idx', 
      width: 70, 
      align: 'center', 
      render: (_, __, i) => <span style={{ color: '#8c8c8c' }}>{i + 1}</span> 
    },
    { 
      title: '鞋種類別 (中文代碼)', 
      dataIndex: 'shoetype',
      key: 'shoetype',
      width: 250,
      render: v => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{v}</span>
    },
    { 
      title: 'Shoe Type (英文名稱)', 
      dataIndex: 'eshoetype',
      key: 'eshoetype',
      render: v => <span>{v}</span>
    }
  ];

  // Detail columns definition
  const detailColumns = [
    { 
      title: '序號 (serialno)', 
      dataIndex: 'serialno', 
      key: 'serialno',
      width: 120, 
      align: 'center',
      render: v => <span style={{ fontFamily: 'monospace' }}>{v !== null && v !== undefined ? String(v) : '-'}</span> 
    },
    { 
      title: '部位中文名稱 (parts_name)', 
      dataIndex: 'parts_name',
      key: 'parts_name',
      render: v => <span style={{ fontWeight: 'bold' }}>{v}</span>
    },
    { 
      title: '部位英文名稱 (eparts_name)', 
      dataIndex: 'eparts_name',
      key: 'eparts_name',
      render: v => <span>{v}</span>
    },
    { 
      title: '部位類別名稱 (dp005_name)', 
      dataIndex: 'dp005_name',
      key: 'dp005_name',
      render: v => <Tag color="geekblue">{v || '-'}</Tag>
    }
  ];

  // Push Action column to detail grid if in edit mode
  if (mode === 'edit') {
    detailColumns.push({
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />} 
          onClick={(e) => {
            e.stopPropagation();
            const newKeys = tempTargetKeys.filter(k => k !== record.dp006gkey);
            setTempTargetKeys(newKeys);
            if (selectedDetailKey === record.dp006gkey) {
              setSelectedDetailKey(null);
            }
            message.info(`已移除部位「${record.parts_name}」，請點擊存檔生效`);
          }}
        />
      )
    });
  }

  // Master Actions (Filter Bar)
  const masterActions = (
    <Form layout="inline" size="small" style={{ display: 'flex', alignItems: 'center' }}>
      <Form.Item label="鞋種類別" style={{ margin: 0, marginRight: '8px' }}>
        <Input 
          placeholder="中文代碼" 
          value={searchChinese} 
          onChange={e => setSearchChinese(e.target.value)} 
          style={{ width: '120px' }}
          allowClear
        />
      </Form.Item>
      <Form.Item label="英文名稱" style={{ margin: 0, marginRight: '8px' }}>
        <Input 
          placeholder="英文名稱" 
          value={searchEnglish} 
          onChange={e => setSearchEnglish(e.target.value)} 
          style={{ width: '120px' }}
          allowClear
        />
      </Form.Item>
      <Button 
        size="small" 
        onClick={() => { setSearchChinese(''); setSearchEnglish(''); }}
      >
        清除
      </Button>
    </Form>
  );

  // Detail Actions
  const detailActions = mode === 'edit' && selectedKind ? (
    <Button 
      type="primary" 
      size="small" 
      icon={<ImportOutlined />}
      onClick={() => setModalVisible(true)}
      className="erp-md-action-button"
    >
      導入部位
    </Button>
  ) : null;

  // Define explicit debug variables exactly as requested by user checklist
  const columns = masterColumns;
  const sizeColumns = null;
  const dataSource = filteredKinds;
  const pivotRows = null;
  const allDetailRows = assignedParts;

  console.log("[DP007 DEBUG] columns:", columns);
  console.log("[DP007 DEBUG] sizeColumns:", sizeColumns);
  console.log("[DP007 DEBUG] dataSource[0]:", dataSource?.[0]);
  console.log("[DP007 DEBUG] pivotRows[0]:", pivotRows?.[0]);

  console.log("[DP007 DEBUG] selectedMaster:", selectedKind);
  console.log("[DP007 DEBUG] selectedMaster gkey:", selectedKind?.gkey);
  console.log("[DP007 DEBUG] raw assigned rows:", assignedParts);
  console.log("[DP007 DEBUG] all source detail rows:", allDetailRows);
  console.log("[DP007 DEBUG] sample detail row:", allDetailRows?.[0]);

  console.log('master rows', filteredKinds);
  console.log('detail rows', displayedDetailParts);
  console.log('tempTargetKeys', tempTargetKeys);
  console.log('allPartsPool', allPartsPool);

  return (
    <ERPSheetPage
      sheetId="dp007"
      title="鞋種部位設定"
      breadcrumb={['開發管理', '鞋種部位設定']}
      mode={mode}
    >
      <ERPMasterDetailLayout
        masterTitle={<span>👞 鞋種類別清單</span>}
        detailTitle={
          <span>
            📅 部位配置對應明細：
            {selectedKind ? (
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{selectedKind.shoetype}</span>
            ) : '未選擇'}
          </span>
        }
        masterHeight="260px"
        masterActions={masterActions}
        detailActions={detailActions}
        masterContent={
          <Table
            dataSource={filteredKinds}
            columns={masterColumns}
            rowKey="gkey"
            size="small"
            pagination={false}
            bordered
            sticky
            loading={loading && shoeKinds.length === 0}
            rowClassName={(record) => selectedKind?.gkey === record.gkey ? 'row-active' : ''}
            childrenColumnName="___unused_children___"
            onRow={(record) => ({
              onClick: () => handleSelectKind(record)
            })}
          />
        }
        detailContent={
          <Table 
            dataSource={displayedDetailParts}
            columns={detailColumns}
            rowKey="dp006gkey"
            size="small"
            pagination={false}
            bordered
            sticky
            loading={loading}
            rowClassName={(record) => selectedDetailKey === record.dp006gkey ? 'row-active' : ''}
            childrenColumnName="___unused_children___"
            onRow={(record) => ({
              onClick: () => setSelectedDetailKey(record.dp006gkey)
            })}
          />
        }
        statusContent={
          <>
            <span>提示：點擊上方鞋種類別列，下方載入部位對應；使用全域工具列「修改、存檔、放棄」維護關係對應</span>
            <span>
              狀態：{statusMsg}
              {isDirty && (
                <span style={{ color: '#ef4444', marginLeft: '10px', fontWeight: 'bold' }}>
                  * 有未儲存變更
                </span>
              )}
            </span>
          </>
        }
      />

      {/* Transfer modal for selecting parts */}
      <Modal
        title={<span><ImportOutlined style={{ marginRight: '6px' }} /> 部位配置導入 - {selectedKind?.shoetype}</span>}
        open={modalVisible}
        onOk={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="確認"
        cancelText="關閉"
        centered
        destroyOnClose
      >
        <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
          <Transfer
            dataSource={allPartsPool.map(p => ({ 
              key: p.gkey, 
              title: `${p.parts} / ${p.eparts}`, 
              parts: p.parts, 
              eparts: p.eparts 
            }))}
            targetKeys={tempTargetKeys}
            onChange={keys => setTempTargetKeys(keys)}
            render={item => (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: '500' }}>{item.parts}</span>
                <span style={{ color: '#8c8c8c', fontSize: '11px', marginRight: '10px' }}>{item.eparts}</span>
              </div>
            )}
            listStyle={{ width: '45%', height: 400 }}
            titles={['可選部位 pool', '已配置部位 target']}
            showSearch
            operations={['加入', '移除']}
          />
        </div>
      </Modal>
    </ERPSheetPage>
  );
}
