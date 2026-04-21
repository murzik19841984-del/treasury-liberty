/**
 * Google Apps Script Web App для управления платежами
 * Листы: "Payments" и "History"
 *
 * Колонки Payments (A-M):
 * A: id, B: amount, C: counterparty, D: due_date, E: purpose,
 * F: link, G: priority, H: budget_article, I: status,
 * J: approved, K: rejection_reason, L: created_at, M: updated_at
 *
 * Колонки History (A-G):
 * A: id, B: payment_id, C: action, D: old_value, E: new_value, F: user, G: timestamp
 */

const SCRIPT_LOCK_TIMEOUT = 30000;
const PAYMENTS_SHEET = "Payments";
const HISTORY_SHEET = "History";
const PAYMENT_HEADERS = ["id", "amount", "counterparty", "due_date", "purpose", "link", "priority", "budget_article", "status", "approved", "rejection_reason", "created_at", "updated_at"];
const HISTORY_HEADERS  = ["id", "payment_id", "action", "old_value", "new_value", "user", "timestamp"];

/**
 * Первичная настройка таблицы.
 * Запустить один раз из редактора Apps Script после создания нового файла.
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Лист Payments ---
  let paymentsSheet = ss.getSheetByName(PAYMENTS_SHEET);
  if (!paymentsSheet) {
    paymentsSheet = ss.insertSheet(PAYMENTS_SHEET);
  }
  _initSheet(paymentsSheet, PAYMENT_HEADERS, "#1565C0");

  // --- Лист History ---
  let historySheet = ss.getSheetByName(HISTORY_SHEET);
  if (!historySheet) {
    historySheet = ss.insertSheet(HISTORY_SHEET);
  }
  _initSheet(historySheet, HISTORY_HEADERS, "#2E7D32");

  // Удаляем дефолтный лист «Лист1» / «Sheet1» если он пустой
  ["Лист1", "Sheet1"].forEach(name => {
    const s = ss.getSheetByName(name);
    if (s && s.getLastRow() === 0) ss.deleteSheet(s);
  });

  SpreadsheetApp.getUi().alert("✅ Таблица настроена!\n\nЛисты Payments и History созданы. Теперь задеплойте Web App и скопируйте URL в app.js.");
}

function _initSheet(sheet, headers, headerColor) {
  // Заголовки только если лист пустой
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold")
             .setFontColor("#ffffff")
             .setBackground(headerColor)
             .setHorizontalAlignment("center");

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 220); // id — широкий
  for (let i = 2; i <= headers.length; i++) {
    sheet.setColumnWidth(i, 150);
  }
}

/**
 * GET запрос: возвращает все данные из листа Payments
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === "getAll") {
      const data = getAllPayments();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return sendError("Invalid action");
  } catch (error) {
    return sendError(error.toString());
  }
}

/**
 * POST запрос: обрабатывает create, update, batchUpdate, addHistory
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    switch (action) {
      case "create":
        return handleCreate(payload);
      case "update":
        return handleUpdate(payload);
      case "batchUpdate":
        return handleBatchUpdate(payload);
      case "addHistory":
        return handleAddHistory(payload);
      default:
        return sendError("Unknown action: " + action);
    }
  } catch (error) {
    return sendError(error.toString());
  }
}

/**
 * Создание новой записи платежа
 */
function handleCreate(payload) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(SCRIPT_LOCK_TIMEOUT);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(PAYMENTS_SHEET);
    
    if (!sheet) {
      return sendError("Sheet '" + PAYMENTS_SHEET + "' not found");
    }
    
    // Генерируем UUID v4
    const id = Utilities.getUuid();
    const now = new Date();
    
    // Подготавливаем новую строку
    const newRow = [
      id,                           // A: id
      payload.amount || "",          // B: amount
      payload.counterparty || "",    // C: counterparty
      payload.due_date || "",        // D: due_date
      payload.purpose || "",         // E: purpose
      payload.link || "",            // F: link
      payload.priority || "",        // G: priority
      payload.budget_article || "",  // H: budget_article
      payload.status || "draft",     // I: status
      payload.approved || false,     // J: approved
      payload.rejection_reason || "", // K: rejection_reason
      now.toISOString(),            // L: created_at
      now.toISOString()             // M: updated_at
    ];
    
    // Добавляем строку в таблицу
    sheet.appendRow(newRow);
    
    return sendSuccess({
      id: id,
      message: "Record created successfully"
    });
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Обновление существующей записи
 */
