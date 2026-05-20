import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Modal, Transfer, Typography, Tag, Divider } from 'antd';
import { BlockOutlined, EyeOutlined, EditOutlined, ImportOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;
const API_BASE = 'http://localhost:8001/api';

export default function Dp007Sheet() {
  const [shoeKinds, setShoeKinds] = useState([]);
  const [allPartsPool, setAllPartsPool] = useState([]);
  const [selectedKind, setSelectedKind] = useState(null);
  const [assignedParts, setAssignedParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [tempTargetKeys, setTempTargetKeys] = useState([]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [kindsRes, partsRes] = await Promise.all([
        axios.get(`${API_BASE}/dp003/`),
        axios.get(`${API_BASE}/dp006/`)
      ]);
      setShoeKinds(kindsRes.data);
      setAllPartsPool(partsRes.data);
      setIsEditing(false);
      
      if (kindsRes.data.length > 0) {
        handleSelectKind(kindsRes.data[0]);
      }
    } catch (e) {
      message.error('讀取資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBaseData(); }, []);

  const [selectedDetailKey, setSelectedDetailKey] = useState(null);

  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp007') {
        if (action === 'retrieve') fetchBaseData();
        else if (action === 'edit') {
          if (selectedKind) { setIsEditing(true); setModalVisible(true); }
          else message.warning('請先選擇一個鞋種');
        }
        else if (action === 'insert') {
          setIsEditing(true);
          if (selectedKind) setModalVisible(true);
          else message.warning('請先選擇一個鞋種');
        }
        else if (action === 'delete') {
          if (isEditing && selectedKind) {
            if (selectedDetailKey) {
                // 刪除選中的單一項
                const newKeys = tempTargetKeys.filter(k => k !== selectedDetailKey);
                setTempTargetKeys(newKeys);
                setAssignedParts(assignedParts.filter(p => (p.dp007_dp006gkey || p.dp006gkey) !== selectedDetailKey));
                setSelectedDetailKey(null);
                message.info('已移除選中部位，請點擊存檔生效');
            } else {
                // 若未選中明細，則詢問是否清除全部？（或者不處理）
                message.warning('請先點選下方要移除的部位');
            }
          } else if (!isEditing) {
            message.warning('請先進入編輯模式再執行刪除');
          }
        }
        else if (action === 'save') handleSaveSync();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [selectedKind, assignedParts, tempTargetKeys, isEditing, selectedDetailKey]);

  const handleSelectKind = async (kind) => {
    setSelectedKind(kind);
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/dp007/?dp003gkey=${kind.gkey}`);
      setAssignedParts(res.data);
      setTempTargetKeys(res.data.map(d => d.dp007_dp006gkey || d.dp006gkey));
    } catch (e) {
      message.error('讀取關聯部位失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSync = async () => {
    if (!isEditing) {
      message.warning('請先開啟編輯模式');
      return;
    }
    if (!selectedKind) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/dp007/sync_parts/`, {
        dp003gkey: selectedKind.gkey,
        assigned_dp006_keys: tempTargetKeys
      });
      message.success('存檔成功');
      setIsEditing(false);
      handleSelectKind(selectedKind);
    } catch (e) {
      message.error('保存失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = () => {
    const newAssigned = allPartsPool
      .filter(p => tempTargetKeys.includes(p.gkey))
      .map((p, idx) => ({
        gkey: `temp_${idx}`,
        dp007_dp006gkey: p.gkey,
        parts_name: p.parts,
        eparts_name: p.eparts
      }));
    setAssignedParts(newAssigned);
    setModalVisible(false);
  };

  const masterColumns = [
    { title: '序號', key: 'idx', width: 70, align: 'center', render: (_, __, i) => <Text type="secondary" style={{ fontSize: '12px' }}>{i + 1}</Text> },
    { 
        title: '鞋種類別 (中)', 
        dataIndex: 'shoetype',
        width: 150,
        render: v => <Text strong style={{ color: '#1890ff', fontSize: '13px' }}>{v}</Text>
    },
    { 
        title: 'Shoe Type (EN)', 
        dataIndex: 'eshoetype',
        render: v => <Text type="secondary" style={{ fontSize: '12px' }}>{v}</Text>
    }
  ];

  const detailColumns = [
    { title: 'NO', key: 'idx', width: 60, align: 'center', render: (_, __, i) => <Text type="secondary" style={{ fontSize: '12px' }}>{i + 1}</Text> },
    { 
        title: '部位名稱 (Chinese)', 
        dataIndex: 'parts_name',
        render: v => <Text strong style={{ fontSize: '13px' }}>{v}</Text>
    },
    { 
        title: 'Part Description (English)', 
        dataIndex: 'eparts_name',
        render: v => <Text type="secondary" style={{ fontSize: '12px' }}>{v}</Text>
    }
  ];

  return (
    <div style={{ padding: '15px', backgroundColor: '#f0f2f5', height: '100vh', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '8px 15px', borderRadius: '4px', border: '1px solid #d9d9d9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <BlockOutlined style={{ color: '#1890ff' }} />
          <Text strong>DP007 鞋種部位設定</Text>
          <Divider type="vertical" />
          {isEditing ? (
            <Tag icon={<EditOutlined />} color="orange">編輯模式 (Editing)</Tag>
          ) : (
            <Tag icon={<EyeOutlined />} color="blue">查看模式 (View-Only)</Tag>
          )}
        </Space>
        <Tag color="cyan">物理主細表還原</Tag>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', minHeight: 0 }}>
        <div style={{ height: '40%', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#fafafa', padding: '5px 15px', borderBottom: '1px solid #f0f0f0' }}>
            <Text strong size="small">鞋種類別列表</Text>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table 
              loading={loading}
              dataSource={shoeKinds}
              columns={masterColumns}
              rowKey="gkey"
              size="small"
              pagination={false}
              bordered
              sticky
              onRow={(record) => ({
                onClick: () => handleSelectKind(record),
                onDoubleClick: () => { setIsEditing(true); setModalVisible(true); },
                className: selectedKind?.gkey === record.gkey ? 'row-active' : ''
              })}
            />
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#fafafa', padding: '5px 15px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Text strong size="small">對應部位結構</Text>
              {selectedKind && <Tag color="blue">{selectedKind.shoetype}</Tag>}
            </Space>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table 
              dataSource={assignedParts.filter(p => tempTargetKeys.includes(p.dp007_dp006gkey || p.dp006gkey))}
              columns={detailColumns}
              rowKey={r => r.dp007_dp006gkey || r.dp006gkey}
              size="small"
              pagination={false}
              bordered
              sticky
              onRow={(record) => ({
                onClick: () => setSelectedDetailKey(record.dp007_dp006gkey || record.dp006gkey),
                className: selectedDetailKey === (record.dp007_dp006gkey || record.dp006gkey) ? 'row-active' : ''
              })}
            />
          </div>
        </div>
      </div>

      <Modal
        title={<span><ImportOutlined /> 部位配置導入 - {selectedKind?.shoetype}</span>}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="確認導入"
        cancelText="取消"
        centered
      >
        <div style={{ padding: '10px 0' }}>
            <Transfer
              dataSource={allPartsPool.map(p => ({ ...p, key: p.gkey, title: `${p.parts} / ${p.eparts}` }))}
              targetKeys={tempTargetKeys}
              onChange={keys => setTempTargetKeys(keys)}
              render={item => (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.parts}</span>
                      <span style={{ color: '#bfbfbf', fontSize: '12px' }}>{item.eparts}</span>
                  </div>
              )}
              listStyle={{ width: '45%', height: 400 }}
              titles={['可選部位', '已選部位']}
              showSearch
              operations={['加入', '移除']}
            />
        </div>
      </Modal>

      <style>{`
        .row-active td { background-color: #e6f7ff !important; border-bottom: 2px solid #1890ff !important; }
        .ant-table-thead > tr > th { background-color: #fafafa !important; font-weight: bold !important; font-size: 13px; }
        .ant-table-cell { padding: 4px 8px !important; }
      `}</style>
    </div>
  );
}


