// app/schedules/[id]/edit/page.tsx
'use client';

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, Timestamp, serverTimestamp
} from 'firebase/firestore';
import type { Client, Worker } from "@/types/db";
import Link from "next/link";
import styles from '../../new/newSchedule.module.css';

// JST一日のレンジ
function jstDayRange(ymd: string) {
  const start = new Date(`${ymd}T00:00:00+09:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// 任意の入力（Timestamp / Date / string）から、JSTの 'YYYY-MM-DD' を安全に取り出す
function toYmdJST(src: any): string {
  if (!src) return "";
  // 文字列 'YYYY-MM-DD' はそのまま返す（ズレを防ぐ）
  if (typeof src === "string" && /^\d{4}-\d{2}-\d{2}$/.test(src)) {
    return src;
  }
  let d: Date | null = null;
  if (typeof src?.toDate === "function") {
    d = src.toDate();
  } else if (src instanceof Date) {
    d = src;
  } else {
    const tmp = new Date(src);
    if (!isNaN(tmp.getTime())) d = tmp;
  }
  if (!d || isNaN(d.getTime())) return "";
  const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, "0");
  const dd = String(jst.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function ScheduleEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [date, setDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [task, setTask] = useState("");
  const [workerIds, setWorkerIds] = useState<string[]>([]);

  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  // 既存データ読み込み（startAt → scheduledAt → 旧 date の順にフォールバック）
  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "schedules", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data() as any;
        const dateSource = d.startAt ?? d.scheduledAt ?? d.date ?? null;
        setDate(toYmdJST(dateSource));
        setClientId(d.clientId ?? "");
        setSiteName(d.siteName ?? "");
        setTask(d.task ?? "");
        setWorkerIds(d.workerIds ?? []);
      }
    };
    load();
  }, [id]);

  // マスターデータ購読
  useEffect(() => {
    const unsubC = onSnapshot(query(collection(db, "clients"), orderBy("name")), (s) => {
      setClients(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Client[]);
    });
    const unsubW = onSnapshot(query(collection(db, "workers"), orderBy("name")), (s) => {
      setWorkers(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Worker[]);
    });
    return () => { unsubC(); unsubW(); };
  }, []);

  const toggleWorker = (wid: string) => {
    setWorkerIds((prev) => prev.includes(wid) ? prev.filter(x => x !== wid) : [...prev, wid]);
  };

  const canSubmit = useMemo(() => {
    return Boolean(date && clientId && siteName.trim() && task.trim());
  }, [date, clientId, siteName, task]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const client = clients.find(c => c.id === clientId);
    const selectedWorkers = workers.filter(w => workerIds.includes(w.id));
    const { start, end } = jstDayRange(date);

    await updateDoc(doc(db, "schedules", id), {
      clientId,
      clientName: client?.name ?? "(不明な取引先)",
      siteName: siteName.trim(),
      task: task.trim(),
      workerIds,
      workerNames: selectedWorkers.map(w => w.name),
      startAt: Timestamp.fromDate(start),
      endAt: Timestamp.fromDate(end),
      updatedAt: serverTimestamp(),
    });

    router.push(`/schedules/${id}`);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>予定を編集</h1>

        <form onSubmit={handleUpdate} className={styles.grid}>
          <label className={styles.field}>
            <div className={styles.label}>作業日</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
              aria-invalid={!date}
              required
            />
          </label>

          <label className={styles.field}>
            <div className={styles.label}>取引先（元請）</div>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={styles.select}
              aria-invalid={!clientId}
              required
            >
              <option value="">選択してください</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <div className={styles.label}>現場名</div>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className={styles.input}
              placeholder="例：○○ビル3F"
              aria-invalid={!siteName.trim()}
              autoComplete="organization"
              inputMode="text"
              required
            />
          </label>

          <label className={styles.field}>
            <div className={styles.label}>業務内容</div>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className={styles.input}
              placeholder="例：改修工事、内装解体、搬出"
              aria-invalid={!task.trim()}
              autoComplete="on"
              inputMode="text"
              required
            />
          </label>

          <div className={styles.field}>
            <div className={styles.label}>外注先（複数選択可）</div>
            <div className={styles.checkboxGrid}>
              {workers.map((w) => (
                <label key={w.id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={workerIds.includes(w.id)}
                    onChange={() => toggleWorker(w.id)}
                  />
                  <span>{w.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} disabled={!canSubmit}>保存</button>
            <Link className={styles.btnGhost} href={`/schedules/${id}`}>キャンセル</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
