import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Client, Stage } from '../../schemas';
import { useRepository } from '../../repositories';
import { useToast } from '../../components/Toast';
import { STAGE_LABELS } from '../../lib/labels';
import { STAGE_COLUMNS, columnForStage } from './stageColumns';
import { columnKeyboardCoordinates } from './columnKeyboardCoordinates';
import { PipelineColumn } from './PipelineColumn';
import { ClientCardBody } from './ClientCard';

interface PipelineBoardProps {
  clients: Client[];
  today: string;
}

const columnTitle = (id: string | number | undefined) => STAGE_COLUMNS.find((c) => c.id === id)?.title ?? 'no column';

export function PipelineBoard({ clients, today }: PipelineBoardProps) {
  const repository = useRepository();
  const notify = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Optimistic stage changes so a dropped card doesn't snap back while saving.
  const [pending, setPending] = useState<Record<string, Stage>>({});

  const sensors = useSensors(
    // A small distance threshold keeps plain clicks on the handle from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // On touch screens, press-and-hold to drag so normal swipes still scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );

  const displayed = useMemo(
    () => clients.map((client) => (pending[client.id] ? { ...client, stage: pending[client.id]! } : client)),
    [clients, pending],
  );
  const nameOf = (id: string | number) => displayed.find((c) => c.id === id)?.name ?? 'client';
  const activeClient = displayed.find((c) => c.id === activeId);

  const moveClient = async (client: Client, stage: Stage) => {
    if (client.stage === stage) return;
    setPending((p) => ({ ...p, [client.id]: stage }));
    try {
      await repository.moveStage(client.id, stage);
      notify(`${client.name} moved to ${STAGE_LABELS[stage]}`);
    } catch {
      notify(`Couldn't move ${client.name}`, 'error');
    } finally {
      setPending(({ [client.id]: _done, ...rest }) => rest);
    }
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const client = displayed.find((c) => c.id === active.id);
    const column = STAGE_COLUMNS.find((c) => c.id === over?.id);
    if (!client || !column || column.stages.includes(client.stage)) return;
    void moveClient(client, column.dropStage);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${nameOf(active.id)}. Use the left and right arrow keys to move between columns, space to drop, escape to cancel.`,
    onDragOver: ({ active, over }) => `${nameOf(active.id)} is over ${columnTitle(over?.id)}.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped in ${columnTitle(over.id)}.` : `${nameOf(active.id)} was not moved.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To move a client, press space or enter on the move handle, use the left and right arrow keys to choose a column, then press space or enter to drop.',
        },
      }}
    >
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0 xl:grid xl:grid-cols-5 xl:overflow-visible">
        {STAGE_COLUMNS.map((column, index) => (
          <PipelineColumn
            key={column.id}
            column={column}
            index={index}
            today={today}
            clients={displayed.filter((c) => columnForStage(c.stage).id === column.id)}
            onToggleInactive={(client) => void moveClient(client, client.stage === 'paused' ? 'churned' : 'paused')}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeClient && (
          <div className="flex rotate-2 rounded-lg border border-teal-500 bg-white shadow-xl dark:bg-slate-800">
            <div className="w-8" />
            <ClientCardBody client={activeClient} today={today} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
