import { openDB } from 'idb';

const DB_NAME = 'GymManagementDB';
const DB_VERSION = 11;

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 🗂️ Active Clients Store
     if (!db.objectStoreNames.contains('clients')) {
  const activeStore = db.createObjectStore('clients', {
    keyPath: ['gymid', 'userid'], // composite key without page
  });
  activeStore.createIndex('gymid', 'gymid', { unique: false });
}
if (!db.objectStoreNames.contains("leads")) {
  const leadStore = db.createObjectStore("leads", {
    
     keyPath: 'id', autoIncrement: true 
  });
  leadStore.createIndex("gymid_page", ["gymid", "page"], { unique: false });
  leadStore.createIndex("gymid", "gymid", { unique: false });
}
  if (!db.objectStoreNames.contains("meta_leads")) {
  db.createObjectStore("meta_leads", { keyPath: "gymid" });
}
      // 🗂️ Inactive Clients Store
      if (!db.objectStoreNames.contains('inactive_clients')) {
        const inactiveStore = db.createObjectStore('inactive_clients', {
          keyPath: ['gymid', 'page', 'userid'], // composite key
        });
        inactiveStore.createIndex('gymid_page', ['gymid', 'page'], { unique: false });
        inactiveStore.createIndex('gymid', 'gymid', { unique: false });
      }
        if (!db.objectStoreNames.contains('meta_inactive')) {
        db.createObjectStore('meta_inactive', { keyPath: 'gymid' });
      }
    },
  });
}
// Save active clients
export async function saveActiveClientsForGymPage(gymid, clients, clearBefore = true) {
  const db = await initDB();
  const tx = db.transaction("clients", "readwrite");
  const store = tx.objectStore("clients");

  // 🧹 Step 1: Delete all existing clients for this gym
  if (clearBefore) {
    const range = IDBKeyRange.only(gymid);
    for (let cursor = await store.index("gymid").openCursor(range);
         cursor;
         cursor = await cursor.continue()) {
      cursor.delete();
    }
  }

  // 🚀 Step 2: Save all new clients (must have userid)
  for (const client of clients) {
    if (!client.userid) {
      console.error("Skipping client - missing userid:", client);
      continue; // or throw new Error(...) if you want to block saving
    }
    store.put({ ...client, gymid }); // gymid + userid = key
  }

  await tx.done;
}
export async function deleteActiveClient(gymid, userid) {
  if (!gymid || !userid) {
    throw new Error("Both gymid and userid are required to delete client");
  }

  const db = await initDB();
  const tx = db.transaction("clients", "readwrite");
  await tx.objectStore("clients").delete([gymid, userid]);
  await tx.done;
}
export async function upsertActiveClient(gymid, client) {
  const db = await initDB();
  const tx = db.transaction("clients", "readwrite");
  const store = tx.objectStore("clients");

  // ✅ Ensure all key fields exist
  const clientRecord = {
    ...client,
    gymid,
    userid: client.userid, // normalize key
  };

  if (!clientRecord.userid) {
    throw new Error("Missing userid for client record");
  }

  // ✅ Put will update if exists, add if not
  await store.put(clientRecord);
  await tx.done;

  return clientRecord;
}
export async function getAllClientsFromIndexedDB(gymId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("YourDatabaseName");

    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction("clients", "readonly");
      const store = transaction.objectStore("clients");

      // If you stored clients under gymId, you might need an index
      const index = store.index("gymId");
      const query = index.getAll(gymId);

      query.onsuccess = function () {
        resolve(query.result);
      };

      query.onerror = function () {
        reject(query.error);
      };
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}
export async function getActiveClientsForGymBatched(gymid, batchSize, callback) {
  const db = await initDB();
  const tx = db.transaction("clients", "readonly");
  const store = tx.objectStore("clients");
  const index = store.index("gymid");

  const range = IDBKeyRange.only(gymid);
  let batch = [];

  for (let cursor = await index.openCursor(range); cursor; cursor = await cursor.continue()) {
    batch.push(cursor.value);
    if (batch.length === batchSize) {
      // ⚡ Collect batch synchronously
      await callback([...batch]); // make a copy
      batch = [];
    }
  }

  // Last leftover batch
  if (batch.length > 0) {
    await callback([...batch]);
  }

  await tx.done;
}
export async function updateActiveClientAttendance(updatedClient) {

    const db = await initDB(); // assumes initDB() from idb
    const tx = db.transaction("clients", "readwrite");
    const store = tx.objectStore("clients");
    await store.put(updatedClient);
    await tx.done;
   // console.log(`✅ Client ${updatedClient.userid} updated in IndexedDB`);
  
}
 
