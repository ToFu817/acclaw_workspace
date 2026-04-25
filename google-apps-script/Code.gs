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
  'sopSteps': 'SOP步驟', 'reviewer': '審核人', 'reviewDate': '審核時間',
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
  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  
  if (sheetName === '客戶資料') {
    const row = range.getRow();
    if (row < 2) return; // 標題列不處理
    
    const hs = getHeaders(sheet);
    const rowData = getSheetData(sheet).find(d => d.rowIndex === row);
    if (rowData) {
      syncToAllocation(rowData);
    }
  }
}

function syncToAllocation(clientData) {
  const allocSheet = getSheet('客戶分配');
  const hs = getHeaders(allocSheet);
  const data = getSheetData(allocSheet);
  
  // 查找是否已存在
  const match = data.find(d => String(d.clientId).trim() === String(clientData.clientId).trim());
  
  // 找出員工編號
  const empData = getSheetData(getSheet('群組管理'));
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
      case 'getDashboardStats': return res(handleGetDashboardStats());
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
  if (h === '狀態' || h === '目前狀態') return 'status';
  if (h === '審核時間' || h === '審核日期') return 'reviewDate';
  if (h === '備註' || h === '備忘錄') return 'note';
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
  if (p.sheetName === '客戶資料') syncToAllocation(p.rowData);
  return { status: 'success' };
}

function handleUpdateRow(p) {
  const sheet = getSheet(p.sheetName);
  const hs = getHeaders(sheet);
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
      sheet.getRange(match.rowIndex, 1, 1, hs.length).setValues([mapDataToRow(hs, { ...match, ...newRow })]);
    } else {
      sheet.appendRow(mapDataToRow(hs, newRow));
    }
    if (p.sheetName === '客戶資料') syncToAllocation(newRow);
  });
  return { status: 'success', message: '匯入完成' };
}

function handleGetDashboardStats() {
  const tasks = getSheetData(getSheet('工作任務'));
  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = Utilities.formatDate(now, 'Asia/Taipei', 'yyyy/MM/dd');
  const todayTime = new Date(now.setHours(0,0,0,0)).getTime();

  let stats = { pending: 0, delayed: 0, completed: 0, reviewing: 0, reviewed: 0 };
  tasks.forEach(t => {
    const status = String(t.status || '').trim();
    const compDate = t.completedDate ? Utilities.formatDate(new Date(t.completedDate), 'Asia/Taipei', 'yyyy/MM/dd') : '';
    const isOverdue = t.dueDate && (new Date(t.dueDate).getTime() < todayTime);
    
    let isReviewing = (status === '待審核');
    if (status === '已完成' || compDate !== '') {
      if (compDate !== '') {
        if (compDate < todayStr) isReviewing = true;
        else if (compDate === todayStr && currentHour >= 22) isReviewing = true;
      }
    }

    if (status === '已審核') stats.reviewed++;
    else if (isReviewing) stats.reviewing++;
    else if (status === '已完成' || compDate !== '') stats.completed++;
    else if (status === '延遲中' || isOverdue) stats.delayed++;
    else stats.pending++;
  });

  const annualTasks = getSheetData(getSheet('年度任務計畫'));
  const currentMonth = String(now.getMonth() + 1);
  const thisMonthAnnual = annualTasks.filter(a => String(a['月份']) === currentMonth).map(a => a['任務名稱']);

  return { status: 'success', data: { ...stats, totalClients: getSheetData(getSheet('客戶資料')).length, monthlyGoals: thisMonthAnnual }};
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

function res(obj) { 
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); 
}
