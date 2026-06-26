// src/components/TaskTrackingPanel.tsx
// A persistent task-tracking panel that combines:
//   1. A standalone to-do list (stored via DataService, synced across devices for auth users)
//   2. GFM checklist items extracted from current-day task descriptions

import { useState, useMemo, KeyboardEvent } from "react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { parseTaskChecklist, toggleDescriptionChecklistItem } from "@/utils/checklistUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlusIcon } from "@radix-ui/react-icons";
import { Label } from "./ui/label";
import { SelectSeparator } from "./ui/select";
import { Trash } from "lucide-react";

export function TaskTrackingPanel() {
  const {
    todoItems,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    clearCompletedTodos,
    tasks,
    isDayStarted,
    updateTask
  } = useTimeTracking();

  const [inputValue, setInputValue] = useState("");

  const activeTodos = todoItems.filter((item) => !item.completed);
  const completedTodos = todoItems.filter((item) => item.completed);

  // Gather checklist items from current-day task descriptions
  const taskChecklists = useMemo(() => {
    if (!isDayStarted) return [];
    return tasks
      .map((task) => ({ task, entries: parseTaskChecklist(task.description ?? "") }))
      .filter(({ entries }) => entries.length > 0);
  }, [isDayStarted, tasks]);

  function handleAdd() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    addTodoItem(trimmed);
    setInputValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  function handleTaskChecklistToggle(taskId: string, description: string, lineIndex: number) {
    const updated = toggleDescriptionChecklistItem(description, lineIndex);
    updateTask(taskId, { description: updated });
  }

  return (
    <>
        {/* Add new to-do */}
      <div className="flex flex-col gap-2">
        <div>
          <Label htmlFor="todo-input">To-Do</Label>
          <Input
            id="todo-input"
            placeholder="Enter a to-do item"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
          />
        </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="h-8 px-2 shrink-0"
          >
          <PlusIcon className="w-4 h-4" />
          Add To-Do
          </Button>
        </div>

        {/* Active to-dos */}
        {activeTodos.length > 0 && (
          <>
          <div className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Active ({activeTodos.length})
              </span>
            </div>
          </div>
          <ul className="my-2">
            {activeTodos.map((item) => (
              <li key={item.id} className="flex items-center py-1 px-2 gap-2 group hover:bg-slate-100">
                <Checkbox
                  id={`todo-${item.id}`}
                  checked={false}
                  onCheckedChange={() => toggleTodoItem(item.id)}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor={`todo-${item.id}`}
                  className="flex-1 text-sm leading-snug cursor-pointer"
                >
                  {item.text}
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="link"
                      onClick={() => deleteTodoItem(item.id)}
                      className="h-5 p-2 shrink-0 text-muted-foreground hover:text-primary-foreground hover:bg-destructive"
                      aria-label="Delete todo"
                    >
                      <Trash size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete todo</TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
          </>
        )}

        {activeTodos.length === 0 && completedTodos.length === 0 && taskChecklists.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No to-do items yet. Add one above.
          </p>
        )}

        {/* Completed to-dos */}
      {completedTodos.length > 0 && (
        <>
        <SelectSeparator className="my-4" />
        <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                Completed ({completedTodos.length})
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearCompletedTodos}
                className="h-5 text-xs text-muted-foreground hover:text-destructive px-1"
              >
                Clear
              </Button>
            </div>
            <ul className="my-2">
              {completedTodos.map((item) => (
                <li key={item.id} className="flex items-center py-1 px-2 gap-2 group hover:bg-slate-100">
                  <Checkbox
                    id={`todo-${item.id}`}
                    checked={true}
                    onCheckedChange={() => toggleTodoItem(item.id)}
                    className="mt-0.5 shrink-0"
                  />
                  <label
                    htmlFor={`todo-${item.id}`}
                    className="flex-1 text-sm leading-snug line-through text-muted-foreground cursor-pointer"
                  >
                    {item.text}
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => deleteTodoItem(item.id)}
                        className="h-5 p-2 shrink-0 text-muted-foreground hover:text-primary-foreground hover:bg-destructive"
                        aria-label="Clear completed todo"
                      >
                        <Trash size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear completed todo</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </div>
        </>
        )}

        {/* Checklist items from task descriptions */}
        {taskChecklists.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                From Tasks
              </span>
              {taskChecklists.map(({ task, entries }) => (
                <div key={task.id} className="space-y-1.5">
                  <p className="text-xs font-medium text-foreground truncate" title={task.title}>
                    {task.title}
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    {entries.map((entry) => (
                      <li
                        key={`${task.id}-${entry.lineIndex}`}
                        className="flex items-start gap-2"
                      >
                        <Checkbox
                          id={`task-check-${task.id}-${entry.lineIndex}`}
                          checked={entry.completed}
                          onCheckedChange={() =>
                            handleTaskChecklistToggle(
                              task.id,
                              task.description ?? "",
                              entry.lineIndex
                            )
                          }
                          className="mt-0.5 shrink-0"
                        />
                        <label
                          htmlFor={`task-check-${task.id}-${entry.lineIndex}`}
                          className={
                            "flex-1 text-sm leading-snug cursor-pointer" +
                            (entry.completed ? " line-through text-muted-foreground" : "")
                          }
                        >
                          {entry.text}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
        </>
  );
}
