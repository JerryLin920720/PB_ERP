/**
 * 全系統作業配置中央登錄表
 */

export const SHEET_STATE = {
  QUERY: 'QUERY',       // is_state '1'
  BROWSE: 'BROWSE',     // is_state '2'
  EDIT: 'EDIT',         // is_state '3'
  NEW: 'NEW',           // is_state '4'
  COPY: 'COPY',         // is_state '5'
  PREVIEW: 'PREVIEW',   // is_state '6'
  DELETING: 'DELETING'  // is_state '-1'
};

export const DEFAULT_TOOLBAR_A = {
  retrieve: true,
  insert: true,
  edit: true,
  delete: true,
  save: true,
  cancel: true,
  print: false,
  preview: false,
  export: true,
  approve: false,
  unapprove: false,
  xcopy: false,
  customActions: [],
};

export const DEFAULT_TOOLBAR_A2 = {
  ...DEFAULT_TOOLBAR_A,
};

export const DEFAULT_TOOLBAR_B = {
  ...DEFAULT_TOOLBAR_A,
  print: false,
  approve: false,
  unapprove: false,
};

export const DEFAULT_TOOLBAR_C = {
  ...DEFAULT_TOOLBAR_B,
  approve: true,
  unapprove: true,
};

export const DEFAULT_TOOLBAR_REPORT = {
  retrieve: true,
  insert: false,
  edit: false,
  delete: false,
  save: false,
  cancel: false,
  print: true,
  preview: true,
  export: true,
  approve: false,
  unapprove: false,
  xcopy: false,
  customActions: [],
};

export const DEFAULT_TOOLBAR_LOOKUP = {
  retrieve: true,
  insert: false,
  edit: false,
  delete: false,
  save: false,
  cancel: false,
  print: false,
  preview: false,
  export: false,
  approve: false,
  unapprove: false,
  xcopy: false,
  customActions: [],
};

export const stateActionMatrix = {
  [SHEET_STATE.QUERY]: { retrieve: true, insert: false, edit: false, delete: false, save: false, cancel: true, print: false, export: false, approve: false, unapprove: false, copy: false },
  [SHEET_STATE.BROWSE]: { retrieve: true, insert: true, edit: true, delete: true, save: false, cancel: false, print: true, export: true, approve: true, unapprove: true, copy: true },
  [SHEET_STATE.EDIT]: { retrieve: false, insert: false, edit: false, delete: true, save: true, cancel: true, print: false, export: false, approve: false, unapprove: false, copy: false },
  [SHEET_STATE.NEW]: { retrieve: false, insert: false, edit: false, delete: false, save: true, cancel: true, print: false, export: false, approve: false, unapprove: false, copy: false },
  [SHEET_STATE.COPY]: { retrieve: false, insert: false, edit: false, delete: false, save: true, cancel: true, print: false, export: false, approve: false, unapprove: false, copy: false },
  [SHEET_STATE.PREVIEW]: { retrieve: false, insert: false, edit: false, delete: false, save: false, cancel: true, print: true, export: true, approve: false, unapprove: false, copy: false },
  [SHEET_STATE.DELETING]: { retrieve: false, insert: false, edit: false, delete: false, save: false, cancel: false, print: false, export: false, approve: false, unapprove: false, copy: false },
};

export const ACTION_TO_PERMISSION = {
  retrieve: 'query',
  insert: 'new',
  edit: 'edit',
  delete: 'delete',
  print: 'prints',
  export: 'excel',
  approve: 'check',
  unapprove: 'recheck',
  copy: 'new'
};

