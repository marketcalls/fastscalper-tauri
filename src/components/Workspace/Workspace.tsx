import { useState } from "react";
import { createStatus, errorText, type Status } from "../../feedback/status";
import { useAlwaysOnTop } from "../../lib/useAlwaysOnTop";
import type { PersistedState } from "../../settings/schema";
import { hasApiKey, type Settings } from "../../settings/settings";
import type { SettingsStorage } from "../../settings/storage";
import { useOrderPlacement } from "../../trading/useOrderPlacement";
import { useTicket } from "../../trading/useTicket";
import { OrderPad } from "../OrderPad/OrderPad";
import { SettingsDialog } from "../SettingsDialog/SettingsDialog";
import { StatusBar } from "../StatusBar/StatusBar";
import styles from "./Workspace.module.css";

interface WorkspaceProps {
  storage: SettingsStorage;
  initialState: PersistedState;
  /** Shown in the status bar on start, for example when saved settings were unreadable. */
  startupWarning?: string | undefined;
}

/** The whole app once saved state is loaded: order pad, status line and settings. */
export function Workspace({ storage, initialState, startupWarning }: WorkspaceProps) {
  const [settings, setSettings] = useState(initialState.settings);
  // First run: without an API key nothing can be traded, so go straight to Settings.
  const [settingsOpen, setSettingsOpen] = useState(() => !hasApiKey(initialState.settings));
  const [status, setStatus] = useState<Status | null>(() =>
    startupWarning === undefined ? null : createStatus("warning", startupWarning),
  );

  const ticket = useTicket(initialState.ticket, storage);
  const orders = useOrderPlacement(settings, setStatus);
  useAlwaysOnTop(settings.alwaysOnTop, setStatus);

  const canTrade = hasApiKey(settings);

  function saveSettings(next: Settings): void {
    setSettings(next);
    setSettingsOpen(false);
    // The new settings are already in use; only remembering them failed.
    storage.saveSettings(next).catch((error: unknown) => {
      setStatus(
        createStatus("warning", "Settings are in use but could not be saved.", errorText(error)),
      );
    });
  }

  return (
    <main className={styles.workspace}>
      <OrderPad
        ticket={ticket}
        pending={orders.pending}
        canTrade={canTrade}
        onTrade={(id) => void orders.submit(id, ticket.draft)}
        onOpenSettings={() => {
          setSettingsOpen(true);
        }}
      />
      <StatusBar status={status} route={settings} needsSetup={!canTrade} />
      {settingsOpen && (
        <SettingsDialog
          initial={settings}
          onSave={saveSettings}
          onCancel={() => {
            setSettingsOpen(false);
          }}
        />
      )}
    </main>
  );
}
