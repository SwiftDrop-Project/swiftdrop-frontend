"use client";

import * as React from "react";
import { ASSIGNMENT_TYPE_LABEL } from "../lib/labels";
import type { OutcomeFailure } from "../lib/outcome-flow";
import { outcomeSummary, submitComplete } from "../lib/task-actions";
import { progressText, taskRouteText } from "../lib/task-view";
import type { CourierTaskDetail, CourierTaskSummary } from "../types";
import { ActionFormShell, GuardedDialog, useSingleFlight, type ActionNotice } from "./action-dialog";

/**
 * Confirms completing the task (only offered when the API says canComplete). Completing closes the courier's part of
 * the work; it changes no parcel status, and parcels handed over at a branch carry on in other tasks.
 */
export function CompleteTaskDialog({
  task,
  open,
  districtName,
  onClose,
  onSavingChange,
  onCompleted,
  onFailure,
}: {
  task: CourierTaskDetail;
  open: boolean;
  districtName: (code: string) => string;
  onClose: () => void;
  onSavingChange: (saving: boolean) => void;
  onCompleted: (summary: CourierTaskSummary, message: string) => void;
  onFailure: (failure: Extract<OutcomeFailure, { kind: "reload" | "gone" }>) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<ActionNotice | null>(null);
  const reportSaving = React.useCallback(
    (value: boolean) => {
      setSaving(value);
      onSavingChange(value);
    },
    [onSavingChange],
  );
  const singleFlight = useSingleFlight(reportSaving);
  const typeLabel = ASSIGNMENT_TYPE_LABEL[task.type];

  function close() {
    setNotice(null);
    onClose();
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void singleFlight(async () => {
      setNotice(null);
      const result = await submitComplete(task.assignmentId);
      if (result.ok) {
        onCompleted(result.task, `${typeLabel} task completed`);
        close();
        return;
      }
      const failure = result.failure;
      if (failure.kind === "reload" || failure.kind === "gone") {
        onFailure(failure);
        close();
        return;
      }
      setNotice({ title: failure.kind === "fields" ? "Check the details" : failure.title, message: failure.message });
    });
  }

  return (
    <GuardedDialog open={open} saving={saving} onClose={close} contentKey={`complete:${task.assignmentId}`}>
      <ActionFormShell
        title={`Complete this ${typeLabel.toLowerCase()} task?`}
        description="This closes your part of the work. It doesn't mean every parcel was delivered: parcels handed over at a branch carry on in other tasks, and parcels you couldn't take go back to the dispatcher."
        notice={notice}
        submitLabel="Complete task"
        saving={saving}
        onSubmit={submit}
        onCancel={close}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-md border border-grey-200 p-4 text-body-sm">
          <dt className="text-grey-600">Route</dt>
          <dd className="min-w-0 break-words">{taskRouteText(task, districtName)}</dd>
          <dt className="text-grey-600">Progress</dt>
          <dd className="tabular-nums">{progressText(task.counts)}</dd>
          {outcomeSummary(task).map((line) => (
            <React.Fragment key={line.outcome}>
              <dt className="text-grey-600">{line.label}</dt>
              <dd className="tabular-nums">{line.count}</dd>
            </React.Fragment>
          ))}
        </dl>
      </ActionFormShell>
    </GuardedDialog>
  );
}
