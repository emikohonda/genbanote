// components/TodayCard.tsx
'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// 表示用（JST）
function formatJPDate(d: Date) {
  const w = ["日","月","火","水","木","金","土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${w}）`;
}

// JSTの "YYYY-MM-DD" を作る（保存と一致させる）
function ymdJST(dUTC: Date) {
  const jst = new Date(dUTC.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const y = jst.getFullYear();
  const m = String(jst.getMonth()+1).padStart(2, "0");
  const dd = String(jst.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function TodayCard() {
  const [now, setNow] = useState(() => new Date());
  const todayJST = useMemo(() => ymdJST(now), [now]); // JSTの YYYY-MM-DD
  const [count, setCount] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ⏱ 日付跨ぎ対応：1分ごとに now を更新（負荷を抑えつつ、日付が変われば再フェッチ）
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/schedules?date=${todayJST}`, { cache: "no-store" });
        if (!res.ok) { setCount(0); return; }
        const data = await res.json();
        if (typeof data?.count === 'number') setCount(data.count);
        else if (Array.isArray(data?.items)) setCount(data.items.length);
        else setCount(0);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message ?? 'fetch error');
        setCount(0);
      }
    })();
  }, [todayJST]);

  // 表示用の“本日”もJSTで
  const displayDate = useMemo(() => {
    const jstDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    return formatJPDate(jstDate);
  }, [todayJST]);

  return (
    <div className="today-card">
      <div className="today-card__head">
        <h2 className="today-title">本日の予定</h2>
        <span className="pill-today">{displayDate}</span>
      </div>

      <div className="today-stats">
        <div className="stat">
          <div className="stat-value">
            {count === null ? '-' : count}
            <span className="stat-suffix">件</span>
          </div>
          {/* <div className="stat-label muted">{err ? "（オフライン表示）" : "予定件数"}</div> */}
        </div>

        <div className="today-actions">
          <Link href='/schedules' className="btn">予定一覧</Link>
          <Link href='/calendar' className='btn'>カレンダー</Link>
        </div>
      </div>
    </div>
  );
}
