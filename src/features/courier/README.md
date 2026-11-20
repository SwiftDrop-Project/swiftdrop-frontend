# Courier

The courier's own screens. A dispatcher gives couriers **tasks**, each holding one or more parcels. Couriers work
two kinds:

- **Pickup**: from the senders to the branch. Parcel: CREATED → PICKED_UP → AT_BRANCH.
- **Delivery**: from the branch to the recipients. Parcel: AT_BRANCH → OUT_FOR_DELIVERY → DELIVERED, or
  OUT_FOR_DELIVERY → FAILED → AT_BRANCH (returned).

The courier records what happened to each parcel, hands parcels over at the branch (or returns failed deliveries to
it), completes the task, looks at one parcel with its history, and searches their finished tasks. A courier only sees
their own tasks and the parcels in them.

**Branch transfers aren't courier work.** The backend's `TRANSFER` type stays in `types.ts` (it is shared), but the
screens never show one as a task to work. If the API sends one anyway, today's tasks and the history count it in a
notice instead of listing it, and its task page is read only, with no buttons.

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
| `/courier` | `CourierTodayTasks` | Counts, then task cards (`TaskCard`) in three groups (In progress, Assigned, Completed today): type, status, day, where to collect and where to take the parcels, progress bar |
| `/courier/tasks/[assignmentId]` | `CourierTaskView` | One task: a "Next step" card (what to do, "2 of 3 parcels updated", the handover and Complete buttons), its parcels with one status each and their next steps |
| `/courier/parcels/[parcelId]` | `CourierParcelView` | One parcel: where it is, contact, your tasks for it, history |
| `/courier/history` | `CourierTaskHistory` | Completed and cancelled tasks, newest first, 20 per page; `?q=` tracking number (the top bar's search lands here), `?page=` (1-based). Tasks open with `?from=history`, so their back link returns here |

Every page renders `RequireCurrentUser`; the detail pages read their id with `useParams()` in a client component.

### One status per parcel

Each parcel in a task shows one badge (`lib/parcel-status.ts`). These are screen words, not backend values. They come
from the parcel's outcome **in this task**, which already records the handover or the return, so an AT_BRANCH parcel
is never called "Handed over" or "Returned" just because of where it is.

| Outcome in the task | Pickup | Delivery |
|---|---|---|
| PENDING | Pending pickup | Ready for delivery |
| COLLECTED | Collected | |
| LOADED | | Out for delivery |
| HANDED_OVER | Handed over | |
| NOT_COLLECTED | Not collected | |
| DELIVERED | | Delivered |
| FAILED | | Delivery failed |
| RETURNED | | Returned to branch |
| NOT_LOADED | | Not taken out |

The backend also allows NOT_LOADED on a delivery (the courier couldn't take a parcel out), so it gets its own words.
The parcel page keeps the parcel's own journey status (`StatusBadge`), separate from the task.

### Task page actions

- **Parcel outcomes**: one button per `allowedOutcomes` entry, opening `OutcomeDialog`: confirm for collected / out
  for delivery (a delivery's LOADED); reason (+ note for Other) for couldn't collect / couldn't take out; the
  recipient's name for delivered (with a cash reminder when there is COD); reason (+ note for Other) for failed.
- **Hand over at branch** (PICKUP) / **Return to branch** (failed DELIVERY parcels): `HandoverDialog` lists
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

## Preview mode (development only)

For looking at the screens without tasks on the backend: the courier pages show sample tasks kept in the browser's
memory instead of calling the courier endpoints. **Off by default**; a production build can never turn it on (the
build drops the preview code).

1. Add this line to your own `.env.local` (git ignores it): `NEXT_PUBLIC_COURIER_PREVIEW=true`
2. Restart `npm run dev` (Next.js reads env files only at start).
3. Log in as any courier account (the login check, `GET /auth/me`, stays real) and open `/courier`. A banner,
   "Preview mode: sample data, nothing is sent to the server", is shown on every courier page.

To go back to the real API, delete the line (or set it to anything other than `true`) and restart `npm run dev`.

- **What it does:** `api.ts` sends the seven courier calls to `preview/preview-api.ts` instead of `apiFetch`. Nothing
  is fetched, so no outcome, handover or completion reaches the backend or the database. The answers still go
  through the response schemas.
- **Sample data** (`preview/data.ts`, made-up people; ids start with `7e570000`, tracking numbers have a 9 after the
  month). Pickups and deliveries only, no branch transfers:
  - A pickup to collect (3 parcels, not started).
  - A pickup in progress: one collected (ready to hand over), one waiting, one not collected.
  - A delivery in progress: one ready for delivery with cash to collect, one out for delivery, one delivered, one
    failed (ready to return).
  - A pickup ready to complete, and a delivery planned for tomorrow.
  - Completed today: a pickup (handed over, not collected) and a delivery (delivered, returned to branch).
  - About 25 closed tasks for History (2 pages, including cancelled ones). The parcel out for delivery failed
    yesterday: searching its tracking number finds yesterday's delivery, where it was returned to the branch.
- **Actions** change the sample in memory with the backend's step rules (`preview/rules.ts`, copied from
  `dispatch.ItemOutcome` and `courier ParcelMoves` for pickups and deliveries; change them together). Reload the page
  to start again.
- **It can't show** clashes with a dispatcher (`ASSIGNMENT_CHANGED`) or real network errors: test those against the
  backend.

## Layout

```text
courier/
├── components/   Screens (today-tasks, task-detail-view, parcel-detail-view, task-history), the dashboard's task-card,
│                 their rows and badges (status, parcel status, type icon, progress bar),
│                 and the action dialogs (outcome-dialog, handover-dialog, complete-task-dialog, action-dialog)
│                 and preview-banner (shown only in preview mode)
├── hooks/        use-courier-load (load, reload, refresh in the background), use-district-name
├── lib/          labels (words, routes), parcel-status (one status per parcel, next step in words), errors
│                 (describeCourierError), outcome-flow, task-actions, task-view, history (URL params and links)
├── preview/      Development-only preview mode: flag, sample data, step rules, in-memory endpoints
├── api.ts        Endpoints, built on apiFetch from @/lib/api (or preview/ when preview mode is on)
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas: forms (same rules and messages as the API), request builders, responses
└── index.ts      Public exports: the only file other code may import
```

Tests: `tests/courier-data-layer.test.mts` (endpoints, schemas, errors), `tests/courier-task-screens.test.mts`
(today's tasks and the task page, read only), `tests/courier-outcome-actions.test.mts` (parcel outcomes),
`tests/courier-task-actions.test.mts` (handover, return, complete), `tests/courier-history.test.mts` (history),
`tests/courier-preview.test.mts` (preview mode: off by default, no fetch, schemas, step rules).

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
