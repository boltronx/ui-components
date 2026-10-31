export type ColorSchemeMode = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

export interface ColorSchemeOptions {
  /** localStorage key that holds the chosen mode. Default "bx-color-scheme". */
  key?: string;
  /** Mode used until the user picks one. Default "system". */
  defaultMode?: ColorSchemeMode;
}

export const DEFAULT_COLOR_SCHEME_KEY = "bx-color-scheme";

function toScriptLiteral(value: string): string {
  // `<` is escaped so a value can never close the surrounding <script> tag.
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * The body of a blocking <script> for <head>. It sets `data-theme` on <html> before first paint,
 * so a saved light/dark choice never flashes the other scheme. Without it the page still follows
 * the OS setting; the script only matters once a user has picked a mode.
 */
export function colorSchemeScript(options: ColorSchemeOptions = {}): string {
  const key = toScriptLiteral(options.key ?? DEFAULT_COLOR_SCHEME_KEY);
  const fallback = toScriptLiteral(options.defaultMode ?? "system");
  return [
    `(function(){var m;try{m=localStorage.getItem(${key})}catch(e){}`,
    `if(m!=="light"&&m!=="dark"&&m!=="system")m=${fallback};`,
    `if(m==="system")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";`,
    `document.documentElement.setAttribute("data-theme",m)})()`
  ].join("");
}
