/**
 * ERP Web 前端權限比對小工具
 */

export function hasPermission(permissions, programId, action, user = null) {
  if (user && isAdmin(user)) return true;
  if (!programId || !action) return true;
  if (!permissions) return false;

  // 1. 後端傳回的權限地圖以 window name (例如 w_dp030) 為主，但也可能以 routeKey/programCode 為 Key
  // 我們統一轉為小寫與原本物件名稱進行比對，增加相容性
  const pKey = programId.toLowerCase();
  
  // 尋找符合的權限設定
  const targetKey = Object.keys(permissions).find(
    (k) => k.toLowerCase() === pKey
  );

  if (!targetKey) {
    // 💡 預留防呆：若該作業完全未指派/註冊權限，預設放行
    return true;
  }

  const actions = permissions[targetKey];
  const actKey = action.toLowerCase();

  // 2. 處理 Action Fallback 映射 (與後端 normalize_action 與 get_permission_index 互補)
  // 如果 API 裡存的是 query，前端傳入 search 或 query 都應視為一致
  if (['search', 'query', 'inquire'].includes(actKey)) {
    return !!(actions['query'] || actions['search'] || actions['inquire']);
  }

  let mappedAction = actKey;
  if (actKey === 'append' || actKey === 'insert' || actKey === 'insertrow' || actKey === 'deleterow') {
    // 新增 / 刪除動作如果找不到，可退回到 edit 權限
    if (actions[actKey] === undefined) {
      mappedAction = 'edit';
    }
  }

  // 3. 檢查動作是否存在
  if (actions[mappedAction] !== undefined) {
    return !!actions[mappedAction];
  }
  if (actions[actKey] !== undefined) {
    return !!actions[actKey];
  }

  // 預設放行瀏覽類操作，防護修改類操作
  return ['query', 'search', 'inquire'].includes(actKey);
}

export const ALLOW_UNCONFIGURED_PROGRAMS_IN_DEV = false;

export function isAdmin(user) {
  const pClass = user?.privilege_class;
  if (!pClass) return false;
  const parsed = parseInt(pClass, 10);
  if (!isNaN(parsed)) {
    return parsed > 4;
  }
  const str = String(pClass).toLowerCase().trim();
  return str === '5' || str === '9' || str === 'admin' || str === 'developer';
}

export function inferPermissionKey(routeKey) {
  if (!routeKey) return null;
  const normalized = String(routeKey).toLowerCase();
  return normalized.startsWith('w_') ? normalized : `w_${normalized}`;
}

export function canOpenProgram(permissions, permissionKey, user = null) {
  if (user && isAdmin(user)) {
    return true;
  }
  if (!permissionKey) return true;

  const targetKey = Object.keys(permissions || {}).find(
    (k) => k.toLowerCase() === permissionKey.toLowerCase()
  );

  if (!targetKey) {
    return ALLOW_UNCONFIGURED_PROGRAMS_IN_DEV;
  }

  const programPerm = permissions[targetKey];
  if (!programPerm) {
    return ALLOW_UNCONFIGURED_PROGRAMS_IN_DEV;
  }

  return Object.values(programPerm).some(Boolean);
}

/**
 * 統一底層指令執行權限校驗
 */
export function canExecuteCommand(permissions, sheetId, command, user, options = {}) {
  // 1. 管理員一律放行
  if (user && isAdmin(user)) {
    return true;
  }

  // 2. 轉換為 programId
  const programId = inferPermissionKey(sheetId);
  if (!programId) return true;

  // 3. 未載入權限時，預設阻擋
  if (!permissions) return false;

  const pKey = programId.toLowerCase();
  const targetKey = Object.keys(permissions).find(
    (k) => k.toLowerCase() === pKey
  );

  // 4. 若該作業完全未配置/指派任何權限，暫時放行（預留防呆）
  if (!targetKey) {
    return true;
  }

  const cmd = command.toLowerCase();

  // 5. 統一指令到動作對應
  if (['retrieve', 'search', 'query', 'inquire'].includes(cmd)) {
    return hasPermission(permissions, programId, 'search', user);
  }

  if (['insert', 'new', 'insertrow', 'add'].includes(cmd)) {
    return hasPermission(permissions, programId, 'new', user);
  }

  if (['edit', 'update'].includes(cmd)) {
    return hasPermission(permissions, programId, 'edit', user);
  }

  if (['delete', 'destroy', 'deleterow'].includes(cmd)) {
    return hasPermission(permissions, programId, 'delete', user);
  }

  if (cmd === 'save') {
    // 依據實際 actionType (new / edit) 判斷，若未提供則 new 或 edit 有一即可
    if (options.actionType === 'new') {
      return hasPermission(permissions, programId, 'new', user);
    }
    if (options.actionType === 'edit') {
      return hasPermission(permissions, programId, 'edit', user);
    }
    return hasPermission(permissions, programId, 'new', user) || hasPermission(permissions, programId, 'edit', user);
  }

  if (['print', 'report'].includes(cmd)) {
    return hasPermission(permissions, programId, 'print', user);
  }

  if (['excel', 'export'].includes(cmd)) {
    return hasPermission(permissions, programId, 'excel', user);
  }

  if (['approve', 'check', 'recheck', 'unapprove'].includes(cmd)) {
    return hasPermission(permissions, programId, 'check', user);
  }

  return hasPermission(permissions, programId, command, user);
}
