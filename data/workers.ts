// data/workers.ts
export type Worker = {
  id: string;
  name: string; // 外注先（業者名や会社名）
};

export const workers: Worker[] = [
  { id: "w-001", name: "日野 繁実" },
];

export const getWorkerById = (id: string) => workers.find(w => w.id === id);
