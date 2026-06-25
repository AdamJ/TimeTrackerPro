import { useCallback } from "react";
import { useElectronBackup } from "@/hooks/useElectronBackup";
import {
  BackupSummary,
  LocalStorageBackupInfo,
  listLocalStorageBackups,
  restoreFullSnapshot,
  restoreLocalStorageBackup,
  summarizeCurrentLocalStorageState,
  summarizeFullSnapshot,
  summarizeLocalStorageBackup
} from "@/services/localStorageService/recovery";

export type RecoveryBackup =
  | { source: "browser"; id: string; timestamp: number; info: LocalStorageBackupInfo }
  | { source: "desktop"; id: string; timestamp: number; name: string };

// Unifies the two write-only backup sources (localStorage schema-mismatch
// sibling keys, Electron disk snapshots) behind one list/preview/restore API.
export function useDataRecovery() {
  const { listDiskBackups, readDiskBackup } = useElectronBackup();

  const listBackups = useCallback(async (): Promise<RecoveryBackup[]> => {
    const browserBackups: RecoveryBackup[] = listLocalStorageBackups().map((info) => ({
      source: "browser",
      id: info.key,
      timestamp: info.timestamp,
      info
    }));

    const diskResult = await listDiskBackups();
    const diskBackups: RecoveryBackup[] = (diskResult.backups ?? []).map((backup) => ({
      source: "desktop",
      id: backup.name,
      timestamp: new Date(backup.timestamp).getTime(),
      name: backup.name
    }));

    return [...browserBackups, ...diskBackups].sort((a, b) => b.timestamp - a.timestamp);
  }, [listDiskBackups]);

  const previewBackup = useCallback(
    async (backup: RecoveryBackup): Promise<BackupSummary | null> => {
      if (backup.source === "browser") {
        return summarizeLocalStorageBackup(backup.info);
      }
      const result = await readDiskBackup(backup.name);
      if (!result.ok || !result.content) return null;
      try {
        return summarizeFullSnapshot(JSON.parse(result.content));
      } catch (error) {
        console.error(`Failed to parse disk backup "${backup.name}":`, error);
        return null;
      }
    },
    [readDiskBackup]
  );

  const restoreBackup = useCallback(
    async (backup: RecoveryBackup): Promise<boolean> => {
      if (backup.source === "browser") {
        return restoreLocalStorageBackup(backup.info);
      }
      const result = await readDiskBackup(backup.name);
      if (!result.ok || !result.content) return false;
      try {
        restoreFullSnapshot(JSON.parse(result.content));
        return true;
      } catch (error) {
        console.error(`Failed to restore disk backup "${backup.name}":`, error);
        return false;
      }
    },
    [readDiskBackup]
  );

  const currentStateSummary = useCallback((): BackupSummary => summarizeCurrentLocalStorageState(), []);

  return { listBackups, previewBackup, restoreBackup, currentStateSummary };
}
