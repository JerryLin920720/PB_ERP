import { useState, useEffect, useRef } from 'react';
import { 
  MonitorPlay, Save, FileSpreadsheet, Printer, 
  LogOut, PlusSquare, Trash2, CheckSquare, Search, Edit3,
  PanelLeftClose, PanelLeftOpen, RefreshCw, ArrowDownAZ, Filter
} from 'lucide-react';
import useAuth from '../auth/useAuth';
import { isAdmin, inferPermissionKey } from '../auth/permissionUtils';
import { getToolbarConfig, isActionVisible, isActionEnabled, SHEET_STATE, ACTION_TO_PERMISSION } from '../config/programRegistry';
import './Navbar.css';

/**
 * Navbar: 升級版 - Config-Driven
 */
export default function Navbar({ 
  onNavigate, 
  onDispatchCommand, 
  activeTabId,
  isSidebarCollapsed,
  onToggleSidebar,
  currentSheetState
}) {
  const { logout, hasPermission, user } = useAuth();
  
  // Tab ID 判斷是否為實際作業 (排除導航與 Map)
  const isSheetActive = activeTabId !== 'navigation' && activeTabId !== 'dp_map';
  const programId = isSheetActive ? inferPermissionKey(activeTabId) : null;
  
  // 取得目前 Sheet 回報的狀態與選中的 Record，若無則預設 BROWSE
  const sheetState = currentSheetState?.state || SHEET_STATE.BROWSE;
  const selectedRecord = currentSheetState?.selectedRecord || null;

  // 封裝權限判斷，傳入 isActionEnabled
  const _checkPermission = (action) => {
    if (user && isAdmin(user)) return true;
    const pbAction = ACTION_TO_PERMISSION[action] || action;
    
    // Save 的權限特殊處理: 有 edit 或 new 權限即可 save
    if (action === 'save' || action === 'cancel') {
      return hasPermission(programId, 'new') || hasPermission(programId, 'edit');
    }
    return hasPermission(programId, pbAction);
  };

  // UI Helper
  const isVisible = (action) => {
    if (!isSheetActive) return false;
    return isActionVisible(programId, action);
  };

  const isEnabled = (action) => {
    if (!isSheetActive) return false;
    return isActionEnabled({
      programId,
      action,
      sheetState,
      hasPermission: _checkPermission(action),
      selectedRecord
    });
  };
  
  // 🛸 菜單下拉控制狀態
  const [openMenu, setOpenMenu] = useState(null);
  const menubarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menubarRef.current && !menubarRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menuKey) => {
    setOpenMenu(openMenu === menuKey ? null : menuKey);
  };

  const handleMenuAction = (action, command = null) => {
    setOpenMenu(null);
    if (command) {
      onDispatchCommand(command);
    } else if (action === 'navigate') {
      onNavigate();
    }
  };

  return (
    <div className="win32-header-stack">
      
      {/* 1. 主標題橫欄 */}
      <div className="win32-titlebar">
        <div className="titlebar-left">
          <span className="app-icon-img">👟</span>
          <span className="title-text">揚網鞋貿ERP - 智慧鞋業核心管理系統 v4.0</span>
        </div>
        <div className="titlebar-actions">
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8' }}>PROD環境</span>
          <div style={{ width: '1px', height: '12px', backgroundColor: '#475569' }}></div>
          <span>使用者: {user?.display_name || user?.username || 'ADMIN'}</span>
        </div>
      </div>

      {/* 2. 系統物理選單列 */}
      <div className="win32-menubar" ref={menubarRef}>
        
        {/* 選單一：系統設置 */}
        <div className={`menu-item-wrapper ${openMenu === 'sys' ? 'active' : ''}`}>
          <span className="menu-item" onClick={() => toggleMenu('sys')}>系統設置(S)</span>
          {openMenu === 'sys' && (
            <div className="menu-dropdown">
              <div className="dropdown-row" onClick={() => handleMenuAction('navigate')}>
                <span>系統導航</span>
                <span className="shortcut">Alt+N</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-row" style={{ color: '#ef4444' }} onClick={logout}>
                <span>退出系統</span>
                <span className="shortcut">Alt+F4</span>
              </div>
            </div>
          )}
        </div>

        {/* 選單二：操作 */}
        <div className={`menu-item-wrapper ${openMenu === 'op' ? 'active' : ''}`}>
          <span className="menu-item" onClick={() => toggleMenu('op')}>操作(O)</span>
          {openMenu === 'op' && (
            <div className="menu-dropdown">
              {isVisible('retrieve') && (
                <div className="dropdown-row" onClick={() => isEnabled('retrieve') && handleMenuAction(null, 'retrieve')}>
                  <span style={{ opacity: isEnabled('retrieve') ? 1 : 0.5 }}>查詢當前頁面</span>
                  <span className="shortcut">F3</span>
                </div>
              )}
              {isVisible('insert') && (
                <div className="dropdown-row" onClick={() => isEnabled('insert') && handleMenuAction(null, 'insert')}>
                  <span style={{ opacity: isEnabled('insert') ? 1 : 0.5 }}>新增記錄 (增行)</span>
                  <span className="shortcut">F5</span>
                </div>
              )}
              {isVisible('delete') && (
                <div className="dropdown-row" onClick={() => isEnabled('delete') && handleMenuAction(null, 'delete')}>
                  <span style={{ opacity: isEnabled('delete') ? 1 : 0.5 }}>刪除記錄 (刪行)</span>
                  <span className="shortcut">F6</span>
                </div>
              )}
              <div className="dropdown-divider"></div>
              {isVisible('save') && (
                <div className="dropdown-row" onClick={() => isEnabled('save') && handleMenuAction(null, 'save')}>
                  <span style={{ opacity: isEnabled('save') ? 1 : 0.5 }}>儲存異動 (存檔)</span>
                  <span className="shortcut">Ctrl+S</span>
                </div>
              )}
              {isVisible('cancel') && (
                <div className="dropdown-row" onClick={() => isEnabled('cancel') && handleMenuAction(null, 'cancel')}>
                  <span style={{ opacity: isEnabled('cancel') ? 1 : 0.5 }}>取消變更</span>
                  <span className="shortcut">Esc</span>
                </div>
              )}
              <div className="dropdown-divider"></div>
              {isVisible('approve') && (
                <div className="dropdown-row" onClick={() => isEnabled('approve') && handleMenuAction(null, 'approve')}>
                  <span style={{ opacity: isEnabled('approve') ? 1 : 0.5 }}>審核單據</span>
                </div>
              )}
              {isVisible('unapprove') && (
                <div className="dropdown-row" onClick={() => isEnabled('unapprove') && handleMenuAction(null, 'unapprove')}>
                  <span style={{ opacity: isEnabled('unapprove') ? 1 : 0.5 }}>反審單據</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. 全域框架工具列 */}
      <div className="win32-toolbar">
        
        {/* 🛰️ 系統導航 Toggle 側欄開關 */}
        <button 
          className={`toolbar-btn ${isSidebarCollapsed ? '' : 'active'}`} 
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "展開左側目錄樹" : "隱藏左側目錄樹"}
          style={{ minWidth: '40px' }}
        >
          <div className="icon-frame">
            {isSidebarCollapsed ? <PanelLeftOpen size={18} color="#0ea5e9"/> : <PanelLeftClose size={18} color="#0ea5e9"/>}
          </div>
          <span className="btn-label">目錄</span>
        </button>

        <div className="toolbar-separator" />

        {/* 導航與入口 */}
        <button className={`toolbar-btn ${!isSheetActive ? 'active' : ''}`} onClick={onNavigate}>
          <div className="icon-frame"><MonitorPlay size={16} color="#2563eb"/></div>
          <span className="btn-label">導航</span>
        </button>
        
        <div className="toolbar-separator" />

        {/* 核心物理 CRUD 操作 */}
        {isVisible('retrieve') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('retrieve')}
            onClick={() => onDispatchCommand('retrieve')}
            title="檢索資料 (F3)"
          >
            <div className="icon-frame"><Search size={16} color={isEnabled('retrieve') ? "#ea580c" : "#94a3b8"}/></div>
            <span className="btn-label">查詢</span>
          </button>
        )}

        {isVisible('edit') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('edit')}
            onClick={() => onDispatchCommand('edit')}
            title="開啟編輯模式 (連點兩下也可編輯)"
          >
            <div className="icon-frame"><Edit3 size={16} color={isEnabled('edit') ? "#2563eb" : "#94a3b8"}/></div>
            <span className="btn-label">編輯</span>
          </button>
        )}

        {isVisible('insert') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('insert')}
            onClick={() => onDispatchCommand('insert')}
            title="新增一筆空白行 (F5)"
          >
            <div className="icon-frame"><PlusSquare size={16} color={isEnabled('insert') ? "#16a34a" : "#94a3b8"}/></div>
            <span className="btn-label">增行</span>
          </button>
        )}

        {isVisible('delete') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('delete')}
            onClick={() => onDispatchCommand('delete')}
            title="刪除當前行 (F6)"
          >
            <div className="icon-frame"><Trash2 size={16} color={isEnabled('delete') ? "#dc2626" : "#94a3b8"}/></div>
            <span className="btn-label">刪行</span>
          </button>
        )}

        {isVisible('save') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('save')}
            onClick={() => onDispatchCommand('save')}
            title="存檔寫入 (Ctrl+S)"
          >
            <div className="icon-frame"><Save size={16} color={isEnabled('save') ? "#eab308" : "#94a3b8"}/></div>
            <span className="btn-label">儲存</span>
          </button>
        )}

        {isVisible('cancel') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('cancel')}
            onClick={() => onDispatchCommand('cancel')}
            title="放棄變更 (Esc)"
          >
            <div className="icon-frame"><RefreshCw size={16} color={isEnabled('cancel') ? "#9333ea" : "#94a3b8"}/></div>
            <span className="btn-label">取消</span>
          </button>
        )}

        <div className="toolbar-separator" />

        {/* 🌟 審核與輸出 */}
        {isVisible('approve') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('approve')} 
            onClick={() => onDispatchCommand('approve')}
            title="單據送出審核"
          >
            <div className="icon-frame"><CheckSquare size={16} color={isEnabled('approve') ? "#6366f1" : "#94a3b8"}/></div>
            <span className="btn-label">審核</span>
          </button>
        )}

        {isVisible('unapprove') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('unapprove')} 
            onClick={() => onDispatchCommand('unapprove')}
            title="反審核單據"
          >
            <div className="icon-frame"><CheckSquare size={16} color={isEnabled('unapprove') ? "#ef4444" : "#94a3b8"}/></div>
            <span className="btn-label">反審</span>
          </button>
        )}

        {isVisible('export') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('export')} 
            onClick={() => onDispatchCommand('export')}
            title="匯出試算表"
          >
            <div className="icon-frame"><FileSpreadsheet size={16} color={isEnabled('export') ? "#0f766e" : "#94a3b8"}/></div>
            <span className="btn-label">Excel</span>
          </button>
        )}

        {isVisible('print') && (
          <button 
            className="toolbar-btn" 
            disabled={!isEnabled('print')}
            onClick={() => onDispatchCommand('print')}
          >
            <div className="icon-frame"><Printer size={16} color={isEnabled('print') ? "#475569" : "#94a3b8"}/></div>
            <span className="btn-label">列印</span>
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* 系統登出 */}
        <button className="toolbar-btn danger" title="安全登出" onClick={logout}>
          <div className="icon-frame"><LogOut size={16} color="#ef4444"/></div>
          <span className="btn-label">退出</span>
        </button>
      </div>
    </div>
  );
}
