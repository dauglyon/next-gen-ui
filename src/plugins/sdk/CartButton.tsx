import { Button, Tooltip } from '@kbase/design-system';
import { Check, Plus } from '@phosphor-icons/react';
import { useCart } from './cart';
import type { CartAddition } from './cart';

// Putting a thing in the cart, drawn the same way everywhere.
//
// The cart is the host's, and so is the control that fills it: three places
// grew their own — a pill on a masthead, a differently sized pill on a card,
// a bare round `+` in the sidebar — and a reader had to learn that all three
// meant the same thing. One component now, so the glyph, the colour, the
// height, the width and the two states are decided once.
//
// There is deliberately no icon-only form. A narrow row is a reason to give
// the button less room, not a reason to make it a different control — the
// last attempt at that produced a bare `+` in a box beside two labelled
// pills, which is two identities and a footnote.
//
// The added state is a state of this button, not of the caller: it reads the
// cart, and pressing it again takes the item back out. Callers that build
// their item lazily pass `id` and `onAdd` instead of `item`; either way the
// id is what "is this in the cart" is answered with.

export interface CartButtonProps {
  // The item to add. Omit only when building it is expensive enough to defer,
  // in which case pass `id` and `onAdd`.
  item?: CartAddition & { id: string };
  id?: string;
  onAdd?: () => void;
  // Said on hover, where the caller has something to say that the label does
  // not — why the button is disabled, or what exactly is being carried. The
  // tooltip is attached here rather than by the caller because a Tooltip
  // trigger has to reach the button element, which is this component's.
  tooltip?: string;
  // What the button is adding, for the accessible name: "Add P0AEX9 to the
  // cart". Falls back to the item's own name.
  subject?: string;
  className?: string;
  disabled?: boolean;
}

export function CartButton({
  item,
  id,
  onAdd,
  tooltip,
  subject,
  className,
  disabled,
}: CartButtonProps) {
  const cart = useCart();
  const key = item?.id ?? id;
  const added = key ? cart.has(key) : false;
  const what = subject ?? item?.subject ?? item?.name ?? 'this';
  const label = added ? `Remove ${what} from the cart` : `Add ${what} to the cart`;

  const button = (
    <Button
      variant={added ? 'purple' : 'outline'}
      size="xs"
      className={className}
      disabled={disabled}
      aria-label={label}
      aria-pressed={added}
      onClick={() => {
        if (!key) return;
        if (added) cart.remove(key);
        else if (onAdd) onAdd();
        else if (item) cart.add(item);
      }}
      // One width for both words, so a row does not reflow when its item goes
      // into the cart.
      style={{ minInlineSize: '5.25rem', justifyContent: 'center' }}
    >
      {added ? <Check size={12} weight="bold" /> : <Plus size={12} weight="bold" />}
      {added ? 'Added' : 'Add'}
    </Button>
  );

  if (!tooltip) return button;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={button} />
      <Tooltip.Popup side="bottom">{tooltip}</Tooltip.Popup>
    </Tooltip.Root>
  );
}
