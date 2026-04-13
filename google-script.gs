// ==========================================
// CONFIGURACIÓN LOGI PRO - ID ACTUALIZADO
// ==========================================

const FOLDER_ID = '1OsV_Q0PAYo0-LEkjdmVKfVImafT8FtB0'; 
const FOLDER_FOTOS_PERFIL = '1ExIVEFippvrARyDUw_lfPHbhC_LSPTK8'; 
const FOLDER_COMPROBANTES_PAGO = '14qmuUkXL1C6wF600wIyKfurXPMLRnoIX';
const SPREADSHEET_ID = '1gmA0PVykHK_ZoEYfM-JPwKU4bTQ-LI4UgpciqGWGhOc';

const SCRIPT_DB_HEADERS = [
  "ID", "Cliente", "Operador", "Estado Pago", "Fecha de Servicio", "Tipo Servicio", 
  "Destino", "Costo", "Monto", "Fecha de Pago", 
  "Estado Factura", "OC / HES", "Cotización", "Nº Factura", "Link Archivo", "Estado Ruta"
];

const USER_HEADERS = ["Nombre", "Clave", "Rol", "Estado", "Email"];

// NUEVO: Encabezados para la pestaña de Potenciales
const POTENTIAL_HEADERS = ["Nombre", "Teléfono", "Email", "Sitio Web"];

// NUEVO: EncabezADOS para la pestaña de Operadores
const OPERATOR_HEADERS = ["Nombre / Empresa", "RUT", "Patente", "Chofer", "Teléfono", "Email", "Foto"];

// NUEVO: Encabezados para la pestaña de Clientes (Layout solicitado)
const CLIENT_HEADERS = ["Nombre", "Teléfono", "Email", "RUT Cliente", "Giro", "Dirección", "Comuna", "Ciudad"];

// CONFIGURACION FACTUREO
const FOLDER_PRE_FACTURAS_ID = '1LtmEnnKHNVNhxWRLx0az_3ochXj-aHwv'; 
const INVOICE_TEMPLATE_ID = ''; // Si el usuario no tiene una, generaremos una dinámica

/**
 * Crea un menú en la hoja de cálculo al abrirse.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Logi Pro')
    .addItem('Actualizar Encabezados', 'setupHeaders')
    .addSeparator()
    .addItem('Sincronizar Todo', 'setupHeaders')
    .addToUi();
}

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Inicializa una hoja y asegura que los encabezados existan.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - El objeto Spreadsheet activo.
 */
function initSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  } else {
    // Verificar si faltan encabezados y sincronizarlos solo si la hoja está casi vacía o faltan columnas
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
  
  // OPTIMIZACIÓN TURBO: Usar getDisplayValues() para obtener strings ya formateados desde Sheets
  // Esto elimina la necesidad de llamar a Utilities.formatDate en cada celda, que es muy lento.
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  
  return values.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function upsertRow(sheet, headers, data, idField, originalId) {
  const targetId = originalId || data[idField];
  
  // GUARD: Evitar actualizar o crear si el ID es nulo o vacío
  if (targetId === undefined || targetId === null || targetId.toString().trim() === "") {
    console.warn("Intento de upsert con ID vacío/inválido ignorado.");
    return;
  }

  const lastRow = sheet.getLastRow();
  let foundRow = -1;
  
  // 1. Buscar si la fila ya existe
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

  // 2. Si existe, obtenemos valores actuales y parcheamos
  if (foundRow !== -1) {
    const currentValues = sheet.getRange(foundRow, 1, 1, headers.length).getValues()[0];
    const newValues = headers.map((h, i) => {
      // Si el campo viene en 'data', lo actualizamos. Si no, mantenemos el anterior.
      return data[h] !== undefined ? data[h] : currentValues[i];
    });
    sheet.getRange(foundRow, 1, 1, headers.length).setValues([newValues]);
  } else {
    // 3. Si no existe, creamos fila nueva con vacíos para lo no provisto
    const rowValues = headers.map(h => data[h] !== undefined ? data[h] : "");
    sheet.appendRow(rowValues);
  }
}

function deleteRowById(sheet, headers, idField, targetId) {
  // GUARD: Evitar borrar si el ID es nulo o vacío
  if (targetId === undefined || targetId === null || targetId.toString().trim() === "") {
    console.warn("Intento de eliminación con ID vacío ignorado.");
    return false;
  }

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
  
  // Forzar actualización de Clientes
  let sheet = ss.getSheetByName("Clientes");
  if (sheet) {
    sheet.getRange(1, 1, 1, CLIENT_HEADERS.length).setValues([CLIENT_HEADERS]);
    sheet.getRange(1, 1, 1, CLIENT_HEADERS.length).setFontWeight("bold").setBackground("#f3f4f6");
  } else {
    initSheet(ss, "Clientes", CLIENT_HEADERS);
  }

  // También aprovechamos de asegurar las otras pestañas
  initSheet(ss, "Servicios", SCRIPT_DB_HEADERS);
  initSheet(ss, "Colaboradores", USER_HEADERS);
  initSheet(ss, "Base_Operadores", OPERATOR_HEADERS);
  
  SpreadsheetApp.getUi().alert("✅ Proceso completado: Los encabezados han sido actualizados en todas las pestañas.");
}

function getFullSystemData(ss, colaboradoresPreLoaded) {
  const data = { status: "success" };
  const sheetsConfig = [
    { name: "Servicios", headers: SCRIPT_DB_HEADERS, key: "servicios" },
    { name: "Clientes", headers: CLIENT_HEADERS, key: "clientes" },
    { name: "Colaboradores", headers: USER_HEADERS, key: "colaboradores" },
    { name: "Potenciales", headers: POTENTIAL_HEADERS, key: "potenciales" },
    { name: "Base_Operadores", headers: OPERATOR_HEADERS, key: "base_operadores" }
  ];

  sheetsConfig.forEach(cfg => {
    // Si ya cargamos colaboradores en el login, no lo volvemos a leer
    if (cfg.name === "Colaboradores" && colaboradoresPreLoaded) {
      data[cfg.key] = colaboradoresPreLoaded;
      return;
    }
    
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) sheet = initSheet(ss, cfg.name, cfg.headers);
    data[cfg.key] = getSheetData(sheet, cfg.headers);
  });

  return data;
}

