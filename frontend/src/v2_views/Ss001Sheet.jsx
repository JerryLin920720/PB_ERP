import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { message, Modal, Spin, Form, Input, Button, Checkbox, Select, InputNumber, Space } from 'antd';
import axios from 'axios';
import ERPSheetPage from '../components/erp/shell/ERPSheetPage';
import Win32DataWindow from '../components/Win32DataWindow';
import ERPSplitGridLayout from '../components/erp/layout/ERPSplitGridLayout';
import { useAuth } from '../auth/useAuth';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Plus, Edit, Trash2 } from 'lucide-react';

export default function Ss001Sheet() {
  const { user } = useAuth();
  
  // Tree state
  const [menuList, setMenuList] = useState([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedMenu, setSelectedMenu] = useState(null);
  const selectedMenuRef = useRef(null);

  // Tree Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add_sibling'); // 'add_sibling' | 'add_child' | 'edit'
  const [form] = Form.useForm();
  const [isProgram, setIsProgram] = useState(false);

  // Focus tracking state: 'popedom' (Upper Grid) or 'column' (Lower Grid)
  const [focusedGrid, setFocusedGrid] = useState('popedom');

  // Unsaved changes dirty state trackers
  const [isPopedomDirty, setIsPopedomDirty] = useState(false);
  const [isColumnDirty, setIsColumnDirty] = useState(false);

  // Upper Grid: Popedom Desc columns (P0: popedom_index range 1~13)
  const popedomColumns = useMemo(
    () => [
      { key: 'popedom_id', label: '權限代號', width: '120px', editable: true, type: 'string', maxLength: 30, required: true },
      { key: 'popedom_desc', label: '權限描述', width: '150px', editable: true, type: 'string', maxLength: 20, required: true },
      { key: 'popedom_index', label: '位元遮罩索引', width: '110px', editable: true, type: 'number', required: true, min: 1, max: 13 },
      { key: 'obj_name', label: '視窗物件名稱', width: '150px', editable: false, type: 'string' },
      { key: 'hisystem', label: '子系統代碼', width: '100px', editable: false, type: 'string' }
    ],
    []
  );

  // Lower Grid: Column translation columns (P0: db_name / display_name required)
  const columnColumns = useMemo(
    () => [
      { key: 'db_name', label: '資料庫欄位名稱', width: '150px', editable: true, type: 'string', maxLength: 50, required: true },
      { key: 'display_name', label: '欄位顯示名稱', width: '180px', editable: true, type: 'string', maxLength: 40, required: true },
      { key: 'obj_name', label: '視窗物件名稱', width: '150px', editable: false, type: 'string' },
      { key: 'hisystem', label: '子系統代碼', width: '100px', editable: false, type: 'string' }
    ],
    []
  );

  // Derive detail API URLs
  // 目錄節點 (fram_class === '0') 也能加載權限 Grid (obj_name 一般為空，則帶入空字串查詢)
  const popedomObjName = selectedMenu?.obj_name || '';
  const popedomApiUrl = selectedMenu
    ? `/api/sys-popedom-desc/?obj_name=${encodeURIComponent(popedomObjName)}&hisystem=${encodeURIComponent(user?.hisystem || '01')}`
    : '';

  // 只有作業節點 (fram_class === '1') 載入欄位翻譯 Grid，目錄節點不載入
  const columnApiUrl = selectedMenu?.obj_name && selectedMenu?.fram_class === '1'
    ? `/api/sys-menu-column/?obj_name=${encodeURIComponent(selectedMenu.obj_name)}&hisystem=${encodeURIComponent(user?.hisystem || '01')}`
    : '';

  // Load tree menu list
  const fetchMenuData = useCallback(async () => {
    setLoadingTree(true);
    try {
      const response = await axios.get('/api/sys-menu/');
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
          ? response.data.results
          : [];
      setMenuList(data);
    } catch (err) {
      console.error('Failed to load menu tree list:', err);
      message.error('載入系統選單樹失敗');
    } finally {
      setLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  // Construct tree hierarchy from menuList
  const treeData = useMemo(() => {
    if (!menuList || menuList.length === 0) return [];
    
    // Sort by serialno
    const sorted = [...menuList].sort((a, b) => Number(a.prg_serialno || 0) - Number(b.prg_serialno || 0));
    
    const map = {};
    const roots = [];
    
    sorted.forEach(item => {
      map[item.prg_code] = {
        ...item,
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

    const assignLevels = (nodes, level = 0) => {
      nodes.forEach(n => {
        n.level = level;
        if (n.children && n.children.length > 0) {
          assignLevels(n.children, level + 1);
        }
      });
    };
    assignLevels(roots, 0);
    
    return roots;
  }, [menuList]);

  // Handle tree node clicks
  const handleNodeClick = useCallback((node) => {
    // Check for unsaved changes before switching selected node
    if (isPopedomDirty || isColumnDirty) {
      Modal.confirm({
        title: '確定要切換作業嗎？',
        content: '目前資料尚未儲存，是否放棄變更？',
        okText: '放棄變更並切換',
        cancelText: '取消',
        onOk: () => {
          setIsPopedomDirty(false);
          setIsColumnDirty(false);
          selectedMenuRef.current = node;
          setSelectedMenu(node);
        }
      });
    } else {
      selectedMenuRef.current = node;
      setSelectedMenu(node);
    }

    // Toggle expansion if it's a folder
    if (node.fram_class === '0') {
      setExpandedKeys(prev => ({
        ...prev,
        [node.prg_code]: !prev[node.prg_code]
      }));
    }
  }, [isPopedomDirty, isColumnDirty]);

  // Prompt default 'operate' row if folder loads and has 0 popedoms
  const handlePopedomFetchSuccess = useCallback((fetchedRows) => {
    const activeMenu = selectedMenuRef.current || selectedMenu;
    if (activeMenu && activeMenu.fram_class === '0' && fetchedRows.length === 0) {
      Modal.confirm({
        title: '提示',
        content: `選單「${activeMenu.prg_code}」為目錄節點，目前尚未建立任何操作權限描述。是否新增預設的「operate / 操作」描述列？`,
        okText: '確認新增列',
        cancelText: '取消',
        onOk: () => {
          // Dispatch insert event to popedom grid
          window.dispatchEvent(
            new CustomEvent('mdi-global-command', {
              detail: { action: 'insert', targetSheet: 'ss001_popedom' }
            })
          );
        }
      });
    }
  }, [selectedMenu]);

  // Command intercept and routing
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail || {};

      if (targetSheet !== 'ss001') {
        return;
      }

      console.log(`⚡ [Ss001Sheet] Routing command: ${action} (Focused: ${focusedGrid})`);

      if (action === 'save') {
        // Dispatch save to both grids sequentially/concurrently
        window.dispatchEvent(
          new CustomEvent('mdi-global-command', {
            detail: { action: 'save', targetSheet: 'ss001_popedom' }
          })
        );
        window.dispatchEvent(
          new CustomEvent('mdi-global-command', {
            detail: { action: 'save', targetSheet: 'ss001_column' }
          })
        );
        return;
      }

      if (action === 'retrieve') {
        // Reload menu tree and details
        fetchMenuData();
        
        window.dispatchEvent(
          new CustomEvent('mdi-global-command', {
            detail: { action: 'retrieve', targetSheet: 'ss001_popedom' }
          })
        );
        window.dispatchEvent(
          new CustomEvent('mdi-global-command', {
            detail: { action: 'retrieve', targetSheet: 'ss001_column' }
          })
        );
        return;
      }

      // insert / delete / edit go to the focused grid
      const target = focusedGrid === 'popedom' ? 'ss001_popedom' : 'ss001_column';
      window.dispatchEvent(
        new CustomEvent('mdi-global-command', {
          detail: { action, targetSheet: target }
        })
      );
    };

    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => {
      window.removeEventListener('mdi-global-command', handleGlobalCommand);
    };
  }, [focusedGrid, fetchMenuData]);

  // Insert default values creators
  const getPopedomDefaultValues = useCallback(() => {
    const activeMenu = selectedMenuRef.current || selectedMenu;
    const activeObjName = activeMenu?.obj_name || '';
    const isFolder = activeMenu?.fram_class === '0';
    return {
      obj_name: activeObjName,
      hisystem: user?.hisystem || '01',
      popedom_id: isFolder ? 'operate' : '',
      popedom_desc: isFolder ? '操作' : '',
      popedom_index: isFolder ? 1 : 1
    };
  }, [selectedMenu, user]);

  const getColumnDefaultValues = useCallback(() => {
    const activeObjName = selectedMenuRef.current?.obj_name || selectedMenu?.obj_name || '';
    return {
      obj_name: activeObjName,
      hisystem: user?.hisystem || '01',
      display_name: ''
    };
  }, [selectedMenu, user]);

  // --- Tree CRUD Handlers ---

  const getNextPrgCode = useCallback((parentCode) => {
    if (!parentCode) {
      return '';
    }
    const children = menuList.filter(m => m.parent_code === parentCode);
    if (children.length === 0) {
      return `${parentCode}01`;
    }
    let maxSuffix = 0;
    children.forEach(c => {
      const suffixStr = c.prg_code.substring(parentCode.length);
      const suffixNum = parseInt(suffixStr, 10);
      if (!isNaN(suffixNum) && suffixNum > maxSuffix) {
        maxSuffix = suffixNum;
      }
    });
    const nextSuffix = String(maxSuffix + 1).padStart(2, '0');
    return `${parentCode}${nextSuffix}`;
  }, [menuList]);

  const getNextSerialNo = useCallback((parentCode) => {
    const siblings = menuList.filter(m => m.parent_code === parentCode);
    if (siblings.length === 0) return 1.0;
    const maxSerial = Math.max(...siblings.map(s => Number(s.prg_serialno || 0)));
    return maxSerial + 1.0;
  }, [menuList]);

  const handleOpenAddModal = (type) => {
    setModalMode(type === 'sibling' ? 'add_sibling' : 'add_child');
    form.resetFields();

    let parentCode = null;
    if (type === 'sibling' && selectedMenu) {
      parentCode = selectedMenu.parent_code;
    } else if (type === 'child') {
      if (!selectedMenu) {
        message.warning('請先點選樹狀目錄節點，再新增下級！');
        return;
      }
      parentCode = selectedMenu.prg_code;
    }

    const calculatedCode = getNextPrgCode(parentCode);
    const calculatedSerial = getNextSerialNo(parentCode);
    setIsProgram(type === 'child'); // children are typically programs

    form.setFieldsValue({
      parent_code: parentCode,
      prg_code: calculatedCode,
      prg_serialno: calculatedSerial,
      fram_class: type === 'child' ? '1' : (selectedMenu?.fram_class || '0'),
      sysflag: false,
      initflag: true,
      win_class: '1',
      pictype: '1'
    });

    setIsModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (!selectedMenu) return;
    setModalMode('edit');
    form.resetFields();
    setIsProgram(selectedMenu.fram_class === '1');

    form.setFieldsValue({
      ...selectedMenu,
      sysflag: selectedMenu.sysflag === '1',
      initflag: selectedMenu.initflag === '1'
    });

    setIsModalOpen(true);
  };

  const handleModalSave = async () => {
    try {
      const values = await form.validateFields();
      
      const payload = {
        ...values,
        sysflag: values.sysflag ? '1' : '0',
        initflag: values.initflag ? '1' : '0'
      };

      if (modalMode === 'edit') {
        const response = await axios.patch(`/api/sys-menu/${encodeURIComponent(selectedMenu.prg_code)}/`, payload);
        message.success('更新選單成功！');
        
        // Update selectedMenu in state
        const updatedNode = { ...selectedMenu, ...response.data };
        setSelectedMenu(updatedNode);
        selectedMenuRef.current = updatedNode;
      } else {
        await axios.post('/api/sys-menu/', payload);
        message.success('新增選單成功！');
      }

      setIsModalOpen(false);
      fetchMenuData();
    } catch (err) {
      console.error('Save node error:', err);
      message.error(err.response?.data?.detail || '儲存失敗，請檢查輸入資料。');
    }
  };

  const handleDeleteNodeClick = () => {
    if (!selectedMenu) return;

    // Check children first (P1 safety checks)
    const hasChildren = menuList.some(m => m.parent_code === selectedMenu.prg_code);
    if (hasChildren) {
      message.error('請先刪除下級節點！');
      return;
    }

    Modal.confirm({
      title: '確定要刪除選單嗎？',
      content: `刪除後將無法復原，並會級聯刪除此作業的「${selectedMenu.obj_name || '無物件'}」對應的所有欄位翻譯字典。確定要刪除選單「${selectedMenu.prg_code} - ${selectedMenu.prg_name}」嗎？`,
      okText: '確認刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // Trigger the transaction-based backend cascade delete endpoint
          const response = await axios.post(`/api/sys-menu/${encodeURIComponent(selectedMenu.prg_code)}/delete-node/`);
          message.success(response.data.detail || '節點及其關聯翻譯刪除成功！');
          setSelectedMenu(null);
          selectedMenuRef.current = null;
          fetchMenuData();
        } catch (err) {
          console.error('Delete node error:', err);
          message.error(err.response?.data?.detail || '刪除節點失敗');
        }
      }
    });
  };

  // Recursive tree renderer
  const renderTreeNode = (node) => {
    const isFolder = node.fram_class === '0';
    const isExpanded = !!expandedKeys[node.prg_code];
    const isSelected = selectedMenu?.prg_code === node.prg_code;
    
    return (
      <div key={node.prg_code} style={{ display: 'flex', flexDirection: 'column' }}>
        <div 
          className={`tree-node ${isFolder ? 'folder' : 'leaf'} ${isSelected ? 'selected-node' : ''}`}
          style={{ paddingLeft: `${node.level * 12 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {isFolder ? (
            <>
              <span className="tree-collapse-btn">
                {isExpanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              </span>
              <span className="node-icon">
                {isExpanded ? <FolderOpen size={14} color="#eab308" fill="#fef08a"/> : <Folder size={14} color="#eab308" fill="#fef08a"/>}
              </span>
              <span className="node-text bold">{node.prg_code} - {node.prg_name}</span>
            </>
          ) : (
            <>
              <span className="tree-collapse-btn" />
              <span className="leaf-icon">
                <FileText size={12} color={isSelected ? 'var(--primary-color)' : '#64748b'} />
              </span>
              <span className="node-text">{node.prg_code} - {node.prg_name}</span>
            </>
          )}
        </div>
        {isFolder && isExpanded && node.children && node.children.length > 0 && (
          <div className="tree-node-children">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const leftGrid = (
    <div className="ss001-tree-panel">
      <div className="ss001-tree-title">系統選單樹結構 (sys_menu)</div>
      
      {/* Tree Maintenance Toolbar */}
      <div className="ss001-tree-toolbar">
        <Space size={4}>
          <Button size="small" type="primary" icon={<Plus size={12} />} onClick={() => handleOpenAddModal('sibling')}>新增同級</Button>
          <Button size="small" type="primary" icon={<Plus size={12} />} onClick={() => handleOpenAddModal('child')}>新增下級</Button>
          <Button size="small" icon={<Edit size={12} />} disabled={!selectedMenu} onClick={handleOpenEditModal}>修改節點</Button>
          <Button size="small" danger icon={<Trash2 size={12} />} disabled={!selectedMenu} onClick={handleDeleteNodeClick}>刪除節點</Button>
        </Space>
      </div>

      {loadingTree ? (
        <div style={{ padding: '20px', textAlign: 'center' }}><Spin size="small" /> 載入中...</div>
      ) : (
        <div className="ss001-tree-scroll">
          {treeData.map(node => renderTreeNode(node))}
        </div>
      )}
    </div>
  );

  const rightGrid = (
    <div className="ss001-right-workspace">
      {/* Upper Grid - Popedom Action Descriptions */}
      <div 
        className={`erp-split-grid-wrapper ${focusedGrid === 'popedom' ? 'is-focused' : ''}`}
        onClick={() => setFocusedGrid('popedom')}
        style={{ flex: 1 }}
      >
        <div className="erp-split-grid-header">
          <span>權限動作描述 (Popedom Actions - {selectedMenu ? `${selectedMenu.prg_code} ${selectedMenu.prg_name}` : '未選取作業'})</span>
          <span className="focus-badge">{focusedGrid === 'popedom' ? '作用中' : '可點選'}</span>
        </div>
        {popedomApiUrl ? (
          <Win32DataWindow
            key={`popedom_${selectedMenu?.prg_code}`}
            sheetId="ss001_popedom"
            permissionKey="w_ss001"
            apiUrl={popedomApiUrl}
            title="權限動作描述"
            columns={popedomColumns}
            defaultValues={getPopedomDefaultValues}
            onDirtyStateChange={setIsPopedomDirty}
            onFetchSuccess={handlePopedomFetchSuccess}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', color: '#9ca3af', fontSize: '13px' }}>
            請先點選左側系統選單樹中的作業節點，以載入對應的權限動作。
          </div>
        )}
      </div>

      {/* Lower Grid - Column Translation Dictionary */}
      <div 
        className={`erp-split-grid-wrapper ${focusedGrid === 'column' ? 'is-focused' : ''}`}
        onClick={() => setFocusedGrid('column')}
        style={{ flex: 1 }}
      >
        <div className="erp-split-grid-header">
          <span>欄位語系對照 (Column Translations - {selectedMenu ? `${selectedMenu.prg_code} ${selectedMenu.prg_name}` : '未選取作業'})</span>
          <span className="focus-badge">{focusedGrid === 'column' ? '作用中' : '可點選'}</span>
        </div>
        {columnApiUrl ? (
          <Win32DataWindow
            key={`column_${selectedMenu?.prg_code}`}
            sheetId="ss001_column"
            permissionKey="w_ss001"
            apiUrl={columnApiUrl}
            title="欄位語系對照"
            columns={columnColumns}
            defaultValues={getColumnDefaultValues}
            onDirtyStateChange={setIsColumnDirty}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', color: '#9ca3af', fontSize: '13px' }}>
            {selectedMenu?.fram_class === '0' 
              ? '目錄節點無欄位對照資料。' 
              : '請先點選左側系統選單樹中的作業節點，以載入對應的欄位對照。'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ERPSheetPage
      sheetId="ss001"
      title="選單與權限啟用設定"
      breadcrumb={['系統設置', '選單與權限啟用設定']}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .ss001-tree-panel {
          height: 100%;
          overflow-y: auto;
          padding: 12px;
          background-color: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ss001-tree-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #374151;
          padding-bottom: 6px;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 2px;
        }
        .ss001-tree-toolbar {
          padding: 4px 0px;
          border-bottom: 1px dashed #f0f0f0;
          margin-bottom: 4px;
        }
        .ss001-tree-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ss001-right-workspace {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 16px;
          padding: 0px;
          overflow: hidden;
        }
        .tree-node {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          margin-bottom: 2px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
          color: #374151;
          user-select: none;
        }
        .tree-node:hover {
          background-color: #f3f4f6;
          color: #2563eb;
        }
        .tree-node.selected-node {
          background-color: #eff6ff !important;
          color: #1d4ed8 !important;
          font-weight: 600;
        }
        .tree-collapse-btn {
          width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
        }
        .node-icon {
          margin-right: 6px;
          display: flex;
          align-items: center;
        }
        .leaf-icon {
          margin-right: 6px;
          display: flex;
          align-items: center;
        }
        .node-text {
          font-size: 13px;
        }
        .node-text.bold {
          font-weight: 700;
        }
        .tree-node-children {
          display: flex;
          flex-direction: column;
        }
      `}} />
      <ERPSplitGridLayout
        leftPanel={leftGrid}
        rightPanel={rightGrid}
        defaultSplit={30}
        minWidth={280}
      />

      {/* Menu Node Maintenance Form Modal (w_tree_edit style) */}
      <Modal
        title={modalMode === 'edit' ? `修改選單節點 [${selectedMenu?.prg_code}]` : '新增選單節點'}
        open={isModalOpen}
        onOk={handleModalSave}
        onCancel={() => setIsModalOpen(false)}
        width={750}
        okText="儲存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* prg_code */}
            <Form.Item 
              name="prg_code" 
              label="作業編號 (prg_code)" 
              rules={[{ required: true, message: '請輸入編號' }]}
            >
              <Input disabled={modalMode === 'edit'} maxLength={20} />
            </Form.Item>
            
            {/* parent_code */}
            <Form.Item name="parent_code" label="父類編號 (parent_code)">
              <Input disabled maxLength={10} />
            </Form.Item>

            {/* prg_name */}
            <Form.Item 
              name="prg_name" 
              label="作業名稱 (prg_name)" 
              rules={[{ required: true, message: '請輸入作業名稱' }]}
            >
              <Input maxLength={40} />
            </Form.Item>

            {/* obj_name */}
            <Form.Item 
              name="obj_name" 
              label="視窗物件名稱 (obj_name)" 
              rules={[{ required: isProgram, message: '作業節點之視窗物件名稱必填' }]}
            >
              <Input placeholder={isProgram ? "e.g. w_xxxx" : "目錄可空白"} maxLength={40} />
            </Form.Item>

            {/* fram_class */}
            <Form.Item name="fram_class" label="框架類別 (fram_class)" rules={[{ required: true }]}>
              <Select 
                disabled={modalMode === 'edit'}
                onChange={(val) => setIsProgram(val === '1')}
                options={[
                  { value: '0', label: '目錄 (0)' },
                  { value: '1', label: '作業 (1)' }
                ]}
              />
            </Form.Item>

            {/* prg_serialno */}
            <Form.Item name="prg_serialno" label="排序權重 (prg_serialno)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} precision={2} step={1} />
            </Form.Item>

            {/* win_class */}
            <Form.Item name="win_class" label="視窗類別 (win_class)">
              <Select
                allowClear
                options={[
                  { value: '0', label: 'General (0)' },
                  { value: '1', label: 'main (1)' },
                  { value: '2', label: 'response (2)' },
                  { value: '3', label: 'Custom Query (3)' },
                  { value: '4', label: 'Custom Report (4)' }
                ]}
              />
            </Form.Item>

            {/* pictype */}
            <Form.Item name="pictype" label="預設圖片類別 (pictype)">
              <Select
                allowClear
                options={[
                  { value: '1', label: 'Sketch (1)' },
                  { value: '2', label: 'photo (2)' }
                ]}
              />
            </Form.Item>

            {/* startqty & endqty */}
            <Form.Item name="startqty" label="起始數量 (startqty)">
              <Input maxLength={4} />
            </Form.Item>
            <Form.Item name="endqty" label="結束數量 (endqty)">
              <Input maxLength={4} />
            </Form.Item>

            {/* yearly & season */}
            <Form.Item name="yearly" label="年份 (yearly)">
              <Input maxLength={4} />
            </Form.Item>
            <Form.Item name="season" label="季節 (season)">
              <Input maxLength={20} />
            </Form.Item>

            {/* makerdf */}
            <Form.Item name="makerdf" label="製造商標誌 (makerdf)">
              <Input maxLength={1} />
            </Form.Item>

            {/* sysflag & initflag checkboxes */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', gridColumn: 'span 2', padding: '8px 0' }}>
              <Form.Item name="sysflag" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox>系統內部選單 (sysflag)</Checkbox>
              </Form.Item>
              <Form.Item name="initflag" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox>初始化啟用 (initflag)</Checkbox>
              </Form.Item>
            </div>

            {/* 多語言名稱 */}
            <div style={{ gridColumn: 'span 2', fontWeight: 'bold', borderTop: '1px solid #f0f0f0', paddingTop: '12px', marginTop: '4px' }}>
              多語言顯示名稱
            </div>
            
            <Form.Item name="chinesebigname" label="繁體中文名稱 (chinesebigname)">
              <Input maxLength={40} />
            </Form.Item>
            <Form.Item name="chinesesimpname" label="簡體中文名稱 (chinesesimpname)">
              <Input maxLength={40} />
            </Form.Item>
            <Form.Item name="englishname" label="英文名稱 (englishname)">
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="vietnamname" label="越南文名稱 (vietnamname)">
              <Input maxLength={40} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </ERPSheetPage>
  );
}
