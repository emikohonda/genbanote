// app/schedules/[id]/page.tsx
'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from "next/link";
import styles from '../schedules.module.css';
import { useClientsMap } from '@/hooks/useClientsMap';

type FirestoreTimestamp = { toDate: () => Date };

type ScheduleDoc = {
  date?: string | number | FirestoreTimestamp | null; // 旧
  startAt?: FirestoreTimestamp | null; // 新
  endAt?: FirestoreTimestamp | null;
  clientId?: string;
  clientName?: string;
  siteName?: string;
  task?: string;
  workerIds?: string[];
  workerNames?: string[];
  createdAt?: FirestoreTimestamp | string | number | null;
  updatedAt?: FirestoreTimestamp | string | number | null;
};

function anyToDate(v: ScheduleDoc['date'] | ScheduleDoc['startAt'] | ScheduleDoc['createdAt']): Date | null {
  if (!v) return null;
  if (typeof (v as any)?.toDate === 'function') return (v as FirestoreTimestamp).toDate();
  if (typeof v === 'number') {
    const ms = v > 1e12 ? v : v * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
    const m = v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
    if (m) {
      const [_, y, mo, da, hh = '0', mm = '0'] = m;
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

function formatJPDateTime(d: Date | null) {
  if (!d) return "-";
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScheduleShowPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ScheduleDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const clientsMap = useClientsMap();

  useEffect(() => {
    const load = async () => {
      const ref = doc(db, "schedules", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        router.replace('/schedules');
        return;
      }
      setData(snap.data() as ScheduleDoc);
      setLoading(false);
    };
    load();
  }, [id, router]);

  if (loading) return <main className={styles.wrapper}>読み込み中...</main>;
  if (!data) return null;

  const workDate = formatJPDate(anyToDate(data.startAt ?? data.date ?? null));
  const created = formatJPDateTime(anyToDate(data.createdAt ?? null));
  const updated = formatJPDateTime(anyToDate(data.updatedAt ?? null));

  const clientLatest = data.clientId ? clientsMap.get(data.clientId) : undefined;

  return (
    <main className={styles.wrapper}>
      <header className={styles.header} style={{ marginBottom: 12 }}>
        <h1 className={styles.title}>予定の詳細</h1>
        <div className={styles.headerActions}>
          <Link href={`/schedules/${id}/edit`} className={styles.btnPrimary}>編集</Link>
          <Link href="/schedules" className={styles.btnGhost}>一覧へ戻る</Link>
        </div>
      </header>

      <article className={styles.detailCard}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>作業日</span>
          <span className={styles.detailValue}>{workDate}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>現場名</span>
          <span className={styles.detailValue}>{data.siteName || "-"}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>業務内容</span>
          <span className={styles.detailValue}>{data.task || "-"}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>取引先</span>
          <span className={styles.detailValue}>
            {clientLatest ?? data.clientName ?? "-"}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>外注先</span>
          <span className={styles.detailValue}>
            {data.workerNames?.length ? data.workerNames.join("、") : "-"}
          </span>
        </div>

        <hr className={styles.detailDivider} />

        <div className={styles.detailMeta}>
          <span>作成日: {created}</span>
          <span>更新日: {updated}</span>
        </div>
      </article>
    </main>
  );
}
