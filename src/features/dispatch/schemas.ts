import { z } from "zod";

// zod schemas for dispatch forms, with the same rules and messages as API.md "Dispatch".

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** The parts of a new task the dispatcher fills in; the type, branches and parcels come from the selection. */
export const createTaskSchema = z.object({
  courierId: z.string().min(1, "Select a courier."),
  scheduledFor: z.string().regex(isoDate, "Choose today or a later date."),
  note: z.string().trim().max(500, "Keep the note under 500 characters."),
});

export type CreateTaskValues = z.infer<typeof createTaskSchema>;

export const reassignSchema = z.object({
  courierId: z.string().min(1, "Select a courier."),
});

export type ReassignValues = z.infer<typeof reassignSchema>;
