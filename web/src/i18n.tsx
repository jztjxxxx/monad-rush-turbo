'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'zh' | 'en';

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'zh',
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mr-lang');
      if (saved === 'en' || saved === 'zh') setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('mr-lang', l);
    } catch {}
  };

  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(LangCtx);
  const L = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  return { lang, setLang, L };
}
