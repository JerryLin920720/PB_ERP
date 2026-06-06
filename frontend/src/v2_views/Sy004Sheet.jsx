import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tabs, Table, Input, Select, Button, Modal, Space, Tag, Empty, Spin, message } from 'antd';
import { ReloadOutlined, SaveOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';
import { useAuth } from '../auth/useAuth';
import { canExecuteCommand } from '../auth/permissionUtils';

export default function Sy004Sheet() {
  const { user, permissions } = useAuth();
  const is_prvl = user ? parseInt(user.privilege_class || '1', 10) : 1;

  // Data & State management
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('modules'); // 'modules' | 'system'
  const [changedData, setChangedData] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Refs to avoid stale closures in listeners
  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const changedDataRef = useRef({});
  useEffect(() => {
    changedDataRef.current = changedData;
  }, [changedData]);

  // Load parameter list from backend
  const fetchParameters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/sys-parameter/');
      setDataSource(response.data);
      setChangedData({});
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to fetch parameters:', err);
      message.error('載入系統參數失敗，請確認是否擁有 search 權限。');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch parameters on mount
  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  // confirm dialog wrapper for dirty state
  const confirmSwitch = useCallback((actionCallback) => {
    if (isDirtyRef.current) {
      Modal.confirm({
        title: '⚠️ 偵測到未儲存的變更',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: '您有修改尚未儲存，繼續操作將會丟失所有修改。確定要繼續嗎？',
        okText: '丟失變更並繼續',
        cancelText: '取消',
        onOk: () => {
          setChangedData({});
          setIsDirty(false);
          actionCallback();
        }
      });
    } else {
      actionCallback();
    }
  }, []);

  // Handle cell edit changes
  const handleCellChange = (gkey, field, value, record) => {
    setChangedData(prev => {
      const rowChanges = prev[gkey] || {};
      const newRowChanges = { ...rowChanges, [field]: value };

      const original = dataSource.find(r => r.gkey === gkey);
      if (original && original[field] === value) {
        delete newRowChanges[field];
      }

      const newChanged = { ...prev };
      if (Object.keys(newRowChanges).length === 0) {
        delete newChanged[gkey];
      } else {
        newChanged[gkey] = {
          ...original,
          ...newRowChanges
        };
      }

      setIsDirty(Object.keys(newChanged).length > 0);
      return newChanged;
    });
  };

  // Perform backend PATCH updates
  const executeSave = async (dirtyRows) => {
    setLoading(true);
    try {
      const promises = dirtyRows.map(row => {
        // Enforce using hisystem and parameterid as compound lookup
        return axios.patch(
          `/api/sys-parameter/${encodeURIComponent(row.parameterid)}/?hisystem=${encodeURIComponent(row.hisystem)}`,
          row
        );
      });
      await Promise.all(promises);
      message.success('系統參數更新成功，快取已失效重載！');
      setChangedData({});
      setIsDirty(false);
      fetchParameters();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.detail || '儲存失敗，請檢查權限或欄位限制。');
    } finally {
      setLoading(false);
    }
  };

  // Save handler with high-risk check
  const handleSave = useCallback(() => {
    // 檢查是否有 w_sy004 edit 權限
    if (!canExecuteCommand(permissions, 'w_sy004', 'edit', user)) {
      message.error('對不起，您沒有此作業的修改/儲存權限。');
      return;
    }

    const dirtyRows = Object.values(changedDataRef.current);
    if (dirtyRows.length === 0) {
      message.info('無修改的參數資料需要儲存。');
      return;
    }

    // High risk parameter double confirmation
    const modifiedHighRisk = dirtyRows.filter(row =>
      row.parameterid === 'LDAP' ||
      row.parameterid === 'doublelogin' ||
      row.parameterid === 'upgrading'
    );

    if (modifiedHighRisk.length > 0) {
      Modal.confirm({
        title: '⚠️ 修改高風險系統參數確認',
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        content: (
          <div>
            <p style={{ fontWeight: 'bold', color: '#ff4d4f' }}>警告：您即將變更攸關系統運作、驗證與連線控制的核心參數！</p>
            <p>即將修改之參數：<strong>{modifiedHighRisk.map(r => r.parameterid).join(', ')}</strong></p>
            <ul style={{ paddingLeft: '20px', fontSize: '13px' }}>
              <li><strong>LDAP</strong> 參數異動可能影響所有帳戶的 LDAP/一般登入驗證通路。</li>
              <li><strong>doublelogin</strong> 參數可能觸發或停用在線 Session 踢除防護。</li>
              <li><strong>upgrading</strong> 參數如果啟用，會拒絕所有非開發/客服管理人員的登入。</li>
            </ul>
            <p>您確定要寫入資料庫並使全系統快取立即失效嗎？</p>
          </div>
        ),
        okText: '確認儲存',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => executeSave(dirtyRows)
      });
    } else {
      executeSave(dirtyRows);
    }
  }, [permissions, user]);

  // Global MDI commands listener
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail || {};
      if (targetSheet !== 'sy004') return;

      console.log(`⚡ [Sy004Sheet] MDI Command received: ${action}`);

      if (action === 'retrieve') {
        confirmSwitch(() => fetchParameters());
      } else if (action === 'save') {
        handleSave();
      } else if (action === 'insert' || action === 'delete') {
        message.warning('系統參數由開發人員定義，不開放新增與刪除！');
      }
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [fetchParameters, handleSave, confirmSwitch]);

  // Table Columns Definition
  const columns = useMemo(() => [
    {
      title: '系統歸屬 (hisystem)',
      dataIndex: 'hisystem',
      key: 'hisystem',
      width: '120px',
    },
    {
      title: '參數代號 (parameterid)',
      dataIndex: 'parameterid',
      key: 'parameterid',
      width: '200px',
      render: (text) => is_prvl < 6 ? '***' : text,
    },
    {
      title: '序號 (serialno)',
      dataIndex: 'serialno',
      key: 'serialno',
      width: '90px',
      render: (text, record) => {
        const value = changedData[record.gkey]?.serialno !== undefined 
          ? changedData[record.gkey].serialno 
          : record.serialno;
        if (is_prvl >= 6) {
          return (
            <Input
              size="small"
              type="number"
              value={value === null ? '' : value}
              onChange={(e) => handleCellChange(record.gkey, 'serialno', e.target.value === '' ? null : parseInt(e.target.value, 10), record)}
            />
          );
        }
        return text;
      }
    },
    {
      title: '參數值 (parametervalue)',
      dataIndex: 'parametervalue',
      key: 'parametervalue',
      width: '200px',
      render: (text, record) => {
        const value = changedData[record.gkey]?.parametervalue !== undefined 
          ? changedData[record.gkey].parametervalue 
          : record.parametervalue;
        return (
          <Input
            size="small"
            value={value || ''}
            onChange={(e) => handleCellChange(record.gkey, 'parametervalue', e.target.value, record)}
          />
        );
      }
    },
    {
      title: '說明敘述 (description)',
      dataIndex: 'description',
      key: 'description',
      width: '280px',
      render: (text, record) => {
        const value = changedData[record.gkey]?.description !== undefined 
          ? changedData[record.gkey].description 
          : record.description;
        if (is_prvl >= 6) {
          return (
            <Input
              size="small"
              value={value || ''}
              onChange={(e) => handleCellChange(record.gkey, 'description', e.target.value, record)}
            />
          );
        }
        return text;
      }
    },
    {
      title: '訪問權限 (visitctrl)',
      dataIndex: 'visitctrl',
      key: 'visitctrl',
      width: '140px',
      render: (text, record) => {
        const value = changedData[record.gkey]?.visitctrl !== undefined 
          ? changedData[record.gkey].visitctrl 
          : record.visitctrl;
        if (is_prvl >= 6) {
          return (
            <Select
              size="small"
              value={value || '9'}
              style={{ width: '100%' }}
              onChange={(val) => handleCellChange(record.gkey, 'visitctrl', val, record)}
              options={[
                { value: '1', label: '1 - 用戶' },
                { value: '5', label: '5 - 管理員' },
                { value: '6', label: '6 - 客服' },
                { value: '7', label: '7 - 測試' },
                { value: '8', label: '8 - 開發' },
                { value: '9', label: '9 - 設計' },
              ]}
            />
          );
        }
        const mapping = { '1': '用戶', '5': '管理員', '6': '客服', '7': '測試', '8': '開發', '9': '設計' };
        return mapping[text] || text;
      }
    },
    {
      title: '特殊控制碼 (specialctrl)',
      dataIndex: 'specialctrl',
      key: 'specialctrl',
      width: '150px',
      render: (text, record) => {
        const value = changedData[record.gkey]?.specialctrl !== undefined 
          ? changedData[record.gkey].specialctrl 
          : record.specialctrl;
        if (is_prvl >= 6) {
          return (
            <Input
              size="small"
              value={value || ''}
              onChange={(e) => handleCellChange(record.gkey, 'specialctrl', e.target.value, record)}
            />
          );
        }
        return text;
      }
    },
    {
      title: '分類模組 (istype)',
      dataIndex: 'istype',
      key: 'istype',
      width: '140px',
      render: (text, record) => {
        const value = changedData[record.gkey]?.istype !== undefined 
          ? changedData[record.gkey].istype 
          : record.istype;
        if (is_prvl >= 6) {
          return (
            <Input
              size="small"
              value={value || ''}
              onChange={(e) => handleCellChange(record.gkey, 'istype', e.target.value, record)}
            />
          );
        }
        return text;
      }
    }
  ], [changedData, is_prvl]);

  // Filter lists based on tab selection
  const filteredData = useMemo(() => {
    if (activeTab === 'modules') {
      return dataSource.filter(item => item.istype !== '全系統');
    } else {
      return dataSource.filter(item => item.istype === '全系統');
    }
  }, [dataSource, activeTab]);

  return (
    <ERPSheetPage
      sheetId="sy004"
      title="系統參數設定工作台"
      breadcrumb={['系統設置', '系統參數設定']}
    >
      <div className="sy004-container" style={{ padding: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', background: 'var(--app-bg-banner)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>使用者權限等級:</span>
            <Tag color={is_prvl >= 6 ? 'gold' : 'blue'}>{is_prvl} - {is_prvl >= 9 ? '設計人員' : is_prvl >= 8 ? '開發人員' : is_prvl >= 6 ? '客服管理員' : '一般用戶'}</Tag>
          </div>
          {isDirty && (
            <Tag color="warning" style={{ fontWeight: 'bold' }}>⚠️ 參數有未儲存的變更</Tag>
          )}
        </div>

        <Tabs activeKey={activeTab} onChange={(key) => confirmSwitch(() => setActiveTab(key))} type="card">
          <Tabs.TabPane tab="⚙️ 模組運行參數" key="modules">
            <Spin spinning={loading}>
              <Table
                dataSource={filteredData}
                columns={columns}
                rowKey="gkey"
                pagination={false}
                bordered
                size="small"
                scroll={{ y: 'calc(100vh - 350px)' }}
              />
            </Spin>
          </Tabs.TabPane>
          <Tabs.TabPane tab="🌐 全系統安全參數" key="system">
            <Spin spinning={loading}>
              <Table
                dataSource={filteredData}
                columns={columns}
                rowKey="gkey"
                pagination={false}
                bordered
                size="small"
                scroll={{ y: 'calc(100vh - 350px)' }}
              />
            </Spin>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </ERPSheetPage>
  );
}
