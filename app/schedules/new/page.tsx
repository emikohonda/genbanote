"use client";
import styles from '../new/newSchedule.module.css';
import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import type { Client, Worker } from "@/types/db";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';

// ★ 追加：ヘルパー使用
import { createWithTimestamps } from '@/lib/firestoreHelpers';

export default function NewSchedulePage() {
  const [date, setDate] = useState(""); // 'YYYY-MM-DD'
  const [clientId, setClientId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [task, setTask] = useState("");
  const [workerIds, setWorkerIds] = useState<string[]>([]);

  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const router = useRouter();

  // モーダル制御
  const [openModal, setOpenModal] = useState(false);
  const okButtonRef = useRef<HTMLButtonElement | null>(null);

  // 完了トグル用
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const unsubC = onSnapshot(query(collection(db, "clients"), orderBy("name")), (s) => {
      setClients(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Client[]);
    });
    const unsubW = onSnapshot(query(collection(db, "workers"), orderBy("name")), (s) => {
      setWorkers(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Worker[]);
    });
    return () => { unsubC(); unsubW(); };
  }, []);

  // モーダルが開いたらOKボタンにフォーカス & 背景スクロール防止
  useEffect(() => {
    if (openModal && okButtonRef.current) okButtonRef.current.focus();
    document.body.style.overflow = openModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [openModal]);

  const toggleWorker = (id: string) => {
    setWorkerIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const canSubmit = useMemo(() => {
    return Boolean(date && clientId && siteName.trim() && task.trim());
  }, [date, clientId, siteName, task]);

  // JSTのその日 [00:00, 翌日00:00) を作るヘルパー
  function jstDayRange(ymd: string) {
    const start = new Date(`${ymd}T00:00:00+09:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const client = clients.find(c => c.id === clientId);
    const selectedWorkers = workers.filter(w => workerIds.includes(w.id));

    // JST基準で終日レンジ
    const { start, end } = jstDayRange(date);

    // 未ログインOK: uid は null のまま渡す（createdBy を付けない）
    const uid = auth.currentUser?.uid ?? null;

    await createWithTimestamps('schedules', {
      clientId,
      clientName: client?.name ?? "(不明な取引先)",
      siteName: siteName.trim(),
      task: task.trim(),
      workerIds,
      workerNames: selectedWorkers.map(w => w.name),
      startAt: Timestamp.fromDate(start),
      endAt: Timestamp.fromDate(end),
      done: isComplete,
    }, uid);

    // フォームをリセット
    setDate(""); setClientId(""); setSiteName(""); setTask(""); setWorkerIds([]);
    setIsComplete(false);

    // モーダルを開く
    setOpenModal(true);
  };

  const closeModal = () => setOpenModal(false);
  const handleKeyDownOnOverlay = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') closeModal();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>予定の新規作成</h1>

        <form onSubmit={submit} className={styles.grid}>
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

          <label className={styles.field}>
            <div className={styles.label}>ステータス</div>
            <label className={styles.checkboxLabel}>
              <input
                type='checkbox'
                checked={isComplete}
                onChange={(e) => setIsComplete(e.target.checked)}
              />
              <span>完了済み</span>
            </label>
          </label>

          <div className={styles.actions}>
            <div className={styles.rightActions}>
              <Link href="/schedules" className={styles.btnGhost}>
                キャンセル
              </Link>
              <button className={styles.btn} disabled={!canSubmit}>
                新規作成
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* ✅ モーダル（中央・大きめ） */}
      {openModal && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={closeModal}
          onKeyDown={handleKeyDownOnOverlay}
          tabIndex={-1}
        >
          {/* stopPropagationで内側クリック時は閉じない */}
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scheduleAddedTitle"
            aria-describedby="scheduleAddedDesc"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              aria-label="閉じる"
              onClick={closeModal}
            >
              ×
            </button>

            <h2 id="scheduleAddedTitle" className={styles.modalTitle}>
              予定を追加しました。
            </h2>
            <p id="scheduleAddedDesc" className={styles.modalBody}>
              カレンダーでもご確認いただけます。
            </p>

            <div className={styles.modalActions}>
              <Link href="/calendar" className={styles.btnPrimary}>
                カレンダー
              </Link>
              <button
                ref={okButtonRef}
                className={styles.btnSecondary}
                onClick={() => router.push("/schedules")} // 一覧に戻る
              >
                予定一覧
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
