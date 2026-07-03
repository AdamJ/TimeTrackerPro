import { useEffect, useState } from "react";

// Local 30s ticker for live-duration displays. Deliberately not part of
// TimeTrackingContext: putting the tick there forced every consumer of the
// context to re-render every 30s regardless of whether they show a running
// duration. Each caller of this hook owns its own interval and re-renders
// independently.
export function useCurrentTime(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
