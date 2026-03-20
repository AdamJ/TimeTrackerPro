import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface RealtimeSyncOptions {
  onCurrentDayUpdate: () => void;
  isAuthenticated: boolean;
  enabled?: boolean;
}

export function useRealtimeSync({
  onCurrentDayUpdate,
  isAuthenticated,
  enabled = true
}: RealtimeSyncOptions) {
  // DISABLED: Periodic sync for single-device usage
  // Only sync manually when user explicitly requests it
  useEffect(() => {
    return;
  }, [enabled, isAuthenticated, onCurrentDayUpdate]);

  // DISABLED: Real-time subscription for single-device usage
  const subscribeToChanges = useCallback(() => {
    return () => {};
  }, []);

  return { subscribeToChanges };
}
