import React, { useState, useEffect, useRef } from 'react';
import { 
  MonitorPlay, Map, Save, FileSpreadsheet, Printer, 
  LogOut, PlusSquare, Trash2, CheckSquare, Search, Edit3,
  PanelLeftClose, PanelLeftOpen, RefreshCw, ArrowDownAZ, Filter
} from 'lucide-react';
import './Navbar.css';

/**
 * Navbar: 升級版 - 支援下拉選單(Menu)、折疊切換(Toggle)與擴展物理按鈕
 */
export default function Navbar({ 
  onNavigate, 
  onDispatchCommand, 
  activeTabId,
  isSidebarCollapsed,
  onToggleSidebar
}) {
  const isSheetActive = activeTabId !== 'navigation';
  
  // 🛸 菜單下拉控制狀態
  const [openMenu, setOpenMenu] = useState(null);
  const menubarRef = useRef(null);

  // 外部點擊自動關閉菜單機制
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
      
      {/* 1. 主標題橫欄 (高階智慧鞋業) */}
      <div className="win32-titlebar">
        <div className="titlebar-left">
          <span className="app-icon-img">👟</span>
          <span className="title-text">揚網鞋貿ERP - 智慧鞋業核心管理系統 v4.0</span>
        </div>
        <div className="titlebar-actions">
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8' }}>PROD環境</span>
          <div style={{ width: '1px', height: '12px', backgroundColor: '#475569' }}></div>
          <span>使用者: ADMIN (系統管理者)</span>
        </div>
      </div>

      {/* 2. 系統物理選單列 - 現已活化支援 Dropdown 互動 (底層重要部件) */}
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
              <div className="dropdown-row" onClick={() => handleMenuAction('navigate')}>
                <span>導航圖</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-row">
                <span>公司資訊</span>
              </div>
              <div className="dropdown-row">
                <span>系統參數</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-row">
                <span>重連資料庫</span>
              </div>
              <div className="dropdown-row">
                <span>切換用戶</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-row" style={{ color: '#ef4444' }}>
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
              <div className="dropdown-row" onClick={() => handleMenuAction(null, 'retrieve')}>
                <span>查詢當前頁面</span>
                <span className="shortcut">F3</span>
              </div>
              <div className="dropdown-row" onClick={() => handleMenuAction(null, 'insert')}>
                <span>新增記錄 (增行)</span>
                <span className="shortcut">F5</span>
              </div>
              <div className="dropdown-row" onClick={() => handleMenuAction(null, 'delete')}>
                <span>刪除記錄 (刪行)</span>
                <span className="shortcut">F6</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-row" onClick={() => handleMenuAction(null, 'save')}>
                <span>儲存異動 (存檔)</span>
                <span className="shortcut">Ctrl+S</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-row">
                <span>審核單據</span>
              </div>
              <div className="dropdown-row">
                <span>反審單據</span>
              </div>
            </div>
          )}
        </div>

        <div className="menu-item-wrapper">
          <span className="menu-item">資料管理(M)</span>
        </div>
        <div className="menu-item-wrapper">
          <span className="menu-item">統計報表(R)</span>
        </div>

        {/* 選單三：工具 */}
        <div className={`menu-item-wrapper ${openMenu === 'tool' ? 'active' : ''}`}>
          <span className="menu-item" onClick={() => toggleMenu('tool')}>工具(T)</span>
          {openMenu === 'tool' && (
            <div className="menu-dropdown">
              <div className="dropdown-row"><span>個性參數設定</span></div>
              <div className="dropdown-row"><span>密碼修改</span></div>
              <div className="dropdown-row"><span>日誌查詢</span></div>
            </div>
          )}
        </div>

        <div className="menu-item-wrapper">
          <span className="menu-item">視窗(W)</span>
        </div>
        <div className="menu-item-wrapper">
          <span className="menu-item">幫助(H)</span>
        </div>
      </div>

      {/* 3. 全域框架工具列 (整合 Toggle 側欄與物理控制) */}
      <div className="win32-toolbar">
        
        {/* 🛰️ 系統導航 Toggle 側欄開關 (完全落實您的提示要求) */}
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
        <button 
          className="toolbar-btn" 
          disabled={!isSheetActive}
          onClick={() => onDispatchCommand('retrieve')}
          title="檢索資料 (F3)"
        >
          <div className="icon-frame"><Search size={16} color={isSheetActive ? "#ea580c" : "#94a3b8"}/></div>
          <span className="btn-label">查詢</span>
        </button>

        <button 
          className="toolbar-btn" 
          disabled={!isSheetActive}
          onClick={() => onDispatchCommand('edit')}
          title="開啟編輯模式 (連點兩下也可編輯)"
        >
          <div className="icon-frame"><Edit3 size={16} color={isSheetActive ? "#2563eb" : "#94a3b8"}/></div>
          <span className="btn-label">編輯</span>
        </button>

        <button 
          className="toolbar-btn" 
          disabled={!isSheetActive}
          onClick={() => onDispatchCommand('insert')}
          title="新增一筆空白行 (F5)"
        >
          <div className="icon-frame"><PlusSquare size={16} color={isSheetActive ? "#16a34a" : "#94a3b8"}/></div>
          <span className="btn-label">增行</span>
        </button>

        <button 
          className="toolbar-btn" 
          disabled={!isSheetActive}
          onClick={() => onDispatchCommand('delete')}
          title="刪除當前行 (F6)"
        >
          <div className="icon-frame"><Trash2 size={16} color={isSheetActive ? "#dc2626" : "#94a3b8"}/></div>
          <span className="btn-label">刪行</span>
        </button>

        <button 
          className="toolbar-btn" 
          disabled={!isSheetActive}
          onClick={() => onDispatchCommand('save')}
          title="存檔寫入 (Ctrl+S)"
        >
          <div className="icon-frame"><Save size={16} color={isSheetActive ? "#eab308" : "#94a3b8"}/></div>
          <span className="btn-label">儲存</span>
        </button>

        <div className="toolbar-separator" />

        {/* 🌟 新增 DataWindow 標準底層輔助物理按鈕 */}
        <button 
          className="toolbar-btn" 
          disabled={!isSheetActive}
          onClick={() => onDispatchCommand('retrieve')}
          title="重整重新整理"
        >
          <div className="icon-frame"><RefreshCw size={16} color={isSheetActive ? "#0891b2" : "#94a3b8"}/></div>
          <span className="btn-label">重整</span>
        </button>

        <button 
          className="toolbar-btn" 
          disabled={!isSheetActive}
          title="數據資料排序"
        >
          <div className="icon-frame"><ArrowDownAZ size={16} color={isSheetActive ? "#4f46e5" : "#94a3b8"}/></div>
          <span className="btn-label">排序</span>
        </button>

        <button 
          className="toolbar-btn" 
          disabled={!isSheetActive}
          title="數據過濾防呆"
        >
          <div className="icon-frame"><Filter size={16} color={isSheetActive ? "#0d9488" : "#94a3b8"}/></div>
          <span className="btn-label">過濾</span>
        </button>

        <div className="toolbar-separator" />

        {/* 審核與輸出 */}
        <button className="toolbar-btn" disabled={!isSheetActive} title="單據送出審核">
          <div className="icon-frame"><CheckSquare size={16} color={isSheetActive ? "#6366f1" : "#94a3b8"}/></div>
          <span className="btn-label">審核</span>
        </button>

        <button className="toolbar-btn" disabled={!isSheetActive} title="匯出試算表">
          <div className="icon-frame"><FileSpreadsheet size={16} color={isSheetActive ? "#0f766e" : "#94a3b8"}/></div>
          <span className="btn-label">Excel</span>
        </button>

        <button className="toolbar-btn" disabled={!isSheetActive}>
          <div className="icon-frame"><Printer size={16} color={isSheetActive ? "#475569" : "#94a3b8"}/></div>
          <span className="btn-label">列印</span>
        </button>

        <div style={{ flex: 1 }} />

        {/* 系統登出 */}
        <button className="toolbar-btn danger" title="安全登出">
          <div className="icon-frame"><LogOut size={16} color="#ef4444"/></div>
          <span className="btn-label">退出</span>
        </button>
      </div>
    </div>
  );
}
