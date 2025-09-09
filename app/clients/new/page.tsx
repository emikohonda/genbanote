// app/clients/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createWithTimestamps } from '@/lib/firestoreHelpers';
import type { Client } from '@/types/client';
import '@/styles/clients.css';

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [memo, setMemo]   = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('会社名を入力してください');
      return;
    }

    const normalizedPhone = phone.trim() ? phone.trim() : null;
    const normalizedMemo  = memo.trim() ? memo.trim() : null;

    setLoading(true);
    try {
      await createWithTimestamps<Client>(
        'clients',
        { name: trimmed, phone: normalizedPhone, memo: normalizedMemo },
        null
      );
      router.push('/clients');
    } catch (err: any) {
      console.error(err);
      setError('登録に失敗しました。通信環境を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clients-page">
      <div className="page-wrap">
        <header className="page-header">
          <h1>取引先を登録</h1>
          <p className="muted">会社名のみでOK。後から編集できます。</p>
        </header>

        <form onSubmit={handleSubmit} className="card form-card">
          <label className="form-field">
            <span className="label">会社名</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例）株式会社サンプル"
              disabled={loading}
            />
          </label>

          <label className="form-field">
            <span className="label">電話番号（任意）</span>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="例）03-1234-5678"
              maxLength={20}
              disabled={loading}
            />
          </label>

          <label className="form-field">
            <span className="label">メモ（任意）</span>
            <textarea
              className="textarea"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="取引条件や注意事項など"
              rows={4}
              maxLength={1000}
              disabled={loading}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <Link href="/clients" className="btn btn-ghost">キャンセル</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '登録中…' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
