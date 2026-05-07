import s from './showcase.module.scss';
import * as Dialog from '../components/Dialog';
import * as Tooltip from '../components/Tooltip';
import * as Popover from '../components/Popover';
import * as Menu from '../components/Menu';
import { Button } from '../components/Button';
import { CodeBlock } from '../components/CodeBlock';
import {
  CheckCircle,
  Info,
  Eye,
  Copy,
  Trash,
  PencilSimple,
  ShareNetwork,
} from '@phosphor-icons/react';

interface Section08OverlaysProps {
  onShowToast: () => void;
}

export function Section08Overlays({ onShowToast }: Section08OverlaysProps) {
  return (
    <div className={s.section}>
      <div className={s.sNum}>08</div>
      <div className={s.sTitle}>Overlays</div>
      <p className={s.sDesc}>
        Tooltip for a quick hint, popover for richer detail, menu for a list of actions, dialog for
        confirmation, toast for transient feedback.
      </p>

      <div className={s.sub}>Tooltip</div>
      <p className={s.note}>Hover-triggered. Keep content short, one or two sentences.</p>
      <Tooltip.Root>
        <Tooltip.Trigger render={<Button variant="outline"><Info size={14} /> Hover me</Button>} />
        <Tooltip.Popup>
          Runs MEGAHIT + Prokka on your paired-end reads. Estimated time: 15 min.
        </Tooltip.Popup>
      </Tooltip.Root>
      <CodeBlock
        language="tsx"
        code={`<Tooltip.Root>
  <Tooltip.Trigger>Hover me</Tooltip.Trigger>
  <Tooltip.Popup>Brief explanation here.</Tooltip.Popup>
</Tooltip.Root>`}
      />

      <div className={s.sub}>Popover</div>
      <p className={s.note}>
        Click-triggered. Has Title and Description sub-components for structured content.
      </p>
      <Popover.Root>
        <Popover.Trigger
          render={<Button variant="outline"><Eye size={14} /> Assembly quality</Button>}
        />
        <Popover.Popup>
          <Popover.Title>Assembly quality</Popover.Title>
          <Popover.Description>
            N50: 8,241 bp. Total: 48.2 Mb across 12,847 contigs. GC: 52.3%. CheckM completeness:
            94.2%.
          </Popover.Description>
        </Popover.Popup>
      </Popover.Root>
      <CodeBlock
        language="tsx"
        code={`<Popover.Root>
  <Popover.Trigger>Click me</Popover.Trigger>
  <Popover.Popup>
    <Popover.Title>Title</Popover.Title>
    <Popover.Description>Detail content.</Popover.Description>
  </Popover.Popup>
</Popover.Root>`}
      />

      <div className={s.sub}>Menu</div>
      <p className={s.note}>Action list. Items support icons. Use Menu.Separator between groups.</p>
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline">Actions</Button>} />
        <Menu.Popup>
          <Menu.Item>
            <Copy size={14} /> Duplicate project
          </Menu.Item>
          <Menu.Item>
            <ShareNetwork size={14} /> Share with team
          </Menu.Item>
          <Menu.Item>
            <PencilSimple size={14} /> Rename
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item>
            <Trash size={14} /> Delete
          </Menu.Item>
        </Menu.Popup>
      </Menu.Root>
      <CodeBlock
        language="tsx"
        code={`<Menu.Root>
  <Menu.Trigger>Actions</Menu.Trigger>
  <Menu.Popup>
    <Menu.Item><Copy size={14} /> Duplicate</Menu.Item>
    <Menu.Separator />
    <Menu.Item><Trash size={14} /> Delete</Menu.Item>
  </Menu.Popup>
</Menu.Root>`}
      />

      <div className={s.sub}>Toast</div>
      <p className={s.note}>
        Transient feedback. Triggered via <code>useToastManager</code>; auto-dismisses after
        timeout.
      </p>
      <Button variant="outline" onClick={onShowToast}>
        <CheckCircle size={14} /> Show toast
      </Button>
      <CodeBlock
        language="tsx"
        code={`const toasts = useToastManager();

toasts.add({
  title: 'Assembly complete',
  description: '12,847 contigs assembled.',
  timeout: 5000,
});`}
      />

      <div className={s.sub}>Dialog</div>
      <p className={s.note}>
        Modal confirmation. Dialog.Close dismisses. Put destructive action on the right.
      </p>
      <Dialog.Root>
        <Dialog.Trigger
          render={<Button variant="danger"><Trash size={14} /> Delete project</Button>}
        />
        <Dialog.Popup>
          <Dialog.Title>Delete project?</Dialog.Title>
          <Dialog.Description>
            This will permanently delete &quot;Soil Metagenome Assembly&quot; and all associated
            data objects.
          </Dialog.Description>
          <div className={s.row} style={{ justifyContent: 'flex-end' }}>
            <Dialog.Close render={<Button variant="ghost">Cancel</Button>} />
            <Dialog.Close
              render={<Button variant="danger"><Trash size={14} /> Delete</Button>}
            />
          </div>
        </Dialog.Popup>
      </Dialog.Root>
      <CodeBlock
        language="tsx"
        code={`<Dialog.Root>
  <Dialog.Trigger>Delete</Dialog.Trigger>
  <Dialog.Popup>
    <Dialog.Title>Delete project?</Dialog.Title>
    <Dialog.Description>This is permanent.</Dialog.Description>
    <Dialog.Close>Cancel</Dialog.Close>
    <Dialog.Close>Delete</Dialog.Close>
  </Dialog.Popup>
</Dialog.Root>`}
      />
    </div>
  );
}
