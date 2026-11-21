# Courier

The courier's own screens. A dispatcher gives couriers parcels in dispatch **tasks** (one task may group several
parcels), but the courier sees and works **each parcel on its own**: one card per parcel, one update at a time. Couriers
work two kinds of step:

- **Pickup**: from the sender to the branch. Parcel: CREATED → PICKED_UP → AT_BRANCH (handed over).
- **Delivery**: from the branch to the recipient. Parcel: AT_BRANCH → OUT_FOR_DELIVERY → DELIVERED, or
  OUT_FOR_DELIVERY → FAILED → AT_BRANCH (returned to the branch).

**Branch transfers aren't courier work.** The backend's `TRANSFER` type stays in `types.ts` and the response schemas
(so an answer holding one still parses), but the screens never show one as courier work: Today counts it in a notice
instead of a card (and leaves it out of the counts and tabs), History counts it in a notice instead of a row, and its
parcel page is read only. No action is ever offered for a transfer, whatever the API lists.

| | |
|---|---|
| Backend module | `com.swiftdrop.courier` (`../swiftdrop-backend/src/main/java/com/swiftdrop/courier`) |
| API | `../swiftdrop-backend/API.md`, section "Courier" (`/courier/deliveries`) |
| Owner | Kalpani (WP9) |
| Import as | `@/features/courier` (only what `index.ts` exports) |

## Who decides what

The backend is the source of truth. Parcel statuses belong to delivery (WP3); tasks and item outcomes belong to
dispatch (WP8); the courier module (WP9) writes both together. The screens only show what the API sends:

- **What the courier may do next**: one button per entry of `nextStatuses`, plus **Unable to Collect** while
  `canMarkUnableToCollect`. The screens never work out a step themselves.
- **Whether the courier is done with a parcel**: `completed`. Never worked out from the parcel's status or the task's
  status. A picked-up parcel is still active until it is handed over; a failed delivery is still active until it is
  returned to the branch.
- **The task**: completes by itself (`task.status` COMPLETED) when its last parcel is completed. **There is no
  "Complete task" button.** Other parcels of the same task stay active until they are done.
- **Cancelled tasks**: left out of Today by the backend. A parcel whose task was cancelled before the courier finished
  it is shown as "Cancelled", never as completed work, and never appears in History.

## Screens

| Route | Component | |
|---|---|---|
| `/courier` | `CourierTodayParcels` | Counts (to do, pickups to do, done today), then **Active** and **Completed today** tabs. Active: pickups, then deliveries, one `ParcelCard` each, with the actions the API allows. Completed: the parcels finished today, newest first |
| `/courier/parcels/[parcelId]` | `CourierParcelView` | One parcel: the next step and its actions, the contact (only while the API sends it), the parcel, the courier's step in the task (who received it, the reason, the proof), the history |
| `/courier/history` | `CourierParcelHistory` | Completed parcels, newest completion first, 20 per page; `?q=` tracking number (the shared header search lands here; below 768px, where the header search is hidden, the page has its own compact search), `?page=` (1-based). Two filters: **Parcel type** (`?type=PICKUP|DELIVERY`) and **Completion date** (`?date=today|7d|30d|custom`, with `?from=`/`?to=` for a custom range, Sri Lankan days); the backend applies them before paging, so the count ("N completed entries", naming a searched tracking number) and the pages cover every matching entry; any change goes back to page 1; **Clear filters** goes back to every entry. There is no outcome filter on this screen (an old `?outcome=` is ignored; the API still accepts it). A parcel finished in two tasks has two rows, each opening its own entry (`?from=history&task=<assignmentId>`), so their back link returns here |
| `/courier/parcels/[parcelId]?task=<assignmentId>` | `CourierParcelView` | One **history entry** exactly as it was (`GET …/{parcelId}/history/{assignmentId}`): that task's route, outcome, times and handover, its proof only if it is the delivery that delivered the parcel, and the parcel's history **until that entry finished**. Read-only: no actions, no forms. "Parcel status now" is where the parcel is today, apart from the entry's outcome in the header. If the entry can't be loaded, the page says so ("This history entry isn't available"); it never shows the parcel's latest step instead |

Every page renders `RequireCurrentUser`; the parcel page reads its id with `useParams()` in a client component. A
task id is in a URL only for a history entry (`?task=`); the backend checks it is the courier's own task, so a
changed id only ever gives "not found".

### One status per parcel

Each parcel shows one badge (`lib/parcel-status.ts`). These are screen words, not backend values. They come from the
parcel's step **in its task** (`task.outcome`), which already records the handover or the return, so an AT_BRANCH
parcel is never called "Handed over" or "Returned" just because of where it is.

| Step (`task.outcome`) | Pickup | Delivery |
|---|---|---|
| PENDING | Pending pickup | Ready for delivery |
| COLLECTED | Picked up | |
| LOADED | | Out for delivery |
| HANDED_OVER | Handed over | |
| NOT_COLLECTED | Not collected | |
| DELIVERED | | Delivered |
| FAILED | | Delivery failed |
| RETURNED | | Returned to branch |
| NOT_LOADED | | Not taken out |

