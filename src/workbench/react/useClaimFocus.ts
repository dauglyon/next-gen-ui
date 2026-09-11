import type { PanelId } from '../core';
import { useDispatch, useLayout, useServices } from './context';

// Handlers that make a panel the workbench focus when the user acts inside
// it. Pointer as well as focus: most of a panel is plain text, and clicking
// it fires no focus event, so the workbench focus would stay where it was.
export function useClaimFocus() {
  const layout = useLayout();
  const dispatch = useDispatch();
  const { focusIntentRef } = useServices();
  return (panel: PanelId) => {
    const claim = () => {
      if (layout.focus !== panel) {
        focusIntentRef.current = 'user';
        dispatch({ type: 'focus', panel });
      }
    };
    return { onPointerDownCapture: claim, onFocusCapture: claim };
  };
}
