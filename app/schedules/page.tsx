// app/schedules/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import styles from "./schedules.module.css";
import { useClientsMap } from "@/hooks/useClientsMap";

type FirestoreTimestamp = { toDate: () => Date };

type FSched = {
  // 旧スキーマ
  date?: string | number | FirestoreTimestamp | null;
  // 新スキーマ
  startAt?: FirestoreTimestamp | null;
  endAt?: FirestoreTimestamp | null;

  clientId?: string;
  clientName?: string;
  siteName?: string;
  task?: string;
  createdAt?: FirestoreTimestamp | string | number | null;
  updatedAt?: FirestoreTimestamp | string | number | null;
};

type Row = {
  id: string;
  dateJP: string;      // 和式表示
  clientId?: string;   // JOIN 用
  clientName: string;  // フォールバック用
  siteName: string;
  task: string;
  createdAt: string;
  updatedAt: string;
};

function anyToDate(v: FSched["date"] | FSched["startAt"]): Date | null {
  if (!v) return null;
  if (typeof (v as any)?.toDate === "function") return (v as FirestoreTimestamp).toDate();
  if (typeof v === "number") {
    const ms = v > 1e12 ? v : v * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
    const m = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
    if (m) {
      const [_, y, mo, da, hh = "0", mm = "0"] = m;
      const d2 = new Date(Number(y), Number(mo) - 1, Number(da), Number(hh), Number(mm));
      return isNaN(d2.getTime()) ? null : d2;
    }
  }
  return null;
}

function formatJPDate(d: Date | null) {
  if (!d) return "-";
  const w = ["日","月","火","水","木","金","土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${w}）`;
}

function fmtDateTimeJP(v: FSched["createdAt"]) {
  if (!v) return "";
  if (typeof (v as any)?.toDate === "function") return (v as FirestoreTimestamp).toDate().toLocaleString("ja-JP");
  if (typeof v === "number") return new Date(v).toLocaleString("ja-JP");
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toLocaleString("ja-JP");
  }
  return "";
}

export default function SchedulesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const clientsMap = useClientsMap();

  useEffect(() => {
    const q = query(collection(db, "schedules"), orderBy("startAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Row[] = snap.docs.map((d) => {
        const data = d.data() as FSched;
        const start = data.startAt?.toDate
          ? data.startAt.toDate()
          : anyToDate(data.date ?? null);
        return {
          id: d.id,
          dateJP: formatJPDate(start),
          clientId: data.clientId ?? undefined,
          clientName: data.clientName ?? "",
          siteName: data.siteName ?? "",
          task: data.task ?? "",
          createdAt: fmtDateTimeJP(data.createdAt),
          updatedAt: fmtDateTimeJP(data.updatedAt),
        };
      });
      setRows(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>予定一覧</h1>
        <Link href="/schedules/new" className={styles.btnPrimary}>+ 新規作成</Link>
      </header>

      {loading && <div>読み込み中...</div>}

      {!loading && rows.length === 0 && (
        <div className={styles.empty}>まだ予定がありません。</div>
      )}

      <div className={styles.grid}>
        {rows.map((r) => {
          const clientLatest = r.clientId ? clientsMap.get(r.clientId) : undefined;
          return (
            <Link key={r.id} href={`/schedules/${r.id}`} className={styles.cardLink}>
              <div className={styles.card}>
                <div className={styles.date}>{r.dateJP || "-"}</div>
                <div className={styles.site}>{r.siteName}</div>
                <div className={styles.task}>{r.task}</div>
                <div className={styles.client}>
                  取引先: {clientLatest ?? r.clientName ?? "-"}
                </div>
                <div className={styles.meta}>
                  <span>作成: {r.createdAt}</span>
                  <span>更新: {r.updatedAt}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
