// ==========================================
// CONFIGURACIÓN LOGI PRO - ID ACTUALIZADO
// ==========================================

const FOLDER_ID = '1OsV_Q0PAYo0-LEkjdmVKfVImafT8FtB0'; 
const FOLDER_FOTOS_PERFIL = '1ExIVEFippvrARyDUw_lfPHbhC_LSPTK8'; 
const FOLDER_COMPROBANTES_PAGO = '14qmuUkXL1C6wF600wIyKfurXPMLRnoIX';
const SPREADSHEET_ID = '1gmA0PVykHK_ZoEYfM-JPwKU4bTQ-LI4UgpciqGWGhOc';
const GEMINI_API_KEY = 'AIzaSyDQtA3SAJ6DxHuIAbtvNliP8tNUoNWWXyc';

const SCRIPT_DB_HEADERS = [
  "ID", "Cliente", "Operador", "Estado Pago", "Fecha de Servicio", "Tipo Servicio", 
  "Destino", "Costo", "Monto", "Fecha de Pago", 
  "Estado Factura", "OC / HES", "Cotización", "DESCRIPCIÓN FACTURACIÓN", "Nº Factura", "Link Archivo", "Estado Ruta"
];

const USER_HEADERS = ["Nombre", "Clave", "Rol", "Estado", "Email", "Cliente Asociado"];
const POTENTIAL_HEADERS = ["Nombre", "Teléfono", "Email", "Sitio Web"];
const OPERATOR_HEADERS = ["Nombre / Empresa", "RUT", "Patente", "Chofer", "Teléfono", "Email", "Foto"];
const CLIENT_HEADERS = ["Nombre", "Teléfono", "Email", "RUT Cliente", "Giro", "Dirección", "Comuna", "Ciudad"];

/**
 * Crea un menú en la hoja de cálculo al abrirse.
 * Se añade try-catch para evitar errores en ejecuciones de Web App.
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    if(ui) {
      ui.createMenu('🚀 Logi Pro')
        .addItem('Actualizar Encabezados', 'setupHeaders')
        .addSeparator()
        .addItem('Sincronizar Todo', 'setupHeaders')
        .addToUi();
    }
  } catch (e) {
    console.warn("Contexto sin UI (Web App): Saltando creación de menú.");
  }
}

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Inicializa una hoja y asegura que los encabezados existan.
 */
function initSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  } else {
    const lastCol = sheet.getLastColumn() || 1;
    if (lastCol < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

function getSheetData(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[h] = val;
    });
    return obj;
  });
}

function upsertRow(sheet, headers, data, idField, originalId) {
  const targetId = originalId || data[idField];
  if (targetId === undefined || targetId === null || targetId.toString().trim() === "") return;

  const lastRow = sheet.getLastRow();
  let foundRow = -1;
  
  if (lastRow >= 2) {
    const idColumnIndex = headers.indexOf(idField) + 1;
    const ids = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] !== "" && ids[i][0].toString() === targetId.toString()) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (foundRow !== -1) {
    const currentValues = sheet.getRange(foundRow, 1, 1, headers.length).getValues()[0];
    const newValues = headers.map((h, i) => data[h] !== undefined ? data[h] : currentValues[i]);
    sheet.getRange(foundRow, 1, 1, headers.length).setValues([newValues]);
  } else {
    const rowValues = headers.map(h => data[h] !== undefined ? data[h] : "");
    sheet.appendRow(rowValues);
  }
}

function deleteRowById(sheet, headers, idField, targetId) {
  if (targetId === undefined || targetId === null || targetId.toString().trim() === "") return false;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const idColumnIndex = headers.indexOf(idField) + 1;
  const ids = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] !== "" && ids[i][0].toString() === targetId.toString()) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

function setupHeaders() {
  const ss = getSS();
  const config = [
    {name: "Clientes", head: CLIENT_HEADERS},
    {name: "Servicios", head: SCRIPT_DB_HEADERS},
    {name: "Colaboradores", head: USER_HEADERS},
    {name: "Base_Operadores", head: OPERATOR_HEADERS},
    {name: "Potenciales", head: POTENTIAL_HEADERS}
  ];

  config.forEach(item => {
    let sheet = ss.getSheetByName(item.name);
    if (sheet) {
      sheet.getRange(1, 1, 1, item.head.length).setValues([item.head]);
      sheet.getRange(1, 1, 1, item.head.length).setFontWeight("bold").setBackground("#f3f4f6");
    } else {
      initSheet(ss, item.name, item.head);
    }
  });

  try {
    const ui = SpreadsheetApp.getUi();
    if (ui) ui.alert("✅ Proceso completado: Encabezados actualizados.");
  } catch (e) {
    console.log("Encabezados actualizados (Sin UI)");
  }
}

