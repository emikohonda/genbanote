'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function NavAutoClose() {
  const pathname = usePathname();

  // 共通: スクロールを固定
  const lockScroll = () => {
    const y = window.scrollY || window.pageYOffset;
    document.body.setAttribute('data-scroll-y', String(y));
    document.body.classList.add('nav-open'); // 任意（CSSフォールバック用）
    Object.assign(document.body.style, {
      position: 'fixed',
      top: `-${y}px`,
      left: '0',
      right: '0',
      width: '100%',
      overflow: 'hidden',
    });
  };

  // 共通: スクロール固定を解除（位置復元も）
  const unlockScroll = () => {
    const y = parseInt(document.body.getAttribute('data-scroll-y') || '0', 10);
    document.body.classList.remove('nav-open');
    Object.assign(document.body.style, {
      position: '',
      top: '',
      left: '',
      right: '',
      width: '',
      overflow: '',
    });
    window.scrollTo(0, y);
    document.body.removeAttribute('data-scroll-y');
  };

  // ルート変更時は必ず閉じてロック解除
  useEffect(() => {
    const checkbox = document.getElementById('nav-toggle') as HTMLInputElement | null;
    if (checkbox) checkbox.checked = false;
    unlockScroll();
  }, [pathname]);

  // メニュー内リンククリック時も閉じて解除
  useEffect(() => {
    const nav = document.getElementById('site-nav');
    const checkbox = document.getElementById('nav-toggle') as HTMLInputElement | null;
    if (!nav || !checkbox) return;

    const handleClick = (e: Event) => {
      if ((e.target as HTMLElement).closest('a')) {
        checkbox.checked = false;
        unlockScroll();
      }
    };

    nav.addEventListener('click', handleClick);
    return () => nav.removeEventListener('click', handleClick);
  }, []);

  // メニュー開閉に合わせてロック/解除
  useEffect(() => {
    const checkbox = document.getElementById('nav-toggle') as HTMLInputElement | null;
    if (!checkbox) return;

    const onChange = () => {
      if (checkbox.checked) {
        lockScroll();
      } else {
        unlockScroll();
      }
    };

    // ESCキーで閉じる（任意）
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && checkbox.checked) {
        checkbox.checked = false;
        unlockScroll();
      }
    };

    checkbox.addEventListener('change', onChange);
    window.addEventListener('keydown', onKeydown);

    // 初期状態の整合性
    if (checkbox.checked) lockScroll(); else unlockScroll();

    return () => {
      checkbox.removeEventListener('change', onChange);
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  return null;
}
