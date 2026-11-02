# Merchants

Business profiles of merchant users and the admin approval workflow (API keys come later).

| | |
|---|---|
| Backend module | `com.swiftdrop.merchants` (`../swiftdrop-backend/src/main/java/com/swiftdrop/merchants`) |
| Owner | Viduranga |
| Import as | `@/features/merchants` (only what `index.ts` exports) |

## Built so far

- `MerchantApprovals`: pending merchant applications with Approve / Reject (`/dispatcher/merchants`)
- `api.ts`: `merchantsApi` (listMerchants, approveMerchant, rejectMerchant)

## Layout

```text
merchants/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas for this feature's forms
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
