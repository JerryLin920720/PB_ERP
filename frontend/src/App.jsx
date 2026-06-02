import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './views/Dashboard';
import Ba001Sheet from './v2_views/Ba001Sheet';
import Ba002Sheet from './v2_views/Ba002Sheet';
import Ba003Sheet from './v2_views/Ba003Sheet';
import Ba004Sheet from './v2_views/Ba004Sheet';
import Ba005Sheet from './v2_views/Ba005Sheet';
import Ba009Sheet from './v2_views/Ba009Sheet';
import Ba010Sheet from './v2_views/Ba010Sheet';
import Ba015Sheet from './v2_views/Ba015V2Sheet';
import Ba020Sheet from './v2_views/Ba020Sheet';
import Ba025V2Sheet from './v2_views/Ba025V2Sheet';
import Ba030V2Sheet from './v2_views/Ba030V2Sheet';
import Ba040Sheet from './v2_views/Ba040Sheet';
import Ba045Sheet from './v2_views/Ba045Sheet';
import Ba050Sheet from './v2_views/Ba050Sheet';
import Ba055Sheet from './v2_views/Ba055Sheet';
import Ba060Sheet from './v2_views/Ba060Sheet';
import Ba061Sheet from './v2_views/Ba061Sheet';
import Ba065Sheet from './v2_views/Ba065Sheet';
import Ba070Sheet from './v2_views/Ba070Sheet';
import Ba075Sheet from './v2_views/Ba075Sheet';
import Ba080Sheet from './v2_views/Ba080Sheet';
import Ba085Sheet from './v2_views/Ba085Sheet';
import Ba090Sheet from './v2_views/Ba090Sheet';
import Ba091Sheet from './v2_views/Ba091Sheet';
import Es101V2Sheet from './v2_views/Es101V2Sheet';
import Ba092Sheet from './v2_views/Ba092Sheet';
import Ss001Sheet from './v2_views/Ss001Sheet';
import Sy005Sheet from './v2_views/Sy005Sheet';
import DpFlowMap from './components/DpFlowMap';
import Dp001Sheet from './v2_views/Dp001Sheet';
import Dp002Sheet from './v2_views/Dp002Sheet';
import Dp003Sheet from './v2_views/Dp003Sheet';
import Dp004Sheet from './v2_views/Dp004Sheet';
import Dp005Sheet from './v2_views/Dp005Sheet';
import Dp006Sheet from './v2_views/Dp006Sheet';
import Dp008Sheet from './v2_views/Dp008Sheet';
import Dp009Sheet from './v2_views/Dp009Sheet';
import Dp007Sheet from './v2_views/Dp007Sheet';
import Dp020Sheet from './v2_views/Dp020Sheet';
import Dp015Sheet from './v2_views/Dp015Sheet';
import Dp010Sheet from './v2_views/Dp010Sheet';
import Dp023Sheet from './v2_views/Dp023Sheet';
import Dp025Sheet from './v2_views/Dp025Sheet';
import Dp030Sheet from './v2_views/Dp030Sheet';
import Dp032Sheet from './v2_views/Dp032Sheet';
import Dp035Sheet from './v2_views/Dp035Sheet';
import Dp040Sheet from './v2_views/Dp040Sheet';
import Dp050Sheet from './v2_views/Dp050Sheet';
import Dp055Sheet from './views/Dp055Sheet';
import Dp080Sheet from './views/Dp080Sheet';
import Dp100Sheet from './views/Dp100Sheet';
import Dp060Sheet from './v2_views/Dp060Sheet';
import Dp065Sheet from './v2_views/Dp065Sheet';

import Mr001Sheet from './v2_views/Mr001Sheet';
import Mr002Sheet from './v2_views/Mr002Sheet';
import Mr015Sheet from './v2_views/Mr015Sheet';
import Mr020Sheet from './v2_views/Mr020Sheet';
import Mr025Sheet from './v2_views/Mr025Sheet';
import Mr030Sheet from './v2_views/Mr030Sheet';
import Mr031Sheet from './v2_views/Mr031Sheet';

import Dp070Sheet from './v2_views/Dp070Sheet';
import Dp095Sheet from './v2_views/Dp095Sheet';

// 💼 業務部門管理系統 (Sales Administration - SA) Pattern A
import Sa001Sheet from './v2_views/Sa001Sheet';
import Sa005Sheet from './v2_views/Sa005Sheet';
import Sa006Sheet from './v2_views/Sa006Sheet';
import Sa007Sheet from './v2_views/Sa007Sheet';
import { message } from 'antd';
import { X } from 'lucide-react';
import useAuth from './auth/useAuth';
import LoginPage from './pages/LoginPage';
import { canOpenProgram, inferPermissionKey } from './auth/permissionUtils';
import './App.css';

