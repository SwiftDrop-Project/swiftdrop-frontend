import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiGallery } from "./_sections/ui-gallery";

export const metadata: Metadata = {
  title: "UI kit",
  robots: { index: false, follow: false },
};

/**
 * /dev/ui: the living style guide. Every component in components/ui and every page template, in
 * every state. Only in development (`npm run dev`); production builds return 404.
 */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiGallery />;
}
