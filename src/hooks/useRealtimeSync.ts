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
  // Periodic sync - check for updates every 120 minutes
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const interval = setInterval(() => {
      console.log('🔄 Checking for updates from other devices...');
      onCurrentDayUpdate();
    }, 120 * 60 * 1000); // 120 minutes

    return () => clearInterval(interval);
  }, [enabled, isAuthenticated, onCurrentDayUpdate]);

  // Real-time subscription (future enhancement)
  const subscribeToChanges = useCallback(() => {
    if (!enabled || !isAuthenticated) return;

    const subscription = supabase
      .channel('current_day_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'current_day'
        },
        (payload) => {
          console.log('🔔 Real-time update detected:', payload);
          onCurrentDayUpdate();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [enabled, isAuthenticated, onCurrentDayUpdate]);

  return { subscribeToChanges };
}