function App() {
  const { isAuthenticated, isLoading, user, permissions } = useAuth();

  // ⭐️ MDI 多頁籤管理器狀態 (100% 復刻 C/S 原理)
  const [tabs, setTabs] = useState([
    { id: 'navigation', title: '系統導航', closable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('navigation');

  React.useEffect(() => {
    console.log('[App Debug] activeTabId changed to:', activeTabId);
  }, [activeTabId]);

  // 🛰️ 側欄折疊與展開狀態 (底層必備框架控制)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ⏱️ 底層框架標準：全域實時時鐘 (Dynamic Clock Engine)
  const [currentTime, setCurrentTime] = useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeTabPermissionKey = activeTabId === 'navigation' || activeTabId === 'dp_map'
    ? null
    : inferPermissionKey(activeTabId);
  const isAuthorized = !activeTabPermissionKey || canOpenProgram(permissions, activeTabPermissionKey, user);

  // 開啟新視窗 (動態 Singleton 路由機制)
  const handleOpenSheet = useCallback((sheetId, sheetLabel, params = {}) => {
    // Route Guard check
    if (sheetId && sheetId !== 'navigation') {
      const permissionKey =
        params?.permissionKey ||
        params?.node?.permissionKey ||
        inferPermissionKey(sheetId);

      if (!canOpenProgram(permissions, permissionKey, user)) {
        message.warning('對不起，您沒有此作業的存取權限。');
        return;
      }
    }

    const finalLabel = sheetLabel || getMockLabel(sheetId);

    // 檢查是否已經開過這個分頁
    const exists = tabs.find(t => t.id === sheetId);
    if (exists) {
      // 已開過，直接切換焦點 (等同 PB .SetFocus())
      setActiveTabId(sheetId);
    } else {
      // 沒開過，向 Tabs 堆疊推入新分頁並聚焦
      setTabs([...tabs, { id: sheetId, title: finalLabel, closable: true, params }]);
      setActiveTabId(sheetId);
    }

    // 發送參數給視窗 (如果已開啟則廣播 retrieve 指令)
    if (params && Object.keys(params).length > 0) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mdi-params-passed', {
          detail: { targetSheet: sheetId, params }
        }));
      }, 100);
    }
  }, [tabs, permissions, user]);

  React.useEffect(() => {
    const handleOpenSheetEvent = (e) => {
      const { sheetId, id, code, sheetLabel, title, label, params } = e.detail;
      const actualId = sheetId || id || code;
      const actualLabel = sheetLabel || title || label;
      const mergedParams = {
        ...params,
        permissionKey: e.detail.permissionKey || e.detail.node?.permissionKey || params?.permissionKey
      };
      handleOpenSheet(actualId, actualLabel, mergedParams);
    };
    window.addEventListener('mdi-open-sheet', handleOpenSheetEvent);
    return () => window.removeEventListener('mdi-open-sheet', handleOpenSheetEvent);
  }, [handleOpenSheet]);

  // 關閉分頁邏輯
  const handleCloseTab = (e, sheetId) => {
    e.stopPropagation(); // 阻斷 Click Bubbling
    const index = tabs.findIndex(t => t.id === sheetId);
    if (index < 0) return;

    const updatedTabs = tabs.filter(t => t.id !== sheetId);
    setTabs(updatedTabs);

    // 如果關閉的是當前啟動分頁，自動聚焦隔壁頁籤
    if (activeTabId === sheetId) {
      const newActiveIndex = Math.min(index, updatedTabs.length - 1);
      setActiveTabId(updatedTabs[newActiveIndex].id);
    }
  };

  // 發布全域物理指令給目前活動視窗
  const handleDispatchCommand = (action) => {
    console.log(`🌐 MDI Dispatching global command: [${action}] to ActiveTab: [${activeTabId}]`);
    // 利用瀏覽器原生 CustomEvent 進行全局廣播，目標 DataWindow 進行過濾接收
    const event = new CustomEvent('mdi-global-command', {
      detail: { action, targetSheet: activeTabId }
    });
    window.dispatchEvent(event);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', gap: '16px', color: '#6366f1',
        backgroundColor: '#09090b', fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '50px', height: '50px', border: '5px solid rgba(99, 102, 241, 0.1)',
          borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin-loader 1s linear infinite'
        }} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin-loader { to { transform: rotate(360deg); } }
        `}} />
        <h3 style={{ margin: 0, fontWeight: 600, color: '#f4f4f5' }}>ERP 系統安全通道載入中...</h3>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const userRole = user?.privilege_class === '5' ? '管理員' : '一般使用者';

  return (
    <div className={`win32-desktop ${isSidebarCollapsed ? 'collapsed-sidebar' : ''}`}>
      {/* Top Navbar - 現在傳遞全域物理按鈕指令委託 */}
      <Navbar
        onNavigate={() => setActiveTabId('navigation')}
        onDispatchCommand={handleDispatchCommand}
        activeTabId={activeTabId}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Body Container */}
      <div className="win32-mdi-body">
        {/* Left Sidebar Tree */}
        <Sidebar onSelectNode={handleOpenSheet} activeNode={activeTabId} />

        {/* 🚀 底層邊緣懸浮切換鈕 (Floating Edge Toggle) */}
        <div
          className="sidebar-edge-toggle"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? "展開側欄" : "隱藏側欄"}
        >
          {isSidebarCollapsed ? '❯' : '❮'}
        </div>

        {/* Right: Unified Workspace with Modern Tab-Strip */}
        <main className="win32-workspace-area">

          {/* 🏷️ 物理復刻分頁條 Tab Strip */}
          <div className="mdi-tab-strip">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`mdi-tab-item ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span>{tab.title}</span>
                {tab.closable && (
                  <span className="mdi-tab-close-btn" onClick={(e) => handleCloseTab(e, tab.id)}>
                    <X size={10} />
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 📄 視窗主顯示區域 (動態 MDI Router) */}
          <div className="mdi-sheet-container">
            {console.log("[MDI DEBUG] activeTabId:", activeTabId)}
            {!isAuthorized ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', width: '100%', gap: '16px', color: '#ef4444',
                backgroundColor: 'var(--app-bg-panel)', borderRadius: 'var(--border-radius-lg)',
                border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)'
              }}>
                <span style={{ fontSize: '48px' }}>🚫</span>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                  403 存取被拒絕
                </h2>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  對不起，您沒有此作業 [{activeTabId.toUpperCase()}] 的存取權限，請聯絡系統管理員。
                </p>
                <button
                  className="modern-btn"
                  style={{ height: '36px', padding: '0 20px', marginTop: '8px', borderRadius: 'var(--border-radius-md)' }}
                  onClick={(e) => handleCloseTab(e, activeTabId)}
                >
                  關閉此頁面
                </button>
              </div>
            ) : activeTabId === 'ss001' ? (
              <Ss001Sheet />
            ) : activeTabId === 'sy005' ? (
              <Sy005Sheet />
            ) : activeTabId === 'navigation' ? (
              <Dashboard onOpenSheet={handleOpenSheet} />
            ) : activeTabId === 'dp_map' ? (
              <DpFlowMap onOpenSheet={handleOpenSheet} />
            ) : activeTabId === 'dp001' ? (
              <Dp001Sheet />
            ) : activeTabId === 'dp002' ? (
              <Dp002Sheet />
            ) : activeTabId === 'dp003' ? (
              <Dp003Sheet />
            ) : activeTabId === 'dp004' ? (
              <Dp004Sheet />
            ) : activeTabId === 'dp007' ? (
              <Dp007Sheet />
            ) : activeTabId === 'dp005' ? (
              <Dp005Sheet />
            ) : activeTabId === 'dp006' ? (
              <Dp006Sheet />
            ) : activeTabId === 'dp008' ? (
              <Dp008Sheet />
            ) : activeTabId === 'dp009' ? (
              <Dp009Sheet />
            ) : activeTabId === 'dp020' ? (
              <Dp020Sheet />
            ) : activeTabId === 'dp015' ? (
              <Dp015Sheet />
            ) : activeTabId === 'dp010' ? (
              <Dp010Sheet />
            ) : activeTabId === 'dp023' ? (
              <Dp023Sheet />
            ) : activeTabId === 'dp025' ? (
              <Dp025Sheet />
            ) : activeTabId === 'dp030' ? (
              <Dp030Sheet />
            ) : activeTabId === 'dp032' ? (
              <Dp032Sheet />
            ) : activeTabId === 'dp035' ? (
              <Dp035Sheet />
            ) : activeTabId === 'dp040' ? (
              <Dp040Sheet />
            ) : activeTabId === 'dp050' ? (
              <Dp050Sheet />
            ) : activeTabId === 'dp055' ? (
              <Dp055Sheet />
            ) : activeTabId === 'dp080' ? (
              <Dp080Sheet />
            ) : activeTabId === 'dp085' ? (
              <Dp080Sheet />
            ) : activeTabId === 'dp100' ? (
              <Dp100Sheet />
            ) : activeTabId === 'dp095' ? (
              <Dp095Sheet />
            ) : activeTabId === 'dp060' ? (
              <Dp060Sheet />
            ) : activeTabId === 'dp065' ? (
              <Dp065Sheet />
            ) : activeTabId === 'dp070' ? (
              <Dp070Sheet />
            ) : activeTabId === 'mr001' ? (
              <Mr001Sheet />
            ) : activeTabId === 'mr002' ? (
              <Mr002Sheet />
            ) : activeTabId === 'mr015' ? (
              <Mr015Sheet />
            ) : activeTabId === 'mr020' ? (
              <Mr020Sheet />
            ) : activeTabId === 'mr025' ? (
              <Mr025Sheet />
            ) : activeTabId === 'mr030' ? (
              <Mr030Sheet />
            ) : activeTabId === 'mr031' ? (
              <Mr031Sheet />
            ) : activeTabId === 'ba001' ? (
              <Ba001Sheet />
            ) : activeTabId === 'ba002' ? (
              <Ba002Sheet />
            ) : activeTabId === 'ba003' ? (
              <Ba003Sheet />
            ) : activeTabId === 'ba004' ? (
              <Ba004Sheet />
            ) : activeTabId === 'ba005' ? (
              <Ba005Sheet />
            ) : activeTabId === 'ba009' ? (
              <Ba009Sheet />
            ) : activeTabId === 'ba010' ? (
              <Ba010Sheet />
            ) : activeTabId === 'ba015' ? (
              <Ba015Sheet />
            ) : activeTabId === 'ba020' ? (
              <Ba020Sheet />
            ) : activeTabId === 'ba025' ? (
              <Ba025V2Sheet />
            ) : activeTabId === 'ba030' ? (
              <Ba030V2Sheet />
            ) : activeTabId === 'ba040' ? (
              <Ba040Sheet />
            ) : activeTabId === 'ba045' ? (
              <Ba045Sheet />
            ) : activeTabId === 'ba050' ? (
              <Ba050Sheet />
            ) : activeTabId === 'ba055' ? (
              <Ba055Sheet />
            ) : activeTabId === 'ba060' ? (
              <Ba060Sheet />
            ) : activeTabId === 'ba061' ? (
              <Ba061Sheet />
            ) : activeTabId === 'ba065' ? (
              <Ba065Sheet />
            ) : activeTabId === 'ba070' ? (
              <Ba070Sheet />
            ) : activeTabId === 'ba075' ? (
              <Ba075Sheet />
            ) : activeTabId === 'ba080' ? (
              <Ba080Sheet />
            ) : activeTabId === 'ba085' ? (
              <Ba085Sheet />
            ) : activeTabId === 'ba090' ? (
              <Ba090Sheet />
            ) : activeTabId === 'ba091' ? (
              <Ba091Sheet />
            ) : activeTabId === 'ba092' ? (
              <Ba092Sheet />
            ) : activeTabId === 'es101' ? (
              <Es101V2Sheet />
            ) : activeTabId === 'sa001' ? (
              <Sa001Sheet />
            ) : activeTabId === 'sa005' ? (
              <Sa005Sheet />
            ) : activeTabId === 'sa006' ? (
              <Sa006Sheet />
            ) : activeTabId === 'sa007' ? (
              <Sa007Sheet />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', width: '100%', gap: '16px', color: 'var(--text-muted)',
                backgroundColor: 'var(--app-bg-panel)', borderRadius: 'var(--border-radius-lg)',
                border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)'
              }}>
                <span style={{ fontSize: '48px' }}>⚡</span>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                  物理作業開發中
                </h2>
                <p style={{ fontSize: '14px', margin: 0 }}>
                  系統作業代號 [{activeTabId.toUpperCase()}] 正在努力還原中...
                </p>
                <button
                  className="modern-btn"
                  style={{ height: '36px', padding: '0 20px', marginTop: '8px', borderRadius: 'var(--border-radius-md)' }}
                  onClick={() => handleCloseTab({ stopPropagation: () => { } }, activeTabId)}
                >
                  關閉此頁面
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer Status Bar (包含底層規範規定的實時時鐘更新) */}
      <footer className="win32-statusbar">
        <div className="status-panel section-left">就緒 | 當前焦點視窗: [{activeTabId.toUpperCase()}]</div>
        <div className="status-panel">使用者: {user?.display_name || user?.username} ({userRole})</div>
        <div className="status-panel">資料庫連線: PROD_DB (正常)</div>
        <div className="status-panel" style={{ fontWeight: '600', opacity: 0.7 }}>
          CAPS: OFF | NUM: ON
        </div>
        <div className="status-panel section-time">
          ⏰ {currentTime.toLocaleString('zh-TW', { hour12: false })}
        </div>
      </footer>
    </div>
  );
}

