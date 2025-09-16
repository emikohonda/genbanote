import { Timestamp } from "firebase/firestore";

export type ScheduleStatus = 'incomplere' | 'complete';

export type Schedule = {
  id?: string;              // FirestoreのドキュメントID（取得時に付与）
  clientId: string | null;
  clientName: string;
  siteName: string;
  task: string;
  workerIds: string[];
  workerNames: string[];
  startAt: Timestamp;       // Firestore に保存される型
  endAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  status: ScheduleStatus;
  completedAt?: Timestamp | null; // 完了したときだけ日時を入れる
};
