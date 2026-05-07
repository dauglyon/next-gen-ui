import s from './showcase.module.scss';
import { Frame } from '../components/Frame';
import { Accordion } from '../components/Accordion';
import { Avatar } from '../components/Avatar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CodeBlock } from '../components/CodeBlock';

export function Section09Layout() {
  return (
    <div className={s.section}>
      <div className={s.sNum}>09</div>
      <div className={s.sTitle}>Structure</div>
      <p className={s.sDesc}>
        The pieces that frame content: collapsible sections, user identity, and navigation context.
      </p>

      <div className={s.sub}>Accordion</div>
      <p className={s.note}>
        Wraps Base UI Collapsible. <code>defaultOpen</code> starts expanded. Use inside Frame with
        horizontal padding for panel-style grouping.
      </p>
      <Frame>
        <div style={{ padding: '0 var(--s-8)' }}>
          <Accordion title={<span className="caption">Assembly parameters</span>} defaultOpen>
            <span className="body">
              MEGAHIT v1.2.9 with default parameters. Min contig length: 200 bp. K-list: 21, 29, 39,
              59, 79, 99, 119, 141.
            </span>
          </Accordion>
          <Accordion title={<span className="caption">Quality metrics</span>}>
            <span className="body">
              N50: 8,241 bp. Total: 48.2 Mb. GC: 52.3%. CheckM completeness: 94.2%.
            </span>
          </Accordion>
        </div>
      </Frame>
      <CodeBlock
        language="tsx"
        code={`<Accordion title={<span className="caption">Assembly parameters</span>} defaultOpen>
  <span className="body">Content here.</span>
</Accordion>`}
      />

      <div className={s.sub}>Avatar</div>
      <p className={s.note}>
        Sizes: 20 (dense metadata), 24 (inline), 28 (table rows), 32 (default), 40 (profile), 64 /
        80 (hero cards). Optional <code>color</code> prop for multi-participant contexts: primary
        (default), teal, ocean, green, purple, orange, red.
      </p>
      <div className={s.row} style={{ alignItems: 'center', marginBottom: 'var(--s-7)' }}>
        <Avatar size={20} initials="JD" />
        <Avatar size={24} initials="JD" />
        <Avatar size={28} initials="AS" color="ocean" />
        <Avatar size={32} initials="AS" color="teal" />
        <Avatar size={40} initials="MK" color="purple" />
        <Avatar size={64} initials="ER" color="red" />
        <Avatar size={80} initials="DL" color="primary" />
      </div>
      <CodeBlock
        language="tsx"
        code={`<Avatar size={20} initials="JD" />            // dense metadata
<Avatar size={24} initials="JD" />            // inline (lists, mentions)
<Avatar size={28} initials="AS" color="ocean" />
<Avatar size={32} initials="AS" color="teal" />
<Avatar size={40} src="/photo.jpg" alt="M. Kim" />
<Avatar size={80} initials="DL" color="primary" />  // profile / hero card`}
      />

      <div className={s.sub}>Shape: circle vs square</div>
      <p className={s.note}>
        Default <code>circle</code> is for people. Use <code>shape="square"</code> for non-person
        identity: tenants, tools, threads, services. Shape signals "this is not a human"; color
        stays available as the differentiator.
      </p>
      <div className={s.row} style={{ alignItems: 'center' }}>
        <Avatar shape="square" size={24} initials="KB" color="primary" />
        <Avatar shape="square" size={32} initials="JL" color="teal" />
        <Avatar shape="square" size={40} initials="DB" color="purple" />
      </div>
      <CodeBlock
        language="tsx"
        code={`<Avatar shape="square" size={32} initials="JL" color="teal" />  // tenant, tool, or service`}
      />

      <div className={s.sub}>Variants: solid vs tint</div>
      <p className={s.note}>
        <code>solid</code> (default) is saturated background + white text + sans, for people and
        identity. <code>tint</code> is washed background + tint-contrast text + mono, for data-type
        abbreviations. TypeBadge is the canonical preset; reach for it before building a new tint
        Avatar.
      </p>
      <div className={s.row} style={{ alignItems: 'center' }}>
        <Avatar variant="solid" size={32} initials="JD" color="primary" />
        <Avatar variant="tint" shape="square" size={32} initials="GE" color="primary" />
        <Avatar variant="tint" shape="square" size={32} initials="TX" color="green" />
        <Avatar variant="tint" shape="square" size={32} initials="AS" color="purple" />
      </div>
      <CodeBlock
        language="tsx"
        code={`<Avatar variant="solid" initials="JD" color="primary" />
<Avatar variant="tint" shape="square" initials="GE" color="primary" />
// for data-type abbreviations, prefer TypeBadge (a preset)
<TypeBadge color="primary">GE</TypeBadge>`}
      />

      <div className={s.sub}>Breadcrumbs</div>
      <p className={s.note}>
        Last item has no <code>href</code>; it renders as plain text (current page).
      </p>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', href: '#' },
          { label: 'Soil Analysis', href: '#' },
          { label: 'Assembly Results' },
        ]}
      />
      <CodeBlock
        language="tsx"
        code={`<Breadcrumbs items={[
  { label: 'Workspaces', href: '/workspaces' },
  { label: 'Soil Analysis', href: '/ws/45221' },
  { label: 'Assembly Results' },  // current page, no href
]} />`}
      />
    </div>
  );
}
