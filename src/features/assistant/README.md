# Assistant

The AI delivery assistant: a chat that answers "Where is my parcel?" and "How much to send 2 kg to Kandy?" from
SwiftDrop's own APIs (tracking and pricing). The backend gets the data and builds the answer from it; Google Gemini
only rewrites that answer clearly (when an AI key is set). The key never reaches the browser. The same data tools
are also an MCP server at `/api/v1/mcp` for other AI clients.

|                |                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------- |
| Backend module | `com.swiftdrop.assistant` (`../swiftdrop-backend/src/main/java/com/swiftdrop/assistant`) |
| API            | `../swiftdrop-backend/API.md` "Assistant"                                                |
| Owner          | D.M.A.I. Disanayaka                                                                      |
| Import as      | `@/features/assistant` (only what `index.ts` exports)                                    |

## Built so far

| Where                                                  | Component                        | What it does                                                                        |
| ------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------- |
| Public pages (`/track`, `/rates`) and the landing site | `AssistantLauncher`              | "Ask SwiftDrop" button, bottom right; public chat (`POST /assistant/chat`)          |
| Customer and merchant areas                            | `<AssistantLauncher signedIn />` | Same, through `POST /assistant/chat/me`, so it can also list the user's own parcels |
| Admin area (`app/admin/layout.tsx`)                    | `<AssistantLauncher admin />`    | Same endpoint; offers daily, weekly and monthly service reports                     |

The panel shows the answer, plus cards with the data the answer came from: a parcel with its status, a list of the user's
parcels, a price with its parts, or (admins) a service report: booked, delivered and failed with the change from the
period before, success rate, per-day table, top districts, failure reasons, parcels in each status and accounts, with
"Download CSV" (built in the browser from the same data, `report-csv.ts`). The conversation is kept for the browser tab (sessionStorage, newest 20 messages)
and sent with each question; "Clear the chat" removes it. Messages are at most 500 characters, 20 per minute.
