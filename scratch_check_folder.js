function findOrCreateInfoFolder() {
  const folderName = "Comprobantes_Pagos_NovaProd";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    const folder = folders.next();
    console.log("Folder exists: " + folder.getId());
  } else {
    console.log("Folder does not exist.");
  }
}
