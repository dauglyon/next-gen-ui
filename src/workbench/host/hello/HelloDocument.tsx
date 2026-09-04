import { usePanel, usePanelTitle } from '../../../plugins/sdk';

export function HelloDocument() {
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
