import type { KeyValueStore } from "../settings/storage";

/** An in-memory `KeyValueStore`. `saved` holds what the last save() wrote to "disk". */
export class MemoryStore implements KeyValueStore {
  private readonly data: Map<string, unknown>;
  saved: Record<string, unknown>;
  saveError: Error | null = null;

  constructor(initial: Record<string, unknown> = {}) {
    this.data = new Map(Object.entries(initial));
    this.saved = { ...initial };
  }

  entries<T>(): Promise<[key: string, value: T][]> {
    return Promise.resolve([...this.data.entries()] as [string, T][]);
  }

  set(key: string, value: unknown): Promise<void> {
    this.data.set(key, structuredClone(value));
    return Promise.resolve();
  }

  save(): Promise<void> {
    if (this.saveError !== null) return Promise.reject(this.saveError);
    this.saved = Object.fromEntries(this.data);
    return Promise.resolve();
  }
}
