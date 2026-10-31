import { createMemo, For, Show } from "solid-js";

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
  const totalPages = () => Math.max(1, props.totalPages);
  // Read by the click handlers, which have no reactive owner: as a memo, a prop written as a
  // condition (`page={a() ?? 1}`) doesn't make Solid create a computation that is never disposed.
  const page = createMemo(() => props.page);

  return (
    <nav
      class={cx("bx-Pagination", props.class)}
      style={props.style}
      aria-label={props["aria-label"] ?? "Pagination"}
    >
      <Button
        disabled={props.page <= 1}
        aria-label="Previous page"
        onClick={() => props.onChange(page() - 1)}
      >
        ← Prev
      </Button>
      <Show
        when={!props.compact}
        fallback={
          <span class="bx-Pagination-status">
            <span aria-hidden="true">
              {COUNT_FORMAT.format(props.page)} / {COUNT_FORMAT.format(totalPages())}
            </span>
            <span class="bx-visually-hidden">
              Page {COUNT_FORMAT.format(props.page)} of {COUNT_FORMAT.format(totalPages())}
            </span>
          </span>
        }
      >
        <For each={pageItems(props.page, totalPages())}>
          {item =>
            item === "…" ? (
              <span class="bx-Pagination-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                variant={item === props.page ? "primary" : "default"}
                aria-label={`Page ${item}`}
                aria-current={item === props.page ? "page" : undefined}
                onClick={() => props.onChange(item)}
              >
                {COUNT_FORMAT.format(item)}
              </Button>
            )
          }
        </For>
      </Show>
      <Button
        disabled={props.page >= totalPages()}
        aria-label="Next page"
        onClick={() => props.onChange(page() + 1)}
      >
        Next →
      </Button>
    </nav>
  );
}
