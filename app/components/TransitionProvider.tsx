"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface TransitionOrigin {
  x: number;
  y: number;
  destination: string; // The target pathname (without hash)
}

interface TransitionContextType {
  origin: TransitionOrigin | null;
  setOrigin: (data: TransitionOrigin) => void;
  clearOrigin: () => void;
}

const TransitionContext = createContext<TransitionContextType | null>(null);

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [origin, setOriginState] = useState<TransitionOrigin | null>(null);

  const setOrigin = (data: TransitionOrigin) => {
    setOriginState(data);
  };

  const clearOrigin = () => {
    setOriginState(null);
  };

  return (
    <TransitionContext.Provider value={{ origin, setOrigin, clearOrigin }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  const context = useContext(TransitionContext);
  if (!context) throw new Error("useTransition must be used within TransitionProvider");
  return context;
}
