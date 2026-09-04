import { Button } from '@kbase/design-system';
import { definePlugin, useHost, usePanel, usePanelTitle } from '../../sdk';

const NAMES = ['alpha', 'beta', 'gamma', 'crash'];

// Throwaway: exercises the shell until real plugins exist.
function HelloNavigator() {
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

function HelloDocument() {
  const { params } = usePanel();
  const name = params.name ?? 'world';
  usePanelTitle(`Hello ${name}`);
  if (name === 'crash') throw new Error('hello plugin asked to crash');
  return (
    <div style={{ padding: 'var(--s-5)' }}>
      <h1 className="h2">Hello, {name}.</h1>
      <p className="body">
        A document panel. Its title came from the panel itself, after it rendered.
      </p>
    </div>
  );
}

export default definePlugin({
  navigator: HelloNavigator,
  document: HelloDocument,
  commands: {
    hello: ({ name }, host) => host.openDocument({ name: String(name) }),
  },
});