export async function clearActiveClientsForGym(gymid) {
  const db = await initDB();
  const tx = db.transaction('clients', 'readwrite');
  const store = tx.objectStore('clients');

  const range = IDBKeyRange.bound([gymid], [gymid, []], false, false);
  const request = store.openCursor(range);
  let cursor = await request;
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}
// Save inactive clients
export async function saveInactiveClientsForGymPage(gymid, page, clients, totalPages) {
  const db = await initDB();
  const tx = db.transaction(['inactive_clients', 'meta_inactive'], 'readwrite');
  const store = tx.objectStore('inactive_clients');
  const metaStore = tx.objectStore('meta_inactive');

  // 🧹 Clear old data for this gymid + page
  const range = IDBKeyRange.bound([gymid, page], [gymid, page, []], false, false);
  const request = store.openCursor(range);
  let cursor = await request;
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  // 🚀 Bulk insert new clients
  const promises = clients.map((client) =>
    store.put({ ...client, gymid, page })
  );
  await Promise.all(promises);

  // ✅ Save totalPages in meta_inactive
  await metaStore.put({ gymid, totalPages });

  await tx.done;
}



export async function getInactiveClientsForGym(gymid) {
  const db = await initDB();
  const tx = db.transaction('inactive_clients', 'readonly');
  const store = tx.objectStore('inactive_clients');
  const index = store.index('gymid');
  return index.getAll(IDBKeyRange.only(gymid));
}
export async function getInactiveClientsForGymPage(gymid, page) {
  const db = await initDB();
  const tx = db.transaction('inactive_clients', 'readonly');
  const store = tx.objectStore('inactive_clients');
  const index = store.index('gymid_page');
  return index.getAll(IDBKeyRange.only([gymid, page]));
}
export async function clearInactiveClientsForGym(gymid) {
  const db = await initDB();
  const tx = db.transaction('inactive_clients', 'readwrite');
  const store = tx.objectStore('inactive_clients');

  const range = IDBKeyRange.bound([gymid], [gymid, []], false, false);
  const request = store.openCursor(range);
  let cursor = await request;
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}
export async function getInactiveTotalPages(gymid) {
  const db = await initDB();
  const tx = db.transaction('meta_inactive', 'readonly');
  const metaStore = tx.objectStore('meta_inactive');
  const meta = await metaStore.get(gymid);
  return meta ? meta.totalPages : null;
}
export async function clearAllIndexedDB() {
  if (!window.indexedDB) {
    console.warn("❌ IndexedDB not supported in this browser.");
    return;
  }

  const dbs = await indexedDB.databases(); // 🆕 Get list of all DBs
  for (const db of dbs) {
  //  console.log(`🗑️ Deleting DB: ${db.name}`);
    indexedDB.deleteDatabase(db.name);
  }
}
/* ---------- LEADS ---------- */
export async function saveLeadDataForGymPage(gymid, page, leads, totalPages) {
  const db = await initDB();
  const tx = db.transaction(['leads', 'meta_leads'], 'readwrite');
  const store = tx.objectStore('leads');
  const metaStore = tx.objectStore('meta_leads');

  // Delete existing leads for same gymid + page
  const range = IDBKeyRange.bound(
    [gymid, page, ""],       // min possible id (string case)
    [gymid, page, "\uffff"]  // max possible id
  );

  let cursor = await store.openCursor(range);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  // Save new leads
  for (const lead of leads) {
    await store.put({ ...lead, gymid, page });
  }

  // Save/update totalPages for this gym
  await metaStore.put({ gymid, totalPages });

  await tx.done;
}


export async function getLeadDataForGymPage(gymid, page) {

    const db = await initDB();
  const tx = db.transaction('leads', 'readonly');
  const store = tx.objectStore('leads');
  const index = store.index('gymid_page');
  return index.getAll(IDBKeyRange.only([gymid, page]));

}

export async function getLeadTotalPages(gymid) {
  const db = await initDB();
  const meta = await db.get('meta_leads', gymid);
  return meta ? meta.totalPages : 1;
}
export async function deleteLead(gymid, page, leadId) {
  const db = await initDB();
  const tx = db.transaction('leads', 'readwrite');
  const store = tx.objectStore('leads');

  // The leadId is the primary key (id)
  // Optional: verify the record belongs to this gymid + page before deleting
  const record = await store.get(leadId);
  if (!record) {
   // console.warn(`Lead with id ${leadId} not found`);
    await tx.done;
    return;
  }
  if (record.gymid !== gymid || record.page !== page) {
    //console.warn(`Lead gymid/page mismatch, delete aborted`);
    await tx.done;
    return;
  }

  await store.delete(leadId);
  await tx.done;
}
export async function clearLeadDataForGym(gymid) {
  const db = await initDB();
  const tx = db.transaction('leads', 'readwrite');
  const store = tx.objectStore('leads');
  const index = store.index('gymid_page');

  // Range to include all pages for gymid
  const range = IDBKeyRange.bound([gymid, 0], [gymid, Number.MAX_SAFE_INTEGER]);

  let cursor = await index.openCursor(range);
  while (cursor) {
    await cursor.delete();  // deletes from object store
    cursor = await cursor.continue();
  }
  await tx.done;
}