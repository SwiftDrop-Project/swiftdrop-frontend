# Courier

The courier's own screens. A dispatcher gives couriers **tasks** (pickup, transfer between branches, final delivery),
each holding one or more parcels. The courier records what happened to each parcel, hands parcels over at a branch
(or returns failed deliveries to it), completes the task, looks at one parcel with its history, and searches their
finished tasks. A courier only sees their own tasks and the parcels in them.

| | |
|---|---|
| Backend module | `com.swiftdrop.courier` (`../swiftdrop-backend/src/main/java/com/swiftdrop/courier`) |
| API | `../swiftdrop-backend/API.md`, section "Courier" |
| Owner | Kalpani (WP9) |
| Import as | `@/features/courier` (only what `index.ts` exports) |

## Who decides what

The backend is the source of truth. Parcel statuses and their transitions belong to delivery (WP3); tasks, item
outcomes and completing belong to dispatch (WP8); the courier module (WP9) writes both together. The screens only
show what the API sends: the next steps a parcel offers (`allowedOutcomes`), which parcels can be handed over
(`readyForHandover`) and whether a task can be completed (`canComplete`). They never work these out, and never set a
parcel status directly. Recording an outcome never completes a task; handing over means "at the branch", never
"delivered". `scheduledFor` is information only: a task for a later day can be worked now.

## Screens

| Route | Component | |
|---|---|---|
| `/courier` | `CourierTodayTasks` | Today's tasks in three groups (In progress, Assigned, Done today); later-day tasks show their date |
| `/courier/tasks/[assignmentId]` | `CourierTaskView` | One task: details, its parcels and their next steps; record outcomes, hand over or return to the branch, complete |
| `/courier/parcels/[parcelId]` | `CourierParcelView` | One parcel: where it is, contact, your tasks for it, history |
| `/courier/history` | `CourierTaskHistory` | Completed and cancelled tasks, newest first, 20 per page; `?q=` tracking number (the top bar's search lands here), `?page=` (1-based). Tasks open with `?from=history`, so their back link returns here |

Every page renders `RequireCurrentUser`; the detail pages read their id with `useParams()` in a client component.

### Task page actions

- **Parcel outcomes**: one button per `allowedOutcomes` entry, opening `OutcomeDialog`: confirm for collected /
  loaded; reason (+ note for Other) for couldn't collect / load; the recipient's name for delivered (with a cash
  reminder when there is COD); reason (+ note for Other) for failed.
- **Hand over at branch** (PICKUP, TRANSFER) / **Return to branch** (failed DELIVERY parcels): `HandoverDialog` lists
  the parcels the API marked `readyForHandover` (all ticked; some can be left out) and asks who received them at the
  branch (the destination branch, or the origin branch for returns). All or nothing.
- **Complete task**: enabled only when the API sends `canComplete`. `CompleteTaskDialog` shows a summary and explains
  that completing doesn't mean every parcel was delivered.

After a save the page shows the task as the API answered and loads it again. When the task changed meanwhile (409
`ASSIGNMENT_CHANGED`, `TASK_STEP_NOT_ALLOWED`, `INVALID_STATUS_TRANSITION`, `ASSIGNMENT_CLOSED`,
`ASSIGNMENT_NOT_FINISHED`) the dialog closes, a message explains, and the task is loaded again; nothing was saved.
Field errors stay in the dialog; 404 goes back to today's tasks; network and server errors can be retried. A dialog
can't be closed or sent twice while it is saving, and the page's other actions wait.

## Endpoints (`api.ts`, `courierApi`)

| Function | Endpoint |
|---|---|
| `today()` | `GET /courier/assignments/today` |
| `history({ page, size, trackingNumber })` | `GET /courier/assignments/history` |
| `task(id)` | `GET /courier/assignments/{id}` |
| `recordOutcome(id, parcelId, body)` | `POST /courier/assignments/{id}/items/{parcelId}/outcome` |
| `handover(id, body)` | `POST /courier/assignments/{id}/handover` |
| `complete(id)` | `POST /courier/assignments/{id}/complete` |
| `parcel(parcelId)` | `GET /courier/parcels/{parcelId}` |

Every answer is checked against the response schemas; a mismatch throws `CourierResponseError` (it names the fields,
never their values).

## Layout

```text
courier/
├── components/   Screens (today-tasks, task-detail-view, parcel-detail-view, task-history), their rows and badges,
│                 and the action dialogs (outcome-dialog, handover-dialog, complete-task-dialog, action-dialog)
├── hooks/        use-courier-load (load, reload, refresh in the background), use-district-name
├── lib/          labels (words, routes), errors (describeCourierError), outcome-flow, task-actions, task-view,
│                 history (URL params and links)
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas: forms (same rules and messages as the API), request builders, responses
└── index.ts      Public exports: the only file other code may import
```

Tests: `tests/courier-data-layer.test.mts` (endpoints, schemas, errors), `tests/courier-task-screens.test.mts`
(today's tasks and the task page, read only), `tests/courier-outcome-actions.test.mts` (parcel outcomes),
`tests/courier-task-actions.test.mts` (handover, return, complete), `tests/courier-history.test.mts` (history).

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
