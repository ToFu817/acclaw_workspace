/**
 * 格式化日期
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 格式化日期時間
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 專門給 input type="date" 使用的格式化 (YYYY-MM-DD)
 */
export function inputFormatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  // 使用本地時間提取，避免 toISOString() 導致的時區偏移問題 (UTC+8 會少一天)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 產生唯一 ID
 */
export function generateId(prefix = '') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return prefix ? `${prefix}-${ts}${rand}` : `${ts}${rand}`;
}

/**
 * 從客戶資料列表中，根據客戶編號自動帶入關聯資料
 */
export function autoFillClientData(clientId, clientList) {
  if (!clientId || !clientList?.length) return {};
  const client = clientList.find((c) => String(c.clientId).trim() === String(clientId).trim());
  if (!client) return {};
  return {
    companyName: client.companyName || '',
    handler: client.handler || '',
    status: client.status || '',
  };
}

/**
 * 從員工列表中，根據員工編號自動帶入資料
 */
export function autoFillEmployeeData(employeeId, employeeList) {
  if (!employeeId || !employeeList?.length) return {};
  const emp = employeeList.find((e) => e.employeeId === employeeId);
  if (!emp) return {};
  return {
    employeeName: emp.employeeName || '',
  };
}

/**
 * 格式化金額 (加千分位)
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  const num = Number(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString('zh-TW');
}

/**
 * 解析金額 (移除千分位)
 */
export function parseCurrency(str) {
  if (!str) return 0;
  return Number(String(str).replace(/,/g, '')) || 0;
}

/**
 * 判斷任務是否延遲
 */
export function isTaskDelayed(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
}

/**
 * 取得 DiceBear 頭像 URL
 */
export function getAvatarUrl(seed, style = 'bottts') {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffffff`;
}

/**
 * 防抖函式
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 下載為 CSV
 */
export function downloadCSV(data, filename) {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
