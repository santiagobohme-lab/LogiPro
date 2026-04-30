// ==========================================
// CONFIGURACIÓN LOGI PRO - ID ACTUALIZADO
// ==========================================

const FOLDER_FACTURAS = '1OsV_Q0PAYo0-LEkjdmVKfVImafT8FtB0'; 
const FOLDER_FOTOS_CHOFERES = '1_b0ljWJPJKqly-20wjlcNMZUDtcNgYdi'; 
const FOLDER_LICENCIAS_CHOFERES = '1bJ9hU61uN7btZ__KHNnWNn0gIxBYGFwG';
const FOLDER_COMPROBANTES_PAGO = '14qmuUkXL1C6wF600wIyKfurXPMLRnoIX';
const FOLDER_GUIAS_DESPACHO = '1JpAwL3DPi-psE94RyUpe5xm7Q8QvuRAy';
const SPREADSHEET_ID = '1gmA0PVykHK_ZoEYfM-JPwKU4bTQ-LI4UgpciqGWGhOc';
const GEMINI_API_KEY = 'AIzaSyDQtA3SAJ6DxHuIAbtvNliP8tNUoNWWXyc';

const SCRIPT_DB_HEADERS = [
  "ID", "Cliente", "Operador", "Estado Pago", "Fecha de Servicio", "Tipo Servicio", 
  "Destino", "Costo", "Monto", "Fecha de Pago", 
  "Estado Factura", "OC / HES", "Cotizaci\u00f3n", "DESCRIPCI\u00d3N FACTURACI\u00d3N", "N\u00ba Factura", "Link Archivo", "Estado Ruta",
  "Patente Asignada", "Chofer Asignado", "\u00daltimo GPS", "\u00daltima Actualizaci\u00f3n", "Origen", "Link Gu\u00eda de Despacho"
];

