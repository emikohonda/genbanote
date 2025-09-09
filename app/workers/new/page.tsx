// app/workers/new/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import '@/styles/workers.css';
import { useRouter } from 'next/navigation';

export default function NewWorkerPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); // 追加
  const [memo, setMemo] = useState('');   // 追加
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  const trimmed = name.trim();
  const p = phone.trim();
  const m = memo.trim();

  if (!trimmed) {
    setError('名前を入力してください');
    return;
  }

  setSaving(true);
  try {
    // 空欄のフィールドは入れない
    const payload: any = {
      name: trimmed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: null,
      updatedBy: null,
    };
    if (p) payload.phone = p;
    if (m) payload.memo  = m;

    await addDoc(collection(db, 'workers'), payload);
    router.push('/workers');
  } catch (err) {
    console.error(err);
    setError('保存に失敗しました。');
  } finally {
    setSaving(false);
  }
};


  return (
    <div className="workers-page page-wrap">
      <header className="page-header">
        <h1>外注先を登録</h1>
      </header>

      <form onSubmit={submit} className="card form-card">
        <label className="form-field">
          <span className="label">名前</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）山田 太郎"
            disabled={saving}
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
            placeholder="例）090-1234-5678"
            disabled={saving}
          />
        </label>

        <label className="form-field">
          <span className="label">メモ（任意）</span>
          <input
            className="input"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="支払い条件、得意作業など"
            disabled={saving}
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <Link href="/workers" className="btn btn-ghost">一覧へ戻る</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '保存中…' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  );
}
