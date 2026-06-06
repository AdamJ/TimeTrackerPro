import { useEffect, type ReactNode } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";

interface PageLayoutProps {
  /** Page title shown in the top header bar. */
  title?: ReactNode;
  /** Icon displayed to the left of the title. */
  icon?: ReactNode;
  /** Badge displayed to the right of the title in the header. */
  badge?: ReactNode;
  /** Action buttons displayed to the right of the title in the header. */
  actions?: ReactNode;
  /** Subtitle text displayed below the title (reserved for future use). */
  description?: ReactNode;
  children: ReactNode;
}

export const PageLayout = ({
  title,
  icon,
  badge,
  actions,
  children,
}: PageLayoutProps) => {
  const { setTitle, setBadge, setActions } = usePageTitle();

  useEffect(() => {
    setTitle(title ?? null);
    setBadge(badge ?? null);
    setActions(actions ?? null);
    return () => {
      setTitle(null);
      setBadge(null);
      setActions(null);
    };
  }, [title, badge, actions, setTitle, setBadge, setActions]);

  return (
    <div className="bg-background">
      {children}
    </div>
  );
};
