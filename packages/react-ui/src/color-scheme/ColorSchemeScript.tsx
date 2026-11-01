import { type ColorSchemeOptions, colorSchemeScript } from "./script";

export interface ColorSchemeScriptProps extends Omit<ColorSchemeOptions, "key"> {
  /** localStorage key that holds the chosen mode. Default "bx-color-scheme". */
  storageKey?: string;
  /** A Content-Security-Policy nonce, when the page's policy requires one for inline scripts. */
  nonce?: string;
}

/**
 * The blocking <script> that sets `data-theme` before first paint. Render it in <head> of the
 * root layout; it works in a Server Component. The script changes <html> before React hydrates,
 * so give <html> `suppressHydrationWarning`.
 *
 *   <html lang="en" suppressHydrationWarning>
 *     <head><ColorSchemeScript /></head>
 */
export function ColorSchemeScript({ nonce, storageKey, ...options }: ColorSchemeScriptProps) {
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: colorSchemeScript({ ...options, key: storageKey }) }} />;
}