const PROGRAM_REGISTRY = {
  ba001: {
    programId: 'ba001', legacyPBWindow: 'w_ba001', title: '個人片語字庫設定', module: 'BA', pattern: 'A', route: 'ba001', apiUrl: '/api/ba/ba001/', sheetComponent: 'Ba001Sheet', saveMode: 'bulkSave',
    toolbarConfig: { ...DEFAULT_TOOLBAR_A },
    permissionConfig: { programId: 'w_ba001', actions: ['new', 'edit', 'query', 'delete', 'excel'] }
  },
  ba010: {
    programId: 'ba010', legacyPBWindow: 'w_ba010', title: '客戶資料管理', module: 'BA', pattern: 'B', route: 'ba010', apiUrl: '/api/ba/ba010/', sheetComponent: 'Ba010Sheet', saveMode: 'deepSave',
    toolbarConfig: { ...DEFAULT_TOOLBAR_B },
    permissionConfig: { programId: 'w_ba010', actions: ['new', 'edit', 'query', 'delete', 'excel'] }
  },
  ba015: {
    programId: 'ba015', legacyPBWindow: 'w_ba015', title: '工廠資料管理', module: 'BA', pattern: 'B', route: 'ba015', apiUrl: '/api/ba/ba015/', sheetComponent: 'Ba015V2Sheet', saveMode: 'deepSave',
    toolbarConfig: { ...DEFAULT_TOOLBAR_B, xcopy: true },
    permissionConfig: { programId: 'w_ba015', actions: ['new', 'edit', 'query', 'delete', 'excel'] }
  },
  dp030: {
    programId: 'dp030', legacyPBWindow: 'w_dp030', title: '樣品單資料管理', module: 'DP', pattern: 'B', route: 'dp030', apiUrl: '/api/dp/dp030/', sheetComponent: 'Dp030Sheet', saveMode: 'deepSave',
    toolbarConfig: { ...DEFAULT_TOOLBAR_B, approve: true, unapprove: true, print: true },
    permissionConfig: { programId: 'w_dp030', actions: ['new', 'edit', 'query', 'delete', 'excel', 'prints', 'check', 'recheck'] },
    billNoConfig: { enabled: true, endpoint: '/api/dp/dp030/get-bill-no/', field: 'sampleno', dateField: 'issuedate' },
    reportConfig: {
      enabled: true,
      endpoint: '/api/dp/dp030/report/',
      defaultFormat: 'pdf',
      reports: [
        { key: 'sample_order', label: '樣品單列印', type: 'document', formats: ['pdf', 'excel'], mode: 'selectedRecord', requiresSelection: true },
        { key: 'sample_list', label: '樣品清單', type: 'list', formats: ['excel'], mode: 'currentQuery', requiresSelection: false }
      ]
    },
    dataConstraintConfig: { enabled: true, mode: 'by_maker', field: 'es101gkey' },
    validationConfig: {
      requiredFields: [
        { field: 'sampleno', label: '樣品單號' },
        { field: 'issuedate', label: '開單日期' },
        { field: 'year', label: '年度' },
        { field: 'ba010gkey', label: '客戶' },
        { field: 'styleno', label: '型體編號' }
      ],
      detailRules: [
        { detailKey: 'dp031', minRows: 1, message: '樣品明細配色至少需要一筆資料' }
      ]
    },
    itemChangedRules: [
      {
        scope: 'master',
        field: 'ba010gkey',
        effects: [
          { type: 'clear', targets: ['styleno', 'stylename'] }
        ]
      },
      {
        scope: 'master',
        field: 'wagescost',
        effects: [
          { type: 'custom', handler: (values) => ({ lop: Number(values.wagescost||0) + Number(values.managecost||0) + Number(values.profit||0) }) }
        ]
      },
      {
        scope: 'master',
        field: 'managecost',
        effects: [
          { type: 'custom', handler: (values) => ({ lop: Number(values.wagescost||0) + Number(values.managecost||0) + Number(values.profit||0) }) }
        ]
      },
      {
        scope: 'master',
        field: 'profit',
        effects: [
          { type: 'custom', handler: (values) => ({ lop: Number(values.wagescost||0) + Number(values.managecost||0) + Number(values.profit||0) }) }
        ]
      },
      {
        scope: 'detail',
        detailKey: 'dp031',
        field: 'totalpairs',
        effects: [
          { type: 'sumDetails', detailField: 'totalpairs', target: 'wagescost' }
        ]
      }
    ],
  },
  dp040: {
    programId: 'dp040', legacyPBWindow: 'w_dp040', title: '正式訂單資料管理', module: 'DP', pattern: 'B', route: 'dp040', apiUrl: '/api/dp/dp040/', sheetComponent: 'Dp040Sheet', saveMode: 'deepSave',
    toolbarConfig: { ...DEFAULT_TOOLBAR_B, approve: true, unapprove: true },
    permissionConfig: { programId: 'w_dp040', actions: ['new', 'edit', 'query', 'delete', 'excel', 'check', 'recheck'] },
    billNoConfig: { enabled: true, endpoint: '/api/dp/dp040/get-bill-no/', field: 'invoiceno', dateField: 'sentdate' },
    dataConstraintConfig: { enabled: true, mode: 'by_maker', field: 'es101gkey' },
    validationConfig: {
      requiredFields: [
        { field: 'sampleno', label: '樣品單號' },
        { field: 'issuedate', label: '開單日期' },
        { field: 'year', label: '年度' },
        { field: 'ba010gkey', label: '客戶' },
        { field: 'styleno', label: '型體編號' }
      ],
      detailRules: [
        { detailKey: 'dp031', minRows: 1, message: '樣品明細配色至少需要一筆資料' }
      ]
    },
    itemChangedRules: [
      {
        scope: 'master',
        field: 'ba010gkey',
        effects: [
          { type: 'clear', targets: ['styleno', 'stylename'] }
        ]
      },
      {
        scope: 'master',
        field: 'wagescost',
        effects: [
          { type: 'custom', handler: (values) => ({ lop: Number(values.wagescost||0) + Number(values.managecost||0) + Number(values.profit||0) }) }
        ]
      },
      {
        scope: 'master',
        field: 'managecost',
        effects: [
          { type: 'custom', handler: (values) => ({ lop: Number(values.wagescost||0) + Number(values.managecost||0) + Number(values.profit||0) }) }
        ]
      },
      {
        scope: 'master',
        field: 'profit',
        effects: [
          { type: 'custom', handler: (values) => ({ lop: Number(values.wagescost||0) + Number(values.managecost||0) + Number(values.profit||0) }) }
        ]
      },
      {
        scope: 'detail',
        detailKey: 'dp031',
        field: 'totalpairs',
        effects: [
          { type: 'sumDetails', detailField: 'totalpairs', target: 'wagescost' }
        ]
      }
    ],
  },
  mr010: {
    programId: 'mr010', legacyPBWindow: 'w_mr010', title: '顏色小類設定', module: 'MR', pattern: 'B', route: 'mr010', apiUrl: '/api/mr/mr010/', sheetComponent: 'Mr010Sheet', saveMode: 'deepSave',
    toolbarConfig: { ...DEFAULT_TOOLBAR_B },
    permissionConfig: { programId: 'w_mr010', actions: ['new', 'edit', 'query', 'delete', 'excel'] }
  },
  mr030: {
    programId: 'mr030', legacyPBWindow: 'w_mr030', title: '物料主檔設定', module: 'MR', pattern: 'A', route: 'mr030', apiUrl: '/api/mr/mr030/', sheetComponent: 'Mr030Sheet', saveMode: 'bulkSave',
    toolbarConfig: { ...DEFAULT_TOOLBAR_A },
    permissionConfig: { programId: 'w_mr030', actions: ['new', 'edit', 'query', 'delete', 'excel'] }
  },
  sa010: {
    programId: 'sa010', legacyPBWindow: 'w_sa010', title: '報價資料管理', module: 'SA', pattern: 'A2', route: 'sa010', apiUrl: '/api/sa/sa010/', sheetComponent: 'Sa010Sheet', saveMode: 'bulkSave',
    toolbarConfig: { ...DEFAULT_TOOLBAR_A2 },
    permissionConfig: { programId: 'w_sa010', actions: ['new', 'edit', 'query', 'delete', 'excel'] }
  },
  sy004: {
    programId: 'sy004', legacyPBWindow: 'w_sy004', title: '系統參數設定', module: 'SY', pattern: 'Custom', route: 'sy004', apiUrl: '/api/sys-parameter/', sheetComponent: 'Sy004Sheet',
    toolbarConfig: { ...DEFAULT_TOOLBAR_A, insert: false, delete: false, print: false, export: false, approve: false },
    permissionConfig: { programId: 'w_sy004', actions: ['query', 'edit'] }
  },
  sy005: {
    programId: 'sy005', legacyPBWindow: 'w_sy005', title: '使用者與群組權限管理', module: 'SY', pattern: 'Custom', route: 'sy005', apiUrl: '/api/auth/users/', sheetComponent: 'Sy005Sheet',
    toolbarConfig: { ...DEFAULT_TOOLBAR_A, insert: false, delete: false, print: false, export: false, approve: false },
    permissionConfig: { programId: 'w_sy005', actions: ['query', 'edit'] }
  },
  ss001: {
    programId: 'ss001', legacyPBWindow: 'w_ss001', title: '選單與權限啟用設定', module: 'SS', pattern: 'Custom', route: 'ss001', apiUrl: '/api/sys-menu/', sheetComponent: 'Ss001Sheet',
    toolbarConfig: { ...DEFAULT_TOOLBAR_A, insert: false, delete: false, print: false, export: false, approve: false },
    permissionConfig: { programId: 'w_ss001', actions: ['query', 'edit'] }
  }
};

