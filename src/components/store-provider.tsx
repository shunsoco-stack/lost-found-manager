"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Store } from "@/lib/types";
import { loadStore, saveStore } from "@/lib/storage";
import { japanDateTime } from "@/lib/dates";

type StoreContextValue = {
  data: Store;
  now: string;
  commit: (update: (data: Store) => Store) => void;
  replace: (data: Store) => void;
  notify: (message: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Store | null>(null);
  const [now, setNow] = useState("");
  const [message, setMessage] = useState("");
  const latest = useRef<Store | null>(null);
  useEffect(() => {
    let active = true;
    loadStore()
      .then((result) => {
        if (active) {
          latest.current = result.data;
          setData(result.data);
          setMessage(result.message);
          setNow(japanDateTime());
        }
      })
      .catch(() => {
        if (active)
          setMessage(
            "保存領域を利用できません。ブラウザの保存設定・空き容量を確認して再読み込みしてください。",
          );
      });
    const timer = setInterval(() => setNow(japanDateTime()), 30000);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() =>
          setMessage("オフライン機能を登録できませんでした。通常の操作は利用できます。"),
        );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  function replace(value: Store) {
    saveStore(value);
    latest.current = value;
    setData(value);
  }
  function commit(update: (value: Store) => Store) {
    if (latest.current) replace(update(latest.current));
  }
  return (
    <>
      {message && (
        <div className="toast no-print" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="通知を閉じる">
            ×
          </button>
        </div>
      )}
      {data && now ? (
        <StoreContext.Provider value={{ data, now, commit, replace, notify: setMessage }}>
          {children}
        </StoreContext.Provider>
      ) : (
        <div className="loading">
          <span className="brand-mark">⌑</span>
          <h1>忘れ物・落とし物管理</h1>
          <p>受付の準備をしています…</p>
          {message && <button onClick={() => window.location.reload()}>再読み込み</button>}
        </div>
      )}
    </>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("保存データの読み込みが必要です。");
  return context;
}
