import { useEffect, useRef, useState } from "react";
import { testConnection, toCommandError } from "../../api/commands";
import type { Connection } from "../../api/types";
import { describeCommandError } from "../../feedback/describeError";

export type ConnectionTestState =
  | { phase: "idle" }
  | { phase: "testing" }
  | { phase: "passed"; text: string }
  | { phase: "failed"; text: string; detail?: string };

/**
 * Runs `test_connection` for the values currently in the form. Only the
 * latest run is shown: a reply to an older run, or one that arrives after
 * the dialog has closed, is ignored.
 */
export function useConnectionTest() {
  const [state, setState] = useState<ConnectionTestState>({ phase: "idle" });
  const latestRun = useRef(0);

  // Invalidate any reply still on its way when the dialog closes.
  useEffect(
    () => () => {
      latestRun.current += 1;
    },
    [],
  );

  async function run(connection: Connection): Promise<void> {
    const runId = ++latestRun.current;
    setState({ phase: "testing" });
    try {
      const { broker } = await testConnection(connection);
      if (runId !== latestRun.current) return;
      const text = broker === "" ? "Connected." : `Connected. Broker: ${broker}.`;
      setState({ phase: "passed", text });
    } catch (error) {
      if (runId !== latestRun.current) return;
      setState({
        phase: "failed",
        ...describeCommandError(toCommandError(error), connection.hostUrl),
      });
    }
  }

  /** Forgets the last result, for example because the host or key changed. */
  function reset(): void {
    latestRun.current += 1;
    setState({ phase: "idle" });
  }

  return { state, run, reset };
}
