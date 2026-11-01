"use client";

import { type BaseProps, cx } from "../../utils/style";
import { Button } from "../Button/Button";

const COUNT_FORMAT = /* @__PURE__ */ new Intl.NumberFormat("en-US");

/** Page numbers to show, with "…" for gaps: [1, 2, 3, "…", 8] or [1, "…", 5, 6, 7, 8]. */
export function pageItems(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const clamp = (n: number) => Math.min(Math.max(n, 2), total - 1);
  const items: (number | "…")[] = [1];
  if (current > 3) items.push("…");
  for (let page = clamp(current - 1); page <= clamp(current + 1); page++) items.push(page);
  if (current < total - 2) items.push("…");
  items.push(total);
  return items;
}

export interface PaginationProps extends BaseProps {
  /** The current page, starting at 1. */
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Only Previous and Next, e.g. on phones. */
  compact?: boolean;
  "aria-label"?: string;
}

export function Pagination(props: PaginationProps) {
  const totalPages = Math.max(1, props.totalPages);

  return (
    <nav
      className={cx("bx-Pagination", props.className)}
      style={props.style}
      aria-label={props["aria-label"] ?? "Pagination"}
    >
      <Button
        disabled={props.page <= 1}
        aria-label="Previous page"
        onClick={() => props.onChange(props.page - 1)}
      >
        ← Prev
      </Button>
      {props.compact ? (
        <span className="bx-Pagination-status">
          <span aria-hidden="true">
            {COUNT_FORMAT.format(props.page)} / {COUNT_FORMAT.format(totalPages)}
          </span>
          <span className="bx-visually-hidden">
            {`Page ${COUNT_FORMAT.format(props.page)} of ${COUNT_FORMAT.format(totalPages)}`}
          </span>
        </span>
      ) : (
        pageItems(props.page, totalPages).map((item, index) =>
          item === "…" ? (
            <span key={`gap-${index}`} className="bx-Pagination-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === props.page ? "primary" : "default"}
              aria-label={`Page ${item}`}
              aria-current={item === props.page ? "page" : undefined}
              onClick={() => props.onChange(item)}
            >
              {COUNT_FORMAT.format(item)}
            </Button>
          )
        )
      )}
      <Button
        disabled={props.page >= totalPages}
        aria-label="Next page"
        onClick={() => props.onChange(props.page + 1)}
      >
        Next →
      </Button>
    </nav>
  );
}