export function getProgramConfig(programId) {
  if (!programId) return null;
  return PROGRAM_REGISTRY[programId.toLowerCase()] || null;
}

export function getTitle(programId) {
  const cfg = getProgramConfig(programId);
  return cfg ? cfg.title : `作業 [${(programId || 'NONEXIST').toUpperCase()}]`;
}

export function getDefaultToolbarByPattern(pattern) {
  switch (pattern) {
    case 'A':
    case 'A2':
      return { ...DEFAULT_TOOLBAR_A };
    case 'B':
      return { ...DEFAULT_TOOLBAR_B };
    case 'Report':
      return { ...DEFAULT_TOOLBAR_REPORT };
    default:
      return { ...DEFAULT_TOOLBAR_A };
  }
}

export function getToolbarConfig(programId) {
  const cfg = getProgramConfig(programId);
  return { ...(cfg && cfg.toolbarConfig ? cfg.toolbarConfig : DEFAULT_TOOLBAR_A) };
}

export function getAuditConfig(programId) {
  const cfg = getProgramConfig(programId);
  return cfg ? cfg.auditConfig : null;
}

export function getPermissionConfig(programId) {
  const cfg = getProgramConfig(programId);
  return cfg ? cfg.permissionConfig : null;
}

export function getAllProgramIds() {
  return Object.keys(PROGRAM_REGISTRY);
}

