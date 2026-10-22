import { KeyboardCode, type KeyboardCoordinateGetter } from '@dnd-kit/core';

/**
 * Keyboard dragging that jumps one whole column per arrow press, instead of
 * dnd-kit's default of nudging 25px at a time.
 */
export const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { active, over, collisionRect, droppableRects, droppableContainers } = context;
  if (!active || !collisionRect) return undefined;
  if (event.code !== KeyboardCode.Right && event.code !== KeyboardCode.Left) return undefined;
  event.preventDefault();

  const columns = droppableContainers
    .getEnabled()
    .map((container) => ({ id: container.id, rect: droppableRects.get(container.id) }))
    .filter((column): column is { id: typeof column.id; rect: NonNullable<typeof column.rect> } => Boolean(column.rect))
    .sort((a, b) => a.rect.left - b.rect.left);
  if (columns.length === 0) return undefined;

  const currentId = over?.id ?? active.data.current?.columnId;
  const currentIndex = Math.max(0, columns.findIndex((column) => column.id === currentId));
  const nextIndex = currentIndex + (event.code === KeyboardCode.Right ? 1 : -1);
  const target = columns[Math.min(columns.length - 1, Math.max(0, nextIndex))]!;

  return {
    x: target.rect.left + (target.rect.width - collisionRect.width) / 2,
    y: target.rect.top + 8,
  };
};
