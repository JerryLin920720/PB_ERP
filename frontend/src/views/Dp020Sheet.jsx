import React, { useState, useEffect } from 'react';
import { Table, Form, Input, InputNumber, Button, Select, Space, Tabs, Row, Col, Card, Checkbox, message, DatePicker, Divider, Tag, Image, Modal, Radio } from 'antd';
import { SearchOutlined, AppstoreOutlined, FileImageOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import './MdSheetLayout.css';

const { TextArea } = Input;
const { TabPane } = Tabs;
const API_URL = 'http://localhost:8001/api/';

// 🔍 雙擊開彈窗 Lookup 欄位組件
function LookupField({ value, onChange, placeholder, type, lookupList, openLookup, disabled }) {
  const displayVal = lookupList.find(item => item.gkey === value)?.shortname || 
                     lookupList.find(item => item.gkey === value)?.lastno || 
                     lookupList.find(item => item.gkey === value)?.groupcode || 
                     lookupList.find(item => item.gkey === value)?.bottomno || 
                     '';
  return (
    <Input
      readOnly
      placeholder={placeholder}
      className="editable-cell-pb"
      value={displayVal}
      disabled={disabled}
      style={{ backgroundColor: disabled ? '#f5f5f5' : '#fffbe6' }}
      onDoubleClick={() => {
        if (!disabled) {
          openLookup(type, (selected) => {
            if (onChange) onChange(selected.gkey);
          });
        }
      }}
      suffix={
        <SearchOutlined 
          style={{ color: disabled ? '#cbd5e1' : '#0284c7', cursor: disabled ? 'not-allowed' : 'pointer' }} 
          onClick={() => {
            if (!disabled) {
              openLookup(type, (selected) => {
                if (onChange) onChange(selected.gkey);
              });
            }
          }} 
        />
      }
    />
  );
}

export default function Dp020Sheet() {
  const [form] = Form.useForm();
  
  // 📦 數據狀態
  const [entities, setEntities] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false); 
  const [loading, setLoading] = useState(false);
  
  const [activeTabKey, setActiveTabKey] = useState('query');
  const [qFilters, setQFilters] = useState({ 
    heelno: '', year: '', ba055gkey: null, ba015gkey: null, heelheight: '', dp010gkey: null, dp015gkey: null, adopted: 'A' 
  });
  
  // 🧬 字典緩存
  const [seasons, setSeasons] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [lasts, setLasts] = useState([]);
  const [outsoles, setOutsoles] = useState([]);

  // 彈窗狀態
  const [lookupState, setLookupState] = useState({
    visible: false,
    type: '',
    searchText: '',
    callback: null
  });

  const openLookup = (type, callback) => {
    setLookupState({
      visible: true,
      type,
      searchText: '',
      callback
    });
  };

  // 1. 🚀 載入所有資料
  const doQuery = async (filterOverride = null) => {
    setLoading(true);
    try {
      const params = filterOverride || { ...qFilters };
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] === null || params[k] === undefined) {
          delete params[k];
        }
      });
      if (params.adopted === 'A') {
        delete params.adopted;
      }
      const [resM, resS, resSup, resL, resO] = await Promise.all([
        axios.get(`${API_URL}dp020/`, { params }),
        axios.get(`${API_URL}ba055/`),
        axios.get(`${API_URL}ba015/`),
        axios.get(`${API_URL}dp010/`),
        axios.get(`${API_URL}dp015/`)
      ]);
      setEntities(resM.data);
      setSeasons(resS.data);
      setSuppliers(resSup.data);
      setLasts(resL.data);
      setOutsoles(resO.data);
      
      if (resM.data.length > 0) {
        // 預設選取第一筆
        const first = resM.data[0];
        setActiveRecord(first);
        form.setFieldsValue({
          ...first,
          issuedate: first.issuedate ? dayjs(first.issuedate) : null
        });
      } else {
        setActiveRecord(null);
        form.resetFields();
      }
    } catch (e) {
      message.error('資料加載失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { doQuery(); }, []);

  // ⚡ MDI 廣播監聽
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp020') {
        if (action === 'retrieve') doQuery();
        else if (action === 'edit') { 
          if (!activeRecord) {
            message.warning('請先選擇一筆資料');
            return;
          }
          setIsEditing(true); 
          setActiveTabKey('details'); 
        }
        else if (action === 'insert') handleAdd();
        else if (action === 'delete') handleDelete();
        else if (action === 'save') handleSave();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [entities, activeRecord, isEditing, qFilters]);

  // 📡 參數接收監聽
  useEffect(() => {
    const handleParams = (e) => {
      const { targetSheet, params } = e.detail;
      if (targetSheet === 'dp020' && params.heelno) {
        const newFilters = { ...qFilters, heelno: params.heelno };
        setQFilters(newFilters);
        doQuery(newFilters);
      }
    };
    window.addEventListener('mdi-params-passed', handleParams);
    return () => window.removeEventListener('mdi-params-passed', handleParams);
  }, [qFilters]);

  // 📋 行選擇與連動
  const handleRowSelect = (record) => {
    setActiveRecord(record);
    setIsEditing(false);
    form.setFieldsValue({
      ...record,
      issuedate: record.issuedate ? dayjs(record.issuedate) : null
    });
  };

  const handleAdd = () => {
    const newM = { gkey: `temp_${Date.now()}`, heelno: '', year: dayjs().format('YYYY'), adopted: 'N' };
    setEntities([newM, ...entities]);
    setActiveRecord(newM);
    setIsEditing(true);
    setActiveTabKey('details');
    form.resetFields();
    form.setFieldsValue({ year: newM.year, issuedate: dayjs(), adopted: 'N', unit: 'CM' });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, issuedate: values.issuedate ? values.issuedate.format('YYYY-MM-DD') : null };
      let gkey = activeRecord.gkey;

      if (gkey.startsWith('temp_')) {
        const res = await axios.post(`${API_URL}dp020/`, payload);
        gkey = res.data.gkey;
      } else {
        await axios.put(`${API_URL}dp020/${gkey}/`, payload);
      }
      message.success('存檔成功');
      setIsEditing(false);
      doQuery();
    } catch (e) { message.error('存檔失敗'); }
  };

  const handleDelete = async () => {
    if (!activeRecord) return;
    if (activeRecord.gkey.startsWith('temp_')) {
      setEntities(entities.filter(e => e.gkey !== activeRecord.gkey));
      setActiveRecord(null);
      setIsEditing(false);
      return;
    }
    try {
      await axios.delete(`${API_URL}dp020/${activeRecord.gkey}/`);
      message.success('刪除成功');
      doQuery();
      setActiveTabKey('query');
    } catch (e) { message.error('刪除失敗'); }
  };

  // 篩選本機過濾
  const filteredEntities = entities.filter(i => 
    (!qFilters.heelno || i.heelno.toLowerCase().includes(qFilters.heelno.toLowerCase())) &&
    (!qFilters.year || (i.year || '').includes(qFilters.year)) &&
    (!qFilters.ba055gkey || i.ba055gkey === qFilters.ba055gkey) &&
    (!qFilters.ba015gkey || i.ba015gkey === qFilters.ba015gkey) &&
    (!qFilters.heelheight || String(i.heelheight || '').includes(qFilters.heelheight)) &&
    (!qFilters.dp010gkey || i.dp010gkey === qFilters.dp010gkey) &&
    (!qFilters.dp015gkey || i.dp015gkey === qFilters.dp015gkey) &&
    (qFilters.adopted === 'A' || i.adopted === qFilters.adopted)
  );

  return (
    <div className="dp020-premium-container md-sheet-container">
      <div className="md-sheet-header">
        <Space>
          <AppstoreOutlined style={{ color: '#096dd9' }} />
          <span className="md-sheet-title">DP020 鞋跟基本資料管理</span>
          <Divider type="vertical" />
          <Tag color={isEditing ? 'orange' : 'blue'}>{isEditing ? 'EDITING' : 'VIEWING'}</Tag>
        </Space>
        <span className="md-sheet-version">PB Master-Detail Parity v3.2</span>
      </div>
      <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} type="line" className="md-sheet-tabs">
        
        {/* 🔍 Tab 1: 瀏覽列表 */}
        <TabPane tab="查詢列表" key="query">
          <div className="md-query-panel">
            
            {/* 🔍 dw-where-panel */}
            <div className="dw-where-panel">
              <Form layout="vertical" size="small" className="pb-form">
                <Row gutter={16}>
                  <Col span={18}>
                    <Row gutter={8}>
                      <Col span={8}>
                        <Form.Item label="鞋跟編號">
                          <Input placeholder="模糊搜尋..." value={qFilters.heelno} onChange={e => setQFilters({...qFilters, heelno: e.target.value})} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="年度">
                          <Input placeholder="如 2026..." value={qFilters.year} onChange={e => setQFilters({...qFilters, year: e.target.value})} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="季節">
                          <Select allowClear showSearch optionFilterProp="label" value={qFilters.ba055gkey} onChange={v => setQFilters({...qFilters, ba055gkey: v})} options={seasons.map(s=>({value:s.gkey, label:s.groupcode}))} placeholder="選擇季節..." />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8} style={{ marginTop: '4px' }}>
                      <Col span={8}>
                        <Form.Item label="供應商">
                          <Select allowClear showSearch optionFilterProp="label" value={qFilters.ba015gkey} onChange={v => setQFilters({...qFilters, ba015gkey: v})} options={suppliers.map(s=>({value:s.gkey, label:s.shortname}))} placeholder="選擇供應商..." />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="跟高">
                          <Input placeholder="輸入跟高..." value={qFilters.heelheight} onChange={e => setQFilters({...qFilters, heelheight: e.target.value})} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="關聯楦頭">
                          <Select allowClear showSearch optionFilterProp="label" value={qFilters.dp010gkey} onChange={v => setQFilters({...qFilters, dp010gkey: v})} options={lasts.map(l=>({value:l.gkey, label:l.lastno}))} placeholder="選擇楦頭..." />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8} style={{ marginTop: '4px' }}>
                      <Col span={8}>
                        <Form.Item label="關聯大底">
                          <Select allowClear showSearch optionFilterProp="label" value={qFilters.dp015gkey} onChange={v => setQFilters({...qFilters, dp015gkey: v})} options={outsoles.map(o=>({value:o.gkey, label:o.bottomno}))} placeholder="選擇大底..." />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>
                  <Col span={6}>
                    <div className="radio-group-box">
                      <div className="box-label">採用狀態</div>
                      <Form.Item name="adopted" initialValue="A" style={{ marginBottom: 0 }}>
                        <Radio.Group value={qFilters.adopted} onChange={e => setQFilters({...qFilters, adopted: e.target.value})}>
                          <Space direction="vertical">
                            <Radio value="Y">已採用</Radio>
                            <Radio value="N">未採用</Radio>
                            <Radio value="A">全部</Radio>
                          </Space>
                        </Radio.Group>
                      </Form.Item>
                    </div>
                  </Col>
                </Row>
              </Form>
            </div>

            {/* 數據 Table */}
            <div className="md-query-grid">
              <Table 
                size="small" bordered dataSource={filteredEntities} rowKey="gkey" pagination={{ pageSize: 50, size: 'small' }} loading={loading}
                onRow={record => ({ 
                  onClick: () => handleRowSelect(record),
                  onDoubleClick: () => { handleRowSelect(record); setActiveTabKey('details'); }
                })}
                rowClassName={r => r.gkey === activeRecord?.gkey ? 'row-active' : ''}
                columns={[
                  { title: '鞋跟編號', dataIndex: 'heelno', width: 180, render: v => <b>{v}</b> },
                  { title: '年度', dataIndex: 'year', width: 80 },
                  { title: '季節', dataIndex: 'season_name', width: 120 },
                  { title: '供應商', dataIndex: 'factory_name', width: 180 },
                  { title: '跟高', dataIndex: 'heelheight', width: 120, render: (v, r) => `${v || 0} ${r.unit || 'CM'}` },
                  { title: '關聯楦頭', dataIndex: 'last_no', width: 180 },
                  { title: '關聯大底', dataIndex: 'bottom_no', width: 180 },
                  { title: '量產', dataIndex: 'adopted', width: 80, align: 'center', render: v => v === 'Y' ? 'Y' : 'N' }
                ]}
              />
            </div>
          </div>
        </TabPane>

        {/* 📋 Tab 2: 卡片編輯頁 */}
        <TabPane tab="編輯維護" key="details" disabled={!activeRecord}>
          <div className="md-editor-shell">
            <div className="md-editor-sidebar">
              <div className="md-editor-sidebar-header">鞋跟列表</div>
              <div className="md-editor-sidebar-list">
                {entities.map(item => (
                  <div
                    key={item.gkey}
                    className={`md-editor-sidebar-item ${activeRecord?.gkey === item.gkey ? 'active' : ''}`}
                    onClick={() => handleRowSelect(item)}
                    onDoubleClick={() => setActiveTabKey('details')}
                  >
                    <div className="md-editor-sidebar-item-title">{item.heelno || '未命名鞋跟'}</div>
                    <div className="md-editor-sidebar-item-meta">{item.year || ''} {item.factory_name || ''}</div>
                  </div>
                ))}
              </div>
            </div>
          <div className="md-editor-main">
            <Row gutter={16}>
              {/* 左邊：鞋跟基本資料 */}
              <Col span={16}>
                <Card size="small" title={<span className="card-title-pb"><AppstoreOutlined /> 鞋跟詳細資料</span>} extra={<Tag color="blue">{activeRecord?.heelno || 'NEW'}</Tag>}>
                  <Form form={form} layout="horizontal" size="small" className="pb-form">
                    <Row gutter={24}>
                      <Col span={12}>
                        <Form.Item name="heelno" label="鞋跟編號" rules={[{ required: true, message: '請輸入鞋跟編號' }]}>
                          <Input disabled={!isEditing} style={{ backgroundColor: isEditing ? '#fffbe6' : '#f5f5f5' }} />
                        </Form.Item>
                        <Form.Item name="ba055gkey" label="季節">
                          <LookupField placeholder="雙擊選擇季節..." type="season" lookupList={seasons} openLookup={openLookup} disabled={!isEditing} />
                        </Form.Item>
                        <Form.Item name="dp010gkey" label="楦頭編號">
                          <LookupField placeholder="雙擊選擇楦頭..." type="last" lookupList={lasts} openLookup={openLookup} disabled={!isEditing} />
                        </Form.Item>
                        <Form.Item name="photopath" label="圖片路徑">
                          <Input disabled={!isEditing} style={{ backgroundColor: isEditing ? '#fffbe6' : '#f5f5f5' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="issuedate" label="發行日期">
                          <DatePicker style={{ width: '100%' }} disabled={!isEditing} />
                        </Form.Item>
                        <Form.Item name="ba015gkey" label="供應商">
                          <LookupField placeholder="雙擊選擇供應商..." type="supplier" lookupList={suppliers} openLookup={openLookup} disabled={!isEditing} />
                        </Form.Item>
                        <Form.Item name="dp015gkey" label="大底編號">
                          <LookupField placeholder="雙擊選擇大底..." type="outsole" lookupList={outsoles} openLookup={openLookup} disabled={!isEditing} />
                        </Form.Item>
                        <Form.Item name="year" label="年度">
                          <Input disabled={!isEditing} style={{ backgroundColor: isEditing ? '#fffbe6' : '#f5f5f5' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Divider style={{ margin: '8px 0' }} />
                    
                    <Row gutter={24}>
                      <Col span={10}>
                        <Form.Item name="heelheight" label="鞋跟高度">
                          <InputNumber style={{ width: '100%' }} disabled={!isEditing} />
                        </Form.Item>
                      </Col>
                      <Col span={7}>
                        <Form.Item name="unit" label="單位">
                          <Select disabled={!isEditing} options={[{ value: 'CM', label: 'CM' }, { value: 'IN', label: 'IN' }]} />
                        </Form.Item>
                      </Col>
                      <Col span={7}>
                        <Form.Item name="adopted" label="量產" valuePropName="checked" getValueProps={v => ({ checked: v === 'Y' })} getValueFromEvent={e => e.target.checked ? 'Y' : 'N'}>
                          <Checkbox disabled={!isEditing}>啟用</Checkbox>
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Row gutter={24}>
                      <Col span={24}>
                        <Form.Item name="material" label="鞋跟材質">
                          <Input disabled={!isEditing} style={{ backgroundColor: isEditing ? '#fffbe6' : '#f5f5f5' }} />
                        </Form.Item>
                        <Form.Item name="description" label="高度說明">
                          <Input disabled={!isEditing} style={{ backgroundColor: isEditing ? '#fffbe6' : '#f5f5f5' }} />
                        </Form.Item>
                        <Form.Item name="remark" label="備註說明">
                          <TextArea rows={6} disabled={!isEditing} style={{ backgroundColor: isEditing ? '#fffbe6' : '#f5f5f5' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              </Col>
              
              {/* 右邊：鞋跟外觀圖片 */}
              <Col span={8}>
                <Card size="small" title="鞋跟外觀圖片" style={{ height: '100%' }}>
                  <div style={{ border: '1px dashed #d9d9d9', borderRadius: '4px', height: '460px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', overflow: 'hidden' }}>
                    {activeRecord?.photopath ? (
                      <Image src={`/media/${activeRecord.photopath}`} style={{ maxHeight: '440px', maxWidth: '100%', objectFit: 'contain' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'; }} />
                    ) : (
                      <div style={{ color: '#bfbfbf', textAlign: 'center' }}><FileImageOutlined style={{ fontSize: '48px' }} /><div>無圖片記錄</div></div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
          </div>
        </TabPane>
      </Tabs>

      {/* 雙擊開彈窗 Lookup 渲染 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: 'bold' }}>
            <SearchOutlined />
            {lookupState.type === 'supplier' && '選擇廠商視窗 (ba015)'}
            {lookupState.type === 'last' && '選擇楦頭視窗 (dp010)'}
            {lookupState.type === 'season' && '選擇季節視窗 (ba055)'}
            {lookupState.type === 'outsole' && '選擇大底視窗 (dp015)'}
          </div>
        }
        open={lookupState.visible}
        onCancel={() => setLookupState(prev => ({ ...prev, visible: false }))}
        footer={[
          <Button key="cancel" size="small" onClick={() => setLookupState(prev => ({ ...prev, visible: false }))}>
            取消
          </Button>
        ]}
        width={700}
        styles={{ body: { padding: '12px' } }}
        destroyOnClose
      >
        <div style={{ marginBottom: '8px' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="請輸入關鍵字快速搜尋..."
            value={lookupState.searchText}
            onChange={e => setLookupState(prev => ({ ...prev, searchText: e.target.value }))}
            allowClear
            autoFocus
            size="middle"
            style={{ borderRadius: '4px' }}
          />
        </div>

        <Table
          size="small"
          bordered
          rowKey="gkey"
          pagination={{ pageSize: 8, showSizeChanger: false, size: 'small' }}
          dataSource={
            lookupState.type === 'supplier' ? suppliers.filter(s => 
              (s.factoryno || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (s.shortname || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (s.fullname || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) :
            lookupState.type === 'last' ? lasts.filter(l => 
              (l.lastno || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (l.remark || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) :
            lookupState.type === 'season' ? seasons.filter(s => 
              (s.groupcode || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) :
            lookupState.type === 'outsole' ? outsoles.filter(o => 
              (o.bottomno || '').toLowerCase().includes(lookupState.searchText.toLowerCase()) ||
              (o.bottomname || '').toLowerCase().includes(lookupState.searchText.toLowerCase())
            ) : []
          }
          columns={
            lookupState.type === 'supplier' ? [
              { title: '廠商代碼', dataIndex: 'factoryno', width: 120, sorter: (a, b) => (a.factoryno || '').localeCompare(b.factoryno || '') },
              { title: '廠商簡稱', dataIndex: 'shortname', width: 180, sorter: (a, b) => (a.shortname || '').localeCompare(b.shortname || '') },
              { title: '廠商全稱', dataIndex: 'fullname', ellipsis: true }
            ] :
            lookupState.type === 'last' ? [
              { title: '楦頭編號', dataIndex: 'lastno', width: 180, sorter: (a, b) => (a.lastno || '').localeCompare(b.lastno || '') },
              { title: '楦頭年度', dataIndex: 'year', width: 100, sorter: (a, b) => (a.year || '').localeCompare(b.year || '') },
              { title: '說明/備註', dataIndex: 'remark', ellipsis: true }
            ] :
            lookupState.type === 'season' ? [
              { title: '季節代碼', dataIndex: 'groupcode', sorter: (a, b) => (a.groupcode || '').localeCompare(b.groupcode || '') }
            ] :
            lookupState.type === 'outsole' ? [
              { title: '大底編號', dataIndex: 'bottomno', width: 180, sorter: (a, b) => (a.bottomno || '').localeCompare(b.bottomno || '') },
              { title: '大底名稱', dataIndex: 'bottomname', width: 220, sorter: (a, b) => (a.bottomname || '').localeCompare(b.bottomname || '') },
              { title: '大底年度', dataIndex: 'year', width: 100 }
            ] : []
          }
          onRow={record => ({
            onDoubleClick: () => {
              if (lookupState.callback) {
                lookupState.callback(record);
              }
              setLookupState(prev => ({ ...prev, visible: false }));
            },
            style: { cursor: 'pointer' }
          })}
        />
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
          * 💡 提示：雙擊任意資料列即可完成選擇並帶回欄位。
        </div>
      </Modal>

      <style>{`
        .dp020-premium-container {
          padding: 8px 12px;
          height: 100vh;
          width: 100% !important;
          display: flex;
          flex-direction: column;
          background: #f1f5f9;
        }

        .dw-where-panel {
          background: #fff;
          padding: 8px;
          border: 1px solid #d9d9d9;
          margin-bottom: 8px;
          flex: 0 0 auto;
        }

        .pb-form .ant-form-item {
          margin-bottom: 4px !important;
        }

        .pb-form .ant-form-item-label {
          padding: 0 0 2px !important;
          line-height: 18px !important;
        }

        .pb-form .ant-form-item-label > label {
          font-size: 12px !important;
          color: #595959 !important;
          font-weight: bold !important;
          height: 18px !important;
          line-height: 18px !important;
        }

        .pb-form .ant-input:not(textarea), 
        .pb-form .ant-input-number, 
        .pb-form .ant-select-selector,
        .pb-form .ant-picker {
          font-size: 13px !important;
          height: 28px !important;
          padding: 2px 8px !important;
          border-radius: 0 !important;
          border-color: #d9d9d9 !important;
        }

        .pb-form .ant-select-selection-item {
          line-height: 24px !important;
        }

        .radio-group-box {
          border: 1px solid #d9d9d9;
          padding: 6px 12px;
          height: 100%;
          background: #fafafa;
        }

        .radio-group-box .box-label {
          font-size: 12px;
          font-weight: bold;
          color: #595959;
          margin-bottom: 8px;
        }

        .row-active td {
          background-color: #bae7ff !important;
        }

        .card-title-pb {
          color: #1e3a8a;
          font-weight: bold;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
