import type { Config } from "tailwindcss";

/**
 * Tailwind CSS 4 — theme tokens live in `app/globals.css` (`@theme`).
 * This file satisfies the project layout (docs/plan.md Task 1) and gives
 * explicit content paths for class scanning (app + components).
 */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./emails/**/*.{js,ts,jsx,tsx}",
  ],
} satisfies Config;
