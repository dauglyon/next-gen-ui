// The value a plugin's page path carries: `/12` names job 12, with any query
// or fragment dropped. `decode` for refs that contain slashes of their own,
// `lower` for slugs, so case never splits one page into two panels.
export function pathParam(path: string, opts: { lower?: boolean; decode?: boolean } = {}): string {
  let value = path.split(/[?#]/)[0].slice(1);
  if (opts.decode) value = decodeURIComponent(value);
  return opts.lower ? value.toLowerCase() : value;
}

// The terms a plugin mints from typed text against an inventory it already
// holds. A fragment shorter than three characters matches too much to offer.
export function matchInventory<T>(
  items: readonly T[],
  text: string,
  opts: { fields: (item: T) => string; term: (item: T) => string; limit?: number },
): string[] {
  const needle = text.toLowerCase();
  if (needle.length < 3) return [];
  return items
    .filter((item) => opts.fields(item).toLowerCase().includes(needle))
    .slice(0, opts.limit ?? 3)
    .map(opts.term);
}
