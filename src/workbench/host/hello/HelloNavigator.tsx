import { Button } from '@kbase/design-system';
import { useHost, usePanelTitle } from '../../../plugins/sdk';

const NAMES = ['alpha', 'beta', 'gamma', 'crash'];

// Throwaway: exercises the shell before real plugins exist.
export function HelloNavigator() {
  usePanelTitle('Hello');
  const host = useHost();
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 'var(--s-3)',
        display: 'grid',
        gap: 'var(--s-2)',
      }}
    >
      {NAMES.map((name) => (
        <li key={name}>
          <Button size="sm" variant="ghost" onClick={() => host.openDocument({ name })}>
            Say hello to {name}
          </Button>
        </li>
      ))}
    </ul>
  );
}
