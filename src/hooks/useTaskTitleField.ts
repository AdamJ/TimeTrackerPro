import { useCallback, useRef, useState } from "react";

export const TASK_TITLE_REQUIRED_MESSAGE = "Task title is required.";

/**
 * State for a required task title, shared by the task forms. The error shows
 * once the field was left (blur) or a submit was attempted, never while typing,
 * and a failed submit moves focus to the field.
 */
export function useTaskTitleField(initial = "") {
  const [title, setTitle] = useState(initial);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const error = touched && !title.trim() ? TASK_TITLE_REQUIRED_MESSAGE : "";

  const markTouched = useCallback(() => setTouched(true), []);

  /** Call on submit. Returns true when the title is valid; otherwise shows the error and focuses the field. */
  const validate = useCallback(() => {
    setTouched(true);
    if (title.trim()) return true;
    ref.current?.focus();
    return false;
  }, [title]);

  const reset = useCallback((value = "") => {
    setTitle(value);
    setTouched(false);
  }, []);

  return { title, setTitle, error, ref, markTouched, validate, reset };
}

export type TaskTitleField = ReturnType<typeof useTaskTitleField>;
