import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Star, Trash2 } from 'lucide-react';
import { Dropdown, message } from 'antd';
import { useAuth } from '../auth/useAuth';
import './Sidebar.css';

// 系統設置管理系統
const ssNodes = [];

// 基本資料 26 隻作業序列
const baNodes = [
  { code: 'ba001', label: '個人片語字庫設定' },
  { code: 'ba002', label: '國家設定' },
  { code: 'ba003', label: '產地設定' },
  { code: 'ba004', label: '地區設定' },
  { code: 'ba005', label: '公司設定' },
  { code: 'ba009', label: '品牌設定' },
  { code: 'ba010', label: '客戶資料管理' },
  { code: 'ba015', label: '工廠資料管理' },
  { code: 'ba020', label: '材料供應商類別設定' },
  { code: 'ba025', label: '材料商資料管理' },
  { code: 'ba030', label: '供應商資料管理' },
  { code: 'ba040', label: '銀行設定' },
  { code: 'ba045', label: '部門設定' },
  { code: 'ba050', label: '職務設定' },
  { code: 'ba055', label: '季節設定' },
  { code: 'ba060', label: '幣別及匯率設定' },
  { code: 'ba061', label: '幣別兌換匯率設定' },
  { code: 'ba065', label: '交易港口設定' },
  { code: 'ba070', label: '交易條件設定' },
  { code: 'ba075', label: '付款條件設定' },
  { code: 'ba080', label: '配件設定' },
  { code: 'ba085', label: 'Size Run設定' },
  { code: 'ba090', label: '快遞公司設定' },
  { code: 'ba091', label: '運輸方式設定' },
  { code: 'ba092', label: '單位設定' },
  { code: 'es101', label: '員工資料管理' },
];

// 開發部門管理系統 28 隻核心作業
const dpNodes = [
  { code: 'dp001', label: '開發片語字庫' },
  { code: 'dp002', label: '樣品類別設定' },
  { code: 'dp003', label: '鞋種類別設定' },
  { code: 'dp004', label: 'Size Type設定' },
  { code: 'dp005', label: '部位部位工藝設定' },
  { code: 'dp006', label: '部位資料設定' },
  { code: 'dp007', label: '鞋種部位工藝設定' },
  { code: 'dp008', label: 'Sock Label設定' },
  { code: 'dp009', label: '加工方式設定' },
  { code: 'dp010', label: '楦頭基本資料' },
  { code: 'dp015', label: '大底基本資料' },
  { code: 'dp020', label: '鞋跟基本資料' },
  { code: 'dp023', label: '組別基本資料' },
  { code: 'dp025', label: '型體基本資料(BOM)' },
  { code: 'dp030', label: '樣品單資料管理' },
  { code: 'dp032', label: '未完樣品清單' },
  { code: 'dp035', label: '樣品 Label 印製' },
  { code: 'dp040', label: '樣品寄出快遞管理' },
  { code: 'dp050', label: '樣品單狀態審核' },
  { code: 'dp055', label: '樣品成本核算' },
  { code: 'dp060', label: '大底量產統計' },
  { code: 'dp065', label: '型體量產統計' },
  { code: 'dp070', label: '樣品數量綜合統計' },
  { code: 'dp075', label: '大底攤銷資料管理' },
  { code: 'dp080', label: 'FittingSample意見書' },
  { code: 'dp085', label: 'CFMSample意見書' },
  { code: 'dp095', label: '樣品進度管理查詢' },
  { code: 'dp100', label: '開發費用轉嫁管理' },
];

const smNodes = []; 

const mmNodes = [
  { code: 'mr001', label: '資材片語字庫設定' },
  { code: 'mr002', label: '顏色大類設定' },
  { code: 'mr010', label: '顏色小類設定' },
  { code: 'mr015', label: '材料大類設定' },
  { code: 'mr020', label: '材料厚度設定' },
  { code: 'mr025', label: '材料幅度設定' },
  { code: 'mr030', label: '材料紋路設定' },
  { code: 'mr031', label: '加工方式設定' },
  { code: 'mr035', label: '料號主檔設定作業' },
  { code: 'mr040', label: '材料貼標列印作業' },
  { code: 'mr045', label: '樣品採購單管理' },
  { code: 'mr050', label: '樣品調料資料管理' },
  { code: 'mr053', label: '材料需求查詢作業' },
  { code: 'mr105', label: '入庫作業' },
  { code: 'mr110', label: '發料管理' },
  { code: 'mr115', label: '退貨管理' },
  { code: 'mr125', label: '庫存/盤點管理作業' },
  { code: 'mr130', label: '材料庫存查詢作業' },
  { code: 'mr135', label: '材料進銷存報表' },
];

