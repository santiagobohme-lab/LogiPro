const fs = require('fs');

const file = 'c:/Users/santi/.gemini/antigravity/scratch/logistica-app/index.html';
let content = fs.readFileSync(file, 'utf8');

// Update mapFromSheetService
content = content.replace(
    /fechaPago: rawDatePago \? rawDatePago\.split\('T'\)\[0\] : "-",\s*estado: sheetObj\["Estado Pago"\]/g,
    `fechaPago: rawDatePago ? rawDatePago.split('T')[0] : "-",\n                idMaestro: sheetObj["ID Maestro"] || "",\n                etapa: sheetObj["Etapa"] || "",\n                estado: sheetObj["Estado Pago"]`
);

// Update mapToSheetService
content = content.replace(
    /"Descripci.n Carga": row\.descripcionCarga \|\| ""\s*};\s*return data;/g,
    `"Descripción Carga": row.descripcionCarga || "",\n                "ID Maestro": row.idMaestro || "",\n                "Etapa": row.etapa || ""\n            };\n            return data;`
);

fs.writeFileSync(file, content);
console.log("Updated map functions successfully.");
