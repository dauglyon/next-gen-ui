import { CartButton as Control } from '@kbase/design-system';
import type { CartButtonProps as ControlProps } from '@kbase/design-system';
import { useCart } from './cart';
import type { CartItem } from './cart';

// The design system's CartButton bound to the host's cart. A caller that
// builds its item lazily passes `id` and `onAdd` instead of `item`; either
// way the id is what "is this in the cart" is answered with.
export interface CartButtonProps extends Pick<ControlProps, 'labelled' | 'className' | 'disabled'> {
  item?: CartItem;
  id?: string;
  onAdd?: () => void;
  // For the accessible name, "Add P0AEX9 to the cart"; falls back to the
  // item's subject, then its name.
  subject?: string;
}

export function CartButton({ item, id, onAdd, subject, ...control }: CartButtonProps) {
  const cart = useCart();
  const key = item?.id ?? id;
  const added = key ? cart.has(key) : false;
  const what = subject ?? item?.subject ?? item?.name ?? 'this';
  return (
    <Control
      {...control}
      pressed={added}
      aria-label={control.labelled ? undefined : `Add ${what} to the cart`}
      onPressedChange={(next) => {
        if (!key) return;
        if (!next) cart.remove(key);
        else if (onAdd) onAdd();
        else if (item) cart.add(item);
      }}
    />
  );
}
