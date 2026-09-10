// Storage that may be absent, disabled or full. Reading a missing or refused
// key is null; a refused write is dropped, because losing persistence is
// better than losing the session.
export function readStorage(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(storage: Storage | null, key: string, value: string | null): void {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // Quota or privacy mode.
  }
}
