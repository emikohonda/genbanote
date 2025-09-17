import type { Timestamp } from "firebase/firestore";

export type Client = {
  id?: string;
  name: string;
  phone?: string | null; // 追加
  memo?: string | null;  // 追加
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
