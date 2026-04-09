/**
 * LOGITRADE: Backend de Google Drive para subir Facturas Automáticamente
 * 
 * PASOS DE INSTALACIÓN:
 * 1. Ve a https://script.google.com
 * 2. Clica en "Nuevo Proyecto"
 * 3. Reemplaza TODO el código inicial con este archivo.
 * 4. Cambia el 'ID_DE_TU_CARPETA' (línea 10) por el ID real de tu carpeta de Google Drive.
 *    (El ID lo sacas de la URL de tu carpeta: https://drive.google.com/drive/folders/ESTE_ES_EL_ID)
 * 5. Guarda (Ctrl+S).
 * 6. Super importante: Clica en el botón azul arriba a la derecha "Implementar" -> "Nueva implementación".
 * 7. Tipo: "Aplicación web". Ejecutar como "Yo". Quién tiene acceso: "Cualquier persona".
 * 8. Autoriza los permisos que Google te pida (Ve a Avanzado -> Ir al script (inseguro)).
 * 9. Se te entregará una URL Web App ("https://script.google.com/macros/s/.../exec"). Copia esa URL en tu index.html.
 */

const FOLDER_ID = 'COMPLETA_TU_ID_AQUI'; 

function doPost(e) {
  try {
    // Para admitir CORS
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
    const fileName = payload.fileName;
    const base64Data = payload.base64;
    
    // Obtener la carpeta por el ID
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Decodificar Base64 quitando la cabecera (ej: data:application/pdf;base64,....)
    const splitData = base64Data.split(',');
    const base64 = splitData[1] || splitData[0];
    const mimeType = splitData[0].split(':')[1].split(';')[0];
    
    // Convertir de base64 a archivo binario (Blob)
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
    
    // Crear archivo en el disco
    const file = folder.createFile(blob);
    
    const response = {
      status: "success",
      url: file.getUrl(),
      fileName: file.getName(),
      id: file.getId()
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

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
