'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  DocumentData,
} from 'firebase/firestore';
import styles from '../../schedules.module.css';

type FirestoreTs = { seconds: number; nanoseconds: number };
type Entry = {
  id: string; // timestamp doc id
  at?: FirestoreTs;
  changeType: 'create' | 'update' | 'delete';
  data: Record<string, any>;
};

function formatAt(at?: FirestoreTs) {
  if (!at) return '—';
  const d = new Date(at.seconds * 1000 + Math.floor(at.nanoseconds / 1e6));
  return d.toLocaleString('ja-JP', { hour12: false });
}

function computeDiff(curr?: Record<string, any>, prev?: Record<string, any>) {
  if (!curr || !prev) return [];
  const keys = Array.from(new Set([...Object.keys(curr), ...Object.keys(prev)]));
  const diffs: { key: string; before: any; after: any }[] = [];
  for (const k of keys) {
    const a = curr[k];
    const b = prev[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push({ key: k, before: b, after: a });
    }
  }
  return diffs;
}

export default function ScheduleHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Entry[]>([]);

  useEffect(() => {
    // snapshots/schedules/{id} を at 降順で取得
    const path = collection(db, 'snapshots', 'schedules', id);
    const q = query(path, orderBy('at', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const rows: Entry[] = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: d.id,
          at: data.at,
          changeType: data.changeType,
          data: (data.data ?? {}) as Record<string, any>,
        };
      });
      setItems(rows);
    });
    return () => unsub();
  }, [id]);

  const rowsWithDiff = useMemo(() => {
    return items.map((row, idx) => {
      const prev = items[idx + 1];
      const diffs = computeDiff(row.data, prev?.data);
      return { ...row, diffs };
    });
  }, [items]);

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>予定の変更履歴</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/schedules/${id}`} className={styles.btnGhost}>詳細に戻る</Link>
          <Link href="/schedules" className={styles.btnPrimary}>一覧へ</Link>
        </div>
      </header>

      {rowsWithDiff.length === 0 ? (
        <div className={styles.empty}>履歴はまだありません。</div>
      ) : (
        <div className={styles.timeline}>
          {rowsWithDiff.map((row) => (
            <div key={row.id} className={styles.timelineItem}>
              <div className={styles.timelineHeader}>
                <span
                  className={
                    row.changeType === 'create'
                      ? styles.badgeCreate
                      : row.changeType === 'update'
                        ? styles.badgeUpdate
                        : styles.badgeDelete
                  }
                >
                  {row.changeType.toUpperCase()}
                </span>
                <span className={styles.timelineDate}>{formatAt(row.at)}</span>
              </div>

              {row.diffs.length > 0 ? (
                <div className={styles.diffList}>
                  {row.diffs.map((d) => (
                    <div key={d.key} className={styles.diffRow}>
                      <div className={styles.diffKey}>{d.key}</div>
                      <div className={styles.diffArrow}>→</div>
                      <div className={styles.diffValues}>
                        {d.before !== undefined && (
                          <span className={styles.diffBefore}>
                            {String(d.before)}
                          </span>
                        )}
                        <span className={styles.diffAfter}>
                          {String(d.after)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className={styles.timelineJson}>
                  {JSON.stringify(row.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
