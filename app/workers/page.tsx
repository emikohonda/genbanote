'use client';

import {
  collection, onSnapshot, orderBy, query, DocumentData,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import type { Worker } from '@/types/worker';
import '@/styles/workers.css';

export type WorkerItem = Worker & { id: string };

export default function WorkersPage() {
  const [items, setItems] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'workers'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as WorkerItem[];
      setItems(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return items;
    return items.filter(w => w.name?.toLowerCase().includes(key));
  }, [items, search]);

  return (
    <div className="page-wrap workers-page">
      <header className="page-header">
        <h1>外注先</h1>
        <p className="muted">最大10人まで登録・編集ができます。</p>
      </header>

      <div className="toolbar">
        <div className="left">
          <input
            className="input input-search"
            placeholder="名前で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="right">
          <Link href="/workers/new" className="btn btn-primary">+ 新規登録</Link>
        </div>
      </div>

      {loading ? (
        <div className="skeleton">読み込み中…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>まだ外注先がありません。</p>
          <Link href="/workers/new" className="btn btn-primary">最初の外注先を登録</Link>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((w) => (
            <div key={w.id} className="card worker-card">
              <div className="worker-header">
                <Link href={`/workers/${w.id}`} className="worker-name-link">{w.name}</Link>
                <div className="worker-actions">
                  <Link href={`/workers/${w.id}`} className="badge">編集</Link>
                </div>
              </div>
              {/* ここに電話番号やメモを出すなら追記 */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
