import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

// 匿名ログインが完了して UID が取得できるまで待つ
export async function ensureUid(): Promise<string> {
  // 既にUIDあればそれを返す
  if (auth.currentUser?.uid) return auth.currentUser.uid;

  // まだなら一度だけ待つ
  const uid = await new Promise<string>(async (resolve, reject) => {
    const stop = onAuthStateChanged(
      auth,
      async (u) => {
        if (u?.uid) {
          stop();
          resolve(u.uid);
        } else {
          // 念のため匿名ログインをトリガー（すでにログイン中なら何もしない）
          try {
            const cred = await signInAnonymously(auth);
            stop();
            resolve(cred.user.uid);
          } catch (e) {
            reject(e);
          }
        }
      },
      reject
    );
  });

  return uid;
}
