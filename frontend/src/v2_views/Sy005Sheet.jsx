import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tabs, Table, Checkbox, Button, Modal, Select, Input, Row, Col, Space, Tag, Card, Empty, Spin, message, Alert, Form } from 'antd';
import { SearchOutlined, ReloadOutlined, SaveOutlined, CopyOutlined, SafetyOutlined, UserOutlined, GroupOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';
import { useAuth } from '../auth/useAuth';
import { canExecuteCommand } from '../auth/permissionUtils';

const FIELD_PERMISSION_FALLBACK_COLUMNS = {
  w_dp030: [
    { db_name: 'styleno', label: '型體編號 (styleno)' },
    { db_name: 'stylename', label: '型體名稱 (stylename)' },
    { db_name: 'logo', label: '商標 (logo)' },
    { db_name: 'cost', label: '成本 (cost)' },
    { db_name: 'profit', label: '利潤 (profit)' },
    { db_name: 'wagescost', label: '工資成本 (wagescost)' },
    { db_name: 'totalfob', label: '總 FOB (totalfob)' },
    { db_name: 'managecost', label: '管理費 (managecost)' },
  ]
};

export default function Sy005Sheet() {
  const { user, permissions } = useAuth();
  const hisystem = user?.hisystem || '01';

  // Navigation Tabs State
  const [activeTabKey, setActiveTabKey] = useState('1');

  // Selection states
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null); // { target_id, is_group, name }

  // Data states
  const [usersList, setUsersList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [matrixRows, setMatrixRows] = useState([]);
  
  // Field permissions state (Phase 9B-3)
  const [fieldPermissions, setFieldPermissions] = useState([]);
  const [loadingFieldPermissions, setLoadingFieldPermissions] = useState(false);
  const [selectedFieldProgram, setSelectedFieldProgram] = useState('w_dp030');

  // Constraint permissions state (Phase 9B-4)
  const [constraintValues, setConstraintValues] = useState([]); // [{cgkey, cname}]
  const [loadingConstraint, setLoadingConstraint] = useState(false);
  const [selectedConstraintProgram, setSelectedConstraintProgram] = useState('w_dp030');
  const [selectedConstraintKeycol, setSelectedConstraintKeycol] = useState('es101gkey');
  const [selectedConstraintType, setSelectedConstraintType] = useState('in_list');
  const [es101Options, setEs101Options] = useState([]);
  const [loadingEs101Options, setLoadingEs101Options] = useState(false);
  // Search filter
  const [userSearchText, setUserSearchText] = useState('');
  const [groupSearchText, setGroupSearchText] = useState('');
  const [matrixSearchText, setMatrixSearchText] = useState('');

  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingUserGroups, setLoadingUserGroups] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  // Dirty state tracking (Unsaved warning)
  const [isDirty, setIsDirty] = useState(false);

  // Copy Permissions Modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyForm] = Form.useForm();

  // C1-3D CRUD Modals State
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [userModalType, setUserModalType] = useState('create'); // 'create' | 'edit'
  const [editingUser, setEditingUser] = useState(null);
  const [userForm] = Form.useForm();
  const [changePwdChecked, setChangePwdChecked] = useState(false);

  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupModalType, setGroupModalType] = useState('create'); // 'create' | 'edit'
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm] = Form.useForm();

  // Es101 employee list
  const [es101List, setEs101List] = useState([]);
  const [loadingEs101, setLoadingEs101] = useState(false);

  // Group assign/remove modal
  const [relationModalVisible, setRelationModalVisible] = useState(false);
  const [relationActionType, setRelationActionType] = useState('add'); // 'add' | 'remove'
  const [targetGroupCode, setTargetGroupCode] = useState(null);

  // Selected Target Ref to avoid stale closures in listeners
  const selectedTargetRef = useRef(null);
  useEffect(() => {
    selectedTargetRef.current = selectedTarget;
  }, [selectedTarget]);

  // Tab Key Ref
  const activeTabKeyRef = useRef('1');
  useEffect(() => {
    activeTabKeyRef.current = activeTabKey;
  }, [activeTabKey]);

  // Dirty State Ref
  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get('/api/auth/users/');
      setUsersList(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
      message.error('載入使用者列表失敗');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Fetch Groups
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const response = await axios.get(`/api/auth/groups/?hisystem=${hisystem}`);
      setGroupsList(response.data);
    } catch (err) {
      console.error('Failed to load groups:', err);
      message.error('載入權限群組列表失敗');
    } finally {
      setLoadingGroups(false);
    }
  }, [hisystem]);

  // Fetch User Groups
  const fetchUserGroups = useCallback(async (accountsId) => {
    setLoadingUserGroups(true);
    try {
      const response = await axios.get(`/api/auth/user-groups/?accounts_id=${encodeURIComponent(accountsId)}&hisystem=${hisystem}`);
      setUserGroups(response.data);
    } catch (err) {
      console.error('Failed to load user groups:', err);
      setUserGroups([]);
    } finally {
      setLoadingUserGroups(false);
    }
  }, [hisystem]);

  // Fetch matrix rows
  const fetchMatrix = useCallback(async (targetObj) => {
    const activeTarget = targetObj || selectedTargetRef.current;
    if (!activeTarget) return;

    setLoadingMatrix(true);
    try {
      const response = await axios.get(`/api/auth/permission-matrix/?target_id=${encodeURIComponent(activeTarget.target_id)}&is_group=${activeTarget.is_group}&hisystem=${hisystem}`);
      setMatrixRows(response.data.menus || []);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to load matrix:', err);
      message.error(err.response?.data?.detail || '載入權限矩陣失敗');
      setMatrixRows([]);
    } finally {
      setLoadingMatrix(false);
    }
  }, [hisystem]);
  // Fetch field permissions
  const fetchFieldPermissions = useCallback(async (targetObj, program) => {
    const activeTarget = targetObj || selectedTargetRef.current;
    if (!activeTarget || activeTarget.is_group) return;

    setLoadingFieldPermissions(true);
    try {
      const response = await axios.get(`/api/sys-accounts-column/?accounts_id=${encodeURIComponent(activeTarget.target_id)}&obj_name=${encodeURIComponent(program || selectedFieldProgram)}&hisystem=${hisystem}`);
      setFieldPermissions(response.data || []);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to load field permissions:', err);
      message.error(err.response?.data?.detail || '載入欄位權限失敗');
      setFieldPermissions([]);
    } finally {
      setLoadingFieldPermissions(false);
    }
  }, [hisystem, selectedFieldProgram]);

  // Save Field Permissions
  const handleSaveFieldPermissions = async () => {
    if (!selectedTarget || selectedTarget.is_group) return;

    // Enforce w_sy005 edit permission guard
    if (!canExecuteCommand('w_sy005', 'edit', permissions)) {
      message.error('您沒有權限修改欄位權限設定');
      return;
    }

    try {
      const payload = {
        accounts_id: selectedTarget.target_id,
        obj_name: selectedFieldProgram,
        hisystem: hisystem,
        columns: fieldPermissions.map(item => ({
          db_name: item.db_name,
          kind: item.kind
        }))
      };

      await axios.post('/api/sys-accounts-column/batch_save/', payload);
      message.success('欄位權限儲存成功。請重新登入或重刷頁面以套用最新權限。');
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save field permissions:', err);
      message.error(err.response?.data?.detail || '欄位權限儲存失敗');
    }
  };

  const handleFieldPermissionChange = (dbName, newKind) => {
    setIsDirty(true);
    setFieldPermissions(prev => {
      const exists = prev.find(p => p.db_name === dbName);
      if (newKind === 'none') {
        return prev.filter(p => p.db_name !== dbName);
      }
      if (exists) {
        return prev.map(p => p.db_name === dbName ? { ...p, kind: newKind } : p);
      }
      return [...prev, { db_name: dbName, kind: newKind }];
    });
  };

  const fetchEs101Options = async () => {
    try {
      setLoadingEs101Options(true);
      const res = await axios.get('/api/es101/');
      const options = (res.data?.results || res.data || []).map(e => ({
        label: `${e.employeeno || e.gkey} - ${e.cname || e.username || ''}`,
        value: e.gkey,
        cname: e.cname || e.username || e.employeeno || ''
      }));
      setEs101Options(options);
    } catch (err) {
      console.error('Failed to fetch es101:', err);
      message.error('無法載入員工清單');
    } finally {
      setLoadingEs101Options(false);
    }
  };

  const fetchConstraints = async (target = selectedTarget, program = selectedConstraintProgram, keycol = selectedConstraintKeycol) => {
    if (!target || target.is_group) {
      setConstraintValues([]);
      return;
    }
    try {
      setLoadingConstraint(true);
      const res = await axios.get('/api/sys-constraint/', {
        params: { accounts_id: target.target_id, obj_name: program, hisystem: hisystem }
      });
      const data = res.data;
      const targetConstraint = data.find(c => c.keycol === keycol);
      if (targetConstraint) {
        setConstraintValues(targetConstraint.values || []);
        setSelectedConstraintType(targetConstraint.constraint_type || 'in_list');
      } else {
        setConstraintValues([]);
        setSelectedConstraintType('in_list');
      }
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to fetch constraints:', err);
      message.error('載入資料範圍約束失敗');
    } finally {
      setLoadingConstraint(false);
    }
  };

  const handleSaveConstraints = async () => {
    if (!selectedTarget || selectedTarget.is_group) return;

    if (!canExecuteCommand('w_sy005', 'edit', permissions)) {
      message.error('您沒有權限修改資料範圍約束設定');
      return;
    }

    const payload = {
      hisystem: hisystem,
      accounts_id: selectedTarget.target_id,
      obj_name: selectedConstraintProgram,
      keycol: selectedConstraintKeycol,
      constraint_type: selectedConstraintType,
      values: constraintValues
    };

    const doSave = async () => {
      try {
        await axios.post('/api/sys-constraint/batch_save/', payload);
        message.success('資料範圍約束儲存成功。該限制已立即影響 API 權限。');
        setIsDirty(false);
      } catch (err) {
        console.error('Failed to save constraints:', err);
        message.error(err.response?.data?.detail || '資料範圍約束儲存失敗');
      }
    };

    if (constraintValues.length === 0) {
      Modal.confirm({
        title: '你即將清空此帳號的資料範圍限制',
        icon: <ExclamationCircleOutlined />,
        content: `清空後，此帳號將不再受 ${selectedConstraintKeycol} 限制，將可看到此作業的全部資料。是否確認？`,
        okText: '確認清空',
        cancelText: '取消',
        onOk: doSave
      });
    } else {
      doSave();
    }
  };

  const handleAddConstraintValue = (gkey, cname) => {
    if (constraintValues.find(v => v.cgkey === gkey)) {
      message.warning('該允許值已存在');
      return;
    }
    setIsDirty(true);
    setConstraintValues(prev => [...prev, { cgkey: gkey, cname }]);
  };

  const handleRemoveConstraintValue = (gkey) => {
    setIsDirty(true);
    setConstraintValues(prev => prev.filter(v => v.cgkey !== gkey));
  };

  // Load database lists on mount
  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchEs101Options();
  }, [fetchUsers, fetchGroups]);

  // Guard Helper: confirms switching when dirty
  const confirmSwitch = useCallback((onConfirm) => {
    if (isDirtyRef.current) {
      Modal.confirm({
        title: '目前權限尚未儲存，是否放棄變更？',
        icon: <ExclamationCircleOutlined />,
        content: '切換對象將會放棄未儲存的權限變更。是否繼續？',
        okText: '放棄變更並切換',
        cancelText: '取消',
        onOk: () => {
          setIsDirty(false);
          onConfirm();
        }
      });
    } else {
      onConfirm();
    }
  }, []);

  // Handle Tab Switch
  const handleTabChange = (key) => {
    confirmSwitch(() => {
      setActiveTabKey(key);
      if (key === '4' && selectedTarget && !selectedTarget.is_group) {
        fetchFieldPermissions(selectedTarget, selectedFieldProgram);
      }
      if (key === '5' && selectedTarget && !selectedTarget.is_group) {
        fetchConstraints(selectedTarget, selectedConstraintProgram, selectedConstraintKeycol);
      }
    });
  };

  // Perform User Selection
  const performSelectUser = (record) => {
    setSelectedUser(record);
    const target = {
      target_id: record.accounts_id,
      is_group: false,
      label: `${record.accounts_id} / ${record.accounts || ''}`,
      name: record.accounts || ''
    };
    setSelectedTarget(target);
    fetchUserGroups(record.accounts_id);
    if (activeTabKeyRef.current === '4') {
      fetchFieldPermissions(target, selectedFieldProgram);
    }
    if (activeTabKeyRef.current === '5') {
      fetchConstraints(target, selectedConstraintProgram, selectedConstraintKeycol);
    }
  };

  const handleSelectUser = (record) => {
    confirmSwitch(() => {
      performSelectUser(record);
    });
  };

  // Perform Group Selection
  const performSelectGroup = (record) => {
    setSelectedGroup(record);
    setSelectedTarget({
      target_id: record.group_code,
      is_group: true,
      label: `${record.group_code} / ${record.group_name || ''}`,
      name: record.group_name || ''
    });
  };

  const handleSelectGroup = (record) => {
    confirmSwitch(() => {
      performSelectGroup(record);
    });
  };

  // Trigger matrix load for User
  const handleLoadUserMatrix = () => {
    let target = selectedTarget;
    if (!target && selectedUser) {
      target = {
        target_id: selectedUser.accounts_id,
        is_group: false,
        label: `${selectedUser.accounts_id} / ${selectedUser.accounts || ''}`,
        name: selectedUser.accounts || ''
      };
      setSelectedTarget(target);
    }
    if (!target) return;
    fetchMatrix(target);
    setActiveTabKey('3');
  };

  // Trigger matrix load for Group
  const handleLoadGroupMatrix = () => {
    let target = selectedTarget;
    if (!target && selectedGroup) {
      target = {
        target_id: selectedGroup.group_code,
        is_group: true,
        label: `${selectedGroup.group_code} / ${selectedGroup.group_name || ''}`,
        name: selectedGroup.group_name || ''
      };
      setSelectedTarget(target);
    }
    if (!target) return;
    fetchMatrix(target);
    setActiveTabKey('3');
  };

  // Save Permissions Matrix (Rule 6 should_refresh_permissions=true check)
  const handleSavePermissions = async () => {
    if (!selectedTarget) return;

    // Enforce w_sy005 edit permission guard
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的修改/儲存權限。');
      return;
    }

    // Filter out rows that do not have an obj_name to keep payload clean
    const permissionsPayload = matrixRows
      .filter(r => r.obj_name && r.obj_name.trim() !== '')
      .map(r => ({
        obj_name: r.obj_name,
        menu_visible: r.menu_visible,
        actions: r.actions || {}
      }));

    const payload = {
      target_id: selectedTarget.target_id,
      is_group: selectedTarget.is_group,
      hisystem: hisystem,
      permissions: permissionsPayload
    };

    setLoadingMatrix(true);
    try {
      const response = await axios.post('/api/auth/save-permissions/', payload);
      if (response.data.success) {
        message.success(response.data.message || '權限儲存成功');
        setIsDirty(false);
        fetchMatrix(selectedTarget);
        if (response.data.should_refresh_permissions) {
          message.info('權限已更新，使用者重新登入或系統重整後生效。');
        }
      }
    } catch (err) {
      console.error('Failed to save permissions:', err);
      message.error(err.response?.data?.detail || '儲存權限失敗，請檢查權限設定。');
    } finally {
      setLoadingMatrix(false);
    }
  };

  // Apply Group Permissions to User
  const handleApplyGroupPermissions = async (accountsId) => {
    // Enforce w_sy005 edit permission guard
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的修改/套用權限。');
      return;
    }

    setLoadingUserGroups(true);
    try {
      const payload = { accounts_id: accountsId, hisystem };
      const response = await axios.post('/api/auth/apply-group-permissions/', payload);
      if (response.data.success) {
        message.success('群組權限已套用，請重新載入權限矩陣確認。');
        if (selectedTarget && selectedTarget.target_id === accountsId && !selectedTarget.is_group) {
          fetchMatrix(selectedTarget);
        }
      }
    } catch (err) {
      console.error('Failed to apply group permissions:', err);
      message.error(err.response?.data?.detail || '套用群組權限失敗');
    } finally {
      setLoadingUserGroups(false);
    }
  };

  // Fetch Es101
  const fetchEs101 = useCallback(async () => {
    setLoadingEs101(true);
    try {
      const response = await axios.get('/api/es101/');
      setEs101List(response.data);
    } catch (err) {
      console.error('Failed to load es101:', err);
    } finally {
      setLoadingEs101(false);
    }
  }, []);

  const handleCreateUser = () => {
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的修改/新增權限。');
      return;
    }
    setUserModalType('create');
    setEditingUser(null);
    setChangePwdChecked(false);
    userForm.resetFields();
    userForm.setFieldsValue({
      peopdom_class: '1',
      status_sign: '0',
      hisystem: hisystem
    });
    fetchEs101();
    setUserModalVisible(true);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的修改權限。');
      return;
    }
    setUserModalType('edit');
    setEditingUser(selectedUser);
    setChangePwdChecked(false);
    userForm.resetFields();
    userForm.setFieldsValue({
      accounts: selectedUser.accounts,
      peopdom_class: selectedUser.peopdom_class,
      status_sign: selectedUser.status_sign,
      es101_employeeno: selectedUser.es101_employeeno
    });
    fetchEs101();
    setUserModalVisible(true);
  };

  const handleUserModalSubmit = async () => {
    try {
      const values = await userForm.validateFields();
      if (userModalType === 'edit' && editingUser) {
        const isSelf = editingUser.accounts_id === user.username || editingUser.accounts === user.username;
        if (isSelf) {
          if (values.peopdom_class !== editingUser.peopdom_class) {
            message.error('禁止修改自己的權限等級。');
            return;
          }
          if (values.status_sign !== editingUser.status_sign) {
            message.error('禁止停用/變更自己的帳號狀態。');
            return;
          }
        }
      }

      const operatorAcct = usersList.find(u => u.accounts_id === user.username || u.accounts === user.username);
      const operatorLevel = operatorAcct ? parseInt(operatorAcct.peopdom_class, 10) : 1;
      const targetLevel = parseInt(values.peopdom_class, 10);
      if (targetLevel > operatorLevel && !user.is_superuser) {
        message.error(`一般管理員不可將權限等級提升至大於自己 (${operatorLevel})。`);
        return;
      }

      const payload = { ...values };
      if (userModalType === 'edit') {
        if (!changePwdChecked) {
          delete payload.user_pwd;
        }
        const response = await axios.patch(`/api/auth/users/${encodeURIComponent(editingUser.accounts_id)}/`, payload);
        if (response.data) {
          message.success('使用者更新成功');
          setUserModalVisible(false);
          fetchUsers();
          if (selectedUser && selectedUser.accounts_id === editingUser.accounts_id) {
            setSelectedUser(response.data);
          }
        }
      } else {
        const response = await axios.post('/api/auth/users/', payload);
        if (response.data) {
          message.success('使用者建立成功');
          setUserModalVisible(false);
          fetchUsers();
        }
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.detail || err.response?.data?.accounts?.[0] || err.response?.data?.es101_employeeno?.[0] || '操作失敗');
    }
  };

  const handleCreateGroup = () => {
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的修改/新增權限。');
      return;
    }
    setGroupModalType('create');
    setEditingGroup(null);
    groupForm.resetFields();
    groupForm.setFieldsValue({
      hisystem: hisystem
    });
    setGroupModalVisible(true);
  };

  const handleEditGroup = () => {
    if (!selectedGroup) return;
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的修改權限。');
      return;
    }
    setGroupModalType('edit');
    setEditingGroup(selectedGroup);
    groupForm.resetFields();
    groupForm.setFieldsValue({
      group_code: selectedGroup.group_code,
      group_name: selectedGroup.group_name,
      hisystem: selectedGroup.hisystem
    });
    setGroupModalVisible(true);
  };

  const handleGroupModalSubmit = async () => {
    try {
      const values = await groupForm.validateFields();
      if (groupModalType === 'edit') {
        const response = await axios.patch(`/api/auth/groups/${encodeURIComponent(editingGroup.group_code)}/`, values);
        if (response.data) {
          message.success('群組更新成功');
          setGroupModalVisible(false);
          fetchGroups();
          if (selectedGroup && selectedGroup.group_code === editingGroup.group_code) {
            setSelectedGroup(response.data);
          }
        }
      } else {
        const response = await axios.post('/api/auth/groups/', values);
        if (response.data) {
          message.success('群組建立成功');
          setGroupModalVisible(false);
          fetchGroups();
        }
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.detail || err.response?.data?.group_name?.[0] || err.response?.data?.group_code?.[0] || '操作失敗');
    }
  };

  const handleAddUserToGroup = (groupCode) => {
    if (!selectedUser) return;
    setRelationActionType('add');
    setTargetGroupCode(groupCode);
    setRelationModalVisible(true);
  };

  const handleRemoveUserFromGroup = (groupCode) => {
    if (!selectedUser) return;
    setRelationActionType('remove');
    setTargetGroupCode(groupCode);
    setRelationModalVisible(true);
  };

  const handleRelationSubmit = async (confirmWithAction) => {
    setRelationModalVisible(false);
    if (relationActionType === 'add') {
      try {
        const response = await axios.post('/api/auth/user-groups/', {
          accounts_id: selectedUser.accounts_id,
          group_code: targetGroupCode,
          hisystem: hisystem,
          apply_permissions: confirmWithAction
        });
        if (response.data.success) {
          message.success(response.data.message || '群組指派成功');
          fetchUserGroups(selectedUser.accounts_id);
          if (selectedTarget && selectedTarget.target_id === selectedUser.accounts_id && !selectedTarget.is_group) {
            fetchMatrix(selectedTarget);
          }
        }
      } catch (err) {
        console.error(err);
        message.error(err.response?.data?.detail || '指派群組失敗');
      }
    } else {
      try {
        const response = await axios.delete('/api/auth/user-groups/', {
          data: {
            accounts_id: selectedUser.accounts_id,
            group_code: targetGroupCode,
            hisystem: hisystem,
            recalculate_permissions: confirmWithAction
          }
        });
        if (response.data.success) {
          message.success(response.data.message || '移除群組成功');
          fetchUserGroups(selectedUser.accounts_id);
          if (selectedTarget && selectedTarget.target_id === selectedUser.accounts_id && !selectedTarget.is_group) {
            fetchMatrix(selectedTarget);
          }
        }
      } catch (err) {
        console.error(err);
        message.error(err.response?.data?.detail || '移除群組失敗');
      }
    }
  };

  const handleToggleUserStatus = async (userRecord) => {
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的修改權限。');
      return;
    }
    const isSelf = userRecord.accounts_id === user.username || userRecord.accounts === user.username;
    if (isSelf && userRecord.status_sign === '0') {
      message.error('禁止停用自己當前登入的帳號。');
      return;
    }
    const actionText = userRecord.status_sign === '0' ? '停用' : '啟用';
    Modal.confirm({
      title: `確定要${actionText}使用者帳號嗎？`,
      icon: <ExclamationCircleOutlined />,
      content: `您即將${actionText}帳號: ${userRecord.accounts_id}。`,
      onOk: async () => {
        try {
          const endpoint = userRecord.status_sign === '0' ? 'disable' : 'enable';
          const response = await axios.post(`/api/auth/users/${encodeURIComponent(userRecord.accounts_id)}/${endpoint}/`);
          if (response.data.success) {
            message.success(response.data.message);
            fetchUsers();
            if (selectedUser && selectedUser.accounts_id === userRecord.accounts_id) {
              setSelectedUser(prev => ({ ...prev, status_sign: userRecord.status_sign === '0' ? '1' : '0' }));
            }
          }
        } catch (err) {
          console.error(err);
          message.error(err.response?.data?.detail || `${actionText}失敗`);
        }
      }
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的刪除權限。');
      return;
    }
    const isSelf = selectedUser.accounts_id === user.username || selectedUser.accounts === user.username;
    if (isSelf) {
      message.error('禁止刪除自己當前登入的帳號。');
      return;
    }
    Modal.confirm({
      title: '確定要物理刪除使用者嗎？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ 警告：此操作不可逆！</p>
          <p>物理刪除此使用者帳號將會<strong>級聯清除</strong>：</p>
          <p>1. 該使用者的個人權限設定 (sys_popedom)</p>
          <p>2. 該使用者的群組成員指派關係 (sys_accounts_group)</p>
          <p>您確定要繼續執行刪除嗎？</p>
        </div>
      ),
      okText: '確認刪除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await axios.delete(`/api/auth/users/${encodeURIComponent(selectedUser.accounts_id)}/`);
          if (response.data.success) {
            message.success(response.data.message || '使用者已成功刪除');
            setSelectedUser(null);
            if (selectedTarget && selectedTarget.target_id === selectedUser.accounts_id && !selectedTarget.is_group) {
              setSelectedTarget(null);
              setMatrixRows([]);
            }
            fetchUsers();
          }
        } catch (err) {
          console.error(err);
          message.error(err.response?.data?.detail || '刪除使用者失敗');
        }
      }
    });
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的刪除權限。');
      return;
    }
    Modal.confirm({
      title: '確定要物理刪除權限群組嗎？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ 警告：此操作將影響所有群組成員，且不可逆！</p>
          <p>刪除此群組將會：</p>
          <p>1. 物理刪除該群組定義及所有關聯權限設定 (sys_popedom)</p>
          <p>2. 自動解除所有成員的群組關係，並對所有成員執行 <strong>OutGroup 權限扣減計算與權限重算</strong>。</p>
          <p>這可能會修改其他成員的實際權限，您確定要繼續執行刪除嗎？</p>
        </div>
      ),
      okText: '確認刪除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await axios.delete(`/api/auth/groups/${encodeURIComponent(selectedGroup.group_code)}/?hisystem=${hisystem}`);
          if (response.data.success) {
            message.success(response.data.message || '群組已成功刪除');
            setSelectedGroup(null);
            if (selectedTarget && selectedTarget.target_id === selectedGroup.group_code && selectedTarget.is_group) {
              setSelectedTarget(null);
              setMatrixRows([]);
            }
            fetchGroups();
            fetchUsers();
          }
        } catch (err) {
          console.error(err);
          message.error(err.response?.data?.detail || '刪除群組失敗');
        }
      }
    });
  };

  // Copy permissions modal submit
  const handleCopyPermissions = async () => {
    // Enforce w_sy005 edit permission guard
    if (!canExecuteCommand(permissions, 'sy005', 'edit', user)) {
      message.error('對不起，您沒有此作業的複製權限。');
      return;
    }

    try {
      const values = await copyForm.validateFields();
      const payload = {
        source_id: values.source_id,
        is_source_group: values.source_type === 'group',
        target_id: values.target_id,
        is_target_group: values.target_type === 'group',
        hisystem: hisystem
      };

      setLoadingMatrix(true);
      const response = await axios.post('/api/auth/copy-permissions/', payload);
      if (response.data.success) {
        message.success(response.data.message || '權限複製成功');
        setIsCopyModalOpen(false);
        // If current selected target is target_id, reload matrix
        if (selectedTarget && selectedTarget.target_id === values.target_id && selectedTarget.is_group === (values.target_type === 'group')) {
          fetchMatrix(selectedTarget);
        }
      }
    } catch (err) {
      console.error('Failed to copy permissions:', err);
      message.error(err.response?.data?.detail || '複製權限失敗');
    } finally {
      setLoadingMatrix(false);
    }
  };

  // Open copy modal with default target
  const openCopyModal = () => {
    copyForm.resetFields();
    if (selectedTarget) {
      copyForm.setFieldsValue({
        target_type: selectedTarget.is_group ? 'group' : 'user',
        target_id: selectedTarget.target_id,
        source_type: 'group'
      });
    } else {
      copyForm.setFieldsValue({
        source_type: 'group',
        target_type: 'user'
      });
    }
    setIsCopyModalOpen(true);
  };

  // Global MDI commands listener
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail || {};
      if (targetSheet !== 'sy005') return;

      console.log(`⚡ [Sy005Sheet] MDI Command received: ${action}`);

      if (action === 'save') {
        if (activeTabKeyRef.current === '3') {
          handleSavePermissions();
        }
      } else if (action === 'retrieve') {
        confirmSwitch(() => {
          if (activeTabKeyRef.current === '1') {
            fetchUsers();
          } else if (activeTabKeyRef.current === '2') {
            fetchGroups();
          } else if (activeTabKeyRef.current === '3' && selectedTargetRef.current) {
            fetchMatrix(selectedTargetRef.current);
          }
        });
      } else if (action === 'insert') {
        if (activeTabKeyRef.current === '1') {
          handleCreateUser();
        } else if (activeTabKeyRef.current === '2') {
          handleCreateGroup();
        }
      } else if (action === 'edit') {
        if (activeTabKeyRef.current === '1') {
          handleEditUser();
        } else if (activeTabKeyRef.current === '2') {
          handleEditGroup();
        }
      } else if (action === 'delete') {
        if (activeTabKeyRef.current === '1') {
          handleDeleteUser();
        } else if (activeTabKeyRef.current === '2') {
          handleDeleteGroup();
        }
      }
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [fetchUsers, fetchGroups, fetchMatrix, confirmSwitch]);

  // Checkbox state modify handlers
  const handleMenuVisibleChange = (prgCode, checked) => {
    setMatrixRows(prev => prev.map(row => {
      if (row.prg_code === prgCode) {
        const updatedActions = { ...row.actions };
        if (!checked) {
          // Rule 4: If menu_visible is unchecked, all actions in the row are unchecked
          Object.keys(updatedActions).forEach(key => {
            updatedActions[key] = false;
          });
        }
        return {
          ...row,
          menu_visible: checked,
          actions: updatedActions
        };
      }
      return row;
    }));
    setIsDirty(true);
  };

  const handleActionChange = (prgCode, actId, checked) => {
    setMatrixRows(prev => prev.map(row => {
      if (row.prg_code === prgCode) {
        return {
          ...row,
          actions: {
            ...row.actions,
            [actId]: checked
          }
        };
      }
      return row;
    }));
    setIsDirty(true);
  };

  // Matrix rows filter & build Tree Data
  const buildTreeData = useCallback((rows) => {
    if (!rows || rows.length === 0) return [];
    
    const sorted = [...rows];
    const map = {};
    const roots = [];
    
    sorted.forEach(item => {
      map[item.prg_code] = {
        ...item,
        key: item.prg_code,
        children: []
      };
    });
    
    sorted.forEach(item => {
      const node = map[item.prg_code];
      const parentCode = item.parent_code;
      if (!parentCode || !map[parentCode]) {
        roots.push(node);
      } else {
        map[parentCode].children.push(node);
      }
    });

    const cleanTree = (nodes) => {
      nodes.forEach(node => {
        if (node.children.length === 0) {
          delete node.children;
        } else {
          cleanTree(node.children);
        }
      });
    };
    cleanTree(roots);
    return roots;
  }, []);

  const filteredTreeData = useMemo(() => {
    if (!matrixSearchText) return buildTreeData(matrixRows);
    const query = matrixSearchText.toLowerCase();
    
    const matchingCodes = new Set();
    matrixRows.forEach(item => {
      if (
        (item.prg_code && item.prg_code.toLowerCase().includes(query)) ||
        (item.prg_name && item.prg_name.toLowerCase().includes(query)) ||
        (item.obj_name && item.obj_name.toLowerCase().includes(query))
      ) {
        matchingCodes.add(item.prg_code);
      }
    });

    const codesToKeep = new Set();
    const addNodeAndParents = (prgCode) => {
      if (!prgCode || codesToKeep.has(prgCode)) return;
      codesToKeep.add(prgCode);
      const item = matrixRows.find(r => r.prg_code === prgCode);
      if (item && item.parent_code) {
        addNodeAndParents(item.parent_code);
      }
    };

    matchingCodes.forEach(code => addNodeAndParents(code));
    const filteredRows = matrixRows.filter(r => codesToKeep.has(r.prg_code));
    return buildTreeData(filteredRows);
  }, [matrixRows, matrixSearchText, buildTreeData]);

  // Extract all unique actions in standard order dynamically
  const uniqueActions = useMemo(() => {
    const actions = [];
    matrixRows.forEach(m => {
      (m.action_defs || []).forEach(def => {
        if (!actions.includes(def.popedom_id)) {
          actions.push(def.popedom_id);
        }
      });
    });

    const standardOrder = ['search', 'new', 'edit', 'delete', 'check', 'print', 'excel'];
    actions.sort((a, b) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return actions;
  }, [matrixRows]);

  // Dynamic columns definition
  const columns = useMemo(() => {
    const baseCols = [
      {
        title: '選單代碼',
        dataIndex: 'prg_code',
        key: 'prg_code',
        width: 150,
        fixed: 'left'
      },
      {
        title: '選單名稱',
        dataIndex: 'prg_name',
        key: 'prg_name',
        width: 220,
        fixed: 'left'
      },
      {
        title: '視窗物件 (obj_name)',
        dataIndex: 'obj_name',
        key: 'obj_name',
        width: 150,
        render: (text) => text || <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>目錄</span>
      },
      {
        title: '顯示',
        key: 'menu_visible',
        width: 90,
        align: 'center',
        render: (_, record) => (
          <Checkbox
            checked={record.menu_visible}
            onChange={(e) => handleMenuVisibleChange(record.prg_code, e.target.checked)}
          />
        )
      }
    ];

    const actionCols = uniqueActions.map(actId => {
      // Find a display label for this action
      let label = actId;
      for (const row of matrixRows) {
        const d = (row.action_defs || []).find(def => def.popedom_id === actId);
        if (d && d.popedom_desc) {
          label = d.popedom_desc;
          break;
        }
      }

      return {
        title: label,
        key: actId,
        width: 100,
        align: 'center',
        render: (_, record) => {
          // Disable checkbox if this menu item doesn't support the action
          const hasAction = (record.action_defs || []).some(def => def.popedom_id === actId);
          if (!hasAction) {
            return <Checkbox disabled checked={false} />;
          }

          const isChecked = !!record.actions?.[actId];
          const isDisabled = !record.menu_visible; // Rule 4: Disable actions if menu hidden

          return (
            <Checkbox
              checked={isChecked}
              disabled={isDisabled}
              onChange={(e) => handleActionChange(record.prg_code, actId, e.target.checked)}
            />
          );
        }
      };
    });

    return [...baseCols, ...actionCols];
  }, [uniqueActions, matrixRows]);

  // Tab 1: User list filter
  const filteredUsers = useMemo(() => {
    if (!userSearchText) return usersList;
    const query = userSearchText.toLowerCase();
    return usersList.filter(u =>
      (u.accounts_id && u.accounts_id.toLowerCase().includes(query)) ||
      (u.accounts && u.accounts.toLowerCase().includes(query)) ||
      (u.user_id && u.user_id.toLowerCase().includes(query))
    );
  }, [usersList, userSearchText]);

  // Tab 2: Group list filter
  const filteredGroups = useMemo(() => {
    if (!groupSearchText) return groupsList;
    const query = groupSearchText.toLowerCase();
    return groupsList.filter(g =>
      (g.group_code && g.group_code.toLowerCase().includes(query)) ||
      (g.group_name && g.group_name.toLowerCase().includes(query))
    );
  }, [groupsList, groupSearchText]);

  const fieldPermissionTableColumns = [
    {
      title: '資料表欄位',
      dataIndex: 'db_name',
      width: 150,
      render: (text) => <code>{text}</code>
    },
    {
      title: '欄位說明 (標籤)',
      dataIndex: 'label',
    },
    {
      title: '權限設定',
      width: 300,
      render: (_, record) => {
        const currentSetting = fieldPermissions.find(p => p.db_name === record.db_name)?.kind || 'none';
        return (
          <Select
            value={currentSetting}
            onChange={(val) => handleFieldPermissionChange(record.db_name, val)}
            style={{ width: '100%' }}
            disabled={!canExecuteCommand('w_sy005', 'edit', permissions)}
          >
            <Select.Option value="none">無限制 (預設)</Select.Option>
            <Select.Option value="readonly">唯讀 (Readonly)</Select.Option>
            <Select.Option value="hide">隱藏 (Hide)</Select.Option>
          </Select>
        );
      }
    }
  ];

  return (
    <ERPSheetPage
      sheetId="sy005"
      title="使用者與群組權限管理工作台"
      breadcrumb={['系統設置', '權限管理工作台']}
    >
      <div className="sy005-container">
        <div className="sy005-target-banner">
          <div>
            <span style={{ fontWeight: 'bold', marginRight: '8px' }}>當前授權對象:</span>
            {selectedTarget ? (
              <Tag color={selectedTarget.is_group ? 'purple' : 'blue'} style={{ fontSize: '13px', padding: '4px 10px' }}>
                {selectedTarget.is_group ? <GroupOutlined /> : <UserOutlined />} {selectedTarget.label.includes(selectedTarget.target_id) ? selectedTarget.label : `${selectedTarget.target_id} / ${selectedTarget.label}`}
              </Tag>
            ) : (
              <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>未選取對象，請先於帳號或群組頁籤點擊載入</span>
            )}
          </div>
          {isDirty && (
            <div className="sy005-dirty-badge">
              ⚠️ 權限矩陣有未儲存的變更
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <Tabs activeKey={activeTabKey} onChange={handleTabChange} type="card">
          <Tabs.TabPane tab="👤 使用者帳號維護" key="1">
            <div className="sy005-split-layout">
              {/* Left Grid: User Accounts List */}
              <div className="sy005-list-panel">
                <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                  <Input
                    placeholder="搜尋帳號 / 姓名 / 員工編號"
                    prefix={<SearchOutlined />}
                    value={userSearchText}
                    onChange={(e) => setUserSearchText(e.target.value)}
                    style={{ flex: 1 }}
                    allowClear
                  />
                  <Button type="primary" onClick={handleCreateUser}>
                    新增使用者
                  </Button>
                </div>
                <Table
                  dataSource={filteredUsers}
                  rowKey="accounts_id"
                  loading={loadingUsers}
                  pagination={{ pageSize: 12, size: 'small' }}
                  size="small"
                  scroll={{ y: 'calc(100vh - 430px)' }}
                  rowClassName={(record) => (selectedUser?.accounts_id === record.accounts_id ? 'ant-table-row-selected' : '')}
                  onRow={(record) => ({
                    onClick: () => handleSelectUser(record)
                  })}
                  columns={[
                    { title: '使用者帳號', dataIndex: 'accounts_id', key: 'accounts_id', width: '120px' },
                    { title: '姓名', dataIndex: 'accounts', key: 'accounts', width: '120px' },
                    { title: '員工代號', dataIndex: 'user_id', key: 'user_id', width: '100px' },
                    { 
                      title: '使用者類別', 
                      dataIndex: 'peopdom_class', 
                      key: 'peopdom_class',
                      width: '100px',
                      render: (val) => val === '5' ? <Tag color="gold">管理員</Tag> : <Tag>一般用戶</Tag>
                    },
                    {
                      title: '狀態',
                      dataIndex: 'status_sign',
                      key: 'status_sign',
                      width: '90px',
                      render: (val) => val === '0' ? <Tag color="success">啟用</Tag> : <Tag color="error">停用</Tag>
                    },
                    {
                      title: 'LDAP',
                      dataIndex: 'isldapacct',
                      key: 'isldapacct',
                      width: '90px',
                      render: (val) => val === '1' ? '是' : '否'
                    }
                  ]}
                />
              </div>

              {/* Right Panel: Selected User Detail */}
              <div className="sy005-detail-panel">
                {selectedUser ? (
                  <Card title={`詳細資訊: ${selectedUser.accounts_id}`} bordered={false}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}><strong>使用者帳號:</strong> {selectedUser.accounts_id}</Col>
                      <Col span={12}><strong>中文姓名:</strong> {selectedUser.accounts}</Col>
                      <Col span={12}><strong>對應員工編號:</strong> {selectedUser.user_id}</Col>
                      <Col span={12}><strong>權限等級:</strong> {selectedUser.peopdom_class === '5' ? '5 - 系統管理員' : '1 - 一般用戶'}</Col>
                      <Col span={24}><strong>防盜登入密碼:</strong> <span style={{ color: '#888', fontStyle: 'italic' }}>(已加密保護，不可明文讀取)</span></Col>
                    </Row>
                    
                    <div style={{ marginTop: '24px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
                      <h4 style={{ marginBottom: '12px', fontWeight: 'bold' }}>所屬權限群組 (成員管理)</h4>
                      {loadingUserGroups ? (
                        <Spin size="small" />
                      ) : userGroups.length > 0 ? (
                        <Space wrap style={{ marginBottom: '12px' }}>
                          {userGroups.map(gCode => {
                            const groupObj = groupsList.find(g => g.group_code === gCode);
                            return (
                              <Tag color="purple" key={gCode} closable onClose={(e) => { e.preventDefault(); handleRemoveUserFromGroup(gCode); }}>
                                {gCode} {groupObj ? `- ${groupObj.group_name}` : ''}
                              </Tag>
                            );
                          })}
                        </Space>
                      ) : (
                        <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px', marginBottom: '12px' }}>尚未加入任何群組。</div>
                      )}
                      
                      <div style={{ maxWidth: '300px' }}>
                        <Select
                          placeholder="指派群組..."
                          style={{ width: '100%' }}
                          value={null}
                          onChange={handleAddUserToGroup}
                          options={groupsList
                            .filter(g => !userGroups.includes(g.group_code))
                            .map(g => ({ value: g.group_code, label: `${g.group_code} - ${g.group_name}` }))
                          }
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      <Button type="primary" icon={<SafetyOutlined />} onClick={handleLoadUserMatrix}>
                        載入權限 Matrix
                      </Button>
                      <Button icon={<ReloadOutlined />} onClick={() => handleApplyGroupPermissions(selectedUser.accounts_id)}>
                        套用群組權限
                      </Button>
                      <Button onClick={handleEditUser}>
                        編輯資料
                      </Button>
                      <Button 
                        danger 
                        onClick={() => handleToggleUserStatus(selectedUser)}
                      >
                        {selectedUser.status_sign === '0' ? '停用帳號' : '啟用帳號'}
                      </Button>
                      <Button danger type="dashed" onClick={handleDeleteUser}>
                        刪除使用者
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description="請先點擊左側使用者列表以載入明細" />
                  </div>
                )}
              </div>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane tab="👥 權限群組維護" key="2">
            <div className="sy005-split-layout">
              {/* Left Grid: Groups List */}
              <div className="sy005-list-panel">
                <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                  <Input
                    placeholder="搜尋群組代碼 / 名稱"
                    prefix={<SearchOutlined />}
                    value={groupSearchText}
                    onChange={(e) => setGroupSearchText(e.target.value)}
                    style={{ flex: 1 }}
                    allowClear
                  />
                  <Button type="primary" onClick={handleCreateGroup}>
                    新增群組
                  </Button>
                </div>
                <Table
                  dataSource={filteredGroups}
                  rowKey="group_code"
                  loading={loadingGroups}
                  pagination={{ pageSize: 12, size: 'small' }}
                  size="small"
                  scroll={{ y: 'calc(100vh - 430px)' }}
                  rowClassName={(record) => (selectedGroup?.group_code === record.group_code ? 'ant-table-row-selected' : '')}
                  onRow={(record) => ({
                    onClick: () => handleSelectGroup(record)
                  })}
                  columns={[
                    { title: '子系統 (hisystem)', dataIndex: 'hisystem', key: 'hisystem', width: '150px' },
                    { title: '群組代碼', dataIndex: 'group_code', key: 'group_code', width: '180px' },
                    { title: '群組名稱', dataIndex: 'group_name', key: 'group_name' }
                  ]}
                />
              </div>

              {/* Right Panel: Selected Group details */}
              <div className="sy005-detail-panel">
                {selectedGroup ? (
                  <Card title={`群組詳情: ${selectedGroup.group_code}`} bordered={false}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}><strong>群組代碼:</strong> {selectedGroup.group_code}</Col>
                      <Col span={12}><strong>群組名稱:</strong> {selectedGroup.group_name}</Col>
                      <Col span={12}><strong>子系統系統別:</strong> {selectedGroup.hisystem}</Col>
                    </Row>

                    <div style={{ marginTop: '24px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
                      <h4 style={{ marginBottom: '8px', fontWeight: 'bold' }}>群組成員指派</h4>
                      <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>
                        群組成員關係目前可於「使用者帳號維護」頁籤中為各使用者進行快速指派與移除。
                      </p>
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', gap: '12px' }}>
                      <Button type="primary" icon={<SafetyOutlined />} onClick={handleLoadGroupMatrix}>
                        載入權限 Matrix
                      </Button>
                      <Button onClick={handleEditGroup}>
                        編輯群組
                      </Button>
                      <Button danger onClick={handleDeleteGroup}>
                        刪除群組
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description="請先點擊左側群組列表以載入詳情" />
                  </div>
                )}
              </div>
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane tab="🎛️ 權限控制矩陣" key="3">
            {selectedTarget ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Search and Action Toolbar */}
                <div className="sy005-matrix-toolbar">
                  <div>
                    <Input
                      placeholder="過濾選單代碼 / 名稱 / 物件名稱"
                      prefix={<SearchOutlined />}
                      value={matrixSearchText}
                      onChange={(e) => setMatrixSearchText(e.target.value)}
                      style={{ width: '280px' }}
                      allowClear
                    />
                  </div>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => confirmSwitch(() => fetchMatrix(selectedTarget))}>
                      重新載入
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSavePermissions}>
                      儲存權限
                    </Button>
                    <Button icon={<CopyOutlined />} onClick={openCopyModal}>
                      複製權限
                    </Button>
                    {!selectedTarget.is_group && (
                      <Button icon={<SafetyOutlined />} onClick={() => handleApplyGroupPermissions(selectedTarget.target_id)}>
                        套用群組權限
                      </Button>
                    )}
                  </Space>
                </div>

                {/* Tree Table */}
                <div className="sy005-matrix-table-wrapper">
                  {loadingMatrix ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}><Spin /> 載入矩陣中...</div>
                  ) : (
                    <Table
                      dataSource={filteredTreeData}
                      columns={columns}
                      pagination={false}
                      size="small"
                      scroll={{ x: 1200, y: 'calc(100vh - 430px)' }}
                      bordered
                    />
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <Empty description="請先在「使用者帳號維護」或「權限群組維護」頁籤中選取一個對象，並點擊「載入權限 Matrix」以進行授權配置。" />
              </div>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab="🛡️ 欄位權限設定" key="4">
            {selectedTarget && !selectedTarget.is_group ? (
              <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <Col>
                    <Space size="large">
                      <div>
                        <strong>目前設定對象：</strong>
                        <Tag color="blue">{selectedTarget.label}</Tag>
                      </div>
                      <div>
                        <strong>指定作業名稱：</strong>
                        <Select 
                          value={selectedFieldProgram} 
                          onChange={(val) => {
                            setSelectedFieldProgram(val);
                            fetchFieldPermissions(selectedTarget, val);
                          }} 
                          style={{ width: 200 }}
                        >
                          <Select.Option value="w_dp030">樣品單作業 (w_dp030)</Select.Option>
                        </Select>
                      </div>
                    </Space>
                  </Col>
                  <Col>
                    <Space>
                      <Button icon={<ReloadOutlined />} onClick={() => fetchFieldPermissions()}>
                        重新載入
                      </Button>
                      <Button 
                        type="primary" 
                        icon={<SaveOutlined />} 
                        onClick={handleSaveFieldPermissions}
                        disabled={!canExecuteCommand('w_sy005', 'edit', permissions)}
                      >
                        儲存欄位權限
                      </Button>
                    </Space>
                  </Col>
                </Row>
                <Table 
                  dataSource={FIELD_PERMISSION_FALLBACK_COLUMNS[selectedFieldProgram] || []}
                  columns={fieldPermissionTableColumns}
                  rowKey="db_name"
                  pagination={false}
                  loading={loadingFieldPermissions}
                  bordered
                  size="small"
                />
              </div>
            ) : (
              <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <Empty description="請先在「使用者帳號維護」中選取一個使用者，本功能不支援群組級別欄位權限。" />
              </div>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab="🔒 資料範圍權限設定" key="5">
            {selectedTarget && !selectedTarget.is_group ? (
              <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <Col>
                    <Space size="large">
                      <div>
                        <strong>目前設定對象：</strong>
                        <Tag color="blue">{selectedTarget.label}</Tag>
                      </div>
                      <div>
                        <strong>作業名稱：</strong>
                        <Select 
                          value={selectedConstraintProgram} 
                          onChange={(val) => {
                            setSelectedConstraintProgram(val);
                            fetchConstraints(selectedTarget, val, selectedConstraintKeycol);
                          }} 
                          style={{ width: 200 }}
                        >
                          <Select.Option value="w_dp030">樣品單作業 (w_dp030)</Select.Option>
                        </Select>
                      </div>
                      <div>
                        <strong>限制欄位：</strong>
                        <Select 
                          value={selectedConstraintKeycol} 
                          onChange={(val) => {
                            setSelectedConstraintKeycol(val);
                            fetchConstraints(selectedTarget, selectedConstraintProgram, val);
                          }} 
                          style={{ width: 150 }}
                        >
                          <Select.Option value="es101gkey">業務員 (es101gkey)</Select.Option>
                        </Select>
                      </div>
                    </Space>
                  </Col>
                  <Col>
                    <Space>
                      <Button icon={<ReloadOutlined />} onClick={() => fetchConstraints()}>
                        重新載入
                      </Button>
                      <Button 
                        type="primary" 
                        icon={<SaveOutlined />} 
                        onClick={handleSaveConstraints}
                        disabled={!canExecuteCommand('w_sy005', 'edit', permissions)}
                      >
                        儲存資料範圍權限
                      </Button>
                    </Space>
                  </Col>
                </Row>
                <div style={{ marginBottom: 16 }}>
                  <Alert
                    message="安全提示"
                    description="若允許值清單為空並儲存，代表解除此帳號在此作業的資料範圍限制，該帳號將可看到此作業的全部資料。"
                    type="info"
                    showIcon
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <strong>新增允許值：</strong>
                    <Select
                      showSearch
                      placeholder="搜尋員工並新增"
                      optionFilterProp="children"
                      loading={loadingEs101Options}
                      style={{ width: 300 }}
                      onChange={(val, option) => {
                        handleAddConstraintValue(val, option.cname);
                      }}
                      disabled={!canExecuteCommand('w_sy005', 'edit', permissions)}
                    >
                      {es101Options.map(opt => (
                        <Select.Option key={opt.value} value={opt.value} cname={opt.cname}>
                          {opt.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Space>
                </div>
                <Table 
                  dataSource={constraintValues}
                  columns={[
                    { title: '業務員 GKEY', dataIndex: 'cgkey', width: 250, render: t => <code>{t}</code> },
                    { title: '顯示名稱', dataIndex: 'cname' },
                    { 
                      title: '操作', 
                      width: 100,
                      render: (_, record) => (
                        <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveConstraintValue(record.cgkey)}
                          disabled={!canExecuteCommand('w_sy005', 'edit', permissions)}
                        >
                          移除
                        </Button>
                      )
                    }
                  ]}
                  rowKey="cgkey"
                  pagination={false}
                  loading={loadingConstraint}
                  bordered
                  size="small"
                  locale={{ emptyText: '目前沒有任何允許值（將不受此欄位限制）' }}
                />
              </div>
            ) : (
              <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <Empty description="請先在「使用者帳號維護」中選取一個使用者，本功能不支援群組級別資料範圍權限。" />
              </div>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab="📊 權限報表與對照" key="6">
            <Alert
              message="權限報表對照與列印規劃中"
              description="本模組支援跨帳號/作業的權限對照分析與報表印製，將於後續 Phase 完成 PDF / Excel 完整輸出引擎後整合推出。"
              type="info"
              showIcon
            />
          </Tabs.TabPane>
        </Tabs>
      </div>

      {/* Copy Permissions Modal */}
      <Modal
        title="複製權限 (Copy Permissions)"
        open={isCopyModalOpen}
        onCancel={() => setIsCopyModalOpen(false)}
        onOk={handleCopyPermissions}
        okText="確認複製"
        cancelText="取消"
      >
        <Form form={copyForm} layout="vertical" style={{ marginTop: '16px' }}>
          <Alert 
            message="複製操作將會徹底覆蓋目標對象在當前系統 (hisystem) 中的所有權限設定，且此操作不可逆！"
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="source_type" label="來源類型" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'user', label: '使用者帳號 (User)' },
                    { value: 'group', label: '權限群組 (Group)' }
                  ]}
                  onChange={() => copyForm.setFieldsValue({ source_id: undefined })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.source_type !== curr.source_type}
              >
                {() => {
                  const sType = copyForm.getFieldValue('source_type');
                  const options = sType === 'group' 
                    ? groupsList.map(g => ({ value: g.group_code, label: `${g.group_code} - ${g.group_name}` }))
                    : usersList.map(u => ({ value: u.accounts_id, label: `${u.accounts_id} - ${u.accounts}` }));
                  return (
                    <Form.Item name="source_id" label="來源帳號/群組" rules={[{ required: true, message: '請選擇來源' }]}>
                      <Select showSearch options={options} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="target_type" label="目標類型" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'user', label: '使用者帳號 (User)' },
                    { value: 'group', label: '權限群組 (Group)' }
                  ]}
                  onChange={() => copyForm.setFieldsValue({ target_id: undefined })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.target_type !== curr.target_type}
              >
                {() => {
                  const tType = copyForm.getFieldValue('target_type');
                  const options = tType === 'group'
                    ? groupsList.map(g => ({ value: g.group_code, label: `${g.group_code} - ${g.group_name}` }))
                    : usersList.map(u => ({ value: u.accounts_id, label: `${u.accounts_id} - ${u.accounts}` }));
                  return (
                    <Form.Item name="target_id" label="目標帳號/群組" rules={[{ required: true, message: '請選擇目標' }]}>
                      <Select showSearch options={options} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* User Edit Modal */}
      <Modal
        title={userModalType === 'create' ? '新增使用者帳號' : '編輯使用者帳號'}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        onOk={handleUserModalSubmit}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={userForm} layout="vertical" style={{ marginTop: '16px' }}>
          <Alert 
            message="密碼處理邊界安全警告 (Password Compatibility Warning)"
            description="新增帳號或重設密碼將使用 Django Hash 加密，這會導致舊 PowerBuilder 系統無法以相同密碼登入！"
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="accounts" label="使用者帳號 (Login ID)" rules={[{ required: true, message: '請輸入使用者帳號' }]}>
                <Input disabled={userModalType === 'edit'} placeholder="例如: USER01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="es101_employeeno" label="對應員工 (Es101)" rules={[{ required: true, message: '請選擇員工' }]}>
                <Select
                  showSearch
                  placeholder="選擇對應員工"
                  loading={loadingEs101}
                  options={es101List.map(e => ({ value: e.employeeno, label: `${e.employeeno} - ${e.chinesename}` }))}
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="peopdom_class" label="使用者類別" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: '1', label: '1 - 一般用戶' },
                    { value: '5', label: '5 - 系統管理員' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status_sign" label="帳號狀態" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: '0', label: '0 - 啟用' },
                    { value: '1', label: '1 - 停用' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Card size="small" title="登入密碼設定" style={{ marginTop: '8px' }}>
            {userModalType === 'edit' && (
              <Form.Item valuePropName="checked" style={{ marginBottom: '12px' }}>
                <Checkbox checked={changePwdChecked} onChange={e => setChangePwdChecked(e.target.checked)}>
                  我要變更此帳號密碼 (可能導致舊 PB 系統無法以此密碼登入)
                </Checkbox>
              </Form.Item>
            )}
            <Form.Item 
              name="user_pwd" 
              label="新密碼" 
              rules={[{ required: userModalType === 'create', message: '請設定登入密碼' }]}
            >
              <Input.Password 
                placeholder="請輸入密碼" 
                disabled={userModalType === 'edit' && !changePwdChecked} 
              />
            </Form.Item>
          </Card>
        </Form>
      </Modal>

      {/* Group Edit Modal */}
      <Modal
        title={groupModalType === 'create' ? '新增權限群組' : '編輯權限群組'}
        open={groupModalVisible}
        onCancel={() => setGroupModalVisible(false)}
        onOk={handleGroupModalSubmit}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={groupForm} layout="vertical" style={{ marginTop: '16px' }}>
          <Form.Item name="group_code" label="群組代碼" rules={[{ required: true, message: '請輸入群組代碼' }]}>
            <Input disabled={groupModalType === 'edit'} placeholder="例如: GRP01" />
          </Form.Item>
          <Form.Item name="group_name" label="群組名稱" rules={[{ required: true, message: '請輸入群組名稱' }]}>
            <Input placeholder="例如: 開發部門管理群組" maxLength={20} />
          </Form.Item>
          <Form.Item name="hisystem" label="系統別 (hisystem)" rules={[{ required: true }]}>
            <Input disabled />
          </Form.Item>
        </Form>
      </Modal>

      {/* Group Assign/Remove Custom Relation Modal */}
      <Modal
        title={relationActionType === 'add' ? '確認加入群組' : '確認退出群組'}
        open={relationModalVisible}
        onCancel={() => setRelationModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRelationModalVisible(false)}>
            取消
          </Button>,
          relationActionType === 'add' ? (
            <Button key="no-apply" onClick={() => handleRelationSubmit(false)}>
              僅指派關係
            </Button>
          ) : (
            <Button key="no-recalc" onClick={() => handleRelationSubmit(false)}>
              僅移除關係 (不改權限)
            </Button>
          ),
          relationActionType === 'add' ? (
            <Button key="apply" type="primary" onClick={() => handleRelationSubmit(true)}>
              指派並合併權限
            </Button>
          ) : (
            <Button key="recalc" type="primary" danger onClick={() => handleRelationSubmit(true)}>
              移除並扣除權限 (推薦)
            </Button>
          )
        ]}
      >
        {relationActionType === 'add' ? (
          <div>
            <p>您即將把使用者 <strong>{selectedUser?.accounts_id}</strong> 加入群組 <strong>{targetGroupCode}</strong>。</p>
            <Alert
              message="加入策略說明"
              description={
                <div>
                  <p>1. <strong>指派並合併權限</strong>：將群組權限與使用者目前權限進行 OR 聯集合併寫入。</p>
                  <p>2. <strong>僅指派關係</strong>：僅指派群組成員，不改變個人權限。</p>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        ) : (
          <div>
            <p>您即將將使用者 <strong>{selectedUser?.accounts_id}</strong> 移出群組 <strong>{targetGroupCode}</strong>。</p>
            <Alert
              message="OutGroup 權限扣減安全說明"
              description={
                <div>
                  <p>1. <strong>移除並扣除權限</strong>：移出群組並重新計算權限（OutGroup 扣減）。此操作會<strong>安全扣除</strong>該群組專屬權限，但<strong>保留</strong>其他群組享有的權限及個人手動設定之權限。</p>
                  <p>2. <strong>僅移除關係</strong>：僅移出群組成員，保留個人目前的權限矩陣內容不予修改。</p>
                </div>
              }
              type="warning"
              showIcon
            />
          </div>
        )}
      </Modal>

      <style dangerouslySetInnerHTML={{__html: `
        .sy005-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #ffffff;
          padding: 12px;
          gap: 12px;
        }
        .sy005-target-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f8fafc;
          border: 1px dashed #cbd5e1;
          padding: 8px 12px;
          border-radius: 4px;
        }
        .sy005-dirty-badge {
          background-color: #fef3c7;
          color: #d97706;
          border: 1px solid #fcd34d;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12px;
          animation: sy005-flash 2s infinite;
        }
        @keyframes sy005-flash {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .sy005-split-layout {
          display: flex;
          gap: 16px;
          height: calc(100vh - 280px);
        }
        .sy005-list-panel {
          flex: 1.2;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background-color: #ffffff;
          padding: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .sy005-detail-panel {
          flex: 0.8;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background-color: #f8fafc;
          padding: 16px;
          overflow-y: auto;
        }
        .sy005-matrix-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .sy005-matrix-table-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
      `}} />
    </ERPSheetPage>
  );
}
