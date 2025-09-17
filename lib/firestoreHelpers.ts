// lib/firestoreHelpers.ts
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  updateDoc,
  getDoc,
  UpdateData,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

type BaseFields = {
  createdAt?: any;           // serverTimestamp()（FieldValue）を許容
  updatedAt?: any;
  createdBy?: string | null; // ログイン時のみ付与／未ログイン時は付けない
  updatedBy?: string | null; // 更新時に uid があれば付与
};
type WithMeta<T extends DocumentData = DocumentData> = T & BaseFields;

// ---------------------------------------------------------
// パススルーのコンバータ（保存/取得時に型をそのまま通す）
// ---------------------------------------------------------
function passthroughConverter<U extends DocumentData>(): FirestoreDataConverter<U, U> {
  return {
    toFirestore(value: U): U {
      return value;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): U {
      return snapshot.data(options) as U;
    },
  };
}

// ---------------------------------------------------------
// Firestore は undefined を拒否 → 送る前に除去
// ---------------------------------------------------------
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

// ---------------------------------------------------------
// 作成：ログイン時は createdBy/updatedBy を付与、匿名は付けない
// createdAt/updatedAt は serverTimestamp()
// ---------------------------------------------------------
export async function createWithTimestamps<T extends DocumentData>(
  colName: string,
  data: T,
  userId?: string | null
) {
  const colRef = collection(db, colName).withConverter(passthroughConverter<WithMeta<T>>());

  const base = stripUndefined(data as Record<string, any>) as T;

  const meta: Partial<BaseFields> = {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // ログイン時のみ所有者情報を付与（未ログインはキー自体を付けない）
    ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
  };

  const ref = await addDoc(colRef, {
    ...base,
    ...meta,
  } as WithMeta<T>);

  return ref;
}

// ---------------------------------------------------------
// 更新：createdAt/createdBy は触らせない（誤上書き防止）
// updatedAt は serverTimestamp()、updatedBy は uid or null
// ---------------------------------------------------------
export async function updateWithTimestamps<T extends DocumentData>(
  colName: string,
  id: string,
  data: Partial<T>,
  userId?: string | null
) {
  const colRef = collection(db, colName).withConverter(passthroughConverter<WithMeta<T>>());
  const ref = doc(colRef, id);

  const cleaned = stripUndefined(data as Record<string, any>) as Partial<T>;
  // うっかり上書きを防止（ルールでも弾くがクライアントでも削除）
  delete (cleaned as any).createdAt;
  delete (cleaned as any).createdBy;

  const payload: UpdateData<WithMeta<T>> = {
    ...(cleaned as UpdateData<WithMeta<T>>),
    updatedAt: serverTimestamp() as any,
    // null 設定もOK（ルール制約なし）。uid があれば入れる。
    updatedBy: (userId ?? null) as any,
  };

  await updateDoc(ref, payload);
  return ref;
}

// ---------------------------------------------------------
// 取得：id を付けて返す（なければ null）
// ---------------------------------------------------------
export async function getDocData<T extends DocumentData>(colName: string, id: string) {
  const colRef = collection(db, colName).withConverter(passthroughConverter<T>());
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);

  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as T) } as T & { id: string })
    : null;
}
