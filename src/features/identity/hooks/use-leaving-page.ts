"use client";

import * as React from "react";

/**
 * A "this page is being left" flag, for a button that keeps its spinner after a successful request until the
 * next page shows (so it can't be pressed twice).
 *
 * Pages can come back with that flag still set, which would leave the button spinning and disabled:
 * - Next.js (cacheComponents) doesn't unmount a page on navigation. It hides it with React <Activity> and
 *   shows it again, state included, on Back.
 * - After a full-page navigation (e.g. to Google), the browser's back/forward cache restores the page as it
 *   was left.
 *
 * So the flag clears when the page is hidden (layout-effect cleanup, which <Activity> runs on hide) and when
 * the browser restores the page (pageshow with event.persisted).
 */
export function useLeavingPage(): [leaving: boolean, startLeaving: () => void] {
  const [leaving, setLeaving] = React.useState(false);

  React.useLayoutEffect(() => {
    return () => setLeaving(false);
  }, []);

  React.useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLeaving(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const startLeaving = React.useCallback(() => setLeaving(true), []);
  return [leaving, startLeaving];
}
