import type { Timestamp } from "firebase/firestore";

export type Worker = {
  id?: string;
  name: string;
  phone?: string | null;
  memo?: string | null;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
