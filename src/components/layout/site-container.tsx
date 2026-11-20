import { cn } from "@/lib/utils";

export interface SiteContainerProps {
  children: React.ReactNode;
  className?: string;
}

/** Wide public page container aligned across header, sections, footer, and info articles. */
export function SiteContainer({ children, className }: SiteContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-wide px-4 sm:px-6 lg:px-10 xl:px-16",
        className,
      )}
    >
      {children}
    </div>
  );
}

