import * as React from "react";
import { SiteContainer } from "@/components/layout/site-container";
import { InlineNotice } from "@/components/ui/inline-notice";
import { LAST_UPDATED } from "../constants";

export interface TocSection {
  id: string;
  label: string;
}

interface InfoArticleLayoutProps {
  title: string;
  description?: string;
  lastUpdated?: string;
  notice?: { title: string; body: string };
  sections: TocSection[];
  children: React.ReactNode;
}

export function InfoArticleLayout({
  title,
  description,
  lastUpdated = LAST_UPDATED,
  notice,
  sections,
  children,
}: InfoArticleLayoutProps) {
  return (
    <div className="bg-white">
      <SiteContainer className="py-10 sm:py-14">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="max-w-3xl lg:col-span-8">
            <header className="flex flex-col">
              <h1 className="text-h1 text-grey-900 sm:text-display">{title}</h1>
              <p className="mt-2 text-body-sm text-grey-600">Last updated: {lastUpdated}</p>
              {description ? <p className="mt-3 text-body text-grey-600">{description}</p> : null}
              {notice ? (
                <InlineNotice tone="info" title={notice.title} className="mt-6">
                  <p>{notice.body}</p>
                </InlineNotice>
              ) : null}
            </header>

            <article className="mt-8 flex flex-col gap-10 border-t border-grey-200 pt-8">{children}</article>
          </div>

          <aside className="hidden lg:col-span-4 lg:block">
            <nav
              aria-label="On this page"
              className="sticky top-24 rounded-lg border border-grey-200 bg-grey-50 p-5"
            >
              <h2 className="text-label font-semibold text-grey-900">On this page</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-sm text-body-sm text-grey-700 hover:text-orange-700 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </SiteContainer>
    </div>
  );
}

export function InfoSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-24 flex-col gap-3">
      <h2 id={`${id}-heading`} className="text-h2 text-grey-900">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-body text-grey-700">{children}</div>
    </section>
  );
}

