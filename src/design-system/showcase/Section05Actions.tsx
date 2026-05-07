import s from './showcase.module.scss';
import { Button } from '../components/Button';
import { SegmentedControl } from '../components/SegmentedControl';
import { CodeBlock } from '../components/CodeBlock';
import {
  Play,
  Copy,
  Trash,
  ShareNetwork,
  Table as TableIcon,
  SquaresFour,
  List,
} from '@phosphor-icons/react';

export function Section05Actions() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>05</div>
      <div className={s.sTitle}>Actions</div>
      <p className={s.sDesc}>
        Most actions are quiet. Primary fill is rare, reserved for the one thing the user came to
        do.
      </p>

      <div className={s.sub}>Button</div>
      <p className={s.note}>
        Six variants. Default to ghost or outline. Primary is for the main action on the page.
      </p>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)' }}>
        <Button variant="primary">
          <Play size={14} weight="bold" /> Run analysis
        </Button>
        <Button variant="outline">
          <Copy size={14} /> Duplicate
        </Button>
        <Button variant="ghost">Cancel</Button>
      </div>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)' }}>
        <Button variant="teal">
          <ShareNetwork size={14} weight="bold" /> Share
        </Button>
        <Button variant="purple">Discover</Button>
        <Button variant="danger">
          <Trash size={14} /> Delete
        </Button>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Button variant="primary"><Play size={14} weight="bold" /> Run analysis</Button>
<Button variant="outline"><Copy size={14} /> Duplicate</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="teal"><ShareNetwork size={14} weight="bold" /> Share</Button>
<Button variant="purple">Discover</Button>
<Button variant="danger"><Trash size={14} /> Delete</Button>`}
      />
      <p className={s.note}>
        Teal is for positive secondary actions (share, publish). Purple is reserved for
        discovery/exploration affordances; it sits next to primary in weight without competing for
        "the main action." Danger gets a red border and text, no fill, so it doesn't scream until
        hovered.
      </p>

      <div className={s.sub}>Sizes</div>
      <p className={s.note}>
        Three sizes: <code>md</code> (default), <code>sm</code>, and <code>xs</code>. Drop to{' '}
        <code>sm</code> in toolbars and table rows; reach for <code>xs</code> in dense filter bars
        and inline metadata. Sizing is orthogonal to variant.
      </p>
      <div className={s.row} style={{ marginBottom: 'var(--s-7)', alignItems: 'center' }}>
        <Button size="md" variant="primary">
          Default
        </Button>
        <Button size="sm" variant="primary">
          Small
        </Button>
        <Button size="xs" variant="primary">
          Extra small
        </Button>
      </div>
      <div className={s.row}>
        <Button size="sm" variant="outline">
          <Copy size={12} /> Duplicate
        </Button>
        <Button size="sm" variant="ghost">
          Cancel
        </Button>
        <Button size="xs" variant="outline">
          Filter
        </Button>
        <Button size="xs" variant="ghost">
          Reset
        </Button>
      </div>
      <CodeBlock
        language="tsx"
        code={`<Button size="md" variant="primary">Default</Button>
<Button size="sm" variant="primary">Small</Button>
<Button size="xs" variant="primary">Extra small</Button>

<Button size="sm" variant="outline"><Copy size={12} /> Duplicate</Button>
<Button size="sm" variant="ghost">Cancel</Button>
<Button size="xs" variant="outline">Filter</Button>
<Button size="xs" variant="ghost">Reset</Button>`}
      />

      <div className={s.sub}>Segmented control</div>
      <p className={s.note}>
        Toggle between views or time ranges. Supports icon + label or label only.
      </p>
      <div className={s.row}>
        <SegmentedControl
          value="table"
          onChange={() => {}}
          options={[
            { value: 'table', icon: <TableIcon size={14} />, label: 'Table' },
            { value: 'grid', icon: <SquaresFour size={14} />, label: 'Grid' },
            { value: 'list', icon: <List size={14} />, label: 'List' },
          ]}
        />
        <SegmentedControl
          value="week"
          onChange={() => {}}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
        />
      </div>
      <CodeBlock
        language="tsx"
        code={`<SegmentedControl
  value={view}
  onChange={setView}
  options={[
    { value: 'table', icon: <TableIcon size={14} />, label: 'Table' },
    { value: 'grid', icon: <SquaresFour size={14} />, label: 'Grid' },
  ]}
/>`}
      />
    </div>
  );
}
