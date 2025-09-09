// hooks/useClientsMap.ts
'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

/** clients を購読して Map<clientId, name> を返す */
export function useClientsMap() {
  const [map, setMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'clients'), orderBy('name')),
      (snap) => {
        const m = new Map<string, string>();
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          m.set(d.id, data?.name ?? '');
        });
        setMap(m);
      }
    );
    return () => unsub();
  }, []);

  return map;
}
