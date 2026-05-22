import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Table, Input, Select, InputNumber, Space, message, Typography, Tag, Divider } from 'antd';
import { 
  BlockOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import axios from 'axios';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';

const { Text, Title } = Typography;
const { Option } = Select;
const API_URL = 'http://localhost:8001/api/dp004/';

// Helper functions for size run generation
const formatSize = (num) => {
  const rounded = Math.round(num * 10) / 10;
  const s = rounded.toString();
  return s.indexOf('.') === -1 ? s + '.0' : s;
};

const generateSizeRun = ({ startsize, endsize, maxsize, fullhalf }) => {
  let start = parseFloat(startsize) || 0;
  let end = parseFloat(endsize) || 0;
  let max = parseFloat(maxsize) || 0;

  if (start === 0 && end === 0) return [];

  let sizes = [];
  const isCombo = fullhalf === '3';
  const step = fullhalf === '2' ? 0.5 : 1.0;

  const addSizes = (sStart, sEnd) => {
    let curr = sStart;
    const limit = sEnd + 0.001; 
    while (curr <= limit) {
      if (sizes.length >= 20) break;
      if (isCombo) {
        sizes.push(`${formatSize(curr)}&${formatSize(curr + 0.5)}`);
      } else {
        sizes.push(formatSize(curr));
      }
      curr += (isCombo ? 1.0 : step);
    }
  };

  if (max > 0) {
    addSizes(start, max);
    if (sizes.length < 20) {
      let sec2Start = 1.0;
      if (fullhalf === '1') {
        const decPart = start - Math.floor(start);
        sec2Start = 1.0 + decPart;
      }
      addSizes(sec2Start, end);
    }
  } else {
    addSizes(start, end);
  }

  return sizes.slice(0, 20);
};

const updateMatrixForSizeType = (masterRow, detailRows) => {
  const { sizetype, startsize, endsize, fullhalf, maxsize } = masterRow;
  const sizes = generateSizeRun({ startsize, endsize, maxsize, fullhalf });

  const colMap = { '1': 'tszus', '2': 'tszeu', '3': 'tszuk', '4': 'tszjp', '5': 'tszot' };
  const targetField = colMap[sizetype] || 'tszus';

  const updatedDetails = [];

  for (let i = 0; i < sizes.length; i++) {
    const existing = detailRows[i];
    if (existing) {
      updatedDetails.push({
        ...existing,
        [targetField]: sizes[i]
      });
    } else {
      updatedDetails.push({
        gkey: `temp_auto_${Date.now()}_${i}`,
        tszus: '',
        tszeu: '',
        tszuk: '',
        tszjp: '',
        tszot: '',
        [targetField]: sizes[i]
      });
    }
  }

  return updatedDetails;
};

export default function Dp004Sheet() {
  const [masterList, setMasterList] = useState([]);
  const [displayList, setDisplayList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGkey, setSelectedGkey] = useState(null);
  const [masterDataMap, setMasterDataMap] = useState({}); 
  const [detailList, setDetailList] = useState([]);
  const [deletedMasterGkeys, setDeletedMasterGkeys] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      const data = res.data;
      setMasterList(data);
      setDisplayList(data);
      
      const initialMap = {};
      data.forEach(m => { initialMap[m.gkey] = { ...m }; });
      setMasterDataMap(initialMap);
      setDeletedMasterGkeys([]);
      setIsEditing(false);
      
      if (data.length > 0) {
        const targetGkey = selectedGkey && initialMap[selectedGkey] ? selectedGkey : data[0].gkey;
        handleRowSelect(targetGkey, initialMap[targetGkey].sizes);
      }
    } catch (e) {
      message.error('資料載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMasters(); }, []);

  useEffect(() => {
    const filtered = masterList.filter(m => 
      m.gender.toLowerCase().includes(searchText.toLowerCase())
    );
    setDisplayList(filtered);
  }, [searchText, masterList]);

  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp004') {
        if (action === 'retrieve') fetchMasters();
        else if (action === 'edit') setIsEditing(true);
        else if (action === 'insert') { setIsEditing(true); handleInsertMaster(); }
        else if (action === 'delete') { setIsEditing(true); handleDeleteMaster(); }
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [masterDataMap, detailList, selectedGkey, deletedMasterGkeys, masterList, isEditing]);

  const handleRowSelect = (gkey, sizes = []) => {
    setSelectedGkey(gkey);
    setDetailList(sizes || []);
  };

  const handleMasterChange = (gkey, field, val) => {
    if (!isEditing) return;
    setMasterDataMap(prev => {
      const updated = { ...prev[gkey], [field]: val };
      if (['sizetype', 'startsize', 'endsize', 'fullhalf', 'maxsize'].includes(field)) {
        setTimeout(() => autoGenerateMatrix(updated), 50);
      }
      return { ...prev, [gkey]: updated };
    });
    setMasterList(prev => prev.map(m => m.gkey === gkey ? { ...m, [field]: val } : m));
  };

  const autoGenerateMatrix = (currentMaster) => {
    setDetailList(prev => updateMatrixForSizeType(currentMaster, prev));
  };

  const handleInsertMaster = () => {
    const tempGkey = `temp_${Date.now()}`;
    const newMaster = {
      gkey: tempGkey,
      serialno: masterList.length + 1,
      gender: 'NEW GENDER',
      sizetype: '1',
      startsize: 0,
      fullhalf: '1',
      endsize: 0,
      maxsize: 0,
      sizes: []
    };
    setMasterList([newMaster, ...masterList]);
    setMasterDataMap(prev => ({ ...prev, [tempGkey]: newMaster }));
    handleRowSelect(tempGkey, []);
  };

  const handleDeleteMaster = () => {
    if (!selectedGkey) return;
    const remaining = masterList.filter(m => m.gkey !== selectedGkey);
    if (!selectedGkey.startsWith('temp_')) {
      setDeletedMasterGkeys(prev => [...prev, selectedGkey]);
    }
    const reordered = remaining.map((m, i) => ({ ...m, serialno: i + 1 }));
    setMasterList(reordered);
    setMasterDataMap(prev => {
      const nm = { ...prev };
      delete nm[selectedGkey];
      return nm;
    });
    if (reordered.length > 0) handleRowSelect(reordered[0].gkey, masterDataMap[reordered[0].gkey]?.sizes);
    else { setSelectedGkey(null); setDetailList([]); }
    message.info('已標記刪除主檔');
  };

  const handleSave = async () => {
    if (!isEditing) { message.warning('請先開啟編輯模式'); return; }
    const currentMaster = masterDataMap[selectedGkey];
    if (currentMaster) {
      currentMaster.sizes = detailList;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}bulk_save/`, {
        upsert: Object.values(masterDataMap),
        delete: deletedMasterGkeys
      });
      message.success('存檔成功');
      fetchMasters();
    } catch (e) {
      message.error('存檔失敗');
    } finally {
      setLoading(false);
    }
  };

  const masterColumns = [
    { title: '序號', dataIndex: 'serialno', width: 60, align: 'center' },
    { 
      title: '性別 (Gender)', 
      dataIndex: 'gender', 
      render: (v, r) => (
          isEditing ? <Input variant="borderless" value={v} onChange={e => handleMasterChange(r.gkey, 'gender', e.target.value)} /> : <Text style={{ paddingLeft: '11px' }}>{v}</Text>
      )
    },
    { 
      title: '碼別', 
      dataIndex: 'sizetype', 
      width: 80,
      render: (v, r) => (
        isEditing ? (
            <Select variant="borderless" value={v} onChange={val => handleMasterChange(r.gkey, 'sizetype', val)} style={{ width: '100%' }}>
                <Option value="1">US</Option><Option value="2">EU</Option><Option value="3">UK</Option><Option value="4">JP</Option><Option value="5">OT</Option>
            </Select>
        ) : <Text style={{ paddingLeft: '11px' }}>{v === '1' ? 'US' : v === '2' ? 'EU' : v === '3' ? 'UK' : v === '4' ? 'JP' : 'OT'}</Text>
      )
    },
    { 
      title: '起', dataIndex: 'startsize', width: 80,
      render: (v, r) => isEditing ? <InputNumber variant="borderless" value={v} onChange={val => handleMasterChange(r.gkey, 'startsize', val)} /> : <Text style={{ paddingLeft: '11px' }}>{v}</Text>
    },
    { 
      title: '全半', dataIndex: 'fullhalf', width: 70,
      render: (v, r) => isEditing ? (
        <Select variant="borderless" value={v} onChange={val => handleMasterChange(r.gkey, 'fullhalf', val)}>
          <Option value="1">-</Option><Option value="2">／</Option><Option value="3">&</Option>
        </Select>
      ) : <Text style={{ paddingLeft: '11px' }}>{v === '2' ? '/' : v === '3' ? '&' : '-'}</Text>
    },
    { 
      title: '迄', dataIndex: 'endsize', width: 80,
      render: (v, r) => isEditing ? <InputNumber variant="borderless" value={v} onChange={val => handleMasterChange(r.gkey, 'endsize', val)} /> : <Text style={{ paddingLeft: '11px' }}>{v}</Text>
    }
  ];

  const detailColumns = [
    { title: 'NO', width: 50, align: 'center', render: (_, __, i) => i + 1 },
    { title: 'US Size', dataIndex: 'tszus', render: (v, r, i) => isEditing ? <Input variant="borderless" value={v} onChange={e => { const nl = [...detailList]; nl[i].tszus = e.target.value; setDetailList(nl); }} /> : <Text style={{ paddingLeft: '11px' }}>{v}</Text> },
    { title: 'EU Size', dataIndex: 'tszeu', render: (v, r, i) => isEditing ? <Input variant="borderless" value={v} onChange={e => { const nl = [...detailList]; nl[i].tszeu = e.target.value; setDetailList(nl); }} /> : <Text style={{ paddingLeft: '11px' }}>{v}</Text> },
    { title: 'UK Size', dataIndex: 'tszuk', render: (v, r, i) => isEditing ? <Input variant="borderless" value={v} onChange={e => { const nl = [...detailList]; nl[i].tszuk = e.target.value; setDetailList(nl); }} /> : <Text style={{ paddingLeft: '11px' }}>{v}</Text> },
    { title: 'JP Size', dataIndex: 'tszjp', render: (v, r, i) => isEditing ? <Input variant="borderless" value={v} onChange={e => { const nl = [...detailList]; nl[i].tszjp = e.target.value; setDetailList(nl); }} /> : <Text style={{ paddingLeft: '11px' }}>{v}</Text> },
    { title: 'OT Size', dataIndex: 'tszot', render: (v, r, i) => isEditing ? <Input variant="borderless" value={v} onChange={e => { const nl = [...detailList]; nl[i].tszot = e.target.value; setDetailList(nl); }} /> : <Text style={{ paddingLeft: '11px' }}>{v}</Text> }
  ];

  return (
    <ERPSheetPage
      sheetId="dp004"
      title="DP004 鞋種性別與尺碼定義"
      breadcrumb={['開發管理', '鞋種性別與尺碼定義']}
    >
      <div className="erp-md-page">
        {/* 上方：性別 / 碼別設定 Grid (Master) */}
        <div className="erp-md-master-area" style={{ flex: '0 0 240px', height: '240px', marginBottom: '12px' }}>
          <div className="erp-md-section-header">
            <span className="erp-md-section-title">
              性別設定 (Master Grid)
              {isEditing ? (
                <Tag icon={<EditOutlined />} color="orange" style={{ marginLeft: 8 }}>編輯模式</Tag>
              ) : (
                <Tag icon={<EyeOutlined />} color="blue" style={{ marginLeft: 8 }}>查看模式</Tag>
              )}
            </span>
            <div className="erp-md-toolbar-strip">
              <Input
                placeholder="快速過濾性別..."
                prefix={<SearchOutlined />}
                style={{ width: 180, height: 24 }}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                size="small"
              />
            </div>
          </div>
          <div className="erp-md-table">
            <Table 
              size="small" 
              dataSource={displayList} 
              columns={masterColumns} 
              rowKey="gkey" 
              pagination={false} 
              sticky 
              bordered 
              rowClassName={(record) => record.gkey === selectedGkey ? 'row-active' : ''}
              onRow={r => ({ 
                  onClick: () => handleRowSelect(r.gkey, masterDataMap[r.gkey]?.sizes), 
                  onDoubleClick: () => setIsEditing(true)
              })} 
            />
          </div>
        </div>

        {/* 下方：尺碼對照矩陣 (Detail) */}
        <div className="erp-md-detail-area" style={{ flex: 1, marginBottom: '8px' }}>
          <div className="erp-md-section-header">
            <span className="erp-md-section-title">
              尺碼對照矩陣 (Detail Matrix)
              {selectedGkey && <Tag color="blue" style={{ marginLeft: 8 }}>{masterDataMap[selectedGkey]?.gender}</Tag>}
            </span>
          </div>
          <div className="erp-md-table">
            <Table
              size="small"
              dataSource={detailList}
              columns={detailColumns}
              rowKey={(r, i) => r.gkey || i}
              pagination={false}
              bordered
              sticky
            />
          </div>
        </div>

        {/* 底部狀態列 */}
        <div className="erp-md-statusbar">
          <span>提示：選擇上方性別設定後可編輯下方尺碼矩陣。</span>
          <span>狀態：讀取完成。共 {displayList.length} 筆性別設定，{detailList.length} 筆尺碼對照。</span>
        </div>
      </div>
    </ERPSheetPage>
  );
}


