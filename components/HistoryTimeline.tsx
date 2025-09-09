// components/HistoryTimeline.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  DocumentData,
  Timestamp,
  collection as fsCollection,
  onSnapshot as fsOnSnapshot,
  orderBy as fsOrderBy,
  query as fsQuery,
} from 'firebase/firestore';
import { useClientsMap } from '@/hooks/useClientsMap';

/** オプション */
type HistoryTimelineProps = {
  /** 監視先: 'clients' | 'sites' | 'schedules' */
  collectionKey: 'clients' | 'sites' | 'schedules';
  /** 対象ドキュメントのID */
  docId: string;
  /** 取得件数（新しい順） */
  pageSize?: number;
  /** 差分から除外するキー（ノイズ抑止） */
  ignoreKeys?: string[];
};

type Entry = {
  id: string; // snapshot doc id
  at?: { seconds: number; nanoseconds: number } | Timestamp;
  changeType: 'create' | 'update' | 'delete';
  data: Record<string, any>;
};

type DiffRow = {
  key: string;
  before: any;
  after: any;
};

/* ====== JST helpers ====== */
function toJSTDate(d: Date) {
  // ローカルからJSTに変換（安定のロケールハック）
  return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
}
function fmtYMDJST(d: Date) {
  const j = toJSTDate(d);
  const y = j.getFullYear();
  const m = String(j.getMonth() + 1).padStart(2, '0');
  const dd = String(j.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function fmtYMDHMJST(d: Date) {
  // 例: 2025/09/09 08:30
  return toJSTDate(d).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
function tsLikeToDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v?.seconds === 'number') {
    return new Date(v.seconds * 1000 + Math.floor((v.nanoseconds ?? 0) / 1e6));
  }
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/* ====== 名称解決（JOIN） ====== */
function useWorkersMap() {
  const [map, setMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const unsub = fsOnSnapshot(
      fsQuery(fsCollection(db, 'workers'), fsOrderBy('name')),
      (snap) => {
        const m = new Map<string, string>();
        for (const d of snap.docs) {
          const data = d.data() as any;
          m.set(d.id, data?.name ?? '');
        }
        setMap(m);
      }
    );
    return () => unsub();
  }, []);
  return map;
}

/* ====== 表示ラベル ====== */
const LABELS: Record<string, string> = {
  startAt: '作業日(開始)',
  endAt: '作業日(終了)',
  scheduledAt: '作業日（旧・単一）',
  date: '作業日（旧・文字列）',
  clientId: '取引先',
  clientName: '取引先（保存値）',
  siteName: '現場名',
  task: '業務内容',
  workerIds: '外注先',
  workerNames: '外注先（保存名）',
  note: 'メモ',
};

/* ====== 値の正規化（人間が読みやすい形へ） ====== */
function normalizeValue(key: string, value: any, opts: {
  clientsMap: Map<string, string>;
  workersMap: Map<string, string>;
}) {
  // 日付系は JST に
  if (key === 'startAt' || key === 'endAt' || key === 'scheduledAt') {
    const d = tsLikeToDate(value);
    return d ? fmtYMDJST(d) : value;
  }
  if (key === 'date') {
    // 'YYYY-MM-DD' 想定はそのまま、それ以外ならできる限りJST日付に
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = tsLikeToDate(value);
    return d ? fmtYMDJST(d) : value;
  }

  // JOIN系
  if (key === 'clientId') {
    if (typeof value === 'string') {
      const name = opts.clientsMap.get(value);
      return name ? `${name} (${value})` : value;
    }
  }
  if (key === 'workerIds') {
    if (Array.isArray(value)) {
      const names = value.map((id) => opts.workersMap.get(id) || id);
      return names.join('、');
    }
  }

  // Timestamp など一般的な ts-like も人間可読に
  if (value instanceof Timestamp || (value && typeof value.seconds === 'number')) {
    const d = tsLikeToDate(value);
    return d ? fmtYMDHMJST(d) : value;
  }

  // オブジェクト/配列は JSON に（長いときは UI 側で truncate ）
  if (typeof value === 'object' && value !== null) {
    try { return JSON.stringify(value); } catch { /* noop */ }
  }
  return value;
}

/* ====== 差分計算（ignoreKeys を除外・正規化して比較） ====== */
function computeDiff(
  curr: Record<string, any> | undefined,
  prev: Record<string, any> | undefined,
  ignoreKeys: string[],
  resolve: (k: string, v: any) => any
): DiffRow[] {
  if (!curr && !prev) return [];
  const keys = Array.from(new Set([...(curr ? Object.keys(curr) : []), ...(prev ? Object.keys(prev) : [])]))
    .filter((k) => !ignoreKeys.includes(k));

  const diffs: DiffRow[] = [];
  for (const k of keys) {
    const aRaw = curr?.[k];
    const bRaw = prev?.[k];

    const a = resolve(k, aRaw);
    const b = resolve(k, bRaw);

    // JSON化で同値判定（Timestamp等は normalizeValue で文字列化済み）
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (!same) diffs.push({ key: k, before: b, after: a });
  }
  return diffs;
}

function badgeClass(type: Entry['changeType']) {
  switch (type) {
    case 'create': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'update': return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'delete': return 'bg-rose-100 text-rose-700 border border-rose-200';
  }
}

function formatDate(at?: { seconds: number; nanoseconds: number } | Timestamp) {
  const d = tsLikeToDate(at);
  return d ? fmtYMDHMJST(d) : '—';
}

export default function HistoryTimeline({
  collectionKey,
  docId,
  pageSize = 50,
  ignoreKeys = ['updatedAt', 'createdAt'], // ← 既定でノイズ抑止
}: HistoryTimelineProps) {
  const [items, setItems] = useState<Entry[]>([]);
  const path = useMemo(
    () => collection(db, 'snapshots', collectionKey, docId),
    [collectionKey, docId]
  );

  // 名称解決マップ
  const clientsMap = useClientsMap();
  const workersMap = useWorkersMap();

  useEffect(() => {
    const q = query(path, orderBy('at', 'desc'), limit(pageSize));
    const unsub = onSnapshot(q, (snap) => {
      const rows: Entry[] = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: d.id,
          at: (data.at as any) ?? undefined,
          changeType: data.changeType,
          data: data.data ?? {},
        };
      });
      setItems(rows);
    });
    return () => unsub();
  }, [path, pageSize]);

  const rowsWithDiff = useMemo(() => {
    const resolver = (k: string, v: any) => normalizeValue(k, v, { clientsMap, workersMap });
    return items.map((row, idx) => {
      const prev = items[idx + 1]; // ひとつ古い
      const diffs = computeDiff(row.data, prev?.data, ignoreKeys, resolver);
      return { ...row, diffs };
    });
  }, [items, clientsMap, workersMap, ignoreKeys]);

  return (
    <div className="space-y-4">
      {rowsWithDiff.length === 0 && (
        <div className="text-sm text-gray-500">履歴はまだありません。</div>
      )}

      {rowsWithDiff.map((row) => (
        <div
          key={row.id}
          className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white"
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className={`px-2 py-1 rounded-lg text-xs font-medium ${badgeClass(row.changeType)}`}
            >
              {row.changeType.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{formatDate(row.at)}</span>
          </div>

          {/* 差分があれば差分を優先表示、無ければデータ全体を抜粋 */}
          {row.diffs.length > 0 ? (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">変更された項目</div>
              <ul className="text-sm space-y-1">
                {row.diffs.map((d) => {
                  const label = LABELS[d.key] ?? d.key;
                  return (
                    <li key={d.key} className="grid grid-cols-3 gap-2">
                      <span className="text-gray-600">{label}</span>
                      <span className="truncate text-gray-500 col-span-1">→</span>
                      <span className="truncate col-span-1">
                        <span className="line-through text-gray-400 mr-1">
                          {String(d.before ?? '—')}
                        </span>
                        <span className="font-medium">{String(d.after ?? '—')}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <pre className="mt-3 text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-56">
              {JSON.stringify(
                // 差分が無かったケースでも、見やすいように正規化して表示
                Object.fromEntries(
                  Object.entries(row.data || {}).map(([k, v]) => [
                    LABELS[k] ?? k,
                    normalizeValue(k, v, { clientsMap, workersMap }),
                  ])
                ),
                null,
                2
              )}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