A parcel whose task was cancelled before it was finished shows "Cancelled"; a branch transfer (read only) shows "Branch
transfer". The parcel page also shows the parcel's own journey status, separately.

### Actions (`lib/parcel-actions.ts`, `ParcelActionDialog`)

| API offers | Button | Form | Request |
|---|---|---|---|
| `PICKED_UP` | Mark picked up (form: "Mark as picked up") | optional note | `POST …/status` `{ status }` |
| `AT_BRANCH` (pickup) | Hand over at branch | **Received by** (2-100, trimmed), note | `{ status: "AT_BRANCH", receivedBy }` |
| `AT_BRANCH` (failed delivery) | Return to branch | **Received by**, note | `{ status: "AT_BRANCH", receivedBy }` |
| `OUT_FOR_DELIVERY` | Out for delivery (form: "Mark out for delivery") | optional note | `{ status }` |
| `DELIVERED` | Mark as delivered | **Received by** (recipient name), note; cash reminder | `{ status, recipientName }` |
| `FAILED` | Mark as failed | **Reason**, note (required for Other) | `{ status, failureReason }` |
| `canMarkUnableToCollect` | Unable to Collect | **Reason** (the backend's problems), note (required for Other) | `POST …/unable-to-collect` `{ problem, note }` |

Actions are offered only for pickups and deliveries (`IN_TRANSIT`, a transfer's step, never gets a button). AT_BRANCH
goes to `task.branch` (the request has no branch field). "Unable to Collect" is one action for pickups and
deliveries: the backend records NOT_COLLECTED or NOT_LOADED from the task, and the parcel's status doesn't change.

After a save the screen shows the parcel as the API answered (Today replaces only that parcel and moves it to
Completed if the answer says `completed`) and loads again in the background. When the parcel or its task changed
meanwhile (409 `ASSIGNMENT_CHANGED` — "Your dispatcher changed this task" —, `TASK_STEP_NOT_ALLOWED`,
`INVALID_STATUS_TRANSITION`, `ASSIGNMENT_CLOSED`) the dialog closes, a message explains, and the data is loaded again;
nothing was saved. Field errors stay in the dialog; 404 goes back to today's parcels; network and server errors can be
retried. A dialog can't be closed or sent twice while it is saving, and the other buttons wait.

### Proof of delivery (DELIVERED only)

**Mark as delivered** asks for the recipient's name **and** a photo of the delivery slip they signed (`ImagePicker`
from `@/components/ui`: Take photo opens the camera on phones, or Choose file; preview, Replace, Remove). Both are
required and Confirm delivery stays disabled until they are valid (JPEG, PNG or WebP, up to 5 MB; `proofFileError`).
Confirming (`submitDelivered` in `lib/parcel-actions.ts`):

1. The photo is drawn upright and saved as a JPEG of at most 2560 px (`lib/proof-photo.ts`): this drops EXIF/GPS on
   the device and keeps it small.
2. `POST /courier/deliveries/{parcelId}/proof` (multipart `file`) stores it and answers `proofPhotoId`. If this fails,
   nothing is delivered; photo problems show under the picker, a storage outage (503) can be retried.
3. `POST …/status` with `{ status: "DELIVERED", recipientName, proofPhotoId }`. The backend attaches the photo in the
   same transaction. If this step fails, the uploaded photo is kept and reused on retry (unless the photo was changed
   or the backend refused it).

Pickups, Mark as failed, Return to branch and Unable to Collect never ask for a photo. A completed delivery shows a
**Proof of delivery** card on its parcel page (who received it, when, and the photo with **View proof**, loaded from
`GET /courier/deliveries/{parcelId}/proof` with the courier's login: never public, never cached), and History shows a
"Proof attached" badge on that delivery's row. Only the courier who delivered a parcel can see its photo, and the API
sends `proof` (recipient's name, photo attached) only on the entry of the delivery that delivered it: never on a
pickup, returned or not-taken entry, so a courier who only collected the parcel never sees who received it.

### Privacy

The API sends the sender (`pickup`) only in an open pickup step and the recipient only in an open delivery step, and
neither once the parcel is completed or its task closed. The screens pick the contact by the task type (the API's
`stop` is DELIVERY for a transfer too). The screens show what is sent and say why
when it isn't. History rows and history entries never show contacts, and the parcel history has no notes. A history
entry's timeline stops when that entry finished, so an older step never reveals what happened to the parcel later.

## Endpoints (`api.ts`, `courierApi`)

| Function | Endpoint |
|---|---|
| `today()` | `GET /courier/deliveries/today` |
| `history({ page, size, trackingNumber })` | `GET /courier/deliveries/history` |
| `delivery(parcelId)` | `GET /courier/deliveries/{parcelId}` |
| `historyEntry(parcelId, assignmentId)` | `GET /courier/deliveries/{parcelId}/history/{assignmentId}` (one finished entry, read-only) |
| `changeStatus(parcelId, body)` | `POST /courier/deliveries/{parcelId}/status` |
| `unableToCollect(parcelId, body)` | `POST /courier/deliveries/{parcelId}/unable-to-collect` |
| `uploadProof(parcelId, photo)` | `POST /courier/deliveries/{parcelId}/proof` (multipart `file`) |
| `proofImageUrl(parcelId)` | `GET /courier/deliveries/{parcelId}/proof` (an image URL the browser loads with the login cookie) |

Every answer is checked against the response schemas; a mismatch throws `CourierResponseError` (it names the fields,
never their values). This is the only courier client the courier screens use.

`features/dispatch` (WP8) also has a small client for `/courier/deliveries/today` and `/status`
(`dispatch/courier-api.ts`, used only by its `CourierTodayCard`, which no page renders). It isn't exported and isn't
used here; removing or pointing it at this feature is WP8's call.

## Preview mode (development only)

For looking at the screens without parcels on the backend: the courier pages show sample parcels kept in the browser's
memory instead of calling the courier endpoints. **Off by default**; a production build can never turn it on (the
build drops the preview code).

1. Add this line to your own `.env.local` (git ignores it): `NEXT_PUBLIC_COURIER_PREVIEW=true`
2. Restart `npm run dev` (Next.js reads env files only at start).
3. Log in as any courier account (the login check, `GET /auth/me`, stays real) and open `/courier`. A banner,
   "Preview mode: sample data, nothing is sent to the server", is shown on every courier page.

To go back to the real API, delete the line (or set it to anything other than `true`) and restart `npm run dev`.

- **What it does:** `api.ts` sends the five courier calls to `preview/preview-api.ts` instead of `apiFetch`. Nothing is
  fetched, so no update reaches the backend or the database. The answers still go through the response schemas.
- **Sample data** (`preview/data.ts`, made-up people; ids start with `7e570000`, tracking numbers have a 9 after the
  month):
  - A pickup task with three parcels: one to pick up, one picked up (hand it over), one already handed over today
    (completed while its siblings stay active).
  - A pickup task not started: pick up, or Unable to Collect.
  - A delivery task with four parcels: one to take out (cash to collect), one out for delivery, one failed (return it to
    the branch), one delivered today.
  - A delivery whose parcel isn't at the branch yet (only Unable to Collect).
  - Pickups and deliveries only: no branch transfers, today or in History.
  - A pickup completed today (handed over, not collected), and a cancelled pickup that never shows as work.
  - About 20 completed parcels on earlier days for History (2 pages). One parcel was worked twice: its first delivery
    failed and it was returned; a later delivery succeeded. Searching its tracking number finds both.
- **Actions** change the sample in memory with the backend's rules (`preview/rules.ts`, copied from `ParcelStatus`,
  `dispatch.ItemOutcome` and `courier CourierTask`; change them together), including the validation messages, the 409s
  and the task completing by itself. Reload the page to start again.
- **Proof of delivery** works in preview too: the photo you pick stays in this browser (a local object URL; nothing
  is uploaded and no email is sent), DELIVERED needs it, and the sample deliveries show a sample signed slip. Pick a
  file whose name starts with `fail` to see a storage outage (503) and the retry.
- **It can't show** clashes with a dispatcher (`ASSIGNMENT_CHANGED`) or real network errors: test those against the
  backend.

## Layout

```text
courier/
├── components/   Screens (today-parcels, parcel-detail-view, parcel-history), the parcel card and its action buttons,
│                 badges (parcel status, task status, type icon), the action dialog (parcel-action-dialog,
│                 handover-dialog, action-dialog, use-action-submit), contact details, load errors,
│                 and preview-banner (shown only in preview mode)
├── hooks/        use-courier-load (load, reload, refresh in the background), use-district-name
├── lib/          labels (words, routes), parcel-status (one status per parcel, active/completed/closed), parcel-view
│                 (grouping, next step, update after a save), parcel-actions (actions from nextStatuses, words,
│                 submit), errors (describeCourierError), history (URL params and links)
├── preview/      Development-only preview mode: flag, sample data, step rules, in-memory endpoints
├── api.ts        Endpoints, built on apiFetch from @/lib/api (or preview/ when preview mode is on)
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas: forms (same rules and messages as the API), request builders, responses
└── index.ts      Public exports: the only file other code may import
```

Tests (run with `node --experimental-strip-types --test tests/*.test.mts tests/*.test.mjs` on Node 22.17;
newer Node versions strip types by default): `tests/courier-data-layer.test.mts` (endpoints, schemas, errors, forms),
`tests/courier-parcel-screens.test.mts` (parcel cards, Active/Completed, siblings, cancelled, privacy, route pages),
`tests/courier-parcel-actions.test.mts` (actions, requests, pickup and delivery workflows, failed and returned, Unable
to Collect, 409s), `tests/courier-history.test.mts` (history, search, pagination, repeated parcels),
`tests/courier-preview.test.mts` (preview mode: off by default, no fetch, schemas, the backend's rules).

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
