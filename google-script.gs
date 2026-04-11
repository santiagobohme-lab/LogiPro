// ==========================================
// CONFIGURACIÓN LOGI PRO - ID ACTUALIZADO
// ==========================================

const FOLDER_ID = '1OsV_Q0PAYo0-LEkjdmVKfVImafT8FtB0'; 
const FOLDER_FOTOS_PERFIL = '1ExIVEFippvrARyDUw_lfPHbhC_LSPTK8'; 
const SPREADSHEET_ID = '1gmA0PVykHK_ZoEYfM-JPwKU4bTQ-LI4UgpciqGWGhOc';

const SCRIPT_DB_HEADERS = [
  "ID", "Cliente", "Operador", "Estado Pago", "Fecha de Servicio", "Tipo Servicio", 
  "Destino", "Costo", "Monto", "Fecha de Pago", 
  "Estado Factura", "OC / HES", "Cotización", "Nº Factura", "Link Archivo"
];

const USER_HEADERS = ["Nombre", "Clave", "Rol", "Estado", "Email"];

// NUEVO: Encabezados para la pestaña de Potenciales
const POTENTIAL_HEADERS = ["Nombre", "Teléfono", "Email", "Sitio Web"];

// NUEVO: EncabezADOS para la pestaña de Operadores
const OPERATOR_HEADERS = ["Nombre / Empresa", "RUT", "Patente", "Chofer", "Teléfono", "Email", "Foto"];

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function initSheet(sheetName, headers) {
  const ss = getSS();
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

function deleteRowById(sheet, headers, idField, targetId) {
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

function doGet(e) {
  try {
    const servicesSheet = initSheet("Servicios", SCRIPT_DB_HEADERS);
    const clientsSheet = initSheet("Clientes", ["Nombre", "Teléfono", "Email"]);
    const usersSheet = initSheet("Colaboradores", USER_HEADERS);
    
    // NUEVO: Inicializar hoja de Potenciales
    const potentialSheet = initSheet("Potenciales", POTENTIAL_HEADERS);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      servicios: getSheetData(servicesSheet, SCRIPT_DB_HEADERS),
      clientes: getSheetData(clientsSheet, ["Nombre", "Teléfono", "Email"]),
      colaboradores: getSheetData(usersSheet, USER_HEADERS),
      potenciales: getSheetData(potentialSheet, POTENTIAL_HEADERS),
      base_operadores: getSheetData(initSheet("Base_Operadores", OPERATOR_HEADERS), OPERATOR_HEADERS)
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "login") {
      const sheet = initSheet("Colaboradores", USER_HEADERS);
      const users = getSheetData(sheet, USER_HEADERS);
      const user = users.find(u => 
        u.Nombre.toString().toLowerCase() === payload.nombre.toString().toLowerCase() && 
        u.Clave.toString() === payload.pass.toString()
      );
      
      if (user) {
        if (user.Estado !== "Activo") throw new Error("Usuario inactivo");
        return ContentService.createTextOutput(JSON.stringify({ status: "success", user: user }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Nombre o Clave incorrectos");
      }
    }

    if (action === "upsertService") {
      const sheet = initSheet("Servicios", SCRIPT_DB_HEADERS);
      upsertRow(sheet, SCRIPT_DB_HEADERS, payload.data, "ID");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    
    else if (action === "upsertClient") {
      const sheet = initSheet("Clientes", ["Nombre", "Teléfono", "Email"]);
      upsertRow(sheet, ["Nombre", "Teléfono", "Email"], payload.data, "Nombre");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 

    // NUEVO: Acción para guardar Clientes Potenciales (clave: Nombre)
    else if (action === "upsertPotential") {
      const sheet = initSheet("Potenciales", POTENTIAL_HEADERS);
      upsertRow(sheet, POTENTIAL_HEADERS, payload.data, "Nombre");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 

    // NUEVO: Acción para guardar Perfil de Operador (clave: Nombre / Empresa)
    else if (action === "upsertOperadorPerfil") {
      const sheet = initSheet("Base_Operadores", OPERATOR_HEADERS);
      upsertRow(sheet, OPERATOR_HEADERS, payload.data, "Nombre / Empresa");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 

    // Eliminar prospecto por Nombre al convertir a cliente real
    else if (action === "deletePotential") {
      const sheet = initSheet("Potenciales", POTENTIAL_HEADERS);
      deleteRowById(sheet, POTENTIAL_HEADERS, "Nombre", payload.nombre);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "deleteClient") {
      const sheet = initSheet("Clientes", ["Nombre", "Teléfono", "Email"]);
      deleteRowById(sheet, ["Nombre", "Teléfono", "Email"], "Nombre", payload.nombre);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    else if (action === "upsertUser") {
      if (payload.requesterRole !== "SuperAdmin") throw new Error("Sin permisos");
      const sheet = initSheet("Colaboradores", USER_HEADERS);
      upsertRow(sheet, USER_HEADERS, payload.data, "Nombre");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "deleteService") {
      const sheet = initSheet("Servicios", SCRIPT_DB_HEADERS);
      deleteRowById(sheet, SCRIPT_DB_HEADERS, "ID", payload.id);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "deleteOperador") {
      const sheet = initSheet("Base_Operadores", OPERATOR_HEADERS);
      deleteRowById(sheet, OPERATOR_HEADERS, "Nombre / Empresa", payload.nombre);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "uploadFile") {
      const targetFolderId = payload.folderType === 'perfil' ? FOLDER_FOTOS_PERFIL : FOLDER_ID;
      const folder = DriveApp.getFolderById(targetFolderId);
      
      const base64Data = payload.base64.split(',')[1] || payload.base64;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), payload.mimeType || "image/jpeg", payload.fileName);
      
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        url: file.getUrl(),
        id: file.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}