function getFullSystemData(ss) {
  const data = { status: "success" };
  const sheetsConfig = [
    { name: "Servicios", headers: SCRIPT_DB_HEADERS, key: "servicios" },
    { name: "Clientes", headers: CLIENT_HEADERS, key: "clientes" },
    { name: "Colaboradores", headers: USER_HEADERS, key: "colaboradores" },
    { name: "Potenciales", headers: POTENTIAL_HEADERS, key: "potenciales" },
    { name: "Base_Operadores", headers: OPERATOR_HEADERS, key: "base_operadores" }
  ];

  sheetsConfig.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) sheet = initSheet(ss, cfg.name, cfg.headers);
    let mappedData = getSheetData(sheet, cfg.headers);
    
    if (cfg.key === "colaboradores") {
      mappedData = mappedData.map(row => {
        let safeRow = {...row};
        delete safeRow["Clave"];
        return safeRow;
      });
    }
    data[cfg.key] = mappedData;
  });

  return data;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "error", 
    message: "Método GET no permitido. Acceso denegado." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = getSS();
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "login") {
      const sheet = ss.getSheetByName("Colaboradores") || initSheet(ss, "Colaboradores", USER_HEADERS);
      const users = getSheetData(sheet, USER_HEADERS);
      const user = users.find(u => u.Nombre.toString().toLowerCase() === payload.nombre.toString().toLowerCase() && u.Clave.toString() === payload.pass.toString());
      if (user) {
        if (user.Estado !== "Activo") throw new Error("Usuario inactivo");
        
        const token = Utilities.getUuid();
        CacheService.getScriptCache().put(token, JSON.stringify(user), 21600);
        
        const safeUser = {...user};
        delete safeUser["Clave"];
        return ContentService.createTextOutput(JSON.stringify({ status: "success", user: safeUser, token: token, ...getFullSystemData(ss) })).setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Nombre o Clave incorrectos");
      }
    }

    if (action === "syncOperatorData") {
      const s_sheet = ss.getSheetByName("Servicios") || initSheet(ss, "Servicios", SCRIPT_DB_HEADERS);
      const o_sheet = ss.getSheetByName("Base_Operadores") || initSheet(ss, "Base_Operadores", OPERATOR_HEADERS);
      return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          servicios: getSheetData(s_sheet, SCRIPT_DB_HEADERS),
          base_operadores: getSheetData(o_sheet, OPERATOR_HEADERS)
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "operatorUpdateStatus") {
      upsertRow(initSheet(ss, "Servicios", SCRIPT_DB_HEADERS), SCRIPT_DB_HEADERS, payload.data, "ID");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    const token = payload.token;
    if (!token) throw new Error("Acceso denegado: Se requiere un Token de sesión.");
    
    const cachedSessionStr = CacheService.getScriptCache().get(token);
    if (!cachedSessionStr) throw new Error("Sesión expirada o inválida. Inicia sesión nuevamente.");
    
    const sessionUser = JSON.parse(cachedSessionStr);

    if (action === "validateSession" || action === "syncData") {
      const safeUser = {...sessionUser};
      delete safeUser["Clave"];
      return ContentService.createTextOutput(JSON.stringify({ status: "success", user: safeUser, token: token, ...getFullSystemData(ss) })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "getTradingDashboard") {
      const insights = getGeminiTradingInsights();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: insights })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "changePassword") {
      const sheet = ss.getSheetByName("Colaboradores");
      if (!sheet) throw new Error("No hay base de colaboradores");
      
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) throw new Error("No hay usuarios registrados");
      
      const data = sheet.getRange(2, 1, lastRow - 1, USER_HEADERS.length).getValues();
      const nIdx = USER_HEADERS.indexOf("Nombre");
      const cIdx = USER_HEADERS.indexOf("Clave");
      
      let found = false;
      for (let i = 0; i < data.length; i++) {
        if (data[i][nIdx].toString().toLowerCase() === payload.nombre.toString().toLowerCase()) {
          if (data[i][cIdx].toString() !== payload.oldPass.toString()) {
            throw new Error("La contraseña actual es incorrecta.");
          }
          sheet.getRange(i + 2, cIdx + 1).setValue(payload.newPass);
          found = true;
          break;
        }
      }
      
      if (!found) throw new Error("Usuario no encontrado.");
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Contraseña actualizada exitosamente." })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === "upsertService") {
      upsertRow(initSheet(ss, "Servicios", SCRIPT_DB_HEADERS), SCRIPT_DB_HEADERS, payload.data, "ID");
    } 
    else if (action === "upsertClient") {
      const oldName = payload.oldNombre;
      const newName = payload.data["Nombre"];
      upsertRow(initSheet(ss, "Clientes", CLIENT_HEADERS), CLIENT_HEADERS, payload.data, "Nombre", oldName);
      if (oldName && oldName !== newName) {
        const sSheet = ss.getSheetByName("Servicios");
        if (sSheet) {
          const sData = sSheet.getDataRange().getValues();
          const cIdx = SCRIPT_DB_HEADERS.indexOf("Cliente");
          for (let i = 1; i < sData.length; i++) { if (sData[i][cIdx] === oldName) sSheet.getRange(i + 1, cIdx + 1).setValue(newName); }
        }
      }
    } 
    else if (action === "upsertPotential") {
      upsertRow(initSheet(ss, "Potenciales", POTENTIAL_HEADERS), POTENTIAL_HEADERS, payload.data, "Nombre");
    }
    else if (action === "upsertOperator") {
      upsertRow(initSheet(ss, "Base_Operadores", OPERATOR_HEADERS), OPERATOR_HEADERS, payload.data, "Nombre / Empresa");
    }
    else if (action === "upsertUser") {
      upsertRow(initSheet(ss, "Colaboradores", USER_HEADERS), USER_HEADERS, payload.data, "Nombre");
    }
    else if (action === "deleteService") {
      deleteRowById(ss.getSheetByName("Servicios"), SCRIPT_DB_HEADERS, "ID", payload.id);
    }
    else if (action === "deleteClient") {
      deleteRowById(ss.getSheetByName("Clientes"), CLIENT_HEADERS, "Nombre", payload.nombre);
    }
    else if (action === "deletePotential") {
      deleteRowById(ss.getSheetByName("Potenciales"), POTENTIAL_HEADERS, "Nombre", payload.nombre);
    }
    else if (action === "deleteOperator") {
      deleteRowById(ss.getSheetByName("Base_Operadores"), OPERATOR_HEADERS, "Nombre / Empresa", payload.nombre);
    }
    else if (action === "uploadFile") {
      const folder = DriveApp.getFolderById(payload.folderType === 'perfil' ? FOLDER_FOTOS_PERFIL : FOLDER_ID);
      const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64.split(',')[1] || payload.base64), payload.mimeType || "image/jpeg", payload.fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", url: file.getUrl(), id: file.getId() })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}

