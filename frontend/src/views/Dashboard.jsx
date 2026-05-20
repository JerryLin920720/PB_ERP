import React, { useState } from 'react';
import FlowMap from '../components/FlowMap';
import DpFlowMap from '../components/DpFlowMap';
import './Dashboard.css';

export default function Dashboard({ onOpenSheet }) {
  const tabs = [
    { id: 'ba', label: '基本資料管理' },
    { id: 'dp', label: '開發部門管理' },
    { id: 'sm', label: '樣品中心管理' },
    { id: 'mr', label: '資材倉庫管理' },
    { id: 'sa', label: '業務部門管理' },
    { id: 'qc', label: 'QC部門管理' },
    { id: 'sh', label: '船務部門管理' },
    { id: 'fa', label: '財務部門管理' },
    { id: 'cc', label: '電腦中心' }
  ];

  const [activeTab, setActiveTab] = useState('ba');

  return (
    <div className="classic-dashboard">
      
      {/* The Classic Tab Control Header */}
      <div className="classic-tab-header">
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className={`classic-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-text">{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Main Tab Content Workspace */}
      <div className="classic-tab-pane win32-outset">
        {activeTab === 'ba' ? (
          <FlowMap onOpenSheet={onOpenSheet} />
        ) : activeTab === 'dp' ? (
          <DpFlowMap onOpenSheet={onOpenSheet} />
        ) : (
          <div className="empty-workspace">
            <p>尚未開啟該功能模組之系統導航圖。</p>
          </div>
        )}
      </div>
    </div>
  );
}
