export const DP_STATUS_MAP = {
  '1': { text: '進行中', color: 'processing' },
  '2': { text: '已寄出', color: 'warning' },
  '3': { text: '已完成', color: 'success' },
  '0': { text: '取消', color: 'default' },
};

export const DP_STATUS_OPTIONS = [
  { value: '1', label: '進行中' },
  { value: '2', label: '已寄出' },
  { value: '3', label: '已完成' },
  { value: '0', label: '取消' },
];