const saNodes = [
  { code: 'sa001', label: '訂單片語字庫' },
  { code: 'sa005', label: '訂單預算管理' },
  { code: 'sa006', label: '顏色設定' },
  { code: 'sa007', label: '配件設定' },
  { code: 'sa010', label: '客戶資料管理' },
  { code: 'sa015', label: '訂單資料管理' },
  { code: 'sa018', label: '未結訂單餘額查詢' },
  { code: 'sa020', label: '付款方式設定' },
  { code: 'sa030', label: '配額資料管理' },
  { code: 'sa040', label: '訂單報價管理' },
  { code: 'sa045', label: '訂單審核管理' },
  { code: 'sa046', label: '新鞋訂單樣品審核' },
  { code: 'sa048', label: '客戶配額查詢' },
  { code: 'sa050', label: '年度訂單結算' },
  { code: 'sa055', label: '訂單數量綜合統計' },
  { code: 'sa058', label: '樣品訂單統計' },
  { code: 'sa060', label: '出貨單狀態審核' },
  { code: 'sa065', label: '出貨單資料管理' },
  { code: 'sa070', label: '訂單餘額明細查詢' },
  { code: 'sa075', label: '訂單轉入 DP041 管理' },
  { code: 'sa080', label: '訂單餘額統計' },
  { code: 'sa085', label: '樣品成本核算' },
  { code: 'sa090', label: '樣品數量綜合統計' },
  { code: 'sa095', label: '出貨單統計' },
  { code: 'sa096', label: '訂單樣品狀態綜合查詢' },
];

const qcNodes = []; 
const shNodes = []; 
const fmNodes = []; 
const ccNodes = []; 

const systemModules = [
  { id: 'ss', label: '系統設置管理系統', nodes: ssNodes, color: '#64748b', fill: '#f1f5f9' },
  { id: 'ba', label: '基本資料管理系統', nodes: baNodes, color: '#eab308', fill: '#fef08a' },
  { id: 'dp', label: '開發部門管理系統', nodes: dpNodes, color: '#10b981', fill: '#d1fae5', mapNode: { code: 'dp_map', label: '開發部門管理導航圖' } },
  { id: 'sm', label: '樣品中心管理系統', nodes: smNodes, color: '#0ea5e9', fill: '#e0f2fe' },
  { id: 'mm', label: '資材部門管理系統', nodes: mmNodes, color: '#f97316', fill: '#ffedd5' },
  { id: 'sa', label: '業務部門管理系統', nodes: saNodes, color: '#8b5cf6', fill: '#ede9fe' },
  { id: 'qc', label: 'Q/C部門管理系統', nodes: qcNodes, color: '#ef4444', fill: '#fee2e2' },
  { id: 'sh', label: '船務部門管理系統', nodes: shNodes, color: '#06b6d4', fill: '#cffafe' },
  { id: 'fm', label: '財務部門管理系統', nodes: fmNodes, color: '#22c55e', fill: '#dcfce7' },
  { id: 'cc', label: '電腦中心管理系統', nodes: ccNodes, color: '#475569', fill: '#e2e8f0' },
];

/**
 * Sidebar: 100% 功能與風格復刻 PB tv_navigation 樹狀選單
 */
