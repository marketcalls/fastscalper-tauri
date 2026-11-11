import { useId, useRef, useState, type SubmitEvent } from "react";
import { EXCHANGES, PRODUCTS } from "../../api/types";
import {
  connectionOf,
  DEFAULT_HOST_URL,
  DEFAULT_SETTINGS,
  normaliseSettings,
  type Settings,
} from "../../settings/settings";
import { hasErrors, validateSettings, type SettingsErrors } from "../../settings/validation";
import { cx } from "../../lib/classNames";
import { useGrownWindow } from "../../lib/useGrownWindow";
import { Button } from "../Button/Button";
import { CheckboxField } from "../fields/CheckboxField";
import { SecretField } from "../fields/SecretField";
import { SelectField } from "../fields/SelectField";
import { TextField } from "../fields/TextField";
import styles from "./SettingsDialog.module.css";
import { SETTINGS_WINDOW_SIZE } from "./settingsWindowSize";
import { useConnectionTest, type ConnectionTestState } from "./useConnectionTest";
import { useModalDialog } from "./useModalDialog";

interface SettingsDialogProps {
  /** The saved settings the form starts from. */
  initial: Settings;
  onSave: (settings: Settings) => void;
  onCancel: () => void;
}

/**
 * Edits a draft copy of the settings. Nothing changes until Save; Cancel or
 * Escape discards the draft. Render it only while it should be open.
 */
export function SettingsDialog({ initial, onSave, onCancel }: SettingsDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const hostUrlRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initial);
  // Errors stay hidden until the user first tries to save or test, then track every edit.
  const [showErrors, setShowErrors] = useState(false);
  const connectionTest = useConnectionTest();
  useModalDialog(dialogRef, apiKeyRef);
  useGrownWindow(SETTINGS_WINDOW_SIZE);

  const errors = validateSettings(draft);
  const visibleErrors: SettingsErrors = showErrors ? errors : {};
  const testing = connectionTest.state.phase === "testing";

  function update<K extends keyof Settings>(key: K, value: Settings[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
    // A result for a different host or key would be misleading.
    if (key === "apiKey" || key === "hostUrl") connectionTest.reset();
  }

  /** Returns true when the connection fields are valid; otherwise shows why. */
  function checkConnectionFields(): boolean {
    if (!hasErrors(errors)) return true;
    setShowErrors(true);
    (errors.apiKey !== undefined ? apiKeyRef : hostUrlRef).current?.focus();
    return false;
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (checkConnectionFields()) onSave(normaliseSettings(draft));
  }

  function handleTest(): void {
    if (checkConnectionFields()) void connectionTest.run(connectionOf(normaliseSettings(draft)));
  }

  function handleReset(): void {
    // The API key is a credential, not a preference, so a reset keeps it.
    setDraft((current) => ({ ...DEFAULT_SETTINGS, apiKey: current.apiKey }));
    connectionTest.reset();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: let React unmount the dialog rather than the browser hide it.
        event.preventDefault();
        onCancel();
      }}
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h2 id={titleId} className={styles.title}>
          Settings
        </h2>

        <div className={styles.body}>
          <SecretField
            ref={apiKeyRef}
            label="API key"
            value={draft.apiKey}
            error={visibleErrors.apiKey}
            onChange={(value) => {
              update("apiKey", value);
            }}
          />
          {/* The test button sits in the host row so the form fits the default window. */}
          <div className={styles.hostGroup}>
            <TextField
              ref={hostUrlRef}
              label="Host URL"
              value={draft.hostUrl}
              error={visibleErrors.hostUrl}
              placeholder={DEFAULT_HOST_URL}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              onChange={(value) => {
                update("hostUrl", value);
              }}
              trailing={
                <Button
                  aria-label={testing ? "Testing connection" : "Test connection"}
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? "Testing" : "Test"}
                </Button>
              }
            />
            <ConnectionTestResult state={connectionTest.state} />
          </div>

          <div className={styles.pair}>
            <SelectField
              label="Exchange"
              value={draft.exchange}
              options={EXCHANGES}
              onChange={(value) => {
                update("exchange", value);
              }}
            />
            <SelectField
              label="Product"
              value={draft.product}
              options={PRODUCTS}
              onChange={(value) => {
                update("product", value);
              }}
            />
          </div>

          <div className={cx(styles.indented, styles.toggles)}>
            <CheckboxField
              label="Voice alerts"
              checked={draft.voiceAlerts}
              onChange={(checked) => {
                update("voiceAlerts", checked);
              }}
            />
            <CheckboxField
              label="Always on top"
              checked={draft.alwaysOnTop}
              onChange={(checked) => {
                update("alwaysOnTop", checked);
              }}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={handleReset}>
            Reset to defaults
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function ConnectionTestResult({ state }: { state: ConnectionTestState }) {
  const text = state.phase === "passed" || state.phase === "failed" ? state.text : "";
  const detail = state.phase === "failed" ? state.detail : undefined;
  return (
    <p
      role="status"
      className={cx(
        styles.indented,
        styles.testResult,
        state.phase === "passed" && styles.passed,
        state.phase === "failed" && styles.failed,
      )}
      title={detail}
    >
      {text}
    </p>
  );
}
