/**
 * ERP Web 前端權限比對小工具
 */

export function hasPermission(permissions, programId, action) {
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
  let mappedAction = actKey;
  if (actKey === 'search' || actKey === 'inquire') {
    mappedAction = 'query';
  } else if (actKey === 'append' || actKey === 'insert' || actKey === 'insertrow' || actKey === 'deleterow') {
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
  try {
    return parseInt(pClass, 10) > 4;
  } catch {
    return false;
  }
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
