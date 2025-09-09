'use client';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  DocumentData,
} from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import type { Client } from '@/types/client';
import '@/styles/clients.css';

export type ClientItem = Client & {
  id: string;
  createdAt?: any;
  updatedAt?: any;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows: ClientItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as DocumentData),
      })) as ClientItem[];
      setClients(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const key = search.trim();
    if (!key) return clients;
    return clients.filter((c) =>
      c.name?.toLowerCase().includes(key.toLowerCase())
    );
  }, [clients, search]);

  return (
    <div className="page-wrap clients-page">
      <header className="page-header">
        <h1>取引先</h1>
        <p className="muted">登録済みの会社一覧。検索や編集ができます。</p>
      </header>

      <div className="toolbar">
        <div className="left">
          <input
            className="input input-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="会社名で検索"
          />
        </div>
        <div className="right">
          <Link href="/clients/new" className="btn btn-primary">
            + 新規登録
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="skeleton">読み込み中…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>まだ取引先がありません。</p>
          <Link href="/clients/new" className="btn btn-primary">
            最初の取引先を登録
          </Link>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((c) => (
            <div key={c.id} className="card client-card">
              <div className="client-header">
                <Link href={`/clients/${c.id}`} className="client-name-link">
                  {c.name}
                </Link>

                <div className="client-actions">
                  <Link href={`/clients/${c.id}`} className="badge">
                    編集
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
