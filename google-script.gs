// ==========================================
// CONFIGURACIÃ“N LOGI PRO - ID ACTUALIZADO
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
  "Patente Asignada", "Chofer Asignado", "\u00daltimo GPS", "\u00daltima Actualizaci\u00f3n", "Origen", "Link Gu\u00eda de Despacho", "DescripciÃ³n Carga",
  "ID Maestro", "Etapa", "Estado Cobro"
];

const USER_HEADERS = ["Nombre", "Clave", "Rol", "Estado", "Email", "Cliente Asociado", "Operador Asociado"];
const POTENTIAL_HEADERS = ["Nombre", "Tel\u00e9fono", "Email", "Sitio Web"];
const OPERATOR_HEADERS = ["Nombre / Empresa", "RUT", "Tel\u00e9fono", "Email", "Foto"];
const CLIENT_HEADERS = ["Nombre", "Tel\u00e9fono", "Email", "RUT Cliente", "Giro", "Direcci\u00f3n", "Comuna", "Ciudad"];
const CHOFER_HEADERS = ["ID_Chofer", "ID_Operador", "Nombre", "RUT", "Foto de Perfil", "TelÃ©fono", "Correo", "Licencia", "Vencimiento Licencia", "Estado Licencia", "Tipo Licencia"];
const CAMION_HEADERS = ["ID_Camion", "ID_Operador", "Patente", "Modelo"];

