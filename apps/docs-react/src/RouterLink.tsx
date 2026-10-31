import type { AnchorHTMLAttributes } from "react";
import { Link } from "react-router";

/**
 * react-router's Link takes `to`, while Anchor and Navlink pass `href`, as Next.js's Link takes.
 * Pass this as their `component` to keep client-side routing.
 */
export function RouterLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <Link to={href ?? "/"} {...props} />;
}