/**
 * 檢查按鈕是否應該顯示 (Visible)
 * 單純取決於 toolbarConfig 內該按鈕是否為 true
 */
export function isActionVisible(programId, action) {
  const config = getToolbarConfig(programId);
  return !!config[action];
}

/**
 * 檢查按鈕是否應該啟用 (Enabled)
 * 綜合考慮:
 * 1. toolbarConfig 是否允許
 * 2. stateActionMatrix 在當前狀態下是否允許
 * 3. 使用者是否有權限 (交由外部 hasPermission 傳入 boolean)
 * 4. selectedRecord 的審核狀態 (is_approved === 'Y')
 */
export function isActionEnabled({ programId, action, sheetState = SHEET_STATE.BROWSE, hasPermission = true, selectedRecord = null }) {
  // 1. toolbarConfig 檢查
  if (!isActionVisible(programId, action)) return false;

  // 2. 狀態機檢查
  const stateMatrix = stateActionMatrix[sheetState] || stateActionMatrix[SHEET_STATE.BROWSE];
  if (!stateMatrix[action]) return false;

  // 3. 權限檢查
  // save 的權限由 edit 或 insert 的狀態決定，此處外部傳入的 hasPermission 已經處理好
  if (!hasPermission) return false;

  // 4. 審核狀態檢查 (防呆)
  const isApproved = selectedRecord && (
    selectedRecord.is_approved === 'Y' || selectedRecord.is_approved === true ||
    selectedRecord.approve === 'Y' || selectedRecord.approve === true ||
    selectedRecord.capprove === 'Y' || selectedRecord.capprove === true
  );
  
  if (isApproved) {
    if (action === 'edit' || action === 'delete' || action === 'save' || action === 'approve') {
      return false;
    }
  } else if (selectedRecord) { // 有選中單據且未審核
    if (action === 'unapprove') {
      return false; // 未審核不能反審
    }
  } else {
    // 沒選中單據
    if (action === 'approve' || action === 'unapprove' || action === 'edit' || action === 'delete') {
      return false;
    }
  }

  return true;
}

export default PROGRAM_REGISTRY;
