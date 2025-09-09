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
  createdAt?: any;  // serverTimestamp() を許容（FieldValue）
  updatedAt?: any;
  createdBy?: string | null;
  updatedBy?: string | null;
};
type WithMeta<T extends DocumentData = DocumentData> = T & BaseFields;

// パススルーのコンバータ（保存/取得時に型をそのまま通す）
function passthroughConverter<U extends DocumentData>(): FirestoreDataConverter<U, U> {
  return {
    toFirestore(value: U): U {
      return value; // そのまま保存
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): U {
      return snapshot.data(options) as U; // そのまま読み出し
    },
  };
}

export async function createWithTimestamps<T extends DocumentData>(
  colName: string,
  data: T,
  userId?: string | null
) {
  // DB側型も WithMeta<T> に統一
  const colRef = collection(db, colName)
    .withConverter(passthroughConverter<WithMeta<T>>());

  const ref = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
  } as WithMeta<T>);

  return ref;
}

export async function updateWithTimestamps<T extends DocumentData>(
  colName: string,
  id: string,
  data: Partial<T>,
  userId?: string | null
) {
  // DB側型も WithMeta<T> に統一
  const colRef = collection(db, colName)
    .withConverter(passthroughConverter<WithMeta<T>>());

  const ref = doc(colRef, id); // DocumentReference<WithMeta<T>, WithMeta<T>>

  const payload: UpdateData<WithMeta<T>> = {
    ...(data as UpdateData<WithMeta<T>>),
    updatedAt: serverTimestamp() as any, // FieldValue OK
    updatedBy: (userId ?? null) as any,   // string|null を許容
  };

  await updateDoc(ref, payload);
  return ref;
}

export async function getDocData<T extends DocumentData>(
  colName: string,
  id: string
) {
  // DB側型を T に統一
  const colRef = collection(db, colName)
    .withConverter(passthroughConverter<T>());

  const ref = doc(colRef, id);
  const snap = await getDoc(ref);

  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as T) } as T & { id: string })
    : null;
}
