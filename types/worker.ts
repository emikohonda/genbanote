// /types/worker.ts
export type Worker = {
  id?: string;
  name: string;
  phone?: string | null; // ← ここをnull許可に
  memo?: string | null;  // ← ここをnull許可に
  createdAt?: any;
  updatedAt?: any;
};
