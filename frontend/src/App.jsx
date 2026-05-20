import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './views/Dashboard';
import Ba001Sheet from './views/Ba001Sheet';
import Ba002Sheet from './views/Ba002Sheet';
import Ba003Sheet from './views/Ba003Sheet';
import Ba004Sheet from './views/Ba004Sheet';
import Ba005Sheet from './views/Ba005Sheet';
import Ba009Sheet from './views/Ba009Sheet';
import Ba010Sheet from './views/Ba010Sheet';
import Ba015Sheet from './views/Ba015Sheet';
import Ba020Sheet from './views/Ba020Sheet';
import Ba025Sheet from './views/Ba025Sheet';
import Ba030Sheet from './views/Ba030Sheet';
import Ba040Sheet from './views/Ba040Sheet';
import Ba045Sheet from './views/Ba045Sheet';
import Ba050Sheet from './views/Ba050Sheet';
import Ba055Sheet from './views/Ba055Sheet';
import Ba060Sheet from './views/Ba060Sheet';
import Ba061Sheet from './views/Ba061Sheet';
import Ba065Sheet from './views/Ba065Sheet';
import Ba070Sheet from './views/Ba070Sheet';
import Ba075Sheet from './views/Ba075Sheet';
import Ba080Sheet from './views/Ba080Sheet';
import Ba085Sheet from './views/Ba085Sheet';
import Ba090Sheet from './views/Ba090Sheet';
import Ba091Sheet from './views/Ba091Sheet';
import Es101Sheet from './views/Es101Sheet';
import Ba092Sheet from './views/Ba092Sheet';
import DpFlowMap from './components/DpFlowMap';
import Dp001Sheet from './views/Dp001Sheet';
import Dp002Sheet from './views/Dp002Sheet';
import Dp003Sheet from './views/Dp003Sheet';
import Dp004Sheet from './views/Dp004Sheet';
import Dp005Sheet from './views/Dp005Sheet';
import Dp006Sheet from './views/Dp006Sheet';
import Dp008Sheet from './views/Dp008Sheet';
import Dp009Sheet from './views/Dp009Sheet';
import Dp007Sheet from './views/Dp007Sheet';
import Dp020Sheet from './views/Dp020Sheet';
import Dp015Sheet from './views/Dp015Sheet';
import Dp010Sheet from './views/Dp010Sheet';
import Dp023Sheet from './views/Dp023Sheet';
import Dp025Sheet from './views/Dp025Sheet';
import Dp030Sheet from './views/Dp030Sheet';
import Dp032Sheet from './views/Dp032Sheet';
import Dp035Sheet from './views/Dp035Sheet';
import Dp040Sheet from './views/Dp040Sheet';
import Dp050Sheet from './views/Dp050Sheet';
import Dp055Sheet from './views/Dp055Sheet';
import Dp080Sheet from './views/Dp080Sheet';
import Dp100Sheet from './views/Dp100Sheet';
import Dp060Sheet from './views/Dp060Sheet';
import Dp065Sheet from './views/Dp065Sheet';
import Dp070Sheet from './views/Dp070Sheet';
import Dp095Sheet from './views/Dp095Sheet';



import { X } from 'lucide-react';
import './App.css';

function App() {
  // ⭐️ MDI 多頁籤管理器狀態 (100% 復刻 C/S 原理)
  const [tabs, setTabs] = useState([
    { id: 'navigation', title: '系統導航', closable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('navigation');

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

  // 開啟新視窗 (動態 Singleton 路由機制)
  const handleOpenSheet = (sheetId, sheetLabel, params = {}) => {
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
  };

  React.useEffect(() => {
    const handleOpenSheetEvent = (e) => {
      const { sheetId, sheetLabel, params } = e.detail;
      handleOpenSheet(sheetId, sheetLabel, params);
    };
    window.addEventListener('mdi-open-sheet', handleOpenSheetEvent);
    return () => window.removeEventListener('mdi-open-sheet', handleOpenSheetEvent);
  }, [tabs]);

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
            {activeTabId === 'navigation' ? (
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
              <Ba025Sheet />
            ) : activeTabId === 'ba030' ? (
              <Ba030Sheet />
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
              <Es101Sheet />
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
                  onClick={() => handleCloseTab({ stopPropagation: () => {} }, activeTabId)}
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
        <div className="status-panel">使用者: ADMIN (管理員)</div>
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
    'dp100': '開發費用轉嫁管理'
  };
  return labels[id] || `作業 [${id.toUpperCase()}]`;
}

export default App;