function handleUpdate(payload) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(SCRIPT_LOCK_TIMEOUT);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(PAYMENTS_SHEET);
    
    if (!sheet) {
      return sendError("Sheet '" + PAYMENTS_SHEET + "' not found");
    }
    
    const id = payload.id;
    const rowIndex = findRowById(sheet, id);
    
    if (rowIndex === -1) {
      return sendError("Record with id '" + id + "' not found");
    }
    
    const now = new Date().toISOString();
    
    // Обновляем заданные поля
    if (payload.amount !== undefined) sheet.getRange(rowIndex, 2).setValue(payload.amount);
    if (payload.counterparty !== undefined) sheet.getRange(rowIndex, 3).setValue(payload.counterparty);
    if (payload.due_date !== undefined) sheet.getRange(rowIndex, 4).setValue(payload.due_date);
    if (payload.purpose !== undefined) sheet.getRange(rowIndex, 5).setValue(payload.purpose);
    if (payload.link !== undefined) sheet.getRange(rowIndex, 6).setValue(payload.link);
    if (payload.priority !== undefined) sheet.getRange(rowIndex, 7).setValue(payload.priority);
    if (payload.budget_article !== undefined) sheet.getRange(rowIndex, 8).setValue(payload.budget_article);
    if (payload.status !== undefined) sheet.getRange(rowIndex, 9).setValue(payload.status);
    if (payload.approved !== undefined) sheet.getRange(rowIndex, 10).setValue(payload.approved);
    if (payload.rejection_reason !== undefined) sheet.getRange(rowIndex, 11).setValue(payload.rejection_reason);
    
    // Обновляем updated_at в столбце M (13)
    sheet.getRange(rowIndex, 13).setValue(now);
    
    return sendSuccess({
      id: id,
      message: "Record updated successfully"
    });
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Массовое обновление записей
 */
function handleBatchUpdate(payload) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(SCRIPT_LOCK_TIMEOUT);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(PAYMENTS_SHEET);
    
    if (!sheet) {
      return sendError("Sheet '" + PAYMENTS_SHEET + "' not found");
    }
    
    const ids = payload.ids || [];
    const status = payload.status;
    const now = new Date().toISOString();
    const updatedIds = [];
    const notFoundIds = [];
    
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const rowIndex = findRowById(sheet, id);
      
      if (rowIndex === -1) {
        notFoundIds.push(id);
        continue;
      }
      
      if (status !== undefined) {
        sheet.getRange(rowIndex, 9).setValue(status); // status column I
      }
      sheet.getRange(rowIndex, 13).setValue(now); // updated_at column M
      updatedIds.push(id);
    }
    
    return sendSuccess({
      updated: updatedIds,
      notFound: notFoundIds,
      message: "Batch update completed"
    });
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Добавление записи в историю
 */
function handleAddHistory(payload) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(SCRIPT_LOCK_TIMEOUT);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(HISTORY_SHEET);
    
    if (!sheet) {
      return sendError("Sheet '" + HISTORY_SHEET + "' not found");
    }
    
    const now = new Date();
    
    // Добавляем запись в историю
    const historyRow = [
      payload.id || Utilities.getUuid(),
      payload.payment_id || "",
      payload.action || "",
      payload.old_value || "",
      payload.new_value || "",
      payload.user || "",
      now.toISOString()
    ];
    
    sheet.appendRow(historyRow);
    
    return sendSuccess({
      message: "History record added successfully"
    });
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Получает все платежи из листа Payments
 */
function getAllPayments() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PAYMENTS_SHEET);
  
  if (!sheet) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  const payments = [];
  
  // Пропускаем первую строку (заголовок)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Пропускаем пустые строки
    if (!row[0]) continue;
    
    payments.push({
      id: row[0],
      amount: row[1],
      counterparty: row[2],
      due_date: row[3] instanceof Date ? row[3].toISOString() : row[3],
      purpose: row[4],
      link: row[5],
      priority: row[6],
      budget_article: row[7],
      status: row[8],
      approved: row[9],
      rejection_reason: row[10],
      created_at: row[11] instanceof Date ? row[11].toISOString() : row[11],
      updated_at: row[12] instanceof Date ? row[12].toISOString() : row[12]
    });
  }
  
  return payments;
}

/**
 * Находит индекс строки по id
 */
function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      return i + 1; // Google Sheets использует 1-based индексы
    }
  }
  
  return -1;
}

/**
 * Отправляет ошибку в формате JSON
 */
function sendError(message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: message
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Отправляет успешный ответ в формате JSON
 */
function sendSuccess(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}
