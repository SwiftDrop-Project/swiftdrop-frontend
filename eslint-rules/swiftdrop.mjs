/*
 * SwiftDrop's own lint rules (wired up in eslint.config.mjs).
 *
 * - swiftdrop/no-raw-colours: colours only come from the DESIGN.md tokens in src/app/globals.css.
 * - swiftdrop/feature-boundaries: features talk to each other only through their index.ts, and the
 *   shared layers (components/ui, lib, types, hooks) never depend on features.
 */
import path from "node:path";

/* ---------------------------------------------------------------- no-raw-colours */

const RAW_COLOUR_CHECKS = [
  {
    // #abc, #abcd, #aabbcc, #aabbccdd (not "&#123;" entities or ids inside words)
    pattern: /(^|[^\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i,
    message: "Hex colour. Use a DESIGN.md token class instead (bg-orange-700, text-grey-600, border-grey-200).",
  },
  {
    pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i,
    message: "Raw colour function. Use a DESIGN.md token class instead (bg-grey-50, text-error).",
  },
  {
    // bg-[#fff], border-t-[rgb(...)], fill-[var(--x)], text-[13px], text-[color:...]
    pattern:
      /(?:^|[\s:"'`!])(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|shadow|decoration|divide|placeholder|caret|accent)-\[(?:#|rgb|hsl|oklch|oklab|lab|lch|hwb|color:|var\(|--)|(?:^|[\s:"'`!])text-\[/i,
    message:
      "Arbitrary colour or font size. Use the DESIGN.md tokens (text-label, text-grey-700, bg-orange-50); if one is missing, change DESIGN.md and globals.css first.",
  },
  {
    // Tailwind v4 shorthand for CSS variables: bg-(--brand), text-(color:--x)
    pattern:
      /(?:^|[\s:"'`!])(?:bg|text|border(?:-[trblxyse])?|ring|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent)-\(/i,
    message: "Arbitrary colour variable. Use a DESIGN.md token class instead.",
  },
];

const noRawColours = {
  meta: {
    type: "problem",
    docs: { description: "Disallow hex colours, colour functions and arbitrary Tailwind colours outside globals.css" },
    schema: [],
  },
  create(context) {
    function check(node, text) {
      for (const { pattern, message } of RAW_COLOUR_CHECKS) {
        if (pattern.test(text)) {
          context.report({ node, message });
          return;
        }
      }
    }
    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};

/* ---------------------------------------------------------------- feature-boundaries */

const SRC = path.resolve(import.meta.dirname, "..", "src");

/** Path of the imported file relative to src/ (posix, no extension), or null for packages. */
function resolveInSrc(source, filename) {
  let absolute;
  if (source.startsWith("@/")) absolute = path.join(SRC, source.slice(2));
  else if (source.startsWith(".")) absolute = path.resolve(path.dirname(filename), source);
  else return null;
  const relative = path.relative(SRC, absolute).split(path.sep).join("/");
  if (relative.startsWith("..")) return null;
  return relative.replace(/\.(tsx?|jsx?|mjs)$/, "").replace(/\/index$/, "");
}

/** "features/delivery/components/x" → { area: "features", feature: "delivery", rest: "components/x" } */
function describe(relative) {
  const parts = relative.split("/");
  if (parts[0] === "features") {
    return { area: "features", feature: parts[1], rest: parts.slice(2).join("/") };
  }
  if (parts[0] === "components") return { area: `components/${parts[1] ?? ""}` };
  return { area: parts[0] };
}

const featureBoundaries = {
  meta: {
    type: "problem",
    docs: { description: "Keep features behind their index.ts and keep shared layers independent of features" },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const fromRelative = path.relative(SRC, filename).split(path.sep).join("/");
    if (fromRelative.startsWith("..")) return {};
    const from = describe(fromRelative);

    function check(node, source) {
      if (typeof source !== "string") return;
      const target = resolveInSrc(source, filename);
      if (target === null) return;
      const to = describe(target);

      // Shared layers must not depend on features (or ui on layout).
      if (from.area === "components/ui" && (to.area === "features" || to.area === "components/layout")) {
        context.report({
          node,
          message: "components/ui is the base layer: it may use lib/, types/ and other ui components only.",
        });
        return;
      }
      if (["lib", "types", "hooks"].includes(from.area) && (to.area === "features" || to.area.startsWith("components/"))) {
        context.report({
          node,
          message: `${from.area}/ is shared code: it must not import features or components.`,
        });
        return;
      }

      if (to.area !== "features") return;

      if (from.area === "features" && from.feature === to.feature) {
        if (source.startsWith("@/")) {
          context.report({
            node,
            message: `Inside the ${to.feature} feature, import its own files with a relative path ("./api", "../types"), not "${source}".`,
          });
        }
        return;
      }

      if (to.rest !== "" || source !== `@/features/${to.feature}`) {
        context.report({
          node,
          message: `Import the ${to.feature} feature only through its index.ts: "@/features/${to.feature}". Export what you need there.`,
        });
      }
    }

    return {
      ImportDeclaration(node) {
        check(node.source, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node.source, node.source.value);
      },
      ExportAllDeclaration(node) {
        check(node.source, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") check(node.source, node.source.value);
      },
    };
  },
};

const plugin = {
  meta: { name: "swiftdrop" },
  rules: {
    "no-raw-colours": noRawColours,
    "feature-boundaries": featureBoundaries,
  },
};

export default plugin;
