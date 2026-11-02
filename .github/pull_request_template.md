## What this changes

<!-- One or two sentences: which screen or component, and why. -->

**Feature (module):** <!-- identity / merchants / pricing / delivery / dispatch / tracking / notifications / reporting / webhooks / ui kit -->
**Related issue:** <!-- #123 -->

## Screenshots

<!-- Every changed screen, in both widths. Include error, empty and loading states if the screen has them. -->

| Desktop (1440px) | Phone (375px) |
|---|---|
|  |  |

## Checklist

- [ ] Checked side by side with `/dev/ui` and `DESIGN.md`: same components, spacing and states.
- [ ] Built only from `src/components/ui` and the page templates (`ListPage`, `DetailPage`, `FormPage`).
      A missing component was added to `components/ui` in its own PR and shown on `/dev/ui`.
- [ ] No new colours or font sizes: no hex values, no `bg-[...]` / `text-[...]`, nothing new in `globals.css`.
- [ ] Orange only for actions and active states; parcel status uses `StatusBadge`.
- [ ] Works at 375px wide with no sideways scrolling of the page.
- [ ] Other features imported only through their `index.ts`; this PR changes one feature.
- [ ] Button labels are verbs; wording is plain and specific ("Create delivery", "We couldn't save the address").
- [ ] Types and form rules match `../swiftdrop-backend/API.md`.
- [ ] `npm run lint` and `npm run build` pass.
