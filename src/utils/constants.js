export const NAV_ITEMS = [
  { path: '/', label: '控制台', icon: '📊' },
  { path: '/tasks', label: '任務管理', icon: '📋' },
  { path: '/clients', label: '客戶資料', icon: '👤' },
  { path: '/allocation', label: '客戶分配', icon: '👥' },
  { path: '/billing', label: '收費資料', icon: '💰' },
  { path: '/items', label: '任務項目', icon: '🛠️' },
  { path: '/sop', label: 'SOP流程', icon: '📝' },
  { path: '/groups', label: '群組管理', icon: '🔐' },
];

export const SHEET_NAMES = {
  TASKS: '工作任務',
  CLIENTS: '客戶資料',
  TASK_ITEMS: '任務項目',
  GROUPS: '群組管理',
  ALLOCATIONS: '客戶分配',
  SOP: '工作標準流程SOP',
  BILLING: '收費資料',
};

export const MONTH_NAMES = [
  '一月 Jan', '二月 Feb', '三月 Mar', '四月 Apr', '五月 May', '六月 Jun',
  '七月 Jul', '八月 Aug', '九月 Sep', '十月 Oct', '十一月 Nov', '十二月 Dec'
];

export const ANNUAL_SCHEDULE = {
  1: ['扣繳申報', '營業稅申報', '健保各類所得申報'],
  2: ['健保投保金額調整', '各類所得扣繳憑單發放'],
  3: ['營業稅申報', '勞保投保金額調整'],
  4: ['年度預算審核'],
  5: ['營所稅結算申報', '綜所稅申報', '營業稅申報'],
  6: ['股東會召開期'],
  7: ['營業稅申報', '二代健保補充保費申報'],
  8: ['年度內部審計'],
  9: ['營所稅暫繳申報', '營業稅申報'],
  10: ['勞健保基數檢查'],
  11: ['營業稅申報', '年度稅務規劃'],
  12: ['盤點工作', '年度結帳準備']
};

export const TASK_STATUS = {
  PENDING: '待處理',
  DELAYED: '延遲中',
  COMPLETED: '已完成',
  REVIEWING: '待審核',
  REVIEWED: '已審核',
};

export const TASK_STATUS_COLORS = {
  '待處理': 'blue',
  '延遲中': 'red',
  '已完成': 'green',
  '待審核': 'purple',
  '已審核': 'gray',
};

export const CLIENT_STATUS = {
  ACTIVE: '在辦中',
  INACTIVE: '已結束',
};

export const CLIENT_STATUS_COLORS = {
  '在辦中': 'green',
  '已結束': 'gray',
};

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

export const BILLING_FIELDS = [
  { key: 'clientId', label: '客戶編號' },
  { key: 'companyName', label: '公司行號名稱' },
  { key: 'handler', label: '承辦' },
  { key: 'billingMonth', label: '收費月份' },
  { key: 'amount', label: '收費金額' },
  { key: 'unpaid', label: '待收款' },
  { key: 'paid', label: '已收款' },
  { key: 'paymentDate', label: '收款日期' },
  { key: 'bankAccount', label: '銀行帳戶' },
];