/**
 * Crea un menÃº en la hoja de cÃ¡lculo al abrirse.
 * Se aÃ±ade try-catch para evitar errores en ejecuciones de Web App.
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    if(ui) {
      ui.createMenu('ðŸš€ Logi Pro')
        .addItem('Actualizar Encabezados', 'setupHeaders')
        .addSeparator()
        .addItem('Sincronizar Todo', 'setupHeaders')
        .addToUi();
    }
  } catch (e) {
    console.warn("Contexto sin UI (Web App): Saltando creaciÃ³n de menÃº.");
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
      const maxCols = sheet.getMaxColumns();
      if (maxCols < item.head.length) {
        sheet.insertColumnsAfter(maxCols, item.head.length - maxCols);
      }
      sheet.getRange(1, 1, 1, item.head.length).setValues([item.head]);
      sheet.getRange(1, 1, 1, item.head.length).setFontWeight("bold").setBackground("#f3f4f6");
    } else {
      initSheet(ss, item.name, item.head);
    }
  });

  try {
    const ui = SpreadsheetApp.getUi();
    if (ui) ui.alert("âœ… Proceso completado: Encabezados actualizados.");
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
    message: "MÃ©todo GET no permitido. Acceso denegado." 
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let ss = null;
  try {
    ss = getSS();
  } catch (sheetInitError) {
    console.warn("Error de conexiÃ³n a Google Sheets: " + sheetInitError.toString());
  }

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
    
    // Optimizacion: Solo carga los servicios del chofer actual, omitiendo otras hojas
    if (action === "syncDriverServices") {
      const s_sheet = ss.getSheetByName("Servicios") || initSheet(ss, "Servicios", SCRIPT_DB_HEADERS);
      let serviciosData = getSheetData(s_sheet, SCRIPT_DB_HEADERS);
      
      if (payload.chofer) {
        const target = payload.chofer.toString().trim().toLowerCase();
        serviciosData = serviciosData.filter(s => {
          const op = (s["Chofer Asignado"] || "").toString().trim().toLowerCase();
          return op === target && s.ID && s.Cliente;
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          servicios: serviciosData
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
        
        // Lectura OCR mediante IA (Gemini) desactivada por el momento.
        // Se prioriza el guardado de la imagen pre-procesada visualmente.
        let nroGuia = "S_N";

        const baseName = `Guia_${payload.cliente}_${payload.fecha}_${payload.serviceId}`;
        
        // 1. Guardar Escaneada (Procesada: Recorte + Color MÃ¡gico)
        const blobScanned = Utilities.newBlob(Utilities.base64Decode(payload.scannedData), payload.mimeType, `${baseName}_ESCANEADA.jpg`);
        const fileScanned = folder.createFile(blobScanned);
        
        // 2. Guardar Original (Sin procesar, por si acaso)
        const blobOrig = Utilities.newBlob(Utilities.base64Decode(payload.originalData), payload.mimeType, `${baseName}_ORIGINAL.jpg`);
        const fileOrig = folder.createFile(blobOrig);

        const fileUrl = fileScanned.getUrl(); // Priorizamos el link del escaneo para la base de datos

        // Guardar el link en la base de datos de servicios (EN LA NUEVA COLUMNA)
        upsertRow(initSheet(ss, "Servicios", SCRIPT_DB_HEADERS), SCRIPT_DB_HEADERS, { "ID": payload.serviceId, "Link GuÃ­a de Despacho": fileUrl }, "ID");
        
        return ContentService.createTextOutput(JSON.stringify({ status: "success", url: fileUrl })).setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === "submitLandingQuote") {
      try {
        const data = payload.data;
        const nombre = data.nombre;
        const empresa = data.empresa;
        const email = data.email;
        const telefono = data.telefono;
        const origen = data.origen;
        const destino = data.destino;
        const descripcion = data.descripcion;
        const ticketId = data.ticketId;

        // 1. Guardar en la hoja de Potenciales (opcional para pruebas)
        try {
          const p_sheet = ss.getSheetByName("Potenciales") || initSheet(ss, "Potenciales", POTENTIAL_HEADERS);
          const rowData = {
            "Nombre": `${nombre} (${empresa})`,
            "TelÃ©fono": telefono,
            "Email": email,
            "Sitio Web": `Origen: ${origen} | Destino: ${destino} | Ticket: ${ticketId} | Detalle: ${descripcion}`
          };
          upsertRow(p_sheet, POTENTIAL_HEADERS, rowData, "Nombre");
        } catch (sheetError) {
          console.warn("No se pudo guardar en Google Sheets, continuando con el envÃ­o de correo: " + sheetError.toString());
        }

        // 2. Enviar correo al administrador de la empresa (Logitrade.cl)
        const userEmail = "Santiago.bohmee@utem.cl";
        const subject = `[Logitrade.cl] Nueva Solicitud de Presupuesto - ${ticketId}`;
        
        const logoBlob = Utilities.newBlob(Utilities.base64Decode(LOGO_BASE64), "image/png", "logo.png");
        
        const htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; color: #1e293b;">
          <div style="background-color: #ffffff; padding: 25px; border-radius: 6px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; font-weight: 700;">Nueva Solicitud de Presupuesto</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #475569; margin-bottom: 20px;">
              Se ha recibido una nueva solicitud de presupuesto desde el sitio web <a href="https://www.logitrade.cl" style="color: #3b82f6; text-decoration: none; font-weight: bold;">www.logitrade.cl</a>.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b; width: 140px;">CÃ³digo Ticket:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${ticketId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Nombre:</td>
                <td style="padding: 8px 0; color: #0f172a;">${nombre}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Empresa:</td>
                <td style="padding: 8px 0; color: #0f172a;">${empresa}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Correo ElectrÃ³nico:</td>
                <td style="padding: 8px 0; color: #3b82f6;"><a href="mailto:${email}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">${email}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">TelÃ©fono:</td>
                <td style="padding: 8px 0; color: #0f172a;">${telefono}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Origen Carga:</td>
                <td style="padding: 8px 0; color: #0f172a;">${origen}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Destino Carga:</td>
                <td style="padding: 8px 0; color: #0f172a;">${destino}</td>
              </tr>
            </table>
            
            <div style="margin-top: 20px; padding: 12px 15px; background-color: #f1f5f9; border-radius: 6px; border-left: 4px solid #cbd5e1;">
              <h4 style="margin: 0 0 6px 0; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">DescripciÃ³n del Requerimiento</h4>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155; white-space: pre-wrap;">${descripcion}</p>
            </div>
          </div>
          
          <!-- Pie de pÃ¡gina discreto y prolijo -->
          <div style="margin-top: 25px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <img src="cid:logo" alt="Logi & Trade" style="max-height: 35px; margin-bottom: 8px;" />
            <p style="margin: 0; font-size: 11px; color: #475569; font-weight: bold;">Logi Trade Chile</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">RUT: 77.985.501-5</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">DirecciÃ³n comercial: Manquehue Sur 520, oficina 205, Las Condes, Santiago, Chile.</p>
          </div>
        </div>
        `;

        MailApp.sendEmail({
          to: userEmail,
          subject: subject,
          htmlBody: htmlBody,
          replyTo: email,
          inlineImages: {
            logo: logoBlob
          }
        });

        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
      } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const token = payload.token;
    if (!token) throw new Error("Acceso denegado: Se requiere un Token de sesiÃ³n.");
    
    const cachedSessionStr = CacheService.getScriptCache().get(token);
    if (!cachedSessionStr) throw new Error("SesiÃ³n expirada o invÃ¡lida. Inicia sesiÃ³n nuevamente.");
    
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
            throw new Error("La contraseÃ±a actual es incorrecta.");
          }
          sheet.getRange(i + 2, cIdx + 1).setValue(payload.newPass);
          found = true;
          break;
        }
      }
      
      if (!found) throw new Error("Usuario no encontrado.");
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "ContraseÃ±a actualizada exitosamente." })).setMimeType(ContentService.MimeType.JSON);
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
        throw new Error("El RUT del chofer no es vÃ¡lido.");
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

/* === VALIDACIÃ“N RUT CHILENO (MÃ³dulo 11) === */
function validarRUT(rut) {
  if (!rut || rut.toString().trim() === "") return true; // VacÃ­o es vÃ¡lido (campo opcional)
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

function testSendEmailScope() {
  MailApp.sendEmail("Santiago.bohmee@utem.cl", "Prueba de Permisos", "Si lees esto, los permisos estÃ¡n OK.");
}




const LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAYAAAB/HSuDAAAQAElEQVR4AezdBYAkxdnG8ffdvTucO1wSyOGQAB8SHBJcgrsT3OU43CF4cCcQJGhI0AR3C+5OCG6HwwHnt/PV0729O7s7Mzuu/73p6e7q6uqqX8/uTb1tbSl+EEAAAQQQQAABBBBAAAEEEECg2QVSbcYPAggggAACCCCAAAIIIIAAAgg0uYAZAYCm38U0EAEEEEAAAQQQQAABBBBAoOUFAgABgIDACwEEEEAAAQQQQAABBBBAAIFmFlDbCABIgQEBBBBAAAEEEEAAAQQQQACB5hWIWkYAIGLgDQEEEEAAAQQQQAABBBBAAIFmFYjbRQAgduAdAQQQQAABBBBAAAEEEEAAgeYU6GwVAYBOCEYIIIAAAggggAACCCCAAAIINKNA0iYCAIkEYwQQQAABBBBAAAEEEEAAAQSaT6CrRQQAuiiYQAABBBBAAAEEEEAAAQQQQKDZBLrbQwCg24IpBBBAAAEEEEAAAQQQQAABBJpLIK01BADSMJhEAAEEEEAAAQQQQAABBBBAoJkE0ttCACBdg2kEEEAAAQQQQAABBBBAAAEEmkegR0sIAPTgYAYBBBBAAAEEEEAAAQQQQACBZhHo2Q4CAD09mEMAAQQQQAABBBBAAAEEEECgOQR6tYIAQC8QZhFAAAEEEEAAAQQQQAABBBBoBoHebSAA0FuEeQQQQAABBBBAAAEEEEAAAQQaX6BPCwgA9CEhAQEEEEAAAQQQQAABBBBAAIFGF+hbfwIAfU1IQQABBBBAAAEEEEAAAQQQQKCxBTLUngBABhSSEEAAAQQQQAABBBBAAAEEEGhkgUx1JwCQSYU0BBBAAAEEEEAAAQQQQAABBBpXIGPNCQBkZCERAQQQQAABBBBAAAEEEEAAgUYVyFxvAgCZXUhFAAEEEEAAAQQQQAABBBBAoDEFstSaAEAWGJIRQAABBBBAAAEEEEAAAQQQaESBbHUmAJBNhnQEEEAAAQQQQAABBBBAAAEEGk8ga40JAGSlYQECCCCAAAIIIIAAAggggAACjSaQvb4EALLbsAQBBBBAAAEEEEAAAQQQQACBxhLIUVsCADlwWIQAAggggAACCCCAAAIIIIBAIwnkqisBgFw6LEMAAQQQQAABBBBAAAEEEECgcQRy1pQAQE4eFiKAAAIIIIAAAggggAACCCDQKAK560kAILcPSxFAAAEEEEAAAQQQQAABBBBoDIF+akkAoB8gFiOAAAIIIIAAAggggAACCCDQCAL91ZEAQH9CLEcAAQQQQAABBBBAAAEEEECg/gX6rSEBgH6JyIAAAggggAACCCCAAAIIIIBAvQv0Xz8CAP0bkQMBBBBAAAEEEEAAAQQQQACB+hbIo3YEAPJAIgsCCCCAAAIIIIAAAggggAAC9SyQT90IAOSjRB4EEEAAAQQQQAABBBBAAAEE6lcgr5oRAMiLiUwIIIAAAggggAACCCCAAAII1KtAfvUiAJCfE7kQQAABBBBAAAEEEEAAAQQQqE+BPGtFACBPKLIhgAACCCCAAAIIIIAAAgggUI8C+daJAEC+UuRDAAEEEEAAAQQQQAABBBBAoP4E8q4RAYC8qciIAAIIIIAAAggggAACCCCAQL0J5F8fAgD5W5ETAQQQQAABBBBAAAEEEEAAgfoSKKA2BAAKwCIrAggggAACCCCAAAIIIIAAAvUkUEhdCAAUokVeBBBAAAEEEEAAAQQQQAABBOpHoKCaEAAoiIvMCCCAAAIIIIAAAggggAACCNSLQGH1IABQmBe5EUAAAQQQQAABBBBAAAEEEKgPgQJrQQCgQDCyI4AAAggggAACCCCAAAIIIFAPAoXWgQBAoWLkRwABBBBAAAEEEEAAAQQQQKD2AgXXgABAwWSsgAACCCCAAAIIIIAAAggggECtBQrfPgGAws1YAwEEEEAAAQQQQAABBBBAAIHaChSxdQIARaCxCgIIIIAAAggggAACCCCAAAK1FChm2wQAilFjHQQQQAABBBBAAAEEEEAAAQRqJ1DUlgkAFMXGSggggAACCCCAAAIIIIAAAgjUSqC47RIAKM6NtRBAAAEEEEAAAQQQQAABBBCojUCRWyUAUCQcqyGAAAIIIIAAAggggAACCCBQC4Fit0kAoFg51kMAAQQQQAABBBBAAAEEEECg+gJFb5EAQNF0rIgAAggggAACCCCAAAIIIIBAtQWK3x4BgOLtWBMBBBBAAAEEEEAAAQQQQACB6gqUsDUCACXgsSoCCCCAAAIIIIAAAggggAAC1RQoZVsEAErRY10EEEAAAQQQQAABBBBAAAEEqidQ0pYIAJTEx8oIIIAAAggggAACCCCAAAIIVEugtO0QACjNj7URQAABBBBAAAEEEEAAAQQQqI5AiVshAFAiIKsjgAACCCCAAAIIIIAAAgggUA2BUrdBAKBUQdZHAAEEEEAAAQQQQAABBBBAoPICJW+BAEDJhBSAAAIIIIAAAggggAACCCCAQKUFSi+fAEDphpSAAAIIIIAAAggggAACCCCAQGUFylA6AYAyIFIEAggggAACCCCAAAIIIIAAApUUKEfZBADKoUgZCCCAAAIIIIAAAggggAACCFROoCwlEwAoCyOFIIAAAggggAACCCCAAAIIIFApgfKUSwCgPI6UggACCCCAAAIIIIAAAggggEBlBMpUKgGAMkFSDAIIIIAAAggggAACCCCAAAKVEChXmQQAyiVJOQgggAACCCCAAAIIIIAAAgiUX6BsJRIAKBslBSGAAAIIIIAAAggggAACCCBQboHylUcAoHyWlIQAAggggAACCCCAAAIIIIBAeQXKWBoBgDJiUhQCCCCAAAIIIIAAAggggAAC5RQoZ1kEAMqpSVkIIIAAAggggAACCCCAAAIIlE+grCURACgrJ4UhgAACCCCAAAIIIIAAAgggUC6B8pZDAKC8npSGAAIIIIAAAggggAACCCCAQHkEylwKAYAyg1IcAggggAACCCCAAAIIIIAAAuUQKHcZBADKLUp5CCCAAAIIIIAAAggggAACCJQuUPYSCACUnZQCEUAAAQQQQAABBBBAAAEEEChVoPzrEwAovyklIoAAAggggAACCCCAAAIIIFCaQAXWJgBQAVSKRAABBBBAAAEEEEAAAQQQQKAUgUqsSwCgEqqUiQACCCCAAAIIIIAAAggggEDxAhVZkwBARVgpFAEEEEAAAQQQQAABBBBAAIFiBSqzHgGAyrhSKgIIIIAAAggggAACCCCAAALFCVRoLQIAFYKlWAQQQAABBBBAAAEEEEAAAQSKEajUOgQAKiVLuQgggAACCCCAAAIIIIAAAggULlCxNQgAVIyWghFAAAEEEEAAAQQQQAABBBAoVKBy+QkAVM6WkhFAAAEEEEAAAQQQQAABBBAoTKCCuQkAVBCXohFAAAEEEEAAAQQQQAABBBAoRKCSeQkAVFKXshFAAAEEEEAAAQQQQAABBBDIX6CiOQkAVJSXwhFAAAEEEEAAAQQQQAABBBDIV6Cy+QgAVNaX0hFAAAEEEEAAAQQQQAABBBDIT6DCuQgAVBiY4hFAAAEEEEAAAQQQQAABBBDIR6DSeQgAVFqY8hFAAAEEEEAAAQQQQAABBBDoX6DiOQgAVJyYDSCAAAIIIIAAAggggAACCCDQn0DllxMAqLwxW0AAAQQQQAABBBBAAAEEEEAgt0AVlhIAqAIym0AAAQQQQAABBBBAAAEEEEAgl0A1lhEAqIYy20AAAQQQQAABBBBAAAEEEEAgu0BVlhAAqAozG0EAAQQQQAABBBBAAAEEEEAgm0B10gkAVMeZrSCAAAIIIIAAAggggAACCCCQWaBKqQQAqgTNZhBAAAEEEEAAAQQQQAABBBDIJFCtNAIA1ZJmOwgggAACCCCAAAIIIIAAAgj0FahaCgGAqlGzIQQQQAABBBBAAAEEEEAAAQR6C1RvngBA9azZEgIIIIAAAggggAACCCCAAAI9Bao4RwCgithsCgEEEEAAAQQQQAABBBBAAIF0gWpOEwCopjbbQgABBBBAAAEEEEAAAQQQQKBboKpTBACqys3GEEAAAQQQQAABBBBAAAEEEEgEqjsmAFBdb7aGAAIIIIAAAggggAACCCCAQCxQ5XcCAFUGZ3MIIIAAAggggAACCCCAAAIISKDaAwGAaouzPQQQQAABBBBAAAEEEEAAAQTMqm5AAKDq5GwQAQQQQAABBBBAAAEEEEAAgeoLEACovjlbRAABBBBAAAEEEEAAAQQQaHWBGrSfAEAN0NkkAggggAACCCCAAAIIIIBAawvUovUEAGqhzjYRQAABBBBAAAEEEEAAAQRaWaAmbScAUBN2NooAAggggAACCCCAAAIIINC6ArVpOQGA2rizVQQQQAABBBBAAAEEEEAAgVYVqFG7CQDUCJ7NIoAAAggggAACCCCAAAIItKZArVpNAKBW8mwXAQQQQAABBBBAAAEEEECgFQVq1mYCADWjZ8MIIIAAAggggAACCCCAAAKtJ1C7FhMAqJ09W0YAAQQQQAABBBBAAAEEEGg1gRq2lwBADfHZNAIIIIAAAggggAACCCCAQGsJ1LK1BABqqc+2EUAAAQQQQAABBBBAAAEEWkmgpm0lAFBTfjaOAAIIIIAAAggggAACCCDQOgK1bSkBgNr6s3UEEEAAAQQQQAABBBBAAIFWEahxOwkA1HgHsHkEEEAAAQQQQAABBBBAAIHWEKh1KwkA1HoPsH0EEEAAAQQQQAABBBBAAIFWEKh5GwkA1HwXUAEEEEAAAQQQQAABBBBAAIHmF6h9CwkA1H4fUAMEEEAAAQQQQAABBBBAAIFmF6iD9hEAqIOdQBUQQAABBBBAAAEEEEAAAQSaW6AeWkcAoB72AnVAAAEEEEAAAQQQQAABBBBoZoG6aBsBgLrYDVQCAQQQQAABBBBAAAEEEECgeQXqo2UEAOpjP1ALBBBAAAEEEEAAAQQQQACBZhWok3YRAKiTHUE1EEAAAQQQQAABBBBAAAEEmlOgXlpFAKBe9gT1QAABBBBAAAEEEEAAAQQQaEaBumkTAYC62RVUBAEEEEAAAQQQQAABBBBAoPkE6qdFBADqZ19QEwQQQAABBBBAAAEEEEAAgWYTqKP2EACoo51BVRBAAAEEEEAAAQQQQAABBJpLoJ5aQwCgnvYGdUEAAQQQQAABBBBAAAEEEGgmgbpqCwGAutodVAYBBBBAAAEEEEAAAQQQQKB5BOqrJQQA6mt/UBsEEEAAAQQQQAABBBBAAIFmEaizdhAAqLMdQnUQQAABBBBAAAEEEEAAAQSaQ6DeWkEAoN72CPVBAAEEEEAAAQQQQAABBBBoBoG6awMBgLrbJVQIAQQQQAABBBBAAAEEEECg8QXqrwUEAOpvn1AjBBBAAAEEEEAAAQQQQACBRheow/oTAKjDnUKVEEAAAQQQQAABBBBAAAEEGlugHmtPAKAe9wp1QgABBBBAAAEEEEAAAQQQaGSBuqw7AYC63C1UCgEEEEAA+fb0RgAAEABJREFUAQQQQAABBBBAoHEF6rPmBADqc79QKwQQQAABBBBAAAEEEEAAgUYVqNN6EwCo0x1DtRBAAAEEEEAAAQQQQAABBBpToF5rTQCgXvcM9UIAAQQQQAABBBBAAAEEEGhEgbqtMwGAut01VAwBBBBAAAEEEEAAAQQQQKDxBOq3xgQA6nffUDMEEEAAAQQQQAABBBBAAIFGE6jj+hIAqOOdQ9UQQAABBBBAAAEEEEAAAQQaS6Cea0sAoJ73DnVDAAEEEEAAAQQQQAABBBBoJIG6risBgLrePVQOAQQQQAABBBBAAAEEEECgcQTqu6YEAOp7/1A7BBBAAAEEEEAAAQQQQACBRhGo83oSAKjzHUT1EEAAAQQQQAABBBBAAAEEGkOg3mtJAKDe9xD1QwABBBBAAAEEEEAAAQQQaASBuq8jAYC630VUEAEEEEAAAQQQQAABBBBAoP4F6r+GBADqfx9RQwQQQAABBBBAAAEEEEAAgXoXaID6EQBogJ1EFRFAAAEEEEAAAQQQQAABBOpboBFqRwCgEfYSdUQAAQQQQAABBBBAAAEEEKhngYaoGwGAhthNVBIBBBBAAAEEEEAAAQQQQKB+BRqjZgQAGmM/UUsEEEAAAQQQQAABBBBAAIF6FWiQehEAaJAdRTURQAABBBBAAAEEEEAAAQTqU6BRakUAoFH2FPVEAAEEEEAAAQQQQAABBBCoR4GGqRMBgIbZVVQUAQQQQAABBBBAAAEEEECg/gQap0YEABpnX1FTBBBAAAEEEEAAAQQQQACBehNooPoQAGignUVVEUAAAQQQQAABBBBAAAEE6kugkWpDAKCR9hZ1RQABBBBAAAEEEEAAAQQQqCeBhqoLAYCG2l1UFgEEEEAAAQQQQAABBBBAoH4EGqsmBAAaa39RWwQQQAABBBBAAAEEEEAAgXoRaLB6EABosB1GdRFAAAEEEEAAAQQQQAABBOpDoNFqQQCg0fYY9UUAAQQQQAABBBBAAAEEEKgHgYarAwGAhttlVBgBBBBAAAEEEEAAAQQQQKD2Ao1XAwIAjbfPqDECCCCAAAIIIIAAAggggECtBRpw+wQAGnCnUWUEEEAAAQQQQAABBBBAAIHaCjTi1gkANOJeo84IIIAAAggggAACCCCAAAK1FGjIbRMAaMjdRqURQAABBBBAAAEEEEAAAQRqJ9CYWyYA0Jj7jVojgAACCCCAAAIIIIAAAgjUSqBBt0sAoEF3HNVGAAEEEEAAAQQQQAABBBCojUCjbpUAQKPuOeqNAAIIIIAAAggggAACCCBQC4GG3SYBgIbddVQcAQQQQAABBBBAAAEEEECg+gKNu0UCAI2776g5AggggAACCCCAAAIIIIBAtQUaeHsEABp451F1BBBAAAEEEEAAAQQQQACB6go08tYIADTy3qPuCCCAAAIIIIAAAggggAAC1RRo6G0RAGjo3UflEUAAAQQQQAABBBBAAAEEqifQ2FsiANDY+4/aI4AAAggggAACCCCAAAIIVEugwbdDAKDBdyDVRwABBBBAAAEEEEAAAQQQqI5Ao2+FAECj70HqjwACCCCAAAIIIIAAAgggUA2Bht8GAYCG34U0AAEEEEAAAQQQQAABBBBAoPICjb8FAgCNvw9pAQIIIIAAAggggAACCCCAQKUFmqB8AgBNsBNpAgIIIIAAAggggAACCCCAQGUFmqF0AgDNsBdpAwIIIIAAAggggAACCCCAQCUFmqJsAgBNsRtpBAIIIIAAAggggAACCCCAQOUEmqNkAgDNsR9pBQIIIIAAAggggAACCCCAQKUEmqRcAgBNsiNpBgIIIIAAAggggAACCCCAQGUEmqVUAgDNsidpBwIIIIAAAggggAACCCCAQCUEmqZMAgBNsytpCAIIIIAAAggggAACCCCAQPkFmqdEAgDNsy9pCQIIIIAAAggggAACCCCAQLkFmqg8AgBNtDNpCgIIIIAAAggggAACCCCAQHkFmqk0AgDNtDdpCwIIIIAAAggggAACCCCAQDkFmqosAgBNtTtpDAIIIIAAAggggAACCCCAQPkEmqskAgDNtT9pDQIIIIAAAggggAACCCCAQLkEmqwcAgBNtkNpDgIIIIAAAggggAACCCCAQHkEmq0UAgDNtkdpDwIIIIAAAggggAACCCCAQDkEmq4MAgBNt0tpEAIIIIAAAggggAACCCCAQOkCzVcCAYDm26e0CAEEEEAAAQQQQAABBBBAoFSBJlyfAEAT7lSahAACCCCAAAIIIIAAAgggUJpAM65NAKAZ9yptQgABBBBAAAEEEEAAAQQQKEWgKdclANCUu5VGIYAAAggggAACCCCAAAIIFC/QnGsSAGjO/UqrEEAAAQQQQAABBBBAAAEEihVo0vUIADTpjqVZCCCAAAIIIIAAAggggAACxQk061oEAJp1z9IuBBBAAAEEEEAAAQQQQACBYgSadh0CAE27a2kYAggggAACCCCAAAIIIIBA4QLNuwYBgObdt7QMAQQQQAABBBBAAAEEEECgUIEmzk8AoIl3Lk1DAAEEEEAAAQQQQAABBBAoTKCZcxMAaOa9S9sQQAABBBBAAAEEEEAAAQQKEWjqvAQAmnr30jgEEEAAAQQQQAABBBBAAIH8BZo7JwGA5t6/tA4BBBBAAAEEEEAAAQQQQCBfgSbPRwCgyXcwzUMAAQQQQAABBBBAAAEEEMhPoNlzEQBo9j1M+xBAAAEEEEAAAQQQQAABBPIRaPo8BACafhfTQAQQQAABBBBAAAEEEEAAgf4Fmj8HAYDm38e0EAEEEEAAAQQQQAABBBBAoD+BFlhOAKAFdjJNRAABBBBAAAEEEEAAAQQQyC3QCksJALTCXqaNCCCAAAIIIIAAAggggAACuQRaYhkBgJbYzTQSAQQQQAABBBBAAAEEEEAgu0BrLCEA0Br7mVYigAACCCCAAAIIIIAAAghkE2iRdAIALbKjaSYCCCCAAAIIIIAAAggggEBmgVZJJQDQKnuadiKAAAIIIIAAAggggAACCGQSaJk0AgAts6tpKAIIIIAAAggggAACCCCAQF+B1kkhANA6+5qWIoAAAggggAACCCCAAAII9BZooXkCAC20s2kqAggggAACCCCAAAIIIIBAT4FWmiMA0Ep7m7YigAACCCCAAAIIIIAAAgikC7TUNAGAltrdNBYBBBBAAAEEEEAAAQQQQKBboLWmCAC01v6mtQgggAACCCCAAAIIIIAAAolAi40JALTYDqe5CCCAAAIIIIAAAggggAACsUCrvRMAaLU9TnsRQAABBBBAAAEEEEAAAQQk0HIDAYCW2+U0GAEEEEAAAQQQQAABBBBAwKz1DAgAtN4+p8UIIIAAAggggAACCCCAAAItKEAAoAV3Ok1GAAEEEEAAAQQQQAABBFpdoBXbTwCgFfc6bUYAAQQQQAABBBBAAAEEWlugJVtPAKAldzuNRgABBBBAAAEEEEAAAQRaWaA1204AoDX3O61GAAEEEEAAAQQQQAABBFpXoEVbTgCgRXc8zUYAAQQQQAABBBBAAAEEWlWgVdtNAKBV9zztRgABBBBAAAEEEEAAAQRaU6BlW00AoGV3PQ1HAAEEEEAAAQQQQAABBFpRoHXbTACgdfc9LUcAAQQQQAABBBBAAAEEWk+ghVtMAKCFdz5NRwABBBBAAAEEEEAAAQRaTaCV20sAoJX3Pm1HAAEEEEAAAQQQQAABBFpLoKVbSwCgpXc/jUcAAQQQQAABBBBAAAEEWkmgtdtKAKC19z+tRwABBBBAAAEEEEAAAQRaR6DFW0oAoMU/ADQfAQQQQAABBBBAAAEEEGgVgVZvJwGAVv8E0H4EEEAAAQQQQAABBBBAoDUEWr6VBABa/iMAAAIIIIAAAggggAACCCDQCgK0kQAAnwEEEEAAAQQQQAABBBBAAIHmF6CFRgCADwECCCCAAAIIIIAAAggggEDTC9BAIwDAhwABBBBAAAEEEEAAAQQQQKDpBWhgEOAMgIDACwEEEEAAAQQQQAABBBBAoJkFaJsECABIgQEBBBBAAAEEEEAAAQQQQKB5BWhZJEAAIGLgDQEEEEAAAQQQQAABBBBAoFkFaFcsQAAgduAdAQQQQAABBBBAAAEEEECgOQVoVacAAYBOCEYIIIAAAggggAACCCCAAALNKECbEgECAIkEYwQQQAABBBBAAAEEEEAAgeYToEVdAgQAuiiYQAABBBBAAAEEEEAAAQQQaDYB2tMtQACg24IpBBBAAAEEEEAAAQQQQACB5hKgNWkCBADSMJhEAAEEEEAAAQQQQAABBBBoJgHaki5AACBdg2kEEEAAAQQQQAABBBBAAIHmEaAlPQQIAPTgYAYBBBBAAAEEEEAAAQQQQKBZBGhHTwECAD09mEMAAQQQQAABBBBAAAEEEGgOAVrRS4AAQC8QZhFAAAEEEEAAAQQQQAABBJpBgDb0FiAA0FuEeQQQQAABBBBAAAEEEEAAgcYXoAV9BAgA9CEhAQEEEEAAAQQQQAABBBBAoNEFqH9fAQIAfU1IQQABBBBAAAEEEEAAAQQQaGwBap9BgABABhSSEEAAAQQQQAABBBBAAAEEGlmAumcSIACQSYU0BBBAAAEEEEAAAQQQQACBxhWg5hkFCABkZCERAQQQQAABBBBAAAEEEECgUQWod2YBAgCZXUhFAAEEEEAAAQQQQAABBBBoTAFqnUWAAEAWGJIRQAABBBBAAAEEEEAAAQQaUYA6ZxMgAJBNhnQEEEAAAQQQQAABBBBAAIHGE6DGWQUIAGSlYQECCCCAAAIIIIAAAggggECjCVDf7AIEALLbsAQBBBBAAAEEEEAAAQQQQKCxBKhtDgECADlwWIQAAggggAACCCCAAAIIINBIAtQ1lwABgFw6LEMAAQQQQAABBBBAAAEEEGgcAWqaU4AAQE4eFiKAAAIIIIAAAggggAACCDSKAPXMLUAAILcPSxFAAAEEEEAAAQQQQAABBBpDgFr2I0AAoB8gFiOAAAIIIIAAAggggAACCDSCAHXsT4AAQH9CLEcAAQQQQAABBBBAAAEEEKh/AWrYrwABgH6JyIAAAggggAACCCCAAAIIIFDvAtSvfwECAP0bkQMBBBBAAAEEEEAAAQQQQKC+BahdHgIEAPJAIgsCCCCAAAIIIIAAAggggEA9C1C3fAQIAOSjRB4EEEAAAQQQQAABBBBAAIH6FaBmeQkQAMiLiUwIIIAAAggggAACCCCAAAL1KkC98hMgAJCfE7kQQAABBBBAAAEEEEAAAQTqU4Ba5SlAACBPKLIhgAACCCCAAAIIIIAAAgjUowB1yleAAEC+UuRDAAEEEEAAAQQQQAABBBCoPwFqlLcAAYC8qciIAAIIIIAAAggggAACCCBQbwLUJ38BAgD5W5ETAQQQQAABBBBAAAEEEECgvgSoTQECBAAKwCIrAggggAACCCCAAAIIIIBAPQlQl0IECAAUokVeBBBAAAEEEEAAAQQQQC8Rq8QAABAASURBVACB+hGgJgUJEAAoiIvMCCCAAAIIIIAAAggggAAC9SJAPQoTIABQmBe5EUAAAQQQQAABBBBAAAEE6kOAWhQoQACgQDCyI4AAAggggAACCCCAAAII1IMAdShUgABAoWLkRwABBBBAAAEEEEAAAQQQqL0ANShYgABAwWSsgAACCCCAAAIIIIAAAgggUGsBtl+4AAGAws1YAwEEEEAAAQQQQAABBBBAoLYCbL0IAQIARaCxCgIIIIAAAggggAACCCCAQC0F2HYxAgQAilFjHQQQQAABBBBAAAEEEEAAgdoJsOWiBAgAFMXGSggggAACCCCAAAIIIIAAArUSYLvFCRAAKM6NtRBAAAEEEEAAAQQQQAABBGojwFaLFCAAUCQcqyGAAAIIIIAAAggggAACCNRCgG0WK0AAoFg51kMAAQQQQAABBBBAAAEEEKi+AFssWoAAQNF0rIgAAggggAACCCCAAAIIIFBtAbZXvAABgOLtWBMBBBBAAAEEEEAAAQQQQKC6AmytBAECACXgsSoCCCCAAAIIIIAAAggggEA1BdhWKQIEAErRY10EEEAAAQQQQAABBBBAAIHqCbClkgQIAJTEx8oIIIAAAggggAACCCCAAALVEmA7pQkQACjNj7URQAABBBBAAAEEEEAAAQSqI8BWShQgAFAiIKsjgAACCCCAAAIIIIAAAghUQ4BtlCpAAKBUQdZHAAEEEEAAAQQQQAABBBCovABbKFmAAEDJhBSAAAIIIIAAAggggAACCCBQaQHKL12AAEDphpSAAAIIIIAAAggggAACCCBQWQFKL4MAAYAyIFIEAggggAACCCCAAAIIIIBAJQUouxwCBADKoUgZCCCAAAIIIIAAAggggAAClROg5LIIEAAoCyOFIIAAAggggAACCCCAAAIIVEqAcssjQACgPI6UggACCCCAAAIIIIAAAgggUBkBSi2TAAGAMkFSDAIIIIAAAggggAACCCCAQCUEKLNcAgQAyiVJOQgggAACCCCAAAIIIIAAAuUXoMSyCRAAKBslBSGAAAIIIIAAAggggAACCJRbgPLKJ0AAoHyWlIQAAggggAACCCCAAAIIIFBeAUorowABgDJiUhQCCCCAAAIIIIAAAggggEA5BSirnAIEAMqpSVkIIIAAAggggAACCCCAAALlE6CksgoQACgrJ4UhgAACCCCAAAIIIIAAAgiUS4ByyitAAKC8npSGAAIIIIAAAggggAACCCBQHgFKKbMAAYAyg1IcAggggAACCCCAAAIIIIBAOQQoo9wCBADKLUp5CCCAAAIIIIAAAggggAACpQtQQtkFCACUnZQCEUAAAQQQQAABBBBAAAEEShVg/fILEAAovyklIoAAAggggAACCCCAAAIIlCbA2hUQIABQAVSKRAABBBBAAAEEEEAAAQQQKEWAdSshQACgEqqUiQACCCCAAAIIIIAAAgggULwAa1ZEgABARVgpFAEEEEAAAQQQQAABBBBAoFgB1quMAAGAyrhSKgIIIIAAAggggAACCCCAQHECrFUhAQIAFYKlWAQQQAABBBBAAAEEEEAAgWIEWKdSAgQAKiVLuQgggAACCCCAAAIIIIAAAoULsEbFBAgAVIyWghFAAAEEEEAAAQQQQAABBAoVIH/lBAgAVM6WkhFAAAEEEEAAAQQQQAABBAoTIHcFBQgAVBCXohFAAAEEEEAAAQQQQAABBAoRIG8lBQgAVFKXshFAAAEEEEAAAQQQQAABBPIXIGdFBQgAVJSXwhFAAAEEEEAAAQQQQAABBPIVIF9lBQgAVNaX0hFAAAEEEEAAAQQQQAABBPITIFeFBQgAVBiY4hFAAAEEEEAAAQQQQAABBPIRIE+lBQgAVFqY8hFAAAEEEEAAAQQQQAABBPoXIEfFBQgAVJyYDSCAAAIIIIAAAggggAACCPQnwPLKCxAAqLwxW0AAAQQQQAABBBBAAAEEEMgtwNIqCBAAqAIym0AAAQQQQAABBBBAAAEEEMglwLJqCBAAqIYy20AAAQQQQAABBBBAAAEEEMguwJKqCBAAqAozG0EAAQQQQAABBBBAAAEEEMgmQHp1BAgAVMeZrSCAAAIIIIAAAggggAACCGQWILVKAgQAqgTNZhBAAAEEEEAAAQQQQAABBDIJkFYtAQIA1ZJmOwgggAACCCCAAAIIIIAAAn0FSKmaAAGAqlGzIQQQQAABBBBAAAEEEEAAgd4CzFdPgABA9azZEgIIIIAAAggggAACCCCAQE8B5qooQACgithsCgEEEEAAAQQQQAABBBBAIF2A6WoKEACopjbbQgABBBBAAAEEEEAAAQQQ6BZgqqoCBACqys3GEEAAAQQQQAABBBBAAAEEEgHG1RUgAFBdb7aGAAIIIIAAAggggAACCCAQC/BeZQECAFUGZ3MIIIAAAggggAACCCCAAAISYKi2AAGAaouzPQQQQAABBBBAAAEEEEAAATMMqi5AAKDq5GwQAQQQQAABBBBAAAEEEEAAgeoLEACovjlbRAABBBBAAAEEEEAAAQRaXYD210CAAEAN0NkkAggggAACCCCAAAIIINDaArS+FgIEAGqhzjYRQAABBBBAAAEEEEAAgVYWoO01ESAAUBN2NooAAggggAACCCCAAAIItK4ALa+NAAGA2rizVQQQQAABBBBAAAEEEECgVQVod40ECADUCJ7NIoAAAggggAACCCCAAAKtKUCrayVAAKBW8mwXAQQQQAABBBBAAAEEEGhFAdpcMwECADWjZ8MIIIAAAggggAACCCCAQOsJ0OLaCRAAqJ09W0YAAQQQQAABBBBAAAEEWk2A9tZQgABADfHZNAIIIIAAAggggAACCCDQWgK0tpYCBABqqc+2EUAAAQQQQAABBBBAAIFWEqCtNRUgAFBTfjaOAAIIIIAAAggggAACCLSOAC2trQABgNr6s3UEEEAAAQQQQAABBBBAoFUEaGeNBQgA1HgHsHkEEEAAAQQQQAABBBBAoDUEaGWtBQgA1HoPsH0EEEAAAQQQQAABBBBAoBUEaGPNBQgA1HwXUAEEEEAAAQQQQAABBBBAoPkFaGHtBQgA1H4fUAMEEEAAAQQQQAABBBBAoNkFaF8dCBAAqIOdQBUQQAABBBBAAAEEEEAAgeYWoHX1IEAAoB72AnVAAAEEEEAAAQQQQAABBJpZgLbVhQABgLrYDVQCAQQQQAABBBBAAAEEEGheAVpWHwIEAOpjP1ALBBBAAAEEEEAAAQQQQKBZBWhXnQgQAKiTHUE1EEAAAQQQQAABBBBAAIHmFKBV9SJAAKBe9gT1QAABBBBAAAEEEEAAAQSaUYA21Y0AAYC62RVUBAEEEEAAAQQQQAABBBBoPgFaVD8CBADqZ19QEwQQQAABBBBAAAEEEECg2QRoTx0JEACoo51BVRBAAAEEEEAAAQQQQACB5hKgNfUkQACgnvYGdUEAAQQQQAABBBBAAAEEmkmAttSVAAGAutodVAYBBBBAAAEEEEAAAQQQaB4BWlJfAgQA6mt/UBsEEEAAAQQQQAABBBBAoFkEaEedCRAAqLMdQnUQQAABBBBAAAEEEEAAgeYQoBX1JkAAoN72CPVBAAEEEEAAAQQQQAABBJpBgDbUnQABgLrbJVQIAQQQQAABBBBAAAEEEGh8AVpQfwIEAOpvn1AjBBBAAAEEEEAAAQQQQKDRBah/HQoQAKjDnUKVEEAAAQQQQAABBBBAAIHGFqD29ShAAKAe9wp1QgABBBBAAAEEEEAAAQQaWYC616UAAYC63C1UCgEEEEAAAQQQQAABBBBoXAFqXp8CBADqc79QKwQQQAABBBBAAAEEEECgUQWod50KEACo0x1DtRBAAAEEEEAAAQQQQACBxhSg1vUqQACgXvcM9UIAAQQQQAABBBBAAAEEGlGAOtetAAGAut01VAwBBBBAAAEEEEAAAQQQaDwBaly/AgQA6nffUDMEEEAAAQQQQAABBBBAoNEEqG8dCxAAqOOdQ9UQQAABBBBAAAEEEEAAgcYSoLb1LEAAoJ73DnVDAAEEEEAAAQQQQAABBBpJgLrWtQABgLrePVQOAQQQQAABBBBAAAEEEGgcAWpa3wIEAOp7/1A7BBBAAAEEEEAAAQQQQKBRBKhnnQsQAKjzHUT1EEAAAQQQQAABBBBAAIHGEKCW9S5AAKDe9xD1QwABBBBAAAEEEEAAAQQaQYA61r0AAYC630VUEAEEEEAAAQQQQAABBBCofwFqWP8CBADqfx9RQwQQQAABBBBAAAEEEECg3gWoXwMIEABogJ1EFRFAAAEEEEAAAQQQQACB+hagdo0gQACgEfZSDeuYSqWirWucDFFCeNN8GPV4KS3T0CNTmMmUp3dayJb11Ttv+rxW0nwy7j2t+fRB+dKH9GXp00kepSXTyVhp6YPSNa+xBk3nGpI8mcZKS4beZSg9U5rSk0HLk+n0sdLzGZJ1lDeZ1ljzhQ5aL31IXz89Pdd0+jrZppP1tVzTyTiZ1rwGzWtIn9a8BqVlGrRMQ65lyXKNNaTnTeY11qBlGmvQdKGD1mNAAAEEEEAAAQRqLkAFGkKAAEBD7KbaVdLdo427u7nHQ5QQ3tw9vPd8uXtXPvfu6Z65LGMe9+787m65ftw9axlaz9016sqjGXfvmnfvntay9MG9e5l793SSx92Tya6xu/coWwvcXaNocPcey917ziuTu2sU5dOEezyv6WRw92i5ezxWuns87R6PlZY+uHv6bNe0u/coyz3zfLKCuyeT0djd81rfvTtftGLam3v2ZWnZeky6d6/jnnk6WcHdo0n3eKwZd++qt+Y1uLtGPQZ378rn3j2dZHLvTnOPp5NlGru7RtHg7l1lKcHdNYoG957T7t6V173/6agQ3hBAAAEEEEAAgRoLsPnGECAA0Bj7iVoigAACCCCAAAIIIIAAAvUqQL0aRIAAQIPsKKqJAAIIIIAAAggggAACCNSnALVqFAECAI2yp6gnAggggAACCCCAAAIIIFCPAtSpYQQIADTMrqKiCCCAAAIIIIAAAggggED9CVCjxhEgANA4+4qaIoAAAggggAACCCCAAAL1JkB9GkiAAEAD7SyqigACCCCAAAIIIIAAAgjUlwC1aSQBAgCNtLeoKwIIIIAAAggggAACCCBQTwLUpaEECAA01O6isggggAACCCCAAAIIIIBA/QhQk8YSIADQWPuL2iKAAAIIIIAAAggggAAC9SJAPRpMgABAg+0wqosAAggggAACCCCAAAII1IcAtWg0AQIAjbbHqC8CCCCAAAIIIIAAAgggUA8C1KHhBAgANNwuo8IIIIAAAggggAACCCCAQO0FqEHjCRAAaLx9Ro0RQAABBBBAAAEEEEAAgVoLsP0GFCAA0IA7jSojgAACCCCAAAIIIIAAArUVYOuNKEAAoBH3GnVGAAEEEEAAAQQQQAABBGopwLYbUoAAQEPuNiqNAAIIIIAAAggggAACCNROgC03pgABgMZZiqbLAAAQAElEQVTcb9QaAQQQQAABBBBAAAEEEKiVANttUAECAA2646g2AggggAACCCCAAAIIIFAbAbbaqAIEABp1z1FvBBBAAAEEEEAAAQQQQKAWAmyzYQUIADTsrqPiCCCAAAIIIIAAAggggED1Bdhi4woQAGjcfUfNEUAAAQQQQAABBBBAAIFqC7C9BhYgANDAO4+qI4AAAggggAACCCCAAALVFWBrjSxAAKCR9x51RwABBBBAAAEEEEAAAQSqKcC2GlqAAEBD7z4qjwACCCCAAAIIIIAAAghUT4AtNbYAAYDG3n/UHgEEEEAAAQQQQAABBBColgDbaXABAgANvgOpPgIIIIAAAggggAACCCBQHQG20ugCBAAafQ9SfwQQQAABBBBAAAEEEECgGgJso+EFCAA0/C6kAQgggAACCCCAAAIIIIBA5QXYQuMLEABo/H1ICxBAAAEEEEAAAQQQQACBSgtQfhMIEABogp1IExBAAAEEEEAAAQQQQACBygpQejMIEABohr1IGxBAAAEEEEAAAQQQQACBSgpQdlMIEABoit1IIxBAAAEEEEAAAQQQQACByglQcnMIEABojv1IKxBAAAEEEEAAAQQQQACBSglQbpMIEABokh1JMxBAAAEEEEAAAQQQQACByghQarMIEABolj1JOxBAAAEEEEAAAQQQQACBSghQZtMIEABoml1JQxBAAAEEEEAAAQQQQACB8gtQYvMIEABonn1JSxBAAAEEEEAAAQQQQACBcgtQXhMJEABoop1JUxBAAAEEEEAAAQQQQACB8gpQWjMJEABopr1JWxBAAAEEEEAAAQQQQACBcgpQVlMJEABoqt1JYxBAAAEEEEAAAQQQQACB8glQUnMJEABorv1JaxBAAAEEEEAAAQQQQACBcglQTpMJEABosh1KcxBAAAEEEEAAAQQQQACB8ghQSrMJEABotj1KexBAAAEEEEAAAQQQQACBcghQRtMJEABoul1KgxBAAAEEEEAAAQQQQACB0gUoofkECAA03z6lRQgggAACCCCAAAIIIIBAqQKs34QCBACacKfSJAQQQAABBBBAAAEEEECgNAHWbkYBAgDNuFdpEwIIIIBAyQITJkwouYx6LkDtS6VS9VxF6oYAAgggUEsBtt2UAgQAmnK30igEEECgPAI//vijffPNNwUN6liWZ+uVK2XixIn29ttv27/+9S878cQTbeutt7all17ahg4dalNOOaW1tbXZwIEDo2GaaaaxBRZYwFZZZRXbe++97aKLLrJHH33UvvrqK6vXH3Xse7dv2WWXtTnnnNOmmmoqa29vj9qm8eDBg22uueayFVZYwbbbbjs79dRT7d///re98847RTdv/PjxBX1m9BkbNWpU0dsrZsWvv/7aHnroIbv88svtkEMOsW233dY22GADW3311W3dddeNPhNKv/LKK+2xxx6zkSNHFrOZgtcpxk5+tRzef/99e/fdd6PhvffeK3jf91f37777zvS3qF7/tnR0dBTc5p9//rngz0auFb799tuC69Cfe+/l2oZ+D8aMGZOrKmVdpn3eux71OP/TTz+Vtd31Uhj1aE4BAgDNuV9pFQIIIFAWgR122MGmn376goYXX3yxLNsudyH6wq0O35577mmzzjqrzT///Lb++uvbkUceadddd509/fTT9uGHH5ryqQOt7evL5/fff29vvfWWPfjgg3bBBReY1v/9739vM844oy211FJ29tln25tvvmnJOlqvFoPqff/999tuu+0W7a/e7XvyySdNHTV9UVWHRXVUnfWFXp22xx9/3K6++mo79NBDbb311rN5553XZphhBttjjz2ito8ePVqr5DUoQFLo50aBh7wKLyHTZ599ZldccUW037T/Vl55Zdtpp53sz3/+s11zzTV222232X333We333579JlQun4Hfve735kCJXLRsrFjx5ZQi9yrKthQqF2t8yuwNPfcc5sGBZPKXZ9pp53Wpp56ahs0aFD0mdTvnQI2Z4ffPf1efvLJJ7lRK7z02muvjX7nCmn3fPPNZ8nvYTmq9+tf/7rgOhRSX+Wdbrrpot+DySabzKaYYopof6+xxhq233772d/+9jd74oknTIG1crQnKeOFF16oeLvUtlKH3XffPalyM41pS5MKEABo0h1LsxBAAAEEYgEdmTz22GNt5plnNnX4dAT/yy+/jBeW+P7MM8/Y/vvvb/ryvdhii9mtt95q6mCXWGzeq6sDr+DDwQcfHB3ZX2211eySSy4xHanLu5AcGfVl/uKLL47OfhgyZIgddthh0ZkB2m6O1epukTr+CmzoDI8dd9zRtN+KaYPOjNDZASpH0woQ1V1jm7hC2mf6TGr/KWCj3z2dmTPbbLPZggsuGAXodOaK8lWT4bzzzit4c59++qnVOnBRcKXTVtAZO/rbeu+999q5555r22+/vS233HJRgEZ/C8855xx7/fXXyxrkSNs8k1URYCPNKkAAoFn3LO1CAAEEWlzggw8+MB29nWeeeey4446reMf8pZdesg033NDmmGMO0xHBQo6YF7qr1MFRx3/jjTeOgg+nnXZaxc9AGDdunJ1yyinRmQG6ZEJf/gutdy3yKyijo606w0Cn15ejDiNGjIjOkthiiy1MZ4iUo0zKKE1AnU1doqMzVxToU5BAl/qUVmr/a+vMmWeffbb/jBlyqNOs3+UMixo6SWeBDRs2LArK6KwQBWt0GUdDN6oVK0+bm1aAAEDT7loahgACCLSmgI5M6Yi/vnheeeWVFe8Y91bWEcptttkm6ijrsoLey0ud1xdpdXR01sEtt9xSanFFrX/99ddHp/8eddRRFQ+sFFXBsJI6VnJSUKZSZ2XcdNNNtsQSS1i5zigJ1eZVBoGHH344usxDl27897//LUOJ2Ys44YQTsi/sZ4kuSdLfi36yNfRiXXakyzV0BtbJJ59MwKyB9iZVbV4BAgDNu29pGQIIINByAjr9V9d264h/NY7+5QLW6b26saCO8un6/Fx581mmDq2ud/7FL35hF154YT6rVDyPOj8KtLzyyisV31ahG9hqq62iU8ILXa/Q/P/73/9spZVWMgWeCl2X/JUV0DXpOvvjrLPOsnKd/ZFe488//9weeOCB9KSCp3UT0oJXasAVdAbR4YcfHl0ioHttlPP+Bw3I0QhVpo5NLEAAoIl3Lk1DAAEEWkVAnWNdq67Tf8vR2S6nm26OpZuklXKUWF+eDzrooOha/EpeWlBMu7/44gv7v//7v+hu+toPxZRR7nUuu+wy+/vf/17uYrOW98Ybb9gBBxyQdTkLaiswfPhwW3PNNa3cvzt6SkSp94HQtfKtdBmJvDbYYIPoDCLdzb+2nwy2nl2AJc0sQACgmfcubUMAAQRaQEBH+jfaaKPobvX12lx1/nWjMl2nXGgddcf5VVdd1c4444xCV61qft1N/9BDD635Tb90pHevvfaqatu1MQWg6vFMCNWNwaInWfz2t78tWxBAHVk9RrQctjfffHM5immoMnRpgO68/9xzzzVUvVumsjS0qQXamrp1NA4BBBBAoKkF9CVcjwTTjd7qvaE6ir/wwgubHseXb13VmV1kkUVMj4bLd51a5tNj8/bdd99aVsHWXnttU9CkkEq4uw0YMMB0eYU+T7/85S+j+ULKUF7dDV1jhvoU0JkaukFgOc5UOfbYY+2HH34oS0N33XVXGzNmTFnKarRCdA+Nv/71r41W7aavLw1sbgECAM29f2kdAggg0LQCuoZUN/l6/vnnG6aNqvPyyy9vr776ar91Vidl0UUXtbfeeqvfvPWU4YILLjA9laBWdXrkkUcK2vT8889vuoxBQQPdt+Gpp56yjz/+OAoiKF2BgXwL1KMB881LvtoIaP/us88+JW/8qquuKrmMpACdxVSJG4Ym5df7eJdddrHTTz+93qvZSvWjrU0uQACgyXcwzetPIJUzg76AJxnSp5M0xgggUDuBPfbYo6Cj6bWrac8tKwiw2GKL9Xv0cI011rBiLhnoubXqz+2+++41ux7+hRdeMJ1pkW+r9YSA1157LboxWVtbz69EmtcNJXVPiUGDBuVVpC710OMZ88pMppoJ6Caad911V9Hb12PtFCQquoAMK26//fZVf2JJhmrULEn3ONG9O2pWATacJsBkswv0/N+u2VtL+xDoI+CmEIBOI/7s00/tmWeeMZ1K/NfLL7NLLr3Urrv+OrvvvvvstVdfs++/+87C/849StC63Qm55rpzMYUAAqUL/OMf/7BLLrmk9IJCCYMHD7bDDjvMdHrwV199ZSNHjjR1+nRXdz0+7vvvv7cRI0bY3XffHZ1ero5hWK2kl/7mzDrrrNFR5kwF6eZi+tuTaVkxaZtssondc889pruW6zGCP/74Y3TXerVT099++63p6Lce77fssssWs4lonaOPPjq68345jKICC3wr5DMx7bTTmjpy7e3tObeizr/+X8iZKW1hqWds6IaKOpOg1EGnuqdVK6/JM88804rZrj7LeW2gM5PMdf18PtvSHeO1n0466STbdNNNbZpppukspfiRAvr7779/0QVU4s79H3zwgb300ktF16mYFfVYPt2EMN9B+0B/mxQ4Gzp0aDGbzLmOLoXQIxxzZspjoS5D0t+zag7nnXdeHjVrkCxUs+kFCAA0/S6mgYlAz+65mb6AX3fdNbb6aqua7tA93/zz2worrGCbbLyx7brzLrb7brvZtttsa2uttZYtseQSNsecc9jc885r6623TvgifVdYf3wICHREAYR4Gx6POt97znUmMkIAgZIF/vvf/9q2225bcjnqFL/77rv29ddfm77YLrDAAqabUk011VQ2+eST22STTWZTTDGFKUAw00wzmY7I33777fZ9CAioMz3LLLOUVAcFGFZfffUQV+z51+nxxx83PbaspMLDyrrU4OWXX446+v/85z9N25p55pltyJAhNuWUU0btUzs1rU6Vrn/fYost7D//+Y8pSKAAhDrJoai8Xueff77puuhadf5VyYceekijvAbdK0Dtzyez/h8YOHBgPlmjz0deGbNkmm666WydddYpedD+zLKJrMnLLbdcUdvN1zHZsLtHwbR82rneeuvZ1ltvHQXpFPjT76sGBeQKDTwk29f47bfftiuu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hyEsDxtJqQeW0gpm7nG6hZ/QjbaRP460L774MsyplDCqySuum+4+rWvtkyrEDsmcRXXPlKYvPIqeX3zxxaYjUe7dbbToJy4/FGBt7e221lprRac7H3fcn6IbHmUqsystCsJYWDWUGV5ivP7v19vEjonWCj8KAIwZOzZ7U4NJ+GjGPiHXDJObDejo/iKpxSE5eiW7xb071b17unMvmYWk8DL9uLu5u7VPGG2/nK7NwpxFPx69Z/xdC5/6kG728Sefxpla7F2ncR944IFFtVpHAvU4weeff76o9XOtpN8pHdFVgKKYL7oq+6KLLjJdq6xAheYLHfR4Ld0sS9etF7puK+TXfRlKaaeOVL/xxhu2wAILlFKMzTrrrFW5P0RJlazDlaecckrTjTUVOCikegqM53os4wUXXFBIcXWZV4+21A1966lyCtIdeeSR0QGKTAeO8qmr/tbrb34+eclTqAD5W12grdUBaH9+AhNDZ/HZ557Nmtndzd07l4dx28Cowz5q4DSmPrqpB6ShM4dGqWiBpkJ+06DplKVCtCEV8oaXpZQe8k20gTbdwmta11kAyto5pDrHGrnH5SRpDz34kJJrMHTWI1RkzJgxlutuve4hXBEa7B6PVVl3t8UXX8LuueceW2aZpa2tLfevqramQR1EHSHV9aVnnHGGTTZZ6LWqwDC4hxyd2wmzXS91XuKZlH0+4nP761//GjqZoeJxYtO+a79MnJAj2NFFEE9MOZlZe0r5PZhoCKPkFbKIV7O9loSklD7FYay9E0Yhg3t4C5N6eShz2sGDrC182jWfjKLp8ObuFl5hKhWG+PXjyB/iiRZ833///W266aYrquU6yrj00kvbaaedlvOoYCGF69R7PaFAR/67f5cKKcFM1/GqY6i1dBZBsae86tGAurGcvniPHj1axTXlUMyj8/7+97+XbKH9og7lb3/726LL0tlcRa/c4ivK/U9/+lPBCoceeqhlCvx9+umndtVVVxVcXr2toP/L9t1337qols66uPPOO23JJZe0E088seg6zTLLLHbAAQcUvT4r9iPA4pYXyN2raHkeABKBjokd9uOPPyazGcfJl191VtoGTW1TzrV0nE+dztCrCd2YeN489IRCZ1ejkKJuTUppYTp6paL3kCd6WbQoFJqabAabcb7lwnz6xzbJHPKG7Vivn3vvvc+SevVaVPHZZLs6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tj333DOUO7Aze891OxMZIYAAAggggAACeQuQEYFMAnFPJNMS0hDIJtDZN9Fo6iGD7bbbbrM11lzTvE0p8UruHnUu0zup8ZLud3ePZtzjzq5m3OPp9PXce+ZLlrl7dL368ccfb4cffpi1hY6ayqjHwd2j+uleAFtsvnlkY2k/7nEbleQeG7j3TNMyDWq/hmRaYw1K06DpbIN7XHayXPmTwd3t559/NgVSbr3llhAE0P0Ykpxh3F2dMNMYryeffML+sPYf7Msv+x75d48b5O7R/pCDu0cN07SCB/pMDR8+3I457libdNJJTY9Pu/P22+2pJ5+03Xfd1XS9vtLd4/Xc43FUSOebu0fla3bgwIGmR8mtvfbadsUVV9jHH39sBx54YMYzQ5SfAQEEEEAAAQQQKFKA1RDIKEAAICMLifkLuE09eGq7+aabbK899jIdjde66kBp7O4aZRyUx71vh9S9ex337uXKr4LcPepQTTvt9HbddddFd603c2uEn0GDBtllf73Mllt22ai6SZuSsXvf9kYZw5vyaHDv21Z3N3cPuXq+3LOnqayeuS0qY9SoUbbNdtvanXfeFd2IsCufesTWOD9Phk76WmutZd9+8213pdPakLRLYw3KpLF7bDagvd2GDRtmp556qhZ1D95miy66mF100cWmezA8//yzdv5559hWW21lSy21VBQUmGOOOaLT+hdYYIEoTZcfKFD16KOP2iuvvGK3hyDCdtttZ+1hGyrYPd6mphkQQAABBBBAAIHSBSgBgcwCBAAyu5Cap4C6Le5uk042mZ1zzjl27dXX2Fxzzx11JNOLcFfO9JR4OulwucfL3bs7wO7d03Hu+F2dphVXXNGeeeYpW3/99ftsK85Vv++y+nfoAP7mN7/pU/fEo3ftlZ6kpU8naRpnSleau/fZjvK7u0YZBwUBNt18U7vjjjutK1fXRMZV6iJR7VUf/6lnnrbVVlvNRv4wMmO93OPGuMfjJJN7/JnTkfq99trLTjvtNHPvmUd53eO0ySef3BZY4De251772LXXXhs9YvDNN9+0d9991/73v/9F91RQIELX9h9xxBG29NJL2zTTTKMiGBBAAAEEEEAAgcoJUDICWQQIAGSBIblAgVTKvM1ts803s+efe8502rTuxq+0pCT3uNOUzKeP1XHTfDJ2jztiSksGnY4966yz2mWXXWb33Xdf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9UJIPRDIW6At75xkRACBlhJwd1MQ4JSTT46ue25rz/znIr3zk0y7xx1y93isR6vtsOOOtugii9hiiy1um2y8cXQTs4023NB01/VFF13Mdt1lZ3v99TdyGiflp2dyj7ehup555pnxWQshLT0P040poP293XbbhQBR9tOWdTRTd8evVQt1ynq9dkKPP/746MaBtbIpZLu6rlaBnELWUd4RI0bYrbfeqsmGGnTpwrnnnBM9PaUWFX/wgQeiM7Nqse1W26ZOQf/blVe2WrNr1t4rrrjCFEDOpwLubroR7SyzzGKzzz67DR061HT/mOmmm84GDRrUbxFLL710v3mql4EtIZC/QOZv9PmvT04EEGhygbaB7XbsscfaIQceHAUEkua6ezIZjdVZiybCm6bdey3v6LDvf/jeXnv9tejxb7ob723/+re98eZb0c15dAlAr1VCSfm99B/1iSecaDqC2HcNXWTQN5WU8groBn4HH3ywZRv0mL0tttjCfve735m+ZOW7dR3N0SMcM+X/8ssvo/IyLcuWNs0005juE6Br+R988EF788037d13341Owb7kkktsq622sl/96lfZVs+YrkcMlnrpwX777ZfVTjey3HbbbW311VePbvanM10yViRDop5isMsuu2QtO9P+ymf/7BgCepnWzZa2YQj2ZaheV9Jhhx0W3UC0K6GAicy/9wUUUOWs+vuoR4wVcrNLd7cZZpghemKGLHfdbTcbtv/+ts+++9q2IUi28iqrRL9XAwb0f8PTwUOG2I477RTd76XKTa/a5tb6wx9snXXWKdtQyO9cpkbqBo96fGOmZeVIm3GmmWyZZZfNe9AjUfvbrj5LhZSpvOpM91duW1tb2fZLso/1eFdtV0/L+O7bbzWZc9C9jtR51+/QwYccYnvsuaftHP5O6vdCv1v7DRtmRx51lO25116mx6jqBrCqd3qhOvKv//fS02o6zcYRKECAAEABWGRFoBUF3Dy6BOD4E06w4cP2twHt7Zbrx92jxfqSq0EzybjzPn3mHueJRur5K1M0xOnRZMY3LddgXWWo86+7oA8/YLhl/onzZ15GarkEZpttNtPlHtmGc889N7qm/5FHHrH333/fHn300ejsj3y2r0cu6Uh/el4dQdUlArpxYHp6tulpp53WdLRej3O699577dBDD43uMzD//PPbnHPOaUsttZSpo3zt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oRQjQIAAgToK6BMBAgQIECBAgEBRAQFAUSnlCBAgQKB+AnpEgAABAgQIECBQWEAAUJhKQQIECBCom4D+ECBAgAABAgQIFBcQABS3UpIAAQIE6iWgNwQIECBAgAABAiMICABGwFKUAAECBOokoC8ECBAgQIAAAQKjCAgARtFSlgABAgTqI6AnBAgQIECAAAECIwkIAEbiUpgAAQIE6iKgHwQIECBAgAABAqMJCABG81KaAAECBOohoBcECBAgQIAAAQIjCggARgRTnAABAgTqIKAPBAgQIECAAAECowoIAEYVU54AAQIEZi+gBwQIECBAgAABAiMLCABGJrMBAQIECMxaQPsECBAgQIAAAQKjCwgARjezBQECBAjMVkDrBAgQIECAAAECYwgIAMZAswkBAgQIzFJA2wQIECBAgAABAuMICADGUbMNAQIECMxOI5OhYgAAEABJREFUQMsECBAgQIAAAQJjCQgAxmKzEQECBAjMSkC7BAgQIECAAAEC4wkIAMZzsxUBAgQIzEZAqwQIECBAgAABAmMKCADGhLMZAQIECMxCQJsECBAgQIAAAQLjCggAxpWzHQECBAhMX0CLBAgQIECAAAECYwsIAMamsyEBAgQITFtAewQIECBAgAABAuMLCADGt7MlAQIECExXQGsECBAgQIAAAQITCAgAJsCzKQECBAhMU0BbBAgQIECAAAECkwgIACbRsy0BAgQITE9ASwQIECBAgAABAhMJCAAm4rMxAQIECExLQDsECBAgQIAAAQKTCQgAJvOzNQECBAhMR0ArBAgQIECAAAECEwoIACYEtDkBAgQITENAGwQIECBAgAABApMKCAAmFbQ9AQIECFQvoAUCBAgQIECAAIGJBQQAExOqgAABAgSqFlA/AQIECBAgQIDA5AICgMkN1UCAAAEC1QqonQABAgQIECBAoAQBAUAJiKogQIAAgSoF1E2AAAECBAgQIFCGgACgDEV1ECBAgEB1AmomQIAAAQIECBAoRUAAUAqjSggQIECgKgH1EiBAgAABAgQIlCMgACjHUS0ECBAgUI2AWgkQIECAAAECBEoSEACUBKkaAgQIEKhCQJ0ECBAgQIAAAQJlCQgAypJUDwECBAiUL6BGAgQIECBAgACB0gQEAKVRqogAAQIEyhZQHwECBAgQIECAQHkCAoDyLNVEgAABAuUKqI0AAQIE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2iwgAGjz7BobAQIERhFQlgABAgQIECBAoNUCAoBWT6/BESBAoLiAkgQIECBAgAABAu0WEAC0e36NjgABAkUFlCNAgAABAgQIEGi5gACg5RNseAQIECgmoBQBAgQIECBAgEDbBQQAbZ9h4yNAgEARAWUIECBAgAABAgRaLyAAaP0UGyABAgTyBZQgQIAAAQIECBBov4AAoP1zbIQECBDIE7CeAAECBAgQIECgAwICgA5MsiESIEBguIC1BAgQIECAAAECXRAQAHRhlo2RAAECwwSsI0CAAAECBAgQ6ISAAKAT02yQBAgQGCxgDQECBAgQIECAQDcEBADdmGejJECAwCABywkQIECAAAECBDoiIADoyEQbJgECBBYWsJQAAQIECBAgQKArAgKArsy0cRIgQGAhAcsIECBAgAABAgQ6IyAA6MxUGygBAgRWFrCEAAECBAgQIECgOwICgO7MtZESIEBgRQHvCRAgQIAAAQIEOiQgAOjQZBsqAQIElhfwjgABAgQIECBAoEsCAoAuzbaxEiBAYL6A1wQIECBAgAABAp0SEAB0aroNlgABAssEvCJAgAABAgQIEOiWgACgW/NttAQIEJgT8EyAAAECBAgQINAxAQFAxybccAkQILBYwFcCBAgQIECAAIGuCQgAujbjxkuAAIEQ8CBAgAABAgQIEOicgACgc1NuwAQIEEiJAQECBAgQIECAQPcEBADdm3MjJkCAAAECBAgQIECAAIEOCggAOjjphkyAQNcFjJ8AAQIECBAgQKCLAgKALs66MRMg0G0BoydAgAABAgQIEOikgACgk9Nu0AQIdFnA2AkQIECAAAECBLopIADo5rwbNQEC3RUwcgIECBAgQIAAgY4KCAA6OvGGTYBAVwWMmwABAgQIECBAoKsCAoCuzrxxEyDQTQGjJkCAAAECBAgQ6KyAAKCzU2/gBAh0UcCYCRAgQIAAAQIEuisgAOju3Bs5AQLdEzBiAgQIECBAgACBDgsIADo8+YZOgEDXBIyXAAECBAgQIECgywICgC7PvrETINAtAaMlQIAAAQIECBDotIAAoNPTb/AECHRJwFgJECBAgAABAgS6LSAA6Pb8Gz0BAt0RMFICBAgQIECAAIGOCwgAOv4NYPgECHRFwDgJECBAgAABAgS6LiAA6Pp3gPETINANAaMkQIAAAQIECBDovIAAoPPfAgAIEOiCgDESIECAAAECBAgQEAD4HiBAgED7BYyQAAECBAgQIECAQBIA+CYgQIBA6wUMkAABAgQIECBAgEASAPgmIECAQOsFDJAAAQIECBAgQIBAT8ARAD0E/xEgQKDNAsZGgAABAgQIECBAIAQEAKHgQYAAgfYKGBkBAgQIECBAgACBvoAAoM/gCwECBNoqYFwECBAgQIAAAQIEFgsIABY7+EqAAIF2ChgVAQIECBAgQIAAgSUCAoAlEJ4IECDQRgFjIkCAAAECBAgQIDAnIACYk/BMgACB9gkYEQECBAgQIECAAIGlAgKApRReECBAoG0CxkOAAAECBAgQIEBgmYAAYJmFVwQIEGiXgNEQIECAAAECBAgQmCcgAJiH4SUBAgTaJGAsBAgQIECAAAECBOYLCADma3hNgACB9ggYCQECBAgQIECAAIHlBAQAy3F4Q4AAgbYIGAcBAgQIECBAgACB5QUEAMt7eEeAAIF2CBgFAQIECBAgQIAAgRUEBAArgHhLgACBNggYAwECBAgQIECAAIEVBQQAK4p4T4AAgeYLGAEBAgQIECBAgACBlQQEACuRWECAAIGmC+g/AQIECBAgQIAAgZUFBAArm1hCgACBZgvoPQECBAgQIECAAIEFBAQAC6BYRIAAgSYL6DsBAgQIECBAgACBhQQEAAupWEaAAIHmCug5AQIECBAgQIAAgQUFBAALslhIgACBpgroNwECBAgQIECAAIGFBQQAC7tYSoAAgWYK6DUBAgQIECBAgACBAQICgAEwFhMgQKCJAvpMgAABAgQIECBAYJCAAGCQjOUECBBonoAeEyBAgAABAgQIEBgoIAAYSGMFAQIEmiagvwQIECBAgAABAgQGCwgABttYQ4AAgWYJ6C0BAgQIECBAgACBIQICgCE4VhEgQKBJAvpKgAABAgQIECBAYJiAAGCYjnUECBBojoCeEiBAgAABAgQIEBgqIAAYymMlAQIEmiKgnwQIECBAgAABAgSGCwgAhvtYS4AAgWYI6CUBAgQIECBAgACBHAEBQA6Q1QQIEGiCgD4SIECAAAECBAgQyBMQAOQJWU+AAIH6C+ghAQIECBAgQIAAgVwBAUAukQIECBCou4D+ESBAgAABAgQIEMgXEADkGylBgACBegvoHQECBAgQIECAAIECAgKAAkiKECBAoM4C+kaAAAECBAgQIECgiIAAoIiSMgQIEKivgJ4RIECAAAECBAgQKCQgACjEpBABAgTqKqBfBAgQIECAAAECBIoJCACKOSlFgACBegroFQECBAgQIECAAIGCAgKAglCKESBAoI4C+kSAAAECBAgQIECgqIAAoKiUcgQIEKifgB4RIECAAAECBAgQKCwgAChMpSABAgTqJqA/BAgQIECAAAECBIoLCACKWylJgACBegnoDQECBAgQIECAAIERBAQAI2ApSoAAgToJ6AsBAgQIECBAgACBUQQEAKNoKUuAAIH6COgJAQIECBAgQIAAgZEEBAAjcSlMgACBugjoBwECBAgQIECAAIHRBAQAo3kpTYAAgXoI6AUBAgQIECBAgACBEQUEACOCKU6AAIE6COgDAQIECBAgQIAAgVEFBACjiilPgACB2QvoAQECBAgQIECAAIGRBQQAI5PZgAABArMW0D4BAgQIECBAgACB0QUEAKOb2YIAAQKzFdA6AQIECBAgQIAAgTEEBABjoNmEAAECsxTQNgECBAgQIECAAIFxBAQA46jZhgABArMT0DIBAgQIECBAgACBsQQEAGOx2YgAAQKzEtAuAQIECBAgQIAAgfEEBADjudmKAAECsxHQKgECBAgQIECAAIExBQQAY8LZjAABArMQ0CYBAgQIECBAgACBcQUEAOPK2Y4AAQLTF9AiAQIECBAgQIAAgbEFBABj09mQAAEC0xbQHgECBAgQIECAAIHxBQQA49vZkgABAtMV0BoBAgQIECBAgACBCQQEABPg2ZQAAQLTFNAWAQIECBAgQIAAgUkEBACT6NmWAAEC0xPQEgECBAgQIECAAIGJBAQAE/HZmAABAtMS0A4BAgQIECBAgACByQQEAJP52ZoAAQLTEdAKAQIECBAgQIAAgQkFBAATAtqcAAEC0xDQBgECBAgQIECAAIFJBQQAkwrangABAtULaIEAAQIECBAgQIDAxAICgIkJVUCAAIGqBdRPgAABAgQIECBAYHIBAcDkhmogQIBAtQJqJ0CAAAECBAgQIFCCgACgBERVECBAoEoBdRMgQIAAAQIECBAoQ0AAUIaiOggQIFCdgJoJECBAgAABAgQIlCIgACiFUSUECBCoSkC9BAgQIECAAAECBMoREACU46gWAgQIVCOgVgIECBAgQIAAAQIlCQgASoJUDQECBKoQUCcBAgQIECBAgACBsgQEAGVJqocAAQLlC6iRAAECBAgQIECAQGkCAoDSKFVEgACBsgXUR4AAAQIECBAgQKA8AQFAeZZqIkCAQLkCaiNAgAABAgQIECBQooAAoERMVREgQKBMAXURIECAAAECBAgQKFNAAFCmproIECBQnoCaCBAgQIAAAQIECJQqIAAolVNlBAgQKEtAPQQIECBAgAABAgTKFRAAlOupNgIECJQjoBYCBAgQIECAAAECJQsIAEoGVR0BAgTKEFAHAQIECBAgQIAAgbIFBABli6qPAAECkwuogQABAgQIECBAgEDpAgKA0klVSIAAgUkFbE+AAAECBAgQIECgfAEBQPmmaiRAgMBkArYmQIAAAQIECBAgUIGAAKACVFUSIEBgEgHbEiBAgAABAgQIEKhCQABQhao6CRAgML6ALQkQIECAAAECBAhUIiAAqIRVpQQIEBhXwHYECBAgQIAAAQIEqhEQAFTjqlYCBAiMJ2ArAgQIECBAgAABAhUJCAAqglUtAQIExhGwDQECBAgQIECAAIGqBAQAVcmqlwABAqML2IIAAQIECBAgQIBAZQICgMpoVUyAAIFRBZQnQIAAAQIECBAgUJ2AAKA6WzUTIEBgNAGlCRAgQIAAAQIECFQoIACoEFfVBAgQGEVAWQIECBAgQIAAAQJVCggAqtRVNwECBIoLKEmAAAECBAgQIECgUoH/DwAA//+wHIt2AAAABklEQVQDAKcyac/+1XTjAAAAAElFTkSuQmCC";