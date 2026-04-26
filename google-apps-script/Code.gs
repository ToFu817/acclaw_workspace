/**
 * ============================================
 * AccLaw 會計師案件管理系統 — 全局同步版
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
  'status': '狀態', 'sopSteps': 'SOP步驟', 'reviewer': '審核人', 'reviewDate': '審核時間',
  // 任務項目
  'itemCode': '項目編號', 'itemName': '項目名稱', 'category': '類別',
  // SOP
  'sopId': 'SOP編號', 'sopName': 'SOP名稱', 'steps': '步驟',
  // 收費資料
  'billingMonth': '收費月份', 'amount': '收費金額', 'unpaid': '待收款', 'paid': '已收款',
  'paymentDate': '收款日期', 'bankAccount': '銀行帳戶',
  // 年度任務
  'month': '月份', 'annualTask': '任務名稱'
};

/**
 * 手動編輯 Google Sheet 時自動同步
 */
function onEdit(e) {
  if (!e || !e.range) return; // 避免在編輯器直接執行報錯
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  
  const startRow = range.getRow();
  const numRows = range.getNumRows();
  
  if (sheetName === '客戶資料') {
    if (startRow < 2 && numRows === 1) return;
    
    const clientDataAll = getSheetData(sheet);
    const allocSheet = getSheet('客戶分配');
    const allocHs = getHeaders(allocSheet);
    let allocData = getSheetData(allocSheet);
    const empData = getSheetData(getSheet('群組管理'));

    for (let i = 0; i < numRows; i++) {
      const r = startRow + i;
      if (r < 2) continue;
      const rowData = clientDataAll.find(d => d.rowIndex === r);
      if (rowData) {
        fastSyncToAllocation(rowData, allocSheet, allocHs, allocData, empData);
        // 更新本地端 allocData 以免下一筆重複新增
        allocData = getSheetData(allocSheet);
      }
    }
  }
  
  if (sheetName === '工作任務') {
    if (startRow < 2 && numRows === 1) return;
    const hs = getHeaders(sheet);
    const taskDataAll = getSheetData(sheet);
    
    for (let i = 0; i < numRows; i++) {
      const r = startRow + i;
      if (r < 2) continue;
      const rowData = taskDataAll.find(d => d.rowIndex === r);
      if (rowData) {
        const originalStatus = rowData.status;
        processTaskStatus(rowData);
        if (originalStatus !== rowData.status) {
          sheet.getRange(r, 1, 1, hs.length).setValues([mapDataToRow(hs, rowData)]);
        }
      }
    }
  }
}

function fastSyncToAllocation(clientData, allocSheet, hs, allocData, empData) {
  const match = allocData.find(d => String(d.clientId).trim() === String(clientData.clientId).trim());
  const emp = empData.find(e => e.employeeName === clientData.handler);
  
  const allocRow = {
    ...clientData,
    employeeId: emp ? emp.employeeId : '',
    employeeName: clientData.handler || '',
    unallocated: (clientData.handler && String(clientData.handler).trim() !== '') ? '否' : '是'
  };
  
  if (match) {
    allocSheet.getRange(match.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, allocRow)]);
  } else {
    allocSheet.appendRow(mapDataToRow(hs, allocRow));
  }
}

// 供管理員手動執行：強制同步「客戶資料」到「客戶分配」
function adminSyncAllClients() {
  const clientSheet = getSheet('客戶資料');
  const clientDataAll = getSheetData(clientSheet);
  
  const allocSheet = getSheet('客戶分配');
  const allocHs = getHeaders(allocSheet);
  const empData = getSheetData(getSheet('群組管理'));
  
  let allocData = getSheetData(allocSheet);
  
  clientDataAll.forEach(rowData => {
    fastSyncToAllocation(rowData, allocSheet, allocHs, allocData, empData);
    allocData = getSheetData(allocSheet); // 確保每次拿到最新行數
  });
}

function syncToAllocation(clientData) {
  const allocSheet = getSheet('客戶分配');
  const hs = getHeaders(allocSheet);
  const allocData = getSheetData(allocSheet);
  const empData = getSheetData(getSheet('群組管理'));
  
  fastSyncToAllocation(clientData, allocSheet, hs, allocData, empData);
}

function doGet(e) {
  return ContentService.createTextOutput("AccLaw 後端服務已成功啟動！").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) return res({ status: 'error', message: '無效請求' });
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
      case 'getDashboardStats': return res(handleGetDashboardStats(p));
      case 'initAnnual': return res(seedAnnualSchedule());
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
  if (h.includes('狀態')) return 'status';
  if (h.includes('審核時間') || h.includes('審核日期')) return 'reviewDate';
  if (h.includes('備註') || h.includes('備忘')) return 'note';
  return h;
}

