import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { localPlugins } from '../../plugins/local';
import { createWorkbench } from '../host';
import { WorkbenchProvider } from './WorkbenchProvider';
import { Workbench } from './Workbench';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

function mount(storage: Storage | null = null) {
  const services = createWorkbench({ installed: localPlugins, storage, defaultPinned: ['hello'] });
  render(
    <WorkbenchProvider services={services}>
      <Workbench />
    </WorkbenchProvider>,
  );
  return services;
}

const status = () => screen.getByRole('status', { name: 'Workbench announcements' });

describe('Workbench', () => {
  it('shows the pinned navigator and opens a document from it', async () => {
    const user = userEvent.setup();
    mount();
    const sidebar = screen.getByRole('region', { name: 'Sidebar' });
    await user.click(await within(sidebar).findByRole('button', { name: /say hello to alpha/i }));
    expect(await screen.findByRole('tab', { name: /hello alpha/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('heading', { name: /hello, alpha/i })).toBeInTheDocument();
    expect(status()).toHaveTextContent('Opened Hello: alpha');
  });

  it('opening the same document again focuses it instead of duplicating', async () => {
    const user = userEvent.setup();
    mount();
    const open = async (name: string) =>
      user.click(await screen.findByRole('button', { name: `Say hello to ${name}` }));
    await open('alpha');
    await open('beta');
    await open('alpha');
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: /hello alpha/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('closes the focused panel from the keyboard and announces it', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole('button', { name: 'Say hello to alpha' }));
    await screen.findByRole('heading', { name: /hello, alpha/i });
    await user.keyboard('{Alt>}{Shift>}W{/Shift}{/Alt}');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(status()).toHaveTextContent('Closed Hello alpha');
  });

  it('splits and moves focus by keyboard', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole('button', { name: 'Say hello to alpha' }));
    await user.click(await screen.findByRole('button', { name: 'Say hello to beta' }));
    await user.keyboard('{Control>}{Alt>}{Shift>}{ArrowRight}{/Shift}{/Alt}{/Control}');
    expect(screen.getAllByRole('tablist', { name: 'Open panels' })).toHaveLength(2);
    expect(status()).toHaveTextContent('Moved Hello beta right of Hello alpha');
    await user.keyboard('{Alt>}{Shift>}{ArrowUp}{/Shift}{/Alt}');
    expect(screen.getByRole('tab', { name: /hello alpha/i })).toHaveFocus();
  });

  it('restores the layout from storage on the next mount', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const first = mount(storage);
    await user.click(await screen.findByRole('button', { name: 'Say hello to gamma' }));
    expect(Object.keys(first.store.get().panels)).toContain('hello/document?name=gamma');

    document.body.innerHTML = '';
    mount(storage);
    expect(await screen.findByRole('tab', { name: /hello gamma/i })).toBeInTheDocument();
  });

  it('keeps the rest interactive when a panel crashes', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(await screen.findByRole('button', { name: 'Say hello to alpha' }));
    await user.click(await screen.findByRole('button', { name: 'Say hello to crash' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This panel crashed');
    await user.click(screen.getByRole('tab', { name: /hello alpha/i }));
    expect(screen.getByRole('heading', { name: /hello, alpha/i })).toBeVisible();
  });
});
