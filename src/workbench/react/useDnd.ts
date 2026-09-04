import { createContext, useContext } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragData, DropData } from './dnd';
import { dragId, dropId } from './dnd';

export const DraggingContext = createContext<DragData | null>(null);

// True while a panel is being dragged; drop targets that only make sense
// mid-drag (group edges) render then.
export function useDragging(): DragData | null {
  return useContext(DraggingContext);
}

export function useDragPanel(data: DragData) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId(data.panel),
    data,
  });
  // dnd-kit's attributes describe keyboard dragging, which this workbench
  // does through commands instead; only the pointer handlers are kept.
  void attributes;
  return { dragRef: setNodeRef, dragHandlers: listeners ?? {}, isDragging };
}

export function useDropTarget(data: DropData, disabled = false) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId(data), data, disabled });
  return { dropRef: setNodeRef, isOver };
}
