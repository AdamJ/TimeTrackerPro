import { useState, type ReactNode } from "react";
import { pageTitleContext } from "@/contexts/page-title-context";

export const PageTitleProvider = ({ children }: { children: ReactNode }) => {
  const [title, setTitle] = useState<ReactNode>(null);
  const [badge, setBadge] = useState<ReactNode>(null);
  const [actions, setActions] = useState<ReactNode>(null);
  return (
    <pageTitleContext.Provider value={{ title, badge, actions, setTitle, setBadge, setActions }}>
      {children}
    </pageTitleContext.Provider>
  );
};
