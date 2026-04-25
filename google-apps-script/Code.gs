/**
 * ============================================
 * AccLaw 會計師案件管理系統 — 全局同步版 (精簡版)
 * ============================================
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

const FIELD_MAP = {
  // 群組管理
  'employeeId': '員工編號', 'employeeName': '員工姓名', 'title': '職稱', 'role': '權限', 'username': '帳號', 'password': '密碼',
  // 客戶資料 / 客戶分配
  'clientId': '客戶編號', 'orgType': '組織型態', 'companyName': '公司行號名稱', 'handler': '承辦', 'status': '目前狀態',
  'yearNote': '年度註記', 'taxId': '統一編號', 'taxRegId': '稅藉編號', 'zipCode': '郵遞區號', 'contactAddress': '聯絡地址',
  'regAddress': '營業登記地址', 'owner': '負責人', 'contactPerson': '聯絡人', 'mailPhone': '郵寄電話', 'deliveryMethod': '送件方式',
  'pickupMethod': '取件方式', 'companyPhone': '公司電話', 'contactMobile': '聯絡人手機', 'email': 'Email', 'taxExt': '國稅局分機',
  'note': '備註', 'taxPassword': '稅務申報密碼', 'healthInsCode': '健保投保代號', 'unallocated': '待分配',
  // 工作任務
  'taskId': '任務編號', 'taskItem': '任務項目', 'dueDate': '預計完成日', 'completedDate': '實際完成日',
  'sopSteps': 'SOP步驟', 'reviewer': '審核人', 'reviewDate': '審核時間',
  // 任務項目
  'itemCode': '項目編號', 'itemName': '項目名稱', 'category': '類別',
  // SOP
  'sopId': 'SOP編號', 'sopName': 'SOP名稱', 'steps': '步驟',
  // 收費資料
  'billingMonth': '收費月份', 'amount': '收費金額', 'unpaid': '待收款', 'paid': '已收款',
  'paymentDate': '收款日期', 'bankAccount': '銀行帳戶'
};

function doGet(e) {
  return ContentService.createTextOutput("AccLaw 後端服務已成功啟動！").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  // 防呆判斷：如果是手動執行或是空請求
  if (!e || !e.postData || !e.postData.contents) {
    return res({ status: 'error', message: '請從前端應用程式發送請求，不要直接在腳本編輯器點擊執行。' });
  }

  const req = JSON.parse(e.postData.contents);
  const { action, params: p = {} } = req;
  try {
    switch (action) {
      case 'login': return res(handleLogin(p));
      case 'getData': return res(handleGetData(p));
      case 'addRow': return res(handleAddRow(p));
      case 'updateRow': return res(handleUpdateRow(p));
      case 'deleteRow': return res(handleDeleteRow(p));
      case 'batchImport': return res(handleBatchImport(p));
      case 'completeTask': return res(handleCompleteTask(p));
      case 'reviewTask': return res(handleReviewTask(p));
      case 'getDashboardStats': return res(handleGetDashboardStats());
      default: return res({ status: 'error', message: '未知動作' });
    }
  } catch (err) {
    return res({ status: 'error', message: err.toString() });
  }
}

function getInternalKey(header) {
  const h = String(header).trim();
  const exact = Object.keys(FIELD_MAP).find(k => FIELD_MAP[k] === h);
  if (exact) return exact;
  if (h === '狀態' || h === '目前狀態') return 'status';
  if (h === '審核時間' || h === '審核日期') return 'reviewDate';
  if (h === '備註' || h === '備忘錄') return 'note';
  if (h === '聯絡地址(發票寄送地址)' || h === '聯絡地址') return 'contactAddress';
  return h;
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}

function getHeaders(sheet) { 
  if (sheet.getLastColumn() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; 
}

function getSheetData(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const hs = getHeaders(sheet);
  const vs = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return vs.map((row, i) => {
    const obj = { rowIndex: i + 2 };
    hs.forEach((h, j) => {
      const key = getInternalKey(h);
      obj[key] = row[j];
    });
    return obj;
  });
}

function mapDataToRow(headers, obj) {
  return headers.map(h => {
    const key = getInternalKey(h);
    return obj[key] !== undefined ? obj[key] : '';
  });
}

function handleGetData(p) {
  const sheet = getSheet(p.sheetName);
  return { status: 'success', data: getSheetData(sheet) };
}

function handleAddRow(p) {
  const sheet = getSheet(p.sheetName);
  const hs = getHeaders(sheet);
  sheet.appendRow(mapDataToRow(hs, p.rowData));
  return { status: 'success' };
}

function handleUpdateRow(p) {
  const sheet = getSheet(p.sheetName);
  const hs = getHeaders(sheet);
  sheet.getRange(p.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, p.rowData)]);
  return { status: 'success' };
}

function handleDeleteRow(p) { 
  getSheet(p.sheetName).deleteRow(p.rowIndex); 
  return { status: 'success' }; 
}

function handleLogin(p) {
  const data = getSheetData(getSheet('群組管理'));
  const user = data.find(u => u.username === p.username && u.password === p.password);
  return user ? { status: 'success', data: user } : { status: 'error', message: '帳號或密碼錯誤' };
}

function handleCompleteTask(p) {
  const sheet = getSheet('工作任務');
  const hs = getHeaders(sheet);
  const task = getSheetData(sheet).find(t => String(t.taskId) === String(p.taskId));
  if (!task) return { status: 'error', message: '找不到任務' };
  const now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd');
  const up = { ...task, status: '已完成', completedDate: now };
  sheet.getRange(task.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, up)]);
  return { status: 'success' };
}

function handleReviewTask(p) {
  const sheet = getSheet('工作任務');
  const hs = getHeaders(sheet);
  const task = getSheetData(sheet).find(t => String(t.taskId) === String(p.taskId));
  if (!task) return { status: 'error', message: '找不到任務' };
  const now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd');
  const up = { ...task, status: '已審核', reviewer: p.reviewedBy, reviewDate: now };
  sheet.getRange(task.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, up)]);
  return { status: 'success' };
}

function handleBatchImport(p) {
  const sheet = getSheet(p.sheetName);
  const hs = getHeaders(sheet);
  const existing = getSheetData(sheet);
  const idKey = (p.sheetName === '客戶資料' || p.sheetName === '收費資料') ? 'clientId' : 
                (p.sheetName === '工作任務' ? 'taskId' : 
                (p.sheetName === '任務項目' ? 'itemCode' : null));

  p.rows.forEach(newRow => {
    const match = idKey ? existing.find(e => String(e[idKey]).trim() === String(newRow[idKey]).trim()) : null;
    if (match) {
      let updateData = { ...match, ...newRow };
      sheet.getRange(match.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, updateData)]);
    } else {
      sheet.appendRow(mapDataToRow(hs, newRow));
    }
  });
  return { status: 'success', message: '匯入完成' };
}

function handleGetDashboardStats() {
  const tasks = getSheetData(getSheet('工作任務'));
  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyy/MM/dd');
  const todayMidnight = new Date(now.setHours(0,0,0,0));

  let stats = { pending: 0, delayed: 0, completed: 0, reviewing: 0, reviewed: 0 };

  tasks.forEach(t => {
    const status = t.status || '';
    const hasFinished = t.completedDate || ['已完成', '待審核', '已審核'].includes(status);
    const isOverdue = t.dueDate && new Date(t.dueDate) < todayMidnight;
    
    // 判斷是否在「待審核」狀態 (已完成且過了晚上10點，或是日期早於今天)
    let isReviewing = (status === '待審核');
    if (status === '已完成') {
      if (t.completedDate) {
        const compDateStr = Utilities.formatDate(new Date(t.completedDate), 'Asia/Taipei', 'yyyy/MM/dd');
        if (compDateStr < todayStr) isReviewing = true;
        if (compDateStr === todayStr && currentHour >= 22) isReviewing = true;
      }
    }

    if (status === '已審核') stats.reviewed++;
    else if (isReviewing) stats.reviewing++;
    else if (status === '已完成') stats.completed++;
    else if (!hasFinished && (status === '延遲中' || isOverdue)) stats.delayed++;
    else stats.pending++;
  });

  return { status: 'success', data: { ...stats, totalClients: getSheetData(getSheet('客戶資料')).length }};
}

function res(obj) { 
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); 
}
