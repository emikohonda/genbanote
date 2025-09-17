'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { db, auth } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  DocumentData,
} from 'firebase/firestore';

import { getDocData, updateWithTimestamps } from '@/lib/firestoreHelpers';
import type { Worker } from '@/types/worker';
import '@/styles/workers.css';

export default function EditWorkerPage() {
  const { id } = useParams();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const data = await getDocData<Worker>('workers', id as string);
      if (!data) {
        setError('データが見つかりませんでした。');
        setLoading(false);
        return;
      }
      setName(data.name ?? '');
      setPhone((data as any)?.phone ?? '');
      setMemo((data as any)?.memo ?? '');
      setLoading(false);
    })();
  }, [id]);

  // 削除
  const openDeleteConfirm = () => {
    if (!id) return;
    setConfirmOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!id) return;

    setDeleting(true);
    setError('');
    try {
      // schedules からこの worker を外す（誰のものでも）
      const qref = query(collection(db, 'schedules'), where('workerIds', 'array-contains', id));
      const snap = await getDocs(qref);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((docSnap) => {
          const s = docSnap.data() as DocumentData;
          const ids: string[] = Array.isArray(s.workerIds) ? s.workerIds : [];
          const names: string[] = Array.isArray(s.workerNames) ? s.workerNames : [];

          const keepIdx: number[] = [];
          ids.forEach((wid, idx) => { if (wid !== id) keepIdx.push(idx); });

          const nextIds = keepIdx.map(i => ids[i]);
          const nextNames = keepIdx.map(i => names[i]).filter(v => typeof v === 'string');

          batch.update(docSnap.ref, {
            workerIds: nextIds,
            workerNames: nextNames,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      await deleteDoc(doc(db, 'workers', id as string));
      router.push('/workers');
    } catch (err) {
      console.error("削除エラー:", err);
      setError('削除に失敗しました。');
      setDeleting(false);
      setConfirmOpen(false);
      return;
    }
  };

  // Escで閉じる
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setConfirmOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen, deleting]);

  // 保存
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('名前を入力してください');
      return;
    }

    setSaving(true);
    try {
      // 未ログインOK（uid は null のまま渡す）
      const uid = auth.currentUser?.uid ?? null;

      // workers 更新（createdBy/createdAt は触らない）
      await updateWithTimestamps('workers', id as string, {
        name: trimmed,
        phone: phone.trim() ? phone.trim() : null,
        memo: memo.trim() ? memo.trim() : null,
      }, uid);

      // 自分が作成した schedules のみ workerNames を同期
      if (uid) {
        const qref = query(
          collection(db, 'schedules'),
          where('workerIds', 'array-contains', id),
          where('createdBy', '==', uid)
        );
        const snap = await getDocs(qref);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((docSnap) => {
            const s = docSnap.data() as DocumentData;
            const ids: string[] = Array.isArray(s.workerIds) ? s.workerIds : [];
            const names: string[] = Array.isArray(s.workerNames) ? s.workerNames.slice() : [];

            ids.forEach((wid, idx) => {
              if (wid === id) names[idx] = trimmed;
            });

            batch.update(docSnap.ref, { workerNames: names, updatedAt: serverTimestamp() });
          });
          await batch.commit();
        }
      }

      router.push('/workers');
    } catch (err: any) {
      console.error("保存エラー:", err.code, err.message, err);
      setError('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="workers-page page-wrap">
        <div className="skeleton">読み込み中…</div>
      </div>
    );
  }

  return (
    <div className="workers-page page-wrap">
      <header className="page-header">
        <h1>外注先を編集</h1>
      </header>

      <form onSubmit={handleSave} className="card form-card">
        <label className="form-field">
          <span className="label">名前</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）山田 太郎"
            disabled={saving || deleting}
          />
        </label>

        <label className="form-field">
          <span className="label">電話番号（任意）</span>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="例）090-1234-5678"
            disabled={saving || deleting}
          />
        </label>

        <label className="form-field">
          <span className="label">メモ（任意）</span>
          <input
            className="input"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="支払い条件、得意作業など"
            disabled={saving || deleting}
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={openDeleteConfirm}
            disabled={saving || deleting}
          >
            {deleting ? '削除中…' : '削除する'}
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/workers" className="btn btn-ghost">一覧へ戻る</Link>
            <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
              {saving ? '保存中…' : '保存する'}
            </button>
          </div>
        </div>
      </form>

      {confirmOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="modal">
            <h3 id="confirm-title" className="modal-title">
              「{name || 'この外注先'}」を削除しますか？
            </h3>
            <p className="modal-text">
              関連する予定からも外されます。<br />
              この操作は取り消せません。
            </p>
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
