// helper/clientExport.js
import * as XLSX from "xlsx";
import { initDB,getActiveClientsForGymBatched } from './indexeddbhelper2'; // adjust import path

// Export active clients by gym ID
export async function exportClientsToExcel(gymId) {
  const data = [];

  // Collect all clients via batching
  await getActiveClientsForGymBatched(gymId, 200, async (batch) => {
    data.push(...batch);
  });

  if (data.length === 0) {
    alert("No client data found in IndexedDB for this gym.");
    return;
  }


  // Transform t_type to readable string
  const transformedData = data.map(client => ({
    ...client,
    t_type: client.t_type === 1 ? "NEW" : client.t_type === 2 ? "RENEW" : client.t_type
  }));

  const worksheet = XLSX.utils.json_to_sheet(transformedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
  XLSX.writeFile(workbook, `clients_${gymId}.xlsx`);
}

export async function exportClientsToExcelStreaming(gymId) {
  const workbook = XLSX.utils.book_new();

  // start with empty sheet
  let worksheet = XLSX.utils.json_to_sheet([], { header: ["id", "name", "t_type", "gymId"] });
  let currentRow = 2; // row 1 = header

  await getActiveClientsForGymBatched(gymId, 500, async (batch) => {
    // transform batch
    const transformedBatch = batch.map(client => ({
      ...client,
      t_type:
        client.t_type === 1 ? "NEW" :
        client.t_type === 2 ? "RENEW" :
        client.t_type
    }));

    // append rows directly into sheet
    XLSX.utils.sheet_add_json(worksheet, transformedBatch, {
      skipHeader: true, // don't rewrite headers
      origin: `A${currentRow}`, // append from current row
    });

    currentRow += transformedBatch.length;
  });

  // attach sheet & write
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
  XLSX.writeFile(workbook, `clients_${gymId}.xlsx`);
}
// Export inactive clients paginated by gym ID
export function exportAllInactiveClientsByGymToExcel(gymId) {
  const allData = [];

  const keys = Object.keys(localStorage);
  const targetPrefix = `inactiveClients_${gymId}_page_`;

  keys.forEach((key) => {
    if (key.startsWith(targetPrefix)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));

        // ✅ Extract from .result if available
        const clients = Array.isArray(data)
          ? data
          : Array.isArray(data.result)
          ? data.result
          : [];

        if (clients.length > 0) {
          allData.push(...clients);
        }
      } catch (e) {
        console.warn(`Invalid JSON in ${key}`, e);
      }
    }
  });

  if (allData.length === 0) {
    alert("No inactive client data found for this gym.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(allData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inactive Clients");
  XLSX.writeFile(workbook, `inactive_clients_${gymId}.xlsx`);
}

export async function exportAllDBInactiveClientsByGymToExcel(gymId) {
  try {
    const db = await initDB();
    const tx = db.transaction('inactive_clients', 'readonly');
    const store = tx.objectStore('inactive_clients');
    const index = store.index('gymid');

    // 🗂 Get all clients for this gym
    const allClients = await index.getAll(IDBKeyRange.only(gymId));

    if (!allClients || allClients.length === 0) {
      alert("No inactive client data found in the database for this gym.");
      return;
    }

    console.log(`📦 Found ${allClients.length} inactive clients in IndexedDB`);

    // 📄 Convert to Excel
    const worksheet = XLSX.utils.json_to_sheet(allClients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inactive Clients");
    XLSX.writeFile(workbook, `inactive_clients_${gymId}.xlsx`);
  } catch (err) {
    console.error("🔥 Failed to export inactive clients:", err);
    alert("Failed to export inactive clients.");
  }
}