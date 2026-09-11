// `item` placed at `index` in a copy of `list` that no longer holds it; no
// index appends, one out of range lands at the nearer end. The tab strip and
// the sidebar's pin order are both placed this way.
export function reinsert<T>(list: readonly T[], item: T, index?: number): T[] {
  const rest = list.filter((t) => t !== item);
  const at = index === undefined ? rest.length : Math.max(0, Math.min(index, rest.length));
  rest.splice(at, 0, item);
  return rest;
}
