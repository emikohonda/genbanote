// app/clients/[id]/page.tsx（差分込みの完成形）
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDocData, updateWithTimestamps } from '@/lib/firestoreHelpers';
import type { Client } from '@/types/client';
import '@/styles/clients.css';

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  deleteDoc,
  doc,
} from 'firebase/firestore';

export default function EditClientPage() {
  const { id } = useParams();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [memo, setMemo] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false); // ← 追加：モーダル開閉

  useEffect(() => {
    (async () => {
      if (!id) return;
      const data = await getDocData<Client>('clients', id as string);
      if (!data) {
        setError('データが見つかりませんでした。');
        setLoading(false);
        return;
      }
      setName(data.name ?? '');
      setPhone(data.phone ?? '');
      setMemo(data.memo ?? '');
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('会社名を入力してください');
      return;
    }

    const normalizedPhone = phone.trim() ? phone.trim() : null;
    const normalizedMemo  = memo.trim() ? memo.trim() : null;

    setSaving(true);
    try {
      // 1) 取引先更新
      await updateWithTimestamps<Client>(
        'clients',
        id as string,
        { name: trimmedName, phone: normalizedPhone, memo: normalizedMemo },
        null
      );

      // 2) schedules 側の clientName を同期
      const qref = query(collection(db, 'schedules'), where('clientId', '==', id));
      const snap = await getDocs(qref);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach(docSnap => {
          batch.update(docSnap.ref, { clientName: trimmedName });
        });
        await batch.commit();
      }

      router.push('/clients');
    } catch (err) {
      console.error(err);
      setError('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  // 実削除処理（モーダルの「削除する」から実行）
  const handleDeleteConfirmed = async () => {
    if (!id) return;
    setError('');
    setDeleting(true);
    try {
      const qref = query(collection(db, 'schedules'), where('clientId', '==', id));
      const snap = await getDocs(qref);
      if (!snap.empty) {
        setError('この取引先に紐づくスケジュールがあります。先にスケジュールを変更または削除してください。');
        setDeleting(false);
        setConfirmOpen(false);
        return;
      }

      await deleteDoc(doc(db, 'clients', id as string));
      router.push('/clients');
    } catch (err) {
      console.error(err);
      setError('削除に失敗しました。通信環境を確認してください。');
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  // Escで閉じられるように（任意）
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setConfirmOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen, deleting]);

  if (loading) return <div className="page-wrap"><div className="skeleton">読み込み中…</div></div>;

  return (
    <div className="clients-page">
      <div className="page-wrap">
        <header className="page-header">
          <h1>取引先を編集</h1>
        </header>

        <form onSubmit={handleSave} className="card form-card">
          <label className="form-field">
            <span className="label">会社名</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例）株式会社サンプル"
              disabled={saving || deleting}
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
              placeholder="例）080-1234-5678"
              maxLength={20}
              disabled={saving || deleting}
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
              disabled={saving || deleting}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions space-between">
            {/* 左側：削除（モーダルを開く） */}
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmOpen(true)}
              disabled={saving || deleting}
            >
              {deleting ? '削除中…' : '削除する'}
            </button>

            {/* 右側：戻る + 保存 */}
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/clients" className="btn btn-ghost">一覧へ戻る</Link>
              <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
                {saving ? '保存中…' : '保存する'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ===== 削除確認モーダル ===== */}
      {confirmOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal">
            <h3 id="confirm-title" className="modal-title">取引先を削除しますか？</h3>
            <p className="modal-text">この操作は取り消せません。</p>
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteConfirmed}
                disabled={deleting}
              >
                {deleting ? '削除中…' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