// 幫助小工具：根據代號回填標題
function getMockLabel(id) {
  const labels = {
    'ss001': '選單與權限啟用設定',
    'sy005': '使用者與群組權限管理',
    'ba001': '個人片語字庫設定',
    'ba002': '國家設定',
    'ba003': '產地設定',
    'ba004': '地區設定',
    'ba005': '公司資料設定',
    'ba009': '品牌設定',
    'ba010': '客戶資料管理',
    'ba015': '工廠資料管理',
    'ba020': '材料供應商類別',
    'ba025': '材料商資料管理',
    'ba030': '供應商資料管理',
    'ba040': '銀行設定',
    'ba045': '部門設定',
    'ba050': '職務設定',
    'ba055': '季節設定',
    'ba060': '幣別及匯率設定',
    'ba061': '幣別兌換匯率設定',
    'ba065': '交易港口設定',
    'ba070': '交易條件設定',
    'ba075': '付款條件設定',
    'ba080': '配件設定',
    'ba085': 'Size Run設定',
    'ba090': '快遞公司設定',
    'ba091': '運輸方式設定',
    'ba092': '單位設定',
    'es101': '員工資料管理',

    // 🚀 開發部門管理系統 (Product Development)
    'dp001': '開發片語字庫',
    'dp002': '樣品類別設定',
    'dp003': '鞋種類別設定',
    'dp004': '鞋種性別設定',
    'dp005': '部位類別設定',
    'dp006': '部位基本資料',
    'dp007': '鞋種部位設定',
    'dp008': 'Sock Label設定',
    'dp009': '加工方式設定',
    'dp010': '楦頭基本資料',
    'dp015': '大底基本資料',
    'dp020': '鞋跟基本資料',
    'dp023': '組別基本資料',
    'dp025': '型體基本資料(BOM)',
    'dp030': '樣品單資料管理',
    'dp032': '未完樣品催交清單',
    'dp035': '樣品 Label 管理',
    'dp040': '樣品寄出資料管理',
    'dp050': '樣品單審核管理',
    'dp055': '樣品成本核算管理',
    'dp080': 'Fitting意見書',
    'dp085': 'CFM Sample意見書',
    'dp060': '大底量產統計查詢',
    'dp065': '樣品生命週期轉化查詢',
    'dp070': '季節款數開發統計查詢',
    'dp095': '確認樣管制系統',
    'dp100': '開發費用轉嫁管理',
    'mr001': '資材片語字庫設定',
    'mr002': '顏色大類設定',
    'mr020': '材料厚度設定',
    'mr025': '材料幅度設定',
    'mr031': '加工方式設定',

    // 💼 業務部門管理系統 (Sales Administration - SA)
    'sa001': '業務片語字庫',
    'sa005': 'Assortment 設定',
    'sa006': '其他費用設定',
    'sa007': '報價其他費用設定',
    'sa010': '報價資料管理',
    'sa015': '開模通知單',
    'sa018': '外部訂單匯入作業',
    'sa020': '預告訂單資料管理',
    'sa030': '正式訂單資料管理',
    'sa040': 'PI 訂單資料管理',
    'sa045': '訂單狀態審核管理',
    'sa046': '配件收受資料管理',
    'sa048': '預接訂單查詢',
    'sa050': '退貨訂單查詢',
    'sa055': '客戶訂單查詢',
    'sa058': '未出貨完成訂單查詢',
    'sa060': '工廠訂單查詢',
    'sa065': '利潤預估查詢',
    'sa070': '型體接單統計查詢',
    'sa075': '客戶接單統計查詢',
    'sa080': '工廠接單統計查詢',
    'sa085': '客戶索樣與接單統計分析',
    'sa090': '暢銷型體查詢',
    'sa095': '信件內容整合管理',
    'sa096': '未收到 LC 查詢',
  };
  return labels[id] || `作業 [${id.toUpperCase()}]`;
}

export default App;
