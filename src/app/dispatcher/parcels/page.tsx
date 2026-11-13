import type { Metadata } from "next";
import { TaskList } from "@/features/dispatch";

export const metadata: Metadata = { title: "Courier tasks" };

export default function Page() {
  return <TaskList />;
}
