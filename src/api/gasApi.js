const GAS_URL = import.meta.env.VITE_GAS_URL;
const IS_MOCK = !GAS_URL || GAS_URL.includes('YOUR_DEPLOYMENT_ID');

/**
 * 核心呼叫函數
 */
export async function callGAS(action, params = {}) {
  if (IS_MOCK) {
    console.warn('GAS URL 未設定，使用模擬資料:', action);
    return mockResponse(action, params);
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, params }),
    });
    const result = await response.json();
    console.log('GAS API Response:', result);
    return result;
  } catch (error) {
    console.error('GAS API Error:', error);
    return { status: 'error', message: error.toString() };
  }
}

/**
 * 導出的快捷方法 (這是解決白畫面的關鍵！)
 */
export const login = (params) => callGAS('login', params);
export const getData = (sheetName) => callGAS('getData', { sheetName });
export const addRow = (params) => callGAS('addRow', params);
export const updateRow = (params) => callGAS('updateRow', params);
export const deleteRow = (params) => callGAS('deleteRow', params);
export const batchImport = (params) => callGAS('batchImport', params);
export const completeTask = (params) => callGAS('completeTask', params);
export const reviewTask = (params) => callGAS('reviewTask', params);
export const getDashboardStats = (params) => callGAS('getDashboardStats', params);
export const applySOPToTask = (params) => callGAS('applySOPToTask', params);

// --- 模擬資料區域 ---
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function mockResponse(action, params) {
  const { sheetName } = params;
  const mockData = {
    login: async () => {
      await delay(500);
      return { status: 'error', message: '系統目前處於模擬模式，請設定 GAS URL 以進行正式登入' };
    },
    getData: async () => {
      await delay(300);
      return { status: 'success', data: [] };
    },
    getDashboardStats: async () => {
      await delay(300);
      return { status: 'success', data: { pending: 0, completed: 0, totalClients: 0 } };
    },
    addRow: async () => ({ status: 'success' }),
    updateRow: async () => ({ status: 'success' }),
    deleteRow: async () => ({ status: 'success' }),
  };

  const handler = mockData[action];
  if (handler) return handler();
  return { status: 'error', message: `未置動作: ${action}` };
}
