export type Client = {
    id: string;
    name: string; //取引先名（元請会社）
};

export const clients: Client[] = [
    { id: "c-001", name: "山陽工業" },
    { id: "c-001", name: "栗本" },
];

export const getClientById = (id: string) => clients.find(c => c.id === id);