function doGet(e) {
  const ss = getSS();
  try {
    const responseData = getFullSystemData(ss);
    return ContentService.createTextOutput(JSON.stringify(responseData)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const ss = getSS();
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "login") {
      const sheet = ss.getSheetByName("Colaboradores") || initSheet(ss, "Colaboradores", USER_HEADERS);
      const users = getSheetData(sheet, USER_HEADERS);
      const user = users.find(u => 
        u.Nombre.toString().toLowerCase() === payload.nombre.toString().toLowerCase() && 
        u.Clave.toString() === payload.pass.toString()
      );
      
      if (user) {
        if (user.Estado !== "Activo") throw new Error("Usuario inactivo");
        
        // OPTIMIZACIÓN TURBO: Pasar 'users' ya cargados para evitar doble lectura
        const systemData = getFullSystemData(ss, users);
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "success", 
          user: user,
          ...systemData 
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Nombre o Clave incorrectos");
      }
    }

    if (action === "upsertService") {
      const sheet = initSheet(ss, "Servicios", SCRIPT_DB_HEADERS);
      upsertRow(sheet, SCRIPT_DB_HEADERS, payload.data, "ID");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    
    else if (action === "upsertClient") {
      const sheet = initSheet(ss, "Clientes", CLIENT_HEADERS);
      const oldName = payload.oldNombre;
      const newName = payload.data["Nombre"];

      upsertRow(sheet, CLIENT_HEADERS, payload.data, "Nombre", oldName);

      // Si hubo cambio de nombre, actualizar en cascada la pestaña Servicios
      if (oldName && oldName !== newName) {
        const servicesSheet = ss.getSheetByName("Servicios");
        if (servicesSheet) {
          const servicesData = servicesSheet.getDataRange().getValues();
          const clientColIndex = SCRIPT_DB_HEADERS.indexOf("Cliente");
          if (clientColIndex !== -1) {
            for (let i = 1; i < servicesData.length; i++) {
              if (servicesData[i][clientColIndex] === oldName) {
                servicesSheet.getRange(i + 1, clientColIndex + 1).setValue(newName);
              }
            }
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 

    else if (action === "upsertPotential") {
      const sheet = initSheet(ss, "Potenciales", POTENTIAL_HEADERS);
      upsertRow(sheet, POTENTIAL_HEADERS, payload.data, "Nombre");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 

    else if (action === "upsertOperadorPerfil") {
      const sheet = initSheet(ss, "Base_Operadores", OPERATOR_HEADERS);
      upsertRow(sheet, OPERATOR_HEADERS, payload.data, "Nombre / Empresa");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 

    else if (action === "deletePotential") {
      const sheet = initSheet(ss, "Potenciales", POTENTIAL_HEADERS);
      deleteRowById(sheet, POTENTIAL_HEADERS, "Nombre", payload.nombre);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "deleteClient") {
      const sheet = initSheet(ss, "Clientes", CLIENT_HEADERS);
      deleteRowById(sheet, CLIENT_HEADERS, "Nombre", payload.nombre);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    else if (action === "upsertUser") {
      if (payload.requesterRole !== "SuperAdmin") throw new Error("Sin permisos");
      const sheet = initSheet(ss, "Colaboradores", USER_HEADERS);
      upsertRow(sheet, USER_HEADERS, payload.data, "Nombre");
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "deleteService") {
      const sheet = initSheet(ss, "Servicios", SCRIPT_DB_HEADERS);
      deleteRowById(sheet, SCRIPT_DB_HEADERS, "ID", payload.id);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "deleteOperador") {
      const sheet = initSheet(ss, "Base_Operadores", OPERATOR_HEADERS);
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
    
    else if (action === "uploadPaymentReceipt") {
      const folder = DriveApp.getFolderById(FOLDER_COMPROBANTES_PAGO);
      
      const base64Data = payload.base64.split(',')[1] || payload.base64;
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
      const fileName = `COMPROBANTE_${payload.operatorName}_${today}`;
      
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), payload.mimeType, fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const sheet = initSheet(ss, "Servicios", SCRIPT_DB_HEADERS);
      upsertRow(sheet, SCRIPT_DB_HEADERS, {
        "ID": payload.serviceId,
        "Link Archivo": file.getUrl(),
        "Estado Pago": "PAGADO"
      }, "ID");
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        url: file.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    else if (action === "generatePreFactura") {
      return handleGeneratePreFactura(ss, payload.serviceId);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Lógica principal para generar el PDF de Pre-Factura
 */
function handleGeneratePreFactura(ss, serviceId) {
  try {
    const servicesSheet = ss.getSheetByName("Servicios");
    const clientsSheet = ss.getSheetByName("Clientes");
    
    const services = getSheetData(servicesSheet, SCRIPT_DB_HEADERS);
    const service = services.find(s => s.ID.toString() === serviceId.toString());
    if (!service) throw new Error("Servicio no encontrado.");

    const clients = getSheetData(clientsSheet, CLIENT_HEADERS);
    const client = clients.find(c => c.Nombre === service.Cliente);
    if (!client) throw new Error("Cliente no encontrado para este servicio.");

    // 1. Obtener carpeta de destino
    let folder;
    try {
      folder = DriveApp.getFolderById(FOLDER_PRE_FACTURAS_ID);
    } catch(e) {
      folder = DriveApp.createFolder("Pre-Facturas");
    }

    // 2. Cálculos Financieros
    const total = parseFloat(service.Monto) || 0;
    const neto = Math.round(total / 1.19);
    const iva = total - neto;

    // 3. Crear documento temporal basado en diseño solicitado
    // Nota: Por simplicidad técnica inicial, creamos un Doc desde cero con el formato
    const docName = `PRE_FACTURA_${client.Nombre}_${service.ID}`;
    const doc = DocumentApp.create(docName);
    const body = doc.getBody();

    // Estilos generales
    body.setMarginTop(30).setMarginBottom(30).setMarginLeft(40).setMarginRight(40);

    // Encabezado
    const headerTable = body.appendTable([
      ["LOGO\nLOGI&TRADE", "LOGIPRO SPA\nGiro: Transporte de Carga\nCalle Ejemplo 123 - Santiago", "R.U.T.: 76.543.210-K\n\nSIMULACIÓN DE FACTURA\n\nNº " + service.ID]
    ]);
    headerTable.setBorderWidth(0);
    headerTable.getRow(0).getCell(2).setBackgroundColor("#fffafa").setPaddingTop(10).setPaddingBottom(10);
    // Nota: El cuadro rojo se simula con bordes en el PDF final o texto coloreado
    headerTable.getRow(0).getCell(2).getChild(0).asParagraph().setColor("#ff0000").setBold(true);

    body.appendHorizontalRule();

    // Datos Receptor
    const receptorBox = body.appendTable([
      ["SEÑOR(ES): " + client.Nombre, "R.U.T.: " + (client["RUT Cliente"] || "---")],
      ["GIRO: " + (client.Giro || "---"), "FECHA: " + service["Fecha de Servicio"]],
      ["DIRECCIÓN: " + (client.Dirección || "---"), "COMUNA: " + (client.Comuna || "---")]
    ]);
    receptorBox.setBorderWidth(0.5).setColumnWidth(0, 300);

    body.appendParagraph("\n");

    // Tabla de Detalle
    const detailTable = body.appendTable([
      ["DESCRIPCIÓN", "CANT", "P. UNITARIO", "TOTAL"]
    ]);
    detailTable.getRow(0).setAttributes({[DocumentApp.Attribute.BACKGROUND_COLOR]: "#f3f4f6", [DocumentApp.Attribute.BOLD]: true});
    detailTable.appendRow([service["Tipo Servicio"] + " - DESTINO: " + service.Destino, "1", total.toLocaleString('es-CL'), total.toLocaleString('es-CL')]);
    
    // Rellenar espacio para que se vea como factura
    for(let i=0; i<5; i++) detailTable.appendRow(["", "", "", ""]);

    body.appendParagraph("\n");

    // Totales
    const totalTable = body.appendTable([
      ["", "MONTO NETO $", neto.toLocaleString('es-CL')],
      ["", "I.V.A. 19% $", iva.toLocaleString('es-CL')],
      ["", "TOTAL $", total.toLocaleString('es-CL')]
    ]);
    totalTable.setBorderWidth(0).setColumnWidth(1, 100).setColumnWidth(2, 80);
    totalTable.getRow(2).getCell(2).setBold(true);

    // Marca de Agua (Texto al final o pie de página)
    body.appendParagraph("\n\n\n\n\n\nBORRADOR - NO VÁLIDO PARA SII").setAlignment(DocumentApp.HorizontalAlignment.CENTER).setItalic(true).setForegroundColor("#cccccc");

    doc.saveAndClose();

    // 4. Convertir a PDF y Guardar
    const pdfBlob = doc.getAs('application/pdf');
    const pdfFile = folder.createFile(pdfBlob);
    pdfFile.setName(docName + ".pdf");
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 5. Limpieza
    DriveApp.getFileById(doc.getId()).setTrashed(true);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      url: pdfFile.getUrl(),
      id: pdfFile.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}
