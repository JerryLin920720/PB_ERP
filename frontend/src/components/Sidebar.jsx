import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Star, Trash2 } from 'lucide-react';
import { Dropdown, message } from 'antd';
import './Sidebar.css';

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
    message.success(`🗑️ 已從我的最愛移除`);
  };

  // 節點展開狀態管理
  const [expandedNodes, setExpandedNodes] = useState({
    favorite: true,
    root: true,
    ba: false, // 基本資料預設收起
  });

  const toggleNode = (node) => {
    setExpandedNodes(prev => ({ ...prev, [node]: !prev[node] }));
  };

  // 基本資料 26 隻作業序列 (物理完全一致)
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

  // 開發部門管理系統 28 隻核心作業 (物理完全對齊)
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

  // 系統其他主模組群組 (開發部門移出為靜態渲染)
  const modules = [
    { id: 'sample', label: '樣品中心管理系統' },
    { id: 'sale', label: '銷售訂單管理系統' },
    { id: 'pur', label: '採購資材管理系統' },
    { id: 'prod', label: '生產製造管理系統' },
    { id: 'inv', label: '庫存倉儲管理系統' },
    { id: 'fin', label: '財務會計結算系統' },
    { id: 'sys', label: '系統參數維護設定' }
  ];

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
            {favorites.length === 0 ? (
              <div className="tree-node leaf" style={{ opacity: 0.5, fontStyle: 'italic', pointerEvents: 'none' }}>
                <span className="node-text" style={{ paddingLeft: '20px' }}>尚無加入任何最愛項目</span>
              </div>
            ) : (
              favorites.map(item => {
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
                      onClick={() => onSelectNode && onSelectNode(item.code, item.label)}
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
            
            {/* 🗂️ 子系統 1: 基本資料管理系統 */}
            <div className="tree-node sub-root" onClick={() => toggleNode('ba')}>
              <span className="tree-collapse-btn">
                {expandedNodes.ba ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              </span>
              <span className="node-icon">
                {expandedNodes.ba ? <FolderOpen size={14} color="#eab308" fill="#fef08a"/> : <Folder size={14} color="#eab308" fill="#fef08a"/>}
              </span>
              <span className="node-text">基本資料管理系統</span>
            </div>

            {expandedNodes.ba && (
              <div className="tree-children">
                {baNodes.map(item => {
                  const isSelected = activeNode === item.code;
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
                        onClick={() => onSelectNode && onSelectNode(item.code, item.label)}
                        title={`${item.code} - ${item.label}`}
                      >
                        <span className="leaf-icon"><FileText size={12} color={isSelected ? 'var(--primary-color)' : '#64748b'} /></span>
                        <span className="node-text">{item.code}--{item.label}</span>
                      </div>
                    </Dropdown>
                  );
                })}
              </div>
            )}

            {/* 🗂️ 子系統 2: 開發部門管理系統 */}
            <div className="tree-node sub-root" onClick={() => toggleNode('dp')}>
              <span className="tree-collapse-btn">
                {expandedNodes.dp ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              </span>
              <span className="node-icon">
                {expandedNodes.dp ? <FolderOpen size={14} color="#10b981" fill="#d1fae5"/> : <Folder size={14} color="#10b981" fill="#d1fae5"/>}
              </span>
              <span className="node-text">開發部門管理系統</span>
            </div>

            {expandedNodes.dp && (
              <div className="tree-children">
                {/* ⭐ 第一個葉子節點：開發部門導航圖專屬按鈕 */}
                <div 
                  className={`tree-node leaf ${activeNode === 'dp_map' ? 'selected-node' : ''}`}
                  onClick={() => onSelectNode && onSelectNode('dp_map', '開發部門導航圖')}
                  title="開發部門導航圖"
                >
                  <span className="leaf-icon"><FolderOpen size={12} color={activeNode === 'dp_map' ? 'var(--primary-color)' : '#10b981'} /></span>
                  <span className="node-text" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>📍 開發部門管理導航圖</span>
                </div>

                {dpNodes.map(item => {
                  const isSelected = activeNode === item.code;
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
                        onClick={() => onSelectNode && onSelectNode(item.code, item.label)}
                        title={`${item.code} - ${item.label}`}
                      >
                        <span className="leaf-icon"><FileText size={12} color={isSelected ? 'var(--primary-color)' : '#64748b'} /></span>
                        <span className="node-text">{item.code}--{item.label}</span>
                      </div>
                    </Dropdown>
                  );
                })}
              </div>
            )}
            {modules.map(mod => {
              const isExpanded = !!expandedNodes[mod.id];
              return (
                <div key={mod.id}>
                  <div className="tree-node sub-root" onClick={() => toggleNode(mod.id)}>
                    <span className="tree-collapse-btn">
                      {isExpanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                    </span>
                    <span className="node-icon">
                      {isExpanded ? <FolderOpen size={14} color="#eab308" fill="#fef08a"/> : <Folder size={14} color="#eab308" fill="#fef08a"/>}
                    </span>
                    <span className="node-text">{mod.label}</span>
                  </div>
                  
                  {isExpanded && (
                    <div className="tree-children">
                      <div className="tree-node leaf" style={{ fontStyle: 'italic', opacity: 0.6 }}>
                        <span className="leaf-icon"><FileText size={12} /></span>
                        <span className="node-text">尚未配置核心作業...</span>
                      </div>
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
