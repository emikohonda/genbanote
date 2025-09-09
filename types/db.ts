export type Client = {
    id: string;
    name: string;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type Worker = {
    id: string;
    name: string;
    phone?: string;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type Schedule = {
    id: string;
    date: string;         // YYYY-MM-DD
    clientId: string;     // 紐付けID
    clientName: string;   // スナップショット名
    siteName: string;
    task: string;
    workerIds: string[];
    workerNames: string[]; // スナップショット名
    createdAt?: string;
    updatedAt?: string;
};

export type Invoice = {
    id: string;
    invoiceNo: string;
    clientId: string;
    clientName: string;
    issueDate: string;    // 'YYYY-MM-DD'
    total: number;
    currency?: string;
    note?: string;
    createdAt?: string;
    updatedAt?: string;
}