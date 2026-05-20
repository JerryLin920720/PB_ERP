import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Input, Select, InputNumber, Button, Space, message, Typography, Tag, Divider, Tabs, Form, Row, Col, Card, Empty, Modal, Radio, Checkbox } from 'antd';
import { 
  BlockOutlined, 
  SearchOutlined, 
  FileTextOutlined, 
  PlusOutlined,
  SaveOutlined,
  DatabaseOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import './MdSheetLayout.css';

const { Text, Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const API_BASE = 'http://localhost:8001/api';

// --- Resizable Table Column Bridge ---
const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <th {...restProps} style={{ ...restProps.style, position: 'relative' }}>
      {restProps.children}
      <div
        className="resizer"
        onMouseDown={(e) => {
          e.stopPropagation();
          const startX = e.pageX;
          const startWidth = width;
          const onMouseMove = (moveEvent) => {
            const currentWidth = startWidth + (moveEvent.pageX - startX);
            onResize(currentWidth);
          };
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      />
    </th>
  );
};

export default function Dp010Sheet() {
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Data States
  const [masterList, setMasterList] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [measurements, setMeasurements] = useState([]); // Dp011
  const [values, setValues] = useState([]);             // Dp012
  const [histories, setHistories] = useState([]);       // Dp013
  const [stocks, setStocks] = useState([]);             // Dp014

  // Lookups
  const [customers, setCustomers] = useState([]);
  const [factories, setFactories] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [sizeTypes, setSizeTypes] = useState([]);
  const [bottoms, setBottoms] = useState([]);
  const [heels, setHeels] = useState([]);
  const [belongTo, setBelongTo] = useState([]);

  // Column Widths for Resizing
  const [colWidths, setColWidths] = useState({
    year: 60, lastno: 120, issuedate: 100, customer: 180, factory: 180, gender: 70, bottom: 120, start: 50, end: 50, adopted: 50
  });

  const fetchData = async (params = {}) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/dp010/`, { params });
      setMasterList(res.data);
      if (res.data.length > 0) loadDetail(res.data[0]);
    } catch (e) { message.error('讀取主檔失敗'); } finally { setLoading(false); }
  };

  const loadDetail = async (master) => {
    setSelectedMaster(master);
    setLoading(true);
    try {
      const [mRes, vRes, hRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/dp011/?dp010gkey=${master.gkey}`),
        axios.get(`${API_BASE}/dp012/?dp010gkey=${master.gkey}`),
        axios.get(`${API_BASE}/dp013/?dp010gkey=${master.gkey}`),
        axios.get(`${API_BASE}/dp014/?dp010gkey=${master.gkey}`)
      ]);
      setMeasurements(mRes.data);
      setValues(vRes.data);
      setHistories(hRes.data);
      setStocks(sRes.data);
      form.setFieldsValue({
        ...master,
        issuedate: master.issuedate ? dayjs(master.issuedate).format('YYYY-MM-DD') : null,
        cfmdate: master.cfmdate ? dayjs(master.cfmdate).format('YYYY-MM-DD') : null
      });
      setIsEditing(false);
    } catch (e) { message.error('讀取明細失敗'); } finally { setLoading(false); }
  };

  useEffect(() => {
    const fetchLookups = async () => {
      const [c, f, s, st, b, h, bt] = await Promise.all([
        axios.get(`${API_BASE}/ba010/`), axios.get(`${API_BASE}/ba015/`), axios.get(`${API_BASE}/ba055/`),
        axios.get(`${API_BASE}/dp004/`), axios.get(`${API_BASE}/dp015/`), axios.get(`${API_BASE}/dp020/`),
        axios.get(`${API_BASE}/ba005/`)
      ]);
      setCustomers(c.data); setFactories(f.data); setSeasons(s.data);
      setSizeTypes(st.data); setBottoms(b.data); setHeels(h.data); setBelongTo(bt.data);
      fetchData();
    };
    fetchLookups();
  }, []);

  // MDI Commands
  useEffect(() => {
    const handleGlobalCommand = (e) => {
      const { action, targetSheet } = e.detail;
      if (targetSheet === 'dp010') {
        if (action === 'retrieve') fetchData(searchForm.getFieldsValue());
        else if (action === 'edit') { setActiveTab('2'); setIsEditing(true); }
        else if (action === 'insert') handleAddNew();
        else if (action === 'save') handleSave();
        else if (action === 'delete') handleDelete();
      }
    };
    window.addEventListener('mdi-global-command', handleGlobalCommand);
    return () => window.removeEventListener('mdi-global-command', handleGlobalCommand);
  }, [selectedMaster, isEditing, measurements, values]);

  const handleDelete = () => {
    if (!selectedMaster || String(selectedMaster.gkey).startsWith('temp_')) return;
    Modal.confirm({
      title: '刪除確認',
      content: `確定要刪除楦頭編號 '${selectedMaster.lastno}' 及其所有關聯資料嗎？`,
      okText: '確定刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete(`${API_BASE}/dp010/${selectedMaster.gkey}/`);
          message.success('資料已刪除');
          fetchData();
        } catch (e) { message.error('刪除失敗'); }
      }
    });
  };

  const handleAddNew = () => {
    setActiveTab('2'); setIsEditing(true); setSelectedMaster({ gkey: `temp_${Date.now()}` });
    setMeasurements([]); setValues([]); setHistories([]); setStocks([]);
    form.resetFields();
    form.setFieldsValue({ issuedate: dayjs().format('YYYY-MM-DD'), year: dayjs().format('YYYY'), fullhalf: '2', basicsize: 7.0 });
  };

  const handleSave = async () => {
    if (!isEditing) return;
    try {
      const masterVals = await form.validateFields();
      const payload = { master: { ...masterVals, gkey: selectedMaster.gkey }, measurements, values, histories, stocks };
      await axios.post(`${API_BASE}/dp010/deep_save/`, payload);
      message.success('存檔成功'); setIsEditing(false); fetchData({ lastno: masterVals.lastno });
    } catch (e) { message.error('存檔失敗'); }
  };

  // --- Size Matrix Logic ---
  const sizeRun = useMemo(() => {
    const fv = form.getFieldsValue();
    const start = parseFloat(fv.startsize) || 0;
    const end = parseFloat(fv.endsize) || 0;
    const mode = fv.fullhalf;
    if (start === 0 && end === 0) return [];
    let list = [], curr = start, step = mode === '2' ? 0.5 : 1.0;
    while (curr <= end && list.length < 25) {
      if (mode === '3') { list.push(`${curr}&${curr+0.5}`); curr += 1.0; }
      else { list.push(curr.toFixed(1)); curr += step; }
    }
    return list;
  }, [form.getFieldValue('startsize'), form.getFieldValue('endsize'), form.getFieldValue('fullhalf')]);

  const handleValueChange = (mGkey, size, val) => {
    if (!isEditing) return;
    const newVal = parseFloat(val) || 0;
    let updatedValues = [...values];
    const idx = updatedValues.findIndex(v => v.dp011gkey === mGkey && v.size === size);
    if (idx >= 0) updatedValues[idx].cvalue = newVal;
    else updatedValues.push({ dp011gkey: mGkey, size, cvalue: newVal, serialno: updatedValues.length + 1, dp010gkey: selectedMaster.gkey });

    const basicSize = form.getFieldValue('basicsize')?.toString();
    if (size === basicSize) {
        const mDef = measurements.find(m => m.gkey === mGkey);
        const steps = parseFloat(mDef?.steps) || 0;
        if (steps !== 0) {
            const sIdx = sizeRun.indexOf(size);
            sizeRun.forEach((s, runIdx) => {
                if (runIdx === sIdx) return;
                const distance = runIdx - sIdx;
                const targetVal = newVal + (distance * steps);
                const vIdx = updatedValues.findIndex(v => v.dp011gkey === mGkey && v.size === s);
                if (vIdx >= 0) updatedValues[vIdx].cvalue = targetVal;
                else updatedValues.push({ dp011gkey: mGkey, size: s, cvalue: targetVal, dp010gkey: selectedMaster.gkey });
            });
        }
    }
    setValues(updatedValues);
  };

  const pivotColumns = [
    { title: '部位/量法', dataIndex: 'parts', fixed: 'left', width: 100,
        render: (v, r) => (isEditing ? <Input value={v} onChange={e => setMeasurements(measurements.map(m => m.gkey === r.gkey ? { ...m, parts: e.target.value } : m))} variant="borderless" style={{ fontSize: '10px' }} /> : <Text strong style={{ fontSize: '10px' }}>{v}</Text>)
    },
    { title: '步長', dataIndex: 'steps', width: 50,
        render: (v, r) => (isEditing ? <InputNumber value={v} onChange={val => setMeasurements(measurements.map(m => m.gkey === r.gkey ? { ...m, steps: val } : m))} variant="borderless" step={0.01} style={{ fontSize: '10px' }} controls={false} /> : <Text type="secondary" style={{ fontSize: '10px' }}>{v}</Text>)
    },
    ...sizeRun.map(size => ({
        title: size, key: size, width: 55, align: 'center',
        render: (_, r) => {
            const vObj = values.find(v => v.dp011gkey === r.gkey && v.size === size);
            const isBasic = size === form.getFieldValue('basicsize')?.toString();
            return isEditing ? (
                <InputNumber value={vObj?.cvalue} onChange={val => handleValueChange(r.gkey, size, val)} variant="borderless" style={{ width: '100%', backgroundColor: isBasic ? '#fff7e6' : 'transparent', fontWeight: isBasic ? 'bold' : 'normal', fontSize: '10px' }} controls={false} />
            ) : <Text style={{ fontSize: '10px', color: isBasic ? '#d46b08' : 'inherit', fontWeight: isBasic ? 'bold' : 'normal' }}>{vObj?.cvalue || '-'}</Text>
        }
    }))
  ];

  // --- UI Components ---
  const SearchTab = (
    <div className="search-tab-container">
      <div className="dw-where-panel">
        <Form form={searchForm} layout="vertical" size="small" className="pb-form">
          <Row gutter={16}>
            <Col span={18}>
              <Row gutter={8}>
                <Col span={8}><Form.Item name="year" label="年度"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="ba055gkey" label="季節"><Select allowClear showSearch options={seasons.map(s=>({value:s.gkey, label:s.groupcode}))}/></Form.Item></Col>
                <Col span={8}><Form.Item name="lastno" label="楦頭編號"><Input /></Form.Item></Col>
              </Row>
              <Row gutter={8}>
                <Col span={8}><Form.Item name="ba010gkey" label="客戶"><Select allowClear showSearch options={customers.map(c=>({value:c.gkey, label:`${c.custno} ${c.shortname}`}))}/></Form.Item></Col>
                <Col span={8}><Form.Item name="ba015gkey" label="楦頭廠"><Select allowClear showSearch options={factories.map(f=>({value:f.gkey, label:`${f.factno} ${f.shortname}`}))}/></Form.Item></Col>
                <Col span={8}><Form.Item name="apba015gkey" label="採用工廠"><Select allowClear showSearch options={factories.map(f=>({value:f.gkey, label:`${f.factno} ${f.shortname}`}))}/></Form.Item></Col>
              </Row>
              <Row gutter={8}>
                <Col span={8}><Form.Item name="dp015gkey" label="大底編號"><Select allowClear showSearch options={bottoms.map(b=>({value:b.gkey, label:b.bottomno}))}/></Form.Item></Col>
                <Col span={8}><Form.Item name="dp020gkey" label="跟型編號"><Select allowClear showSearch options={heels.map(h=>({value:h.gkey, label:h.heelno}))}/></Form.Item></Col>
                <Col span={8}><Form.Item name="ba005gkey" label="歸屬公司"><Select allowClear showSearch options={belongTo.map(b=>({value:b.gkey, label:b.shortname}))}/></Form.Item></Col>
              </Row>
            </Col>
            <Col span={6}>
              <div className="radio-group-box">
                <div className="box-label">採用狀態</div>
                <Form.Item name="adopted" initialValue=" ">
                  <Radio.Group><Space direction="vertical"><Radio value="Y">已採用</Radio><Radio value="N">未採用</Radio><Radio value=" ">全部</Radio></Space></Radio.Group>
                </Form.Item>
              </div>
            </Col>
          </Row>
        </Form>
      </div>
      <div className="dw-query-panel">
        <Table 
          size="small" dataSource={masterList} rowKey="gkey" pagination={{ pageSize: 50, size: 'small' }} bordered
          onRow={r => ({ onClick: () => loadDetail(r), onDoubleClick: () => { loadDetail(r); setActiveTab('2'); }, className: selectedMaster?.gkey === r.gkey ? 'row-active' : '' })}
          components={{ header: { cell: ResizableTitle } }}
          columns={[
              { title: '年度', dataIndex: 'year', width: colWidths.year, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, year: w}) }) },
              { title: '楦頭編號', dataIndex: 'lastno', width: colWidths.lastno, fixed: 'left', onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, lastno: w}) }) },
              { title: '發行日期', dataIndex: 'issuedate', width: colWidths.issuedate, render: v => v ? dayjs(v).format('YYYY-MM-DD') : '', onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, issuedate: w}) }) },
              { title: '客戶', dataIndex: 'ba010_shortname', width: colWidths.customer, render: (v, r) => v || '', onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, customer: w}) }) },
              { title: '楦頭廠', dataIndex: 'ba015_shortname', width: colWidths.factory, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, factory: w}) }) },
              { title: '採用工廠', dataIndex: 'ba015_shortname1', width: 120, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, factory1: w}) }) },
              { title: '性別', dataIndex: 'dp004_gender', width: colWidths.gender, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, gender: w}) }) },
              { title: '大底編號', dataIndex: 'dp015_bottomno', width: colWidths.bottom, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, bottom: w}) }) },
              { title: '跟型編號', dataIndex: 'dp020_heelno', width: 100, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, heel: w}) }) },
              { title: '楦頭類型', dataIndex: 'dp010_lasttype', width: 100, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, type: w}) }) },
              { title: '起碼', dataIndex: 'startsize', width: colWidths.start, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, start: w}) }) },
              { title: '-/', dataIndex: 'fullhalf', width: 40 },
              { title: '迄碼', dataIndex: 'endsize', width: colWidths.end, onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, end: w}) }) },
              { title: '防呆碼', dataIndex: 'maxsize', width: 60 },
              { title: '採用', dataIndex: 'adopted', width: colWidths.adopted, align: 'center', render: v => v === 'Y' ? 'Y' : 'N', onHeaderCell: c => ({ width: c.width, onResize: w => setColWidths({...colWidths, adopted: w}) }) }
          ]}
          scroll={{ x: 'max-content', y: 'calc(100vh - 420px)' }}
        />
      </div>
    </div>
  );

  return (
    <div className="dp010-premium-container md-sheet-container">
      <div className="mdi-header md-sheet-header">
        <Space><BlockOutlined style={{ color: '#096dd9' }} /><span className="md-sheet-title">DP010 楦頭基本資料管理</span><Divider type="vertical" /><Tag color={isEditing ? 'orange' : 'blue'}>{isEditing ? 'EDITING' : 'VIEWING'}</Tag></Space>
        <span className="md-sheet-version">PB Master-Detail Parity v3.2</span>
      </div>
      <div className="mdi-body">
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" className="md-sheet-tabs">
          <TabPane tab="查詢列表" key="1">{SearchTab}</TabPane>
          <TabPane tab="編輯維護" key="2">
            <div className="editor-master-layout">
              <div className="editor-sidebar">
                <div className="sidebar-header">楦頭列表</div>
                <div className="sidebar-content">
                  {masterList.map(item => (
                    <div 
                      key={item.gkey} 
                      className={`sidebar-item ${selectedMaster?.gkey === item.gkey ? 'active' : ''}`}
                      onClick={() => loadDetail(item)}
                    >
                      <div className="item-lastno">{item.lastno}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="editor-main-content">
                <div className="editor-parity-layout">
              <div className="master-form-container">
                <Form form={form} layout="vertical" size="small" className="pb-form" disabled={!isEditing}>
                  <div className="form-group-title">主檔資料</div>
                  <Row gutter={4}>
                    <Col span={6}><Form.Item name="lastno" label="楦頭編號" rules={[{required:true}]}><Input /></Form.Item></Col>
                    <Col span={6}><Form.Item name="dp004gkey" label="性別"><Select options={sizeTypes.map(s=>({value:s.gkey, label:s.gender}))}/></Form.Item></Col>
                    <Col span={6}><Form.Item name="year" label="年度"><Input /></Form.Item></Col>
                    <Col span={6}><Form.Item name="ba055gkey" label="季節"><Select options={seasons.map(s=>({value:s.gkey, label:s.groupcode}))}/></Form.Item></Col>
                  </Row>
                  <Row gutter={4}>
                    <Col span={6}><Form.Item name="issuedate" label="發行日期"><Input type="date"/></Form.Item></Col>
                    <Col span={6}><Form.Item name="cfmdate" label="確認日期"><Input type="date"/></Form.Item></Col>
                    <Col span={6}><Form.Item name="dp015gkey" label="大底編號"><Select options={bottoms.map(b=>({value:b.gkey, label:b.bottomno}))}/></Form.Item></Col>
                    <Col span={6}><Form.Item name="dp020gkey" label="跟型編號"><Select options={heels.map(h=>({value:h.gkey, label:h.heelno}))}/></Form.Item></Col>
                  </Row>
                  <Row gutter={4}>
                    <Col span={6}><Form.Item name="ba010gkey" label="客戶對象"><Select options={customers.map(c=>({value:c.gkey, label:`${c.custno} ${c.shortname}`}))}/></Form.Item></Col>
                    <Col span={6}><Form.Item name="ba015gkey" label="楦頭廠"><Select options={factories.map(f=>({value:f.gkey, label:`${f.factno} ${f.shortname}`}))}/></Form.Item></Col>
                    <Col span={6}><Form.Item name="lasttype" label="楦頭類型"><Input /></Form.Item></Col>
                    <Col span={6}><Form.Item name="midsoleno" label="中底編號"><Input /></Form.Item></Col>
                  </Row>
                  <Row gutter={4}>
                    <Col span={6}><Form.Item name="apba015gkey" label="採用工廠"><Select options={factories.map(f=>({value:f.gkey, label:`${f.factno} ${f.shortname}`}))}/></Form.Item></Col>
                    <Col span={6}><Form.Item name="basicsize" label="基準碼"><InputNumber style={{width:'100%'}}/></Form.Item></Col>
                    <Col span={6}><Form.Item name="ba005gkey" label="歸屬公司"><Select options={belongTo.map(b=>({value:b.gkey, label:b.shortname}))}/></Form.Item></Col>
                    <Col span={6}><Form.Item name="adopted" label="已採用" valuePropName="checked"><Checkbox>Y</Checkbox></Form.Item></Col>
                  </Row>
                  <Row gutter={4}>
                    <Col span={3}><Form.Item name="startsize" label="起碼"><InputNumber style={{width:'100%'}}/></Form.Item></Col>
                    <Col span={3}><Form.Item name="fullhalf" label="標記"><Select options={[{value:'1', label:'-'},{value:'2', label:'／'},{value:'3', label:'&'}]}/></Form.Item></Col>
                    <Col span={3}><Form.Item name="endsize" label="迄碼"><InputNumber style={{width:'100%'}}/></Form.Item></Col>
                    <Col span={3}><Form.Item name="maxsize" label="防呆碼"><InputNumber style={{width:'100%'}}/></Form.Item></Col>
                    <Col span={12}><Form.Item name="photopath" label="圖片路徑"><Input /></Form.Item></Col>
                  </Row>
                  <div className="form-group-title">尺碼細節</div>
                  <Row gutter={8} style={{ flex: 1, minHeight: 0 }}>
                    <Col span={24} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="detail-tabs-area" style={{ flex: 1 }}>
                        <Tabs size="small" type="card" className="sub-tabs-container">
                          <TabPane tab="尺碼量值明細" key="s1">
                            <div className="scrollable-pane">
                              <Table dataSource={measurements} columns={pivotColumns} rowKey="gkey" pagination={false} bordered size="small" scroll={{ x: 'max-content', y: 150 }} className="compact-pivot" />
                              {isEditing && <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setMeasurements([...measurements, { gkey:`temp_m_${Date.now()}`, parts:'New Part', steps:0.21, serialno:measurements.length+1, dp010gkey:selectedMaster.gkey }])} style={{ marginTop: '4px' }}>增加量法</Button>}
                            </div>
                          </TabPane>
                          <TabPane tab="庫存狀況" key="s3">
                            <div className="scrollable-pane">
                              <Table 
                                dataSource={stocks} size="small" pagination={false} bordered
                                columns={[
                                    { title: 'No', dataIndex: 'serialno', width: 50 },
                                    { title: '尺碼', dataIndex: 'size', width: 100 },
                                    { title: '左腳數量', dataIndex: 'leftqty', width: 100 },
                                    { title: '右腳數量', dataIndex: 'rightqty', width: 100 },
                                    { title: '左腳庫存量', dataIndex: 'leftstockqty', width: 120 },
                                    { title: '右腳庫存量', dataIndex: 'rightstockqty', width: 120 }
                                ]}
                              />
                            </div>
                          </TabPane>
                          <TabPane tab="變更歷史" key="s4">
                            <div className="scrollable-pane">
                              <Table dataSource={histories} size="small" pagination={false} columns={[{title:'日期',dataIndex:'mdate'},{title:'說明',dataIndex:'description'}]}/>
                            </div>
                          </TabPane>
                          <TabPane tab="英文描述與備註" key="s5">
                            <div className="scrollable-pane">
                              <Row gutter={4}>
                                <Col span={12}><Form.Item name="description" label="英文描述"><Input.TextArea rows={4}/></Form.Item></Col>
                                <Col span={12}><Form.Item name="remark" label="備註"><Input.TextArea rows={4}/></Form.Item></Col>
                              </Row>
                            </div>
                          </TabPane>
                        </Tabs>
                      </div>
                    </Col>
                  </Row>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </TabPane>
    </Tabs>
  </div>
      <style>{`
        .dp010-premium-container { height: 100vh; display: flex; flex-direction: column; background: #f0f2f5; font-size: 13px; overflow: hidden; }
        .mdi-header { background: #fff; padding: 4px 15px; border-bottom: 1px solid #d9d9d9; display: flex; justify-content: space-between; align-items: center; flex: 0 0 auto; }
        .mdi-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
        .ant-tabs-content { height: 100%; }
        
        .pb-form .ant-form-item { margin-bottom: 4px !important; }
        .pb-form .ant-form-item-label { padding: 0 0 2px !important; }
        .pb-form .ant-form-item-label label { font-size: 12px !important; color: #595959 !important; height: 18px !important; line-height: 18px !important; }
        .pb-form .ant-input, .pb-form .ant-input-number, .pb-form .ant-select-selector { font-size: 13px !important; height: 28px !important; padding: 2px 8px !important; border-radius: 0 !important; border-color: #d9d9d9 !important; }
        
        .form-group-title { font-size: 12px; font-weight: bold; color: #002766; background: #e6f7ff; padding: 4px 12px; margin: 6px 0; border-left: 4px solid #1890ff; }
        .radio-group-box { border: 1px solid #d9d9d9; padding: 4px 10px; height: 100%; background: #fafafa; }
        
        .search-tab-container { display: flex; flex-direction: column; height: 100%; padding: 8px; overflow: hidden; }
        .dw-where-panel { background: #fff; padding: 8px; border: 1px solid #d9d9d9; margin-bottom: 8px; flex: 0 0 auto; }
        .dw-query-panel { flex: 1; background: #fff; border: 1px solid #d9d9d9; min-height: 0; overflow: auto; }
        
        .editor-master-layout { height: 100%; display: flex; overflow: hidden; background: #fff; }
        .editor-sidebar { width: 220px; border-right: 1px solid #d9d9d9; display: flex; flex-direction: column; flex: 0 0 auto; background: #fafafa; }
        .sidebar-header { padding: 8px 12px; background: #e6f7ff; font-weight: bold; border-bottom: 1px solid #d9d9d9; font-size: 12px; }
        .sidebar-content { flex: 1; overflow-y: auto; }
        .sidebar-item { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: all 0.2s; }
        .sidebar-item:hover { background: #f0f5ff; }
        .sidebar-item.active { background: #e6f7ff; border-right: 3px solid #1890ff; }
        .item-lastno { font-weight: bold; color: #262626; font-size: 13px; }
        .item-info { color: #8c8c8c; font-size: 11px; margin-top: 2px; }
        
        .editor-main-content { flex: 1; min-width: 0; overflow: hidden; }
        .editor-parity-layout { height: 100%; display: flex; flex-direction: column; padding: 12px; gap: 8px; overflow: hidden; background: #fff; }
        .master-form-container { background: #fff; padding: 12px; border: 1px solid #d9d9d9; flex: 0 0 auto; }
        .detail-tabs-area { flex: 1; background: #fff; border: 1px solid #d9d9d9; padding: 8px; min-height: 0; display: flex; flex-direction: column; }
        .sub-tabs-container { flex: 1; min-height: 0; display: flex; flex-direction: column; }
        .sub-tabs-container .ant-tabs-content-holder { flex: 1; overflow: auto; }
        .scrollable-pane { padding: 8px; }
        
        .compact-pivot .ant-table-cell { padding: 4px 8px !important; font-size: 12px !important; }
        .photo-preview { height: 180px; background: #f5f5f5; display: flex; align-items: center; justifyContent: center; overflow: hidden; }
        .photo-preview img { max-width: 100%; max-height: 100%; }
        .resizer { position: absolute; right: 0; top: 0; height: 100%; width: 5px; cursor: col-resize; z-index: 10; }
        .resizer:hover { background: #1890ff; }
        .row-active td { background-color: #bae7ff !important; }
      `}</style>
    </div>
  );
}
