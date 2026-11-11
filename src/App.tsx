import { Suspense, use, useState } from "react";
import styles from "./App.module.css";
import { Workspace } from "./components/Workspace/Workspace";
import type { LoadResult, SettingsStorage } from "./settings/storage";

interface AppProps {
  storage: SettingsStorage;
}

/** Loads saved settings, then shows the workspace. */
export default function App({ storage }: AppProps) {
  // Held in state so the same load is reused while the child suspends.
  const [startup] = useState(() => storage.load());

  return (
    <Suspense fallback={<p className={styles.loading}>Loading settings</p>}>
      <LoadedWorkspace storage={storage} startup={startup} />
    </Suspense>
  );
}

function LoadedWorkspace({ storage, startup }: AppProps & { startup: Promise<LoadResult> }) {
  // `load` never rejects, so no error boundary is needed.
  const { state, warning } = use(startup);
  return <Workspace storage={storage} initialState={state} startupWarning={warning} />;
}