const USER_HEADERS = ["Nombre", "Clave", "Rol", "Estado", "Email", "Cliente Asociado", "Operador Asociado"];
const POTENTIAL_HEADERS = ["Nombre", "Tel\u00e9fono", "Email", "Sitio Web"];
const OPERATOR_HEADERS = ["Nombre / Empresa", "RUT", "Tel\u00e9fono", "Email", "Foto"];
const CLIENT_HEADERS = ["Nombre", "Tel\u00e9fono", "Email", "RUT Cliente", "Giro", "Direcci\u00f3n", "Comuna", "Ciudad"];
const CHOFER_HEADERS = ["ID_Chofer", "ID_Operador", "Nombre", "RUT", "Foto de Perfil", "Teléfono", "Correo", "Licencia", "Vencimiento Licencia", "Estado Licencia", "Tipo Licencia"];
const CAMION_HEADERS = ["ID_Camion", "ID_Operador", "Patente", "Modelo"];

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
    const maxCols = sheet.getMaxColumns();
    if (maxCols < headers.length) {
      sheet.insertColumnsAfter(maxCols, headers.length - maxCols);
    }
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
    {name: "Potenciales", head: POTENTIAL_HEADERS},
    {name: "Choferes", head: CHOFER_HEADERS},
    {name: "Camiones", head: CAMION_HEADERS}
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
    { name: "Base_Operadores", headers: OPERATOR_HEADERS, key: "base_operadores" },
    { name: "Choferes", headers: CHOFER_HEADERS, key: "choferes" },
    { name: "Camiones", headers: CAMION_HEADERS, key: "camiones" }
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
      const ch_sheet = ss.getSheetByName("Choferes") || initSheet(ss, "Choferes", CHOFER_HEADERS);
      const ca_sheet = ss.getSheetByName("Camiones") || initSheet(ss, "Camiones", CAMION_HEADERS);
      return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          servicios: getSheetData(s_sheet, SCRIPT_DB_HEADERS),
          base_operadores: getSheetData(o_sheet, OPERATOR_HEADERS),
          choferes: getSheetData(ch_sheet, CHOFER_HEADERS),
          camiones: getSheetData(ca_sheet, CAMION_HEADERS)
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "operatorUpdateStatus") {
      upsertRow(initSheet(ss, "Servicios", SCRIPT_DB_HEADERS), SCRIPT_DB_HEADERS, payload.data, "ID");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "uploadGuia") {
      try {
        const folderId = FOLDER_GUIAS_DESPACHO;
        const folder = DriveApp.getFolderById(folderId);
        
        // Extraer número de guía usando Gemini (opcional pero potente)
        let nroGuia = "S_N";
        try {
           nroGuia = extractGuideNumberWithGemini(payload.originalData, payload.mimeType);
        } catch(e) { 
           console.error("Gemini OCR failed: " + e);
        }

        const baseName = `Guia_${payload.cliente}_${payload.fecha}_${payload.serviceId}`;
        
        // 1. Guardar Escaneada (B&W)
        const blobScanned = Utilities.newBlob(Utilities.base64Decode(payload.scannedData), payload.mimeType, `${baseName}_ESCANEADA.jpg`);
        const fileScanned = folder.createFile(blobScanned);
        
        // 2. Guardar Original (Color)
        const blobOrig = Utilities.newBlob(Utilities.base64Decode(payload.originalData), payload.mimeType, `${baseName}_ORIGINAL.jpg`);
        const fileOrig = folder.createFile(blobOrig);

        const fileUrl = fileScanned.getUrl(); // Priorizamos el link del escaneo para la base de datos

        // Guardar el link en la base de datos de servicios (EN LA NUEVA COLUMNA)
        upsertRow(initSheet(ss, "Servicios", SCRIPT_DB_HEADERS), SCRIPT_DB_HEADERS, { "ID": payload.serviceId, "Link Guía de Despacho": fileUrl }, "ID");
        
        return ContentService.createTextOutput(JSON.stringify({ status: "success", url: fileUrl })).setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
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
    else if (action === "upsertChofer") {
      if (payload.data["RUT"] && !validarRUT(payload.data["RUT"])) {
        throw new Error("El RUT del chofer no es válido.");
      }
      if (!payload.data["ID_Chofer"]) payload.data["ID_Chofer"] = Date.now().toString() + Math.floor(Math.random() * 1000);
      upsertRow(initSheet(ss, "Choferes", CHOFER_HEADERS), CHOFER_HEADERS, payload.data, "ID_Chofer");
    }
    else if (action === "deleteChofer") {
      deleteRowById(ss.getSheetByName("Choferes") || initSheet(ss, "Choferes", CHOFER_HEADERS), CHOFER_HEADERS, "ID_Chofer", payload.id);
    }
    else if (action === "upsertCamion") {
      if (!payload.data["ID_Camion"]) payload.data["ID_Camion"] = Date.now().toString() + Math.floor(Math.random() * 1000);
      upsertRow(initSheet(ss, "Camiones", CAMION_HEADERS), CAMION_HEADERS, payload.data, "ID_Camion");
    }
    else if (action === "deleteCamion") {
      deleteRowById(ss.getSheetByName("Camiones") || initSheet(ss, "Camiones", CAMION_HEADERS), CAMION_HEADERS, "ID_Camion", payload.id);
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
      // Also cascade-delete associated choferes and camiones
      const opName = payload.nombre;
      const chSheet = ss.getSheetByName("Choferes");
      if (chSheet) {
        const chData = chSheet.getDataRange().getValues();
        const opIdx = CHOFER_HEADERS.indexOf("ID_Operador");
        for (let i = chData.length - 1; i >= 1; i--) {
          if (chData[i][opIdx].toString() === opName) chSheet.deleteRow(i + 1);
        }
      }
      const caSheet = ss.getSheetByName("Camiones");
      if (caSheet) {
        const caData = caSheet.getDataRange().getValues();
        const opIdx = CAMION_HEADERS.indexOf("ID_Operador");
        for (let i = caData.length - 1; i >= 1; i--) {
          if (caData[i][opIdx].toString() === opName) caSheet.deleteRow(i + 1);
        }
      }
      deleteRowById(ss.getSheetByName("Base_Operadores"), OPERATOR_HEADERS, "Nombre / Empresa", payload.nombre);
    }
    else if (action === "uploadFile") {
      let targetFolderId;
      if (payload.folderType === 'chofer') {
        targetFolderId = FOLDER_FOTOS_CHOFERES;
      } else if (payload.folderType === 'licencia') {
        targetFolderId = FOLDER_LICENCIAS_CHOFERES;
      } else if (payload.folderType === 'pago') {
        targetFolderId = FOLDER_COMPROBANTES_PAGO;
      } else {
        targetFolderId = FOLDER_FACTURAS;
      }
      
      const folder = DriveApp.getFolderById(targetFolderId);
      const pureBase64 = payload.base64.includes(',') ? payload.base64.split(',')[1] : payload.base64;
      const blob = Utilities.newBlob(Utilities.base64Decode(pureBase64), payload.mimeType || "application/octet-stream", payload.fileName);
      const file = folder.createFile(blob);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        url: file.getUrl(), 
        id: file.getId() 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}

/* === VALIDACIÓN RUT CHILENO (Módulo 11) === */
function validarRUT(rut) {
  if (!rut || rut.toString().trim() === "") return true; // Vacío es válido (campo opcional)
  const clean = rut.toString().replace(/[^0-9kK]/g, '');
  if (clean.length < 8 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected = 11 - (sum % 11);
  const dvExpected = expected === 11 ? '0' : expected === 10 ? 'K' : expected.toString();
  return dv === dvExpected;
}


