"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useTaskStore } from "@/store/taskStore";
import TaskItem from "./TaskItem";
import { COMMON_TEXT, useUiLanguage } from "@/lib/i18n";

export default function TaskList({ filter }: { filter: "todo" | "done" }) {
  const { tasks, reorderTasks } = useTaskStore();
  const uiLanguage = useUiLanguage();
  const text = COMMON_TEXT[uiLanguage];
  const sensors = useSensors(useSensor(PointerSensor));

  const filtered = tasks.filter((t) => t.status === filter);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = filtered.findIndex((t) => t.id === active.id);
    const newIdx = filtered.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(filtered, oldIdx, newIdx);
    await reorderTasks(reordered.map((t) => t.id));
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">{filter === "done" ? "🌱" : "🎉"}</p>
        <p className="text-sm text-stone-600">
          {filter === "done" ? text.noDone : text.noTodo}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={filtered.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
