import Image from "next/image";
import { cn } from "@/lib/utils";
import logoWhite from "../../../public/logo-white.png";
import logo from "../../../public/logo.png";

/*
 * Built from public/SwiftDrop_Full_Logo.png (cropped, transparent background).
 * When the designer's SVGs arrive, swap these two imports for /logo.svg and /logo-white.svg.
 */

interface LogoProps {
  variant?: "default" | "white";
  /** Set the height with a class (e.g. "h-8"); the width follows. */
  className?: string;
  priority?: boolean;
}

export function Logo({ variant = "default", className, priority }: LogoProps) {
  return (
    <Image
      src={variant === "white" ? logoWhite : logo}
      alt="SwiftDrop"
      priority={priority}
      className={cn("h-8 w-auto", className)}
      sizes="(min-width: 1024px) 400px, 200px"
    />
  );
}