function getSheet(name) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
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

function processTaskStatus(rowData) {
  const status = rowData.status || '';
  if (status === '已完成' || status === '待審核' || status === '已審核') return;
  
  if (rowData.dueDate) {
    const today = new Date();
    // 轉化為台灣時區的 YYYY-MM-DD
    const todayStr = Utilities.formatDate(today, 'Asia/Taipei', 'yyyy-MM-dd');
    
    // 嘗試解析傳入的 dueDate
    let dueStr = '';
    try {
      const d = new Date(rowData.dueDate);
      if (!isNaN(d.getTime())) {
        dueStr = Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
      } else {
        // 如果傳入的就是純文字的 YYYY-MM-DD，直接使用
        dueStr = String(rowData.dueDate).trim().substring(0, 10).replace(/\//g, '-');
      }
    } catch (e) {
      dueStr = String(rowData.dueDate).trim().substring(0, 10).replace(/\//g, '-');
    }

    if (dueStr && dueStr < todayStr) {
      rowData.status = '延遲中';
    } else if (status === '延遲中') {
      rowData.status = '待處理';
    }
  }
}

function handleAddRow(p) {
  const sheet = getSheet(p.sheetName);
  const hs = getHeaders(sheet);
  
  if (p.sheetName === '工作任務') processTaskStatus(p.rowData);

  sheet.appendRow(mapDataToRow(hs, p.rowData));
  if (p.sheetName === '客戶資料') syncToAllocation(p.rowData);
  return { status: 'success' };
}

function handleUpdateRow(p) {
  const sheet = getSheet(p.sheetName);
  const hs = getHeaders(sheet);
  
  if (p.sheetName === '工作任務') processTaskStatus(p.rowData);

  sheet.getRange(p.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, p.rowData)]);
  if (p.sheetName === '客戶資料') syncToAllocation(p.rowData);
  return { status: 'success' };
}

function handleDeleteRow(p) { 
  getSheet(p.sheetName).deleteRow(p.rowIndex); 
  return { status: 'success' }; 
}

function handleLogin(p) {
  const data = getSheetData(getSheet('群組管理'));
  const user = data.find(u => String(u.username).trim() === String(p.username).trim() && String(u.password).trim() === String(p.password).trim());
  if (!user) return { status: 'error', message: '帳號或密碼錯誤' };
  
  // 權限對應
  let role = 'user';
  const rawRole = String(user.role || '').trim();
  if (rawRole === '管理者') role = 'admin';
  else if (rawRole === '資深使用者') role = 'senior';
  else if (rawRole === '一般使用者') role = 'user';
  
  return { 
    status: 'success', 
    data: { 
      employeeId: user.employeeId, 
      employeeName: user.employeeName, 
      role: role
    } 
  };
}

function handleCompleteTask(p) {
  const sheet = getSheet('工作任務');
  const hs = getHeaders(sheet);
  const data = getSheetData(sheet);
  const task = data.find(t => String(t.taskId) === String(p.taskId));
  if (!task) return { status: 'error', message: '找不到任務' };
  
  const now = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd');
  const updatedTask = { ...task, status: '已完成', completedDate: now };
  
  sheet.getRange(task.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, updatedTask)]);
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
      sheet.getRange(match.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, { ...match, ...newRow })]);
    } else {
      sheet.appendRow(mapDataToRow(hs, newRow));
    }
    if (p.sheetName === '客戶資料') syncToAllocation(newRow);
  });
  return { status: 'success', message: '匯入完成' };
}

