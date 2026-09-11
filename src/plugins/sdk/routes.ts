// The value a plugin's page path carries: `/12` names job 12, with any query
// or fragment dropped.
export const pathParam = (path: string) => path.split(/[?#]/)[0].slice(1);

// The items of an inventory a plugin already holds that a typed fragment
// names. A fragment shorter than three characters matches too much to offer;
// three matches is as many rows as the bar shows for one plugin.
export function matchInventory<T>(
  items: readonly T[],
  text: string,
  fields: (item: T) => string,
): T[] {
  const needle = text.toLowerCase();
  if (needle.length < 3) return [];
  return items.filter((item) => fields(item).toLowerCase().includes(needle)).slice(0, 3);
}