export default function Sidebar({ onSelectNode, activeNode }) {
  // 我的最愛動態管理 (自動持久化至 localStorage)
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('pb_favorites');
    return saved ? JSON.parse(saved) : [
      { code: 'ba001', label: '個人片語字庫設定' }
    ];
  });

  const saveFavorites = (newFavs) => {
    setFavorites(newFavs);
    localStorage.setItem('pb_favorites', JSON.stringify(newFavs));
  };

  const addToFavorites = (node) => {
    if (favorites.some(f => f.code === node.code)) {
      message.info(`「${node.code}」已在我的最愛中`);
      return;
    }
    const newFavs = [...favorites, node];
    saveFavorites(newFavs);
    message.success(`⭐️ 「${node.code} ${node.label}」已加入我的最愛`);
  };

  const removeFromFavorites = (code) => {
    const newFavs = favorites.filter(f => f.code !== code);
    saveFavorites(newFavs);
    message.success('🗑️ 已從我的最愛移除');
  };

  // 節點展開狀態管理
  const [expandedNodes, setExpandedNodes] = useState({
    favorite: true,
    root: true,
    ss: false,
    ba: false,
    dp: false,
    sm: false,
    mm: false,
    sa: false,
    qc: false,
    sh: false,
    fm: false,
    cc: false,
  });

  const toggleNode = (node) => {
    setExpandedNodes(prev => ({ ...prev, [node]: !prev[node] }));
  };

  // 1. 取得全域 Auth 中的 menuData
  const { menuData } = useAuth();

  // 2. 當 menuData 有效且不為空時，對靜態選單進行動態過濾與重組
  const effectiveMenuData = React.useMemo(() => {
    if (!Array.isArray(menuData) || menuData.length === 0) {
      // Phase 5 fallback: if backend menuData is empty, keep legacy static menu for compatibility.
      return systemModules;
    }

    // Direct mapping from backend menuData to conform to the phase requirements
    return menuData.map(folder => {
      // Find matching folder in systemModules to preserve custom styling (color, fill, mapNode)
      const staticMod = systemModules.find(m => m.label === folder.label);
      const id = staticMod?.id || folder.label.toLowerCase();
      const color = staticMod?.color || '#64748b';
      const fill = staticMod?.fill || '#f1f5f9';
      const mapNode = staticMod?.mapNode || null;

      // Transform backend children list into frontend node list
      const nodes = (folder.children || []).map(child => {
        // leaf node 沒有 routeKey / id 時不渲染 (前端防呆)
        if (!child.routeKey) return null;

        return {
          id: child.routeKey.toLowerCase(),
          code: child.routeKey.toLowerCase(),
          key: child.routeKey.toLowerCase(),
          title: child.label,
          label: child.label,
          programCode: child.programCode,
          permissionKey: child.permissionKey,
          path: child.path
        };
      }).filter(Boolean);

      return {
        id,
        label: folder.label,
        color,
        fill,
        mapNode,
        nodes
      };
    }).filter(mod => {
      // folder node children.length === 0 (nodes.length === 0) 時不渲染
      return mod.nodes.length > 0 || mod.mapNode;
    });
  }, [menuData]);

  // 3. 過濾「我的最愛」以確保只顯示有權限之作業
  const filteredFavorites = React.useMemo(() => {
    if (!Array.isArray(menuData) || menuData.length === 0) {
      return favorites;
    }
    const allowedKeys = new Set();
    const extractKeys = (nodes) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach(n => {
        if (n.routeKey) allowedKeys.add(n.routeKey.toLowerCase());
        else if (n.children) extractKeys(n.children);
      });
    };
    extractKeys(menuData);
    return favorites.filter(fav => allowedKeys.has(fav.code.toLowerCase()));
  }, [favorites, menuData]);

  const renderLeafNode = (item, options = {}) => {
    const isSelected = activeNode === item.code;
    const iconColor = isSelected ? 'var(--primary-color)' : (options.iconColor || '#64748b');

    return (
      <Dropdown
        key={item.code}
        menu={{
          items: [
            {
              key: 'add',
              label: '⭐️ 加入我的最愛',
              icon: <Star size={14} color="#eab308" fill="#fef08a" />,
              onClick: () => addToFavorites(item)
            }
          ]
        }}
        trigger={['contextMenu']}
      >
        <div
          className={`tree-node leaf ${isSelected ? 'selected-node' : ''}`}
          onClick={() => onSelectNode && onSelectNode(item.code, item.label, { permissionKey: item.permissionKey })}
          title={`${item.code} - ${item.label}`}
        >
          <span className="leaf-icon"><FileText size={12} color={iconColor} /></span>
          <span className="node-text">{item.code}--{item.label}</span>
        </div>
      </Dropdown>
    );
  };

  const renderModuleNode = (item, mod) => {
    return renderLeafNode(item, { iconColor: mod.color });
  };

  const renderEmptyModule = () => (
    <div className="tree-node leaf" style={{ fontStyle: 'italic', opacity: 0.6, pointerEvents: 'none' }}>
      <span className="leaf-icon"><FileText size={12} /></span>
      <span className="node-text">尚未配置核心作業...</span>
    </div>
  );

  return (
    <aside className="classic-sidebar">
      <div className="tree-container">

        {/* 🌟 Level 1: 我的最愛 (PB 原廠規格，記錄常用作業) */}
        <div className="tree-node root-node" onClick={() => toggleNode('favorite')}>
          <span className="tree-collapse-btn">
            {expandedNodes.favorite ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
          </span>
          <span className="node-icon"><Star size={14} color="#eab308" fill="#fef08a"/></span>
          <span className="node-text bold">我的最愛</span>
        </div>

        {expandedNodes.favorite && (
          <div className="tree-children">
            {filteredFavorites.length === 0 ? (
              <div className="tree-node leaf" style={{ opacity: 0.5, fontStyle: 'italic', pointerEvents: 'none' }}>
                <span className="node-text" style={{ paddingLeft: '20px' }}>尚無加入任何最愛項目</span>
              </div>
            ) : (
              filteredFavorites.map(item => {
                const isSelected = activeNode === item.code;
                return (
                  <Dropdown
                    key={item.code}
                    menu={{
                      items: [
                        {
                          key: 'remove',
                          label: '💔 移除我的最愛',
                          danger: true,
                          icon: <Trash2 size={14} />,
                          onClick: () => removeFromFavorites(item.code)
                        }
                      ]
                    }}
                    trigger={['contextMenu']}
                  >
                    <div
                      className={`tree-node leaf ${isSelected ? 'selected-node' : ''}`}
                      onClick={() => onSelectNode && onSelectNode(item.code, item.label, { permissionKey: item.permissionKey })}
                      title={`${item.code} - ${item.label}`}
                    >
                      <span className="leaf-icon"><FileText size={12} color={isSelected ? 'var(--primary-color)' : '#eab308'} /></span>
                      <span className="node-text">{item.code}--{item.label}</span>
                    </div>
                  </Dropdown>
                );
              })
            )}
          </div>
        )}

        {/* 🌟 Level 1: 揚網鞋貿ERP系統主幹 */}
        <div className="tree-node root-node" onClick={() => toggleNode('root')}>
          <span className="tree-collapse-btn">
            {expandedNodes.root ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
          </span>
          <span className="node-icon">
            {expandedNodes.root ? <FolderOpen size={14} color="#2563eb" fill="#dbeafe"/> : <Folder size={14} color="#2563eb" fill="#dbeafe"/>}
          </span>
          <span className="node-text bold">揚網鞋貿ERP系統</span>
        </div>

        {expandedNodes.root && (
          <div className="tree-children">
            {effectiveMenuData.map(mod => {
              const isExpanded = !!expandedNodes[mod.id];

              return (
                <div key={mod.id}>
                  <div className="tree-node sub-root" onClick={() => toggleNode(mod.id)}>
                    <span className="tree-collapse-btn">
                      {isExpanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                    </span>
                    <span className="node-icon">
                      {isExpanded
                        ? <FolderOpen size={14} color={mod.color} fill={mod.fill}/>
                        : <Folder size={14} color={mod.color} fill={mod.fill}/>
                      }
                    </span>
                    <span className="node-text">{mod.label}</span>
                  </div>

                  {isExpanded && (
                    <div className="tree-children">
                      {mod.mapNode && (
                        <div
                          className={`tree-node leaf ${activeNode === mod.mapNode.code ? 'selected-node' : ''}`}
                          onClick={() => onSelectNode && onSelectNode(mod.mapNode.code, mod.mapNode.label)}
                          title={mod.mapNode.label}
                        >
                          <span className="leaf-icon">
                            <FolderOpen size={12} color={activeNode === mod.mapNode.code ? 'var(--primary-color)' : mod.color} />
                          </span>
                          <span className="node-text" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                            📍 {mod.mapNode.label}
                          </span>
                        </div>
                      )}

                      {mod.nodes.length > 0
                        ? mod.nodes.map(item => renderModuleNode(item, mod))
                        : renderEmptyModule()
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
