// app/calendar/page.tsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import '../../styles/calendar.css';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
} from 'firebase/firestore';
import { useClientsMap } from '@/hooks/useClientsMap';

type Schedule = {
  id: string;
  siteName?: string;
  clientId?: string;
  clientName?: string;
  note?: string;
  startAt?: Timestamp | null;
  endAt?: Timestamp | null;
  scheduledAt?: Timestamp | null;
  date?: string | null;
  done?: boolean;
  status?: 'complete' | 'incomplete';
};

const scheduleConverter: FirestoreDataConverter<Schedule> = {
  toFirestore(data) { return data; },
  fromFirestore(snap, options) {
    const d = snap.data(options) as any;
    return {
      id: snap.id,
      siteName: d.siteName,
      clientId: d.clientId ?? null,
      clientName: d.clientName,
      note: d.note,
      startAt: d.startAt ?? null,
      endAt: d.endAt ?? null,
      scheduledAt: d.scheduledAt ?? null,
      date: typeof d.date === 'string' ? d.date : null,
      // ★ 新旧スキーマを吸収
      done: d.done === true || d.status === 'complete',
      status: d.status, // あっても使わないが保持はOK
    };
  },
};

function fmtYMD(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 優先度：startAt → scheduledAt → date
function toYMDFromDoc(doc: Schedule): string | null {
  if (doc.startAt instanceof Timestamp) return fmtYMD(doc.startAt.toDate());
  if (doc.scheduledAt instanceof Timestamp) return fmtYMD(doc.scheduledAt.toDate());
  if (doc.date && /^\d{4}-\d{2}-\d{2}$/.test(doc.date)) return doc.date;
  return null;
}

export default function CalendarPage() {
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const clientsMap = useClientsMap();

  useEffect(() => {
    const ref = collection(db, 'schedules').withConverter(scheduleConverter);
    const unsub = onSnapshot(ref, (snap) => {
      setSchedules(snap.docs.map((d) => d.data()));
    });
    return () => unsub();
  }, []);

  const today = new Date();
  const isSameYMD = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const daysInCalendar = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    const startWeekday = start.getDay();
    start.setDate(start.getDate() - startWeekday);

    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    const lastDay = new Date(year, month + 1, 0);
    return { cells, firstDay, lastDay, year, month };
  }, [viewDate]);

  // 祝日
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set());
  useEffect(() => {
    const y = daysInCalendar.year;
    let canceled = false;
    (async () => {
      try {
        const res = await fetch(`/api/holidays/${y}`, { cache: 'force-cache' });
        const data: { year: number; days: string[] } = await res.json();
        if (!canceled) setHolidaySet(new Set(data.days));
      } catch { setHolidaySet(new Set()); }
    })();
    return () => { canceled = true; };
  }, [daysInCalendar.year]);

  // 日付ごとにマップ
  const eventsMap = useMemo(() => {
    const m = new Map<string, Schedule[]>();
    for (const sc of schedules) {
      const ymd = toYMDFromDoc(sc);
      if (!ymd) continue;
      if (!m.has(ymd)) m.set(ymd, []);
      m.get(ymd)!.push(sc);
    }
    return m;
  }, [schedules]);

  const selectedEvents = useMemo(() => {
    if (!selectedYmd) return [];
    return eventsMap.get(selectedYmd) ?? [];
  }, [selectedYmd, eventsMap]);

  const headerLabel = `${daysInCalendar.year}年 ${daysInCalendar.month + 1}月`;

  const goPrevMonth = () => { const d = new Date(viewDate); d.setMonth(viewDate.getMonth() - 1); setViewDate(d); setSelectedYmd(null); };
  const goNextMonth = () => { const d = new Date(viewDate); d.setMonth(viewDate.getMonth() + 1); setViewDate(d); setSelectedYmd(null); };

  const daylistRef = useRef<HTMLDivElement | null>(null);

  return (
    <main className="page-wrap calendar-page">
      {/* 上部ツールバー：タイトル＋新規作成 */}
      <div className="cal-topbar">
        <h1 className="cal-topbar-title">カレンダー</h1>
        <Link
          href="/schedules/new"
          className="btn"
          accessKey="n"
          aria-label="予定を新規作成 (ショートカット: N)"
        >
          + 新規作成
        </Link>
      </div>

      <section className="card">
        <div className="cal-header">
          <button className="btn-ghost" onClick={goPrevMonth} aria-label="前の月へ">◀</button>
          <h1 className="cal-title">{headerLabel}</h1>
          <button className="btn-ghost" onClick={goNextMonth} aria-label="次の月へ">▶</button>
        </div>

        <div className="cal-grid">
          {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}

          {daysInCalendar.cells.map((d, idx) => {
            const ymd = fmtYMD(d);
            const inMonth = d.getMonth() === daysInCalendar.month;
            const todays = eventsMap.get(ymd) || [];
            const isSelected = selectedYmd === ymd;

            const dow = d.getDay();
            const isSun = dow === 0;
            const isSat = dow === 6;
            const isToday = isSameYMD(d, today);
            const isHoliday = inMonth && holidaySet.has(ymd);

            return (
              <button
                key={idx}
                className={[
                  'cal-cell',
                  inMonth ? '' : 'is-out',
                  todays.length ? 'has-events' : '',
                  isSelected ? 'is-selected' : '',
                  isSun ? 'is-sun' : '',
                  isSat ? 'is-sat' : '',
                  isToday ? 'is-today' : '',
                  isHoliday ? 'is-holiday' : '',
                ].join(' ')}
                onClick={() => {
                  if (todays.length) {
                    setSelectedYmd(ymd);
                    setTimeout(() => {
                      daylistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 0);
                  }
                }}
                aria-pressed={isSelected}
                aria-label={`${ymd} ${todays.length ? `予定 ${todays.length} 件` : '予定なし'}`}
              >
                <div className="date-number">{d.getDate()}</div>
                {todays.length > 0 && (
                  <div className="event-badges">
                    <span className="badge">{todays.length}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="muted" style={{ marginTop: 8 }}>
          ● 予定がある日だけクリックできます（下に当日の予定一覧が出ます）
        </p>
      </section>

      <section className="card" ref={daylistRef}>
        <header className="daylist-header">
          <h2>
            当日の予定
            {selectedYmd && <span className="muted">（{selectedEvents.length}件）</span>}
          </h2>
          <p className="muted">{selectedYmd ?? '— 未選択 —'}</p>
        </header>

        {selectedYmd && selectedEvents.length === 0 && <p className="muted">選択日の予定はありません</p>}

        {selectedYmd && selectedEvents.length > 0 && (
          <ul className="daylist">
            {selectedEvents.map(ev => {
              const clientLatest = ev.clientId ? clientsMap.get(ev.clientId) : undefined;
              const isComplete = ev.done === true || ev.status === 'complete'; // 念のため旧にも対応
              return (
                <li key={ev.id} className="daylist-item">
                  <div className="daylist-main">
                    <div className="daylist-title">
                      {ev.siteName ?? '（現場名 - 未入力）'}
                      {/* ✅ Nullish と OR 併用はカッコ必須。空文字も「未入力」に落とす */}
                      <span className="muted">
                        （{clientLatest ?? (ev.clientName || '取引先 - 未入力')}）
                      </span>
                      {/* 追加: ステータス表示（CSSいじらず絵文字） */}
                      <span style={{ marginLeft: 8 }}>{isComplete ? '⭕️ 完了済み' : '❌ 未完了'}</span>
                    </div>
                    {ev.note && <div className="daylist-note">{ev.note}</div>}
                  </div>
                  <Link className="btn-link" href={`/schedules/${ev.id}`}>詳細</Link>
                </li>
              );
            })}
          </ul>
        )}

        {!selectedYmd && <p className="muted">カレンダーから日付を選択してください</p>}
      </section>
    </main>
  );
}
