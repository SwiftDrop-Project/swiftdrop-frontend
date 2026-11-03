import { createCn } from "cn/config";

/**
 * Joins class names and resolves Tailwind conflicts.
 * Our custom type scale (text-h1, text-label ...) and shadow-overlay are registered here,
 * otherwise "text-label text-grey-700" would be read as two text colours and one dropped.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "body", "body-sm", "label", "caption"] },
      ],
      shadow: [{ shadow: ["overlay"] }],
    },
  },
});
