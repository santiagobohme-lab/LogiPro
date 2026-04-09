/**
 * LOGITRADE: Backend API (Google Apps Script)
 * Proporciona endpoints para inicializar hojas, lectura (doGet) y escritura completa (doPost)
 */

const FOLDER_ID = 'COMPLETA_TU_ID_AQUI'; // Cambia esto por tu ID de Drive para guardar facturas

const SCRIPT_DB_HEADERS = [
  "ID", "Cliente", "Operador", "Fecha de Servicio", "Tipo Servicio", 
  "Destino", "Costo", "Monto", "Fecha de Pago", "Estado Pago", 
  "Estado Factura", "OC / HES", "Cotización", "Nº Factura", "Link Archivo"
];

function initSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetData(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function upsertRow(sheet, headers, data, idField) {
  const lastRow = sheet.getLastRow();
  let foundRow = -1;
  const targetId = data[idField];
  
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

  const rowValues = headers.map(h => data[h] !== undefined ? data[h] : "");

  if (foundRow !== -1) {
    sheet.getRange(foundRow, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function doGet(e) {
  try {
    const servicesSheet = initSheet("Servicios", SCRIPT_DB_HEADERS);
    const clientsSheet = initSheet("Clientes", ["Nombre", "Teléfono", "Email"]);

    const sData = getSheetData(servicesSheet, SCRIPT_DB_HEADERS);
    const cData = getSheetData(clientsSheet, ["Nombre", "Teléfono", "Email"]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      servicios: sData,
      clientes: cData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No se enviaron datos post" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "upsertService") {
      const sheet = initSheet("Servicios", SCRIPT_DB_HEADERS);
      upsertRow(sheet, SCRIPT_DB_HEADERS, payload.data, "ID");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === "upsertClient") {
      const sheet = initSheet("Clientes", ["Nombre", "Teléfono", "Email"]);
      upsertRow(sheet, ["Nombre", "Teléfono", "Email"], payload.data, "Nombre");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === "uploadFile") {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const fileName = payload.fileName;
      const base64Data = payload.base64;
      
      const splitData = base64Data.split(',');
      const base64 = splitData[1] || splitData[0];
      const mimeType = payload.mimeType || (splitData[0] && splitData[0].includes('data:') ? splitData[0].split(':')[1].split(';')[0] : "application/pdf");
      
      const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
      const file = folder.createFile(blob);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        url: file.getUrl(),
        fileName: file.getName(),
        id: file.getId()
      })).setMimeType(ContentService.MimeType.JSON);

    } else {
       return ContentService.createTextOutput(JSON.stringify({ error: "Acción no reconocida" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Para la respuesta segura a solicitudes tipo Preflight (CORS en navegadores modernos)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
