import React from 'react';
import { Form, Input, Checkbox, Select, InputNumber, Row, Col, Image, Radio, Space } from 'antd';
import createRecordWorkbenchSheet from '../components/erp/factory/createRecordWorkbenchSheet';
import ERPLookupField from '../components/erp/lookup/ERPLookupField';

/**
 * DP020Sheet - 鞋跟基本資料管理 (Pattern B Single-Master Workbench)
 */
export default createRecordWorkbenchSheet({
  sheetId: 'dp020',
  title: '鞋跟基本資料管理',
  breadcrumb: ['開發管理', '鞋跟基本資料'],

  api: {
    listUrl: '/api/dp020/',
    deepSaveUrl: '/api/dp020/deep_save/',
    deleteUrl: '/api/dp020/',
  },

  masterKey: 'gkey',

  fieldLabels: {
    heelno: '鞋跟編號',
    issuedate: '發行日期',
    year: '年度',
    ba055gkey: '季節代號',
    heelheight: '跟高',
    unit: '單位',
    material: '材料',
    description: '描述',
    ba015gkey: '廠商代號',
    adopted: '已採用',
    remark: '備註',
    photopath: '圖片路徑',
    dp010gkey: '搭配楦頭',
    dp015gkey: '搭配大底'
  },

  sidebar: {
    title: '鞋跟列表',
    getDisplayText: (row) => `[${row.heelno || '?'}] ${row.year || ''}`,
  },

  createDefaultRecord: (tempKey) => {
    return {
      gkey: tempKey,
      year: String(new Date().getFullYear()),
      issuedate: new Date().toISOString().substring(0, 10),
      unit: 'CM',
      adopted: 'N',
      heelno: '',
      heelheight: null,
      material: '',
      description: '',
      remark: '',
      photopath: '',
      ba055gkey: null,
      ba015gkey: null,
      dp010gkey: null,
      dp015gkey: null
    };
  },

  query: {
    buildParams: (values) => {
      const params = { ...values };
      // 若 heelheight 為 0、空字串或未定義，不作為查詢條件
      if (params.heelheight === 0 || params.heelheight === '0' || !params.heelheight) {
        delete params.heelheight;
      }
      // 若 adopted 為 'A' (全部)，不作為查詢條件
      if (params.adopted === 'A') {
        delete params.adopted;
      }
      return params;
    }
  },

  list: {
    columns: [
      { title: '年度', dataIndex: 'year', width: 70, align: 'center' },
      { 
        title: '鞋跟編號', 
        dataIndex: 'heelno', 
        width: 120, 
        fixed: 'left', 
        sorter: (a, b) => (a.heelno || '').localeCompare(b.heelno || '') 
      },
      { 
        title: '發行日期', 
        dataIndex: 'issuedate', 
        width: 100, 
        align: 'center', 
        render: (val) => val ? val.substring(0, 10) : '' 
      },
      { title: '承製廠商', dataIndex: 'factory_name', width: 150 },
      { title: '搭配楦頭', dataIndex: 'last_no', width: 130 },
      { title: '搭配大底', dataIndex: 'bottom_no', width: 130 },
      { title: '跟高', dataIndex: 'heelheight', width: 80, align: 'right' },
      { title: '單位', dataIndex: 'unit', width: 75, align: 'center' },
      {
        title: '採用',
        dataIndex: 'adopted',
        width: 55,
        align: 'center',
        render: (val) => val === 'Y' ? 'Y' : 'N'
      }
    ]
  },

  validateMasterRow: (values) => {
    if (!values.heelno || !values.heelno.trim()) {
      throw new Error('鞋跟編號為必填');
    }
    if (!values.year || !values.year.trim()) {
      throw new Error('年度為必填');
    }
    if (!values.issuedate) {
      throw new Error('發行日期為必填');
    }
  },

  buildDeepSavePayload: (latestMaster) => {
    const cleanMaster = { ...latestMaster };
    // Remove display-only read-only attributes to prevent sending them as writable data
    delete cleanMaster.ba015_factno;
    delete cleanMaster.ba015_shortname;
    delete cleanMaster.factory_no;
    delete cleanMaster.factory_name;
    delete cleanMaster.dp010_lastno;
    delete cleanMaster.last_no;
    delete cleanMaster.dp015_bottomno;
    delete cleanMaster.bottom_no;
    delete cleanMaster.season_name;
    delete cleanMaster.display_label;

    return {
      master: {
        ...cleanMaster,
        adopted: cleanMaster.adopted || 'N',
        heelno: cleanMaster.heelno?.trim()
      }
    };
  },

  detailTabs: [], // 無明細分頁

  renderQueryForm: ({ form }) => (
    <Row gutter={16}>
      <Col span={18}>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="year" label="年度">
              <Input placeholder="年度精確查詢..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ba055gkey" label="季節">
              <ERPLookupField type="ba055" title="關聯作業：BA055 季節資料" placeholder="F2 檢索季節..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="heelno" label="鞋跟編號">
              <Input placeholder="鞋跟編號模糊查詢..." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="ba015gkey" label="承製廠商">
              <ERPLookupField type="ba015" queryParams={{ type: '2' }} title="關聯作業：BA025 材料商基本資料" placeholder="F2 檢索廠商..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="dp010gkey" label="搭配楦頭">
              <ERPLookupField type="dp010" title="關聯作業：DP010 楦頭基本資料" placeholder="F2 檢索楦頭..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="dp015gkey" label="搭配大底">
              <ERPLookupField type="dp015" title="關聯作業：DP015 大底基本資料" placeholder="F2 檢索大底..." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={8}>
            <Form.Item name="heelheight" label="跟高">
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="跟高精確查詢..." />
            </Form.Item>
          </Col>
        </Row>
      </Col>
      <Col span={6}>
        <div className="erp-rw-query-right-panel">
          <div className="erp-rw-query-right-panel-title">採用狀態</div>
          <Form.Item name="adopted" initialValue="A">
            <Radio.Group>
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
  ),

  renderMasterForm: ({ form, isEditing, activeRecord, updateMasterField }) => {
    const photopath = Form.useWatch('photopath', form);

    return (
      <Row gutter={16}>
        {/* 左側欄位輸入區域 */}
        <Col span={18}>
          {/* Row 1: 基本標識 */}
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="heelno" label="鞋跟編號" rules={[{ required: true, message: '鞋跟編號為必填' }]}>
                <Input maxLength={20} placeholder="請輸入鞋跟編號" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="year" label="年度" rules={[{ required: true, message: '年度為必填' }]}>
                <Input maxLength={4} placeholder="YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="issuedate" label="發行日期" rules={[{ required: true, message: '發行日期為必填' }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={6} style={{ display: 'flex', alignItems: 'center', paddingTop: '10px' }}>
              <Form.Item 
                name="adopted" 
                valuePropName="checked" 
                getValueProps={(value) => ({ checked: value === 'Y' })}
                normalize={(value) => (value ? 'Y' : 'N')}
                style={{ margin: 0 }}
              >
                <Checkbox>已採用</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          {/* Row 2: 季節、單位、跟高、材料 */}
          <Row gutter={8}>
            <Col span={6}>
              <Form.Item name="ba055gkey" label="季節">
                <ERPLookupField 
                  type="ba055" 
                  title="關聯作業：BA055 季節資料"
                  placeholder="F2 檢索季節"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="unit" label="單位">
                <Select options={[
                  { value: 'CM', label: 'CM (公分)' },
                  { value: 'INCH', label: 'INCH (英吋)' },
                  { value: 'MM', label: 'MM (公釐)' }
                ]} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="heelheight" label="跟高">
                <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="material" label="材料">
                <Input maxLength={100} placeholder="請輸入材料" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3: 承製廠商, 搭配楦頭, 搭配大底 */}
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="ba015gkey" label="承製廠商">
                <ERPLookupField 
                  type="ba015" 
                  queryParams={{ type: '2' }} 
                  title="關聯作業：BA025 材料商基本資料"
                  placeholder="F2 檢索廠商..."
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dp010gkey" label="搭配楦頭">
                <ERPLookupField 
                  type="dp010" 
                  title="關聯作業：DP010 楦頭基本資料"
                  placeholder="F2 檢索楦頭..."
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dp015gkey" label="搭配大底">
                <ERPLookupField 
                  type="dp015" 
                  title="關聯作業：DP015 大底基本資料"
                  placeholder="F2 檢索大底..."
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4: 英文描述 */}
          <Row gutter={8}>
            <Col span={24}>
              <Form.Item name="description" label="英文描述">
                <ERPLookupField 
                  type="dp001" 
                  title="關聯作業：DP001 開發片語字庫"
                  placeholder="請輸入英文描述或按 F2 從開發片語字庫選擇" 
                  onChange={(val) => {
                    form.setFieldsValue({ description: val });
                    updateMasterField('description', val);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 5: 備註說明 */}
          <Row gutter={8}>
            <Col span={24}>
              <Form.Item name="remark" label="備註說明">
                <ERPLookupField 
                  type="dp001" 
                  isTextArea={true} 
                  rows={2} 
                  title="關聯作業：DP001 開發片語字庫"
                  placeholder="請輸入備註說明或按 F2 從開發片語字庫選擇" 
                  onChange={(val) => {
                    form.setFieldsValue({ remark: val });
                    updateMasterField('remark', val);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 6: 圖片路徑 */}
          <Row gutter={8}>
            <Col span={24}>
              <Form.Item name="photopath" label="圖片路徑">
                <Input maxLength={400} placeholder="請輸入圖片 URL 路徑 (http://... 或本地路徑)" />
              </Form.Item>
            </Col>
          </Row>
        </Col>

        {/* 右側：鞋跟外觀實時圖片預覽區 */}
        <Col span={6} style={{ display: 'flex', flexDirection: 'column', paddingTop: '28px' }}>
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            padding: '12px',
            backgroundColor: 'var(--app-bg-panel)',
            textAlign: 'center',
            minHeight: '220px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
              📸 鞋跟外觀預覽 (Heel Sketch)
            </span>
            {photopath ? (
              <Image
                src={photopath}
                alt="鞋跟示意圖"
                fallback="https://placehold.co/200x150?text=No+Image+Found"
                style={{
                  maxWidth: '100%',
                  maxHeight: '160px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                border: '1px dashed var(--border-color)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '36px'
              }}>
                👠
              </div>
            )}
          </div>
        </Col>
      </Row>
    );
  }
});