/* === LOGI PRO AI BRAIN (GEMINI) === */
function fetchMacroData() {
  try {
    const response = UrlFetchApp.fetch("https://mindicador.cl/api", { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      return {
        usd: data.dolar ? data.dolar.valor : null,
        uf: data.uf ? data.uf.valor : null
      };
    }
  } catch(e) { }
  return { usd: null, uf: null };
}

function getGeminiTradingInsights() {
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get("tradingInsightsV2");
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const macro = fetchMacroData();
  const usdVal = macro.usd || 980;
  const ufVal = macro.uf || 37800;
  
  const prompt = `Eres el cerebro de IA de un "Trading Terminal de Logística" en Chile (Logi Pro).
  Fecha actual: Abril de 2026.
  Aquí tienes los indicadores reales de hoy: Dólar $${usdVal} CLP y UF $${ufVal} CLP. 
  Crea 4 alertas de radar hiperrealistas para una empresa de camiones (Ruta 5, fronteras, peajes, ENAP, tarifas fletes). 
  Calcula también valores ficticios pero muy realistas para el Combustible Diésel ENAP hoy (que ronde los $1546 CLP histórico) y el Petróleo WTI (que ronde los 84 USD/bbl), con tendencias.
  Proporciona además un array "enap_chart" de 12 valores numéricos (ej. 1100, 1150... 1546) representando los últimos 12 meses, de Mayo 2025 a Abril 2026.
  Formato de Salida Obligatorio (JSON puro):
  {
    "usd": { "val": ${usdVal}, "trend": "ALZA/BAJA según corresponda" },
    "uf": { "val": ${ufVal}, "trend": "ALZA/BAJA" },
    "wti": { "val": 84.15, "trend": "-1.12 USD", "sentiment": "Cauteloso/Alza/Baja" },
    "enap": { "val": 1546, "trend": "+$30,0 por litro", "sentiment": "Alza Histórica" },
    "enap_chart": [1200, 1210, 1230, 1220, 1250, 1280, 1310, 1350, 1400, 1450, 1500, 1546],
    "ai_radar": [
      { 
        "type": "ALERTA/TENDENCIA/INFORME", 
        "time": "Hace 2h", 
        "color": "rose/amber/sky/emerald", 
        "icon": "fa-bolt/fa-arrow-trend-up/fa-leaf/fa-truck", 
        "desc": "Describe brevemente la noticia, usando <strong>texto clave</strong> en negritas tag." 
      }
    ]
  }`;

  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
    const payload = {
      "contents": [{ "parts": [{"text": prompt}] }],
      "generationConfig": { "responseMimeType": "application/json" }
    };
    
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const gData = JSON.parse(response.getContentText());
      let textContent = gData.candidates[0].content.parts[0].text;
      const finalJson = JSON.parse(textContent);
      cache.put("tradingInsights", JSON.stringify(finalJson), 3600); // 1 hora
      return finalJson;
    } else {
      return { _error: "Error Gemini API: " + response.getContentText() };
    }
  } catch(e) {
    return { _error: "Exception: " + e.toString() };
  }
}