function handleGetDashboardStats(p = {}) {
  const tasks = getSheetData(getSheet('工作任務'));
  const isAdmin = p.role === 'admin';
  const targetName = String(p.employeeName || '').trim();

  // 資深使用者與一般使用者僅統計自己的數量，管理員統計全部
  const statsTasks = isAdmin ? tasks : tasks.filter(t => String(t.handler || '').trim() === targetName);
  
  let stats = { pending: 0, delayed: 0, completed: 0, reviewing: 0, reviewed: 0 };
  statsTasks.forEach(t => {
    const status = String(t.status || '').trim();
    if (status === '已審核') stats.reviewed++;
    else if (status === '待審核') stats.reviewing++;
    else if (status === '已完成') stats.completed++;
    else if (status === '延遲中') stats.delayed++;
    else stats.pending++;
  });

  const clients = getSheetData(getSheet('客戶資料'));
  const totalClients = clients.length;
  const unassignedClients = clients.filter(c => !c.handler || String(c.unallocated).trim() === '是').length;

  const annualTasks = getSheetData(getSheet('年度任務計畫'));
  const currentMonth = String(new Date().getMonth() + 1);
  const thisMonthAnnual = annualTasks.filter(a => String(a.month) === currentMonth).map(a => a.annualTask);

  const today = new Date();
  const future7d = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const future7dStr = Utilities.formatDate(future7d, 'Asia/Taipei', 'yyyy-MM-dd');

  let urgentTasks = [];
  if (p.employeeName) {
    const targetName = String(p.employeeName).trim();
    const myTasks = tasks.filter(t => String(t.handler || '').trim() === targetName);
    myTasks.forEach(t => {
      const status = String(t.status || '').trim();
      if (status === '已完成' || status === '已審核' || status === '待審核') return;

      let dDate = '';
      if (Object.prototype.toString.call(t.dueDate) === '[object Date]' && !isNaN(t.dueDate.getTime())) {
        dDate = Utilities.formatDate(t.dueDate, 'Asia/Taipei', 'yyyy-MM-dd');
      } else if (t.dueDate) {
        let str = String(t.dueDate).trim();
        if (str.includes('T')) {
          const d = new Date(str);
          if (!isNaN(d.getTime())) dDate = Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
        } else {
          dDate = str.substring(0, 10).replace(/\//g, '-');
        }
      }

      if (status === '延遲中') {
        urgentTasks.push({ ...t, dueDate: dDate });
      } else if (status === '待處理' && dDate && dDate <= future7dStr) {
        urgentTasks.push({ ...t, dueDate: dDate });
      }
    });

    urgentTasks.sort((a, b) => {
      if (a.status === '延遲中' && b.status !== '延遲中') return -1;
      if (a.status !== '延遲中' && b.status === '延遲中') return 1;
      return (a.dueDate || '') > (b.dueDate || '') ? 1 : -1;
    });
  }

  return { 
    status: 'success', 
    data: { 
      ...stats, 
      totalClients, 
      unassignedClients,
      monthlyGoals: thisMonthAnnual,
      urgentTasks
    }
  };
}

function seedAnnualSchedule() {
  const sheet = getSheet('年度任務計畫');
  if (sheet.getLastRow() > 1) return { status: 'success' };
  const data = [
    ["1", "11-12月營業稅申報"], ["1", "各類所得扣繳申報作業"], ["2", "二代健保申報"], ["2", "11-12月帳務處理"], ["2", "03-04月統購發票寄送"],
    ["3", "01-02月營業稅申報"], ["3", "股東平台申報"], ["3", "營所稅結算申報編製作業"], ["3", "會計師簽證資料準備"],
    ["4", "營所稅結算申報編製作業"], ["4", "會計師簽證資料準備"], ["4", "05-06月統購發票寄送"],
    ["5", "03-04月份營業稅申報"], ["5", "營所稅結算申報"], ["5", "綜合所得稅結算申報"], ["5", "稅務簽證報告書簽證作業"],
    ["6", "01-04月份帳務處理"], ["6", "07-08月統購發票寄送"], ["6", "財務簽證報告書簽證作業"],
    ["7", "05-06月營業稅申報"], ["7", "05-06月份帳務處理"], ["8", "05-06月份帳務處理"], ["8", "09-10月統購發票寄送"],
    ["9", "07-08月營業稅申報"], ["9", "07-08月份帳務處理"], ["9", "營所稅預估暫繳申報"],
    ["10", "07-08月份帳務處理"], ["10", "11-12月統購發票寄送"], ["10", "上年度未分配盈餘+股利二代前置作業"],
    ["11", "9-10月營業稅申報"], ["11", "9-10月份帳務處理"], ["11", "各類所得扣繳申報資料調查"],
    ["12", "9-10月份帳務處理"], ["12", "01-02月統購發票寄送"], ["12", "扣繳申報前置作業"]
  ];
  sheet.getRange(1, 1, 1, 2).setValues([["月份", "任務名稱"]]);
  sheet.getRange(2, 1, data.length, 2).setValues(data);
  return { status: 'success' };
}

function autoUpdateToReviewing() {
  const sheet = getSheet('工作任務');
  if (!sheet) return;
  const hs = getHeaders(sheet);
  const data = getSheetData(sheet);
  
  const now = new Date();
  const todayStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyy/MM/dd');
  
  data.forEach(row => {
    if (row.status === '已完成') {
      const compDate = row.completedDate ? Utilities.formatDate(new Date(row.completedDate), 'Asia/Taipei', 'yyyy/MM/dd') : '';
      if (compDate && compDate <= todayStr) {
        row.status = '待審核';
        sheet.getRange(row.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, row)]);
      }
    }
  });
}

function installTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoUpdateToReviewing') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('autoUpdateToReviewing')
    .timeBased()
    .atHour(22)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone("Asia/Taipei")
    .create();
}

function res(obj) { 
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); 
}
