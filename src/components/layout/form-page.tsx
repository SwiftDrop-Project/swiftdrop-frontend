import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

interface FormPageProps {
  title: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  /** A <form> made of FormSections and ending with FormActions. */
  children: React.ReactNode;
}

/** Template for create and edit pages: header, then a form column up to 640px wide. */
export function FormPage({ title, description, backHref, backLabel, children }: FormPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} backHref={backHref} backLabel={backLabel} />
      <div className="max-w-form-app">{children}</div>
    </>
  );
}

/**
 * A group of fields with a Heading 3 title; fields sit 24px apart. Put sections in a
 * `<form className="flex flex-col gap-12" noValidate>` so they are 48px apart.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-h3 text-grey-900">
          {title}
        </h2>
        {description ? <p className="text-body-sm text-grey-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** The form's buttons, last in the form: the primary action first, then Cancel. Full width on phones. */
export function FormActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-grey-200 pt-6 sm:flex-row [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
