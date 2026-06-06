import { createContext, type ReactNode } from "react";

export interface PageTitleContextValue {
  title: ReactNode;
  badge: ReactNode;
  actions: ReactNode;
  setTitle: (title: ReactNode) => void;
  setBadge: (badge: ReactNode) => void;
  setActions: (actions: ReactNode) => void;
}

export const pageTitleContext = createContext<PageTitleContextValue>({
  title: null,
  badge: null,
  actions: null,
  setTitle: () => {},
  setBadge: () => {},
  setActions: () => {},
});
