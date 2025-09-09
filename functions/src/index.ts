import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

initializeApp();
const db = getFirestore();

// 共通：スナップショット保存関数
async function saveSnapshot(
  collection: string,
  docId: string,
  data: FirebaseFirestore.DocumentData,
  changeType: "create" | "update" | "delete"
) {
  const ts = Timestamp.now();
  await db
    .collection("snapshots")
    .doc(collection)
    .collection(docId)
    .doc(String(ts.toMillis()))
    .set({ changeType, at: ts, data });
}

// ✅ Hello World (HTTP)
export const helloWorld = onRequest(
  { region: "asia-northeast1" },
  (req, res) => {
    res.send("Hello from GenbaNote Functions v2!");
  }
);

// ✅ Clients
export const onClientsWrite = onDocumentWritten(
  { document: "clients/{clientId}", region: "asia-northeast1" },
  async (event) => {
    const id = event.params.clientId as string;
    const before = event.data?.before;
    const after = event.data?.after;

    if (!before?.exists && after?.exists) {
      await saveSnapshot("clients", id, after.data()!, "create");
    } else if (before?.exists && after?.exists) {
      await saveSnapshot("clients", id, after.data()!, "update");
    } else if (before?.exists && !after?.exists) {
      await saveSnapshot("clients", id, before.data()!, "delete");
    }
  }
);

// ✅ Sites
export const onSitesWrite = onDocumentWritten(
  { document: "sites/{siteId}", region: "asia-northeast1" },
  async (event) => {
    const id = event.params.siteId as string;
    const before = event.data?.before;
    const after = event.data?.after;

    if (!before?.exists && after?.exists) {
      await saveSnapshot("sites", id, after.data()!, "create");
    } else if (before?.exists && after?.exists) {
      await saveSnapshot("sites", id, after.data()!, "update");
    } else if (before?.exists && !after?.exists) {
      await saveSnapshot("sites", id, before.data()!, "delete");
    }
  }
);

// ✅ Schedules
export const onSchedulesWrite = onDocumentWritten(
  { document: "schedules/{scheduleId}", region: "asia-northeast1" },
  async (event) => {
    const id = event.params.scheduleId as string;
    const before = event.data?.before;
    const after = event.data?.after;

    if (!before?.exists && after?.exists) {
      await saveSnapshot("schedules", id, after.data()!, "create");
    } else if (before?.exists && after?.exists) {
      await saveSnapshot("schedules", id, after.data()!, "update");
    } else if (before?.exists && !after?.exists) {
      await saveSnapshot("schedules", id, before.data()!, "delete");
    }
  }
);
