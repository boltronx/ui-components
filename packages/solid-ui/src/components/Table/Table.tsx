import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  Show,
  untrack
} from "solid-js";

import { FolderEmptyIcon } from "../../icons";
import { type BaseProps, cx, mergeStyle } from "../../utils/style";
import { Loader } from "../Loader/Loader";
import { Pagination } from "../Pagination/Pagination";
import { ScrollArea } from "../ScrollArea/ScrollArea";

export interface TableColumn<T> {
  header: JSX.Element;
  render: (row: T, index: number) => JSX.Element;
  align?: "left" | "center" | "right";
  /** Column width, e.g. "8rem". */
  width?: string;
  minWidth?: string;
  /** Stays in view while the table scrolls sideways. */
  fixed?: "left" | "right";
  hidden?: boolean;
  /** Class for the column's header and cells. */
  class?: string;
  /**
   * How the cell shows in the stacked (phone) layout: beside its header as a label (default),
   * full width without the label, in the card's top-right corner (for row actions), or not at all.
   */
  stacked?: "label" | "full" | "corner" | "hidden";
}

export interface TablePagination {
  /** The current page, starting at 1. */
  page: number;
  pageSize: number;
  totalItems: number;
  onChange: (page: number) => void;
  /** Singular noun for the summary, e.g. "order" for "Showing 1 – 25 of 40 orders". */
  itemName?: string;
}

export interface TableProps<T> extends BaseProps {
  columns: TableColumn<T>[];
  data: T[];
  "aria-label"?: string;
  /** Shows an overlay over the current rows instead of replacing them. */
  loading?: boolean;
  emptyMessage?: JSX.Element;
  emptyDescription?: JSX.Element;
  /** Replaces the empty folder shown when there are no rows. */
  emptyIcon?: JSX.Element;
  pagination?: TablePagination;
  /** Below this width the table scrolls sideways. Default "40rem". */
  minWidth?: string;
  /**
   * Below this width of the table itself (not the screen), in px, rows become stacked cards.
   * Default 576; 0 never stacks.
   */
  stackBelow?: number;
  /**
   * Makes each row clickable, and a Tab stop that Enter activates. A screen reader reads a
   * focused row's cells but can't tell that the row does anything, so give it a named control
   * too: either `rowLabel`, or a link or button of your own in the row, e.g. on the order number:
   * `render: order => <Anchor component="button" type="button" onClick={...}>{order.id}</Anchor>`.
   * A click on a control inside a row goes to that control, not to `onRowClick`.
   */
  onRowClick?: (row: T, event: MouseEvent | KeyboardEvent) => void;
  /**
   * Names what `onRowClick` does for a row, e.g. `order => \`Open order ${order.id}\``. Each row
   * then gets a button with that name, unseen but announced, which keyboard and screen reader
   * users reach instead of the row; the row stays clickable for the mouse.
   */
  rowLabel?: (row: T) => string;
}

const COUNT_FORMAT = /* @__PURE__ */ new Intl.NumberFormat("en-US");

/** "Showing 1 – 25 of 40 orders", or "" without an item name or items. */
export function paginationSummary(pagination: TablePagination): string {
  const { page, pageSize, totalItems, itemName } = pagination;
  if (!itemName || totalItems === 0) return "";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const count = COUNT_FORMAT.format;
  const plural = totalItems === 1 ? "" : "s";
  return `Showing ${count(start)} – ${count(end)} of ${count(totalItems)} ${itemName}${plural}`;
}

const INTERACTIVE =
  'a[href], button, input, select, textarea, label, summary, [role="button"], [role="link"], [tabindex]';

type Offsets = { left: (number | undefined)[]; right: (number | undefined)[] };

export function Table<T>(props: TableProps<T>) {
  const [stacked, setStacked] = createSignal(false);
  const [scrolledFromLeft, setScrolledFromLeft] = createSignal(false);
  const [canScrollRight, setCanScrollRight] = createSignal(false);
  const [offsets, setOffsets] = createSignal<Offsets>({ left: [], right: [] });
  let root: HTMLDivElement | undefined;
  let viewport: HTMLDivElement | undefined;
  let table: HTMLTableElement | undefined;

  const columns = createMemo(() => props.columns.filter(column => !column.hidden));
  const pagination = () => props.pagination;
  const totalPages = () => {
    const current = pagination();
    return current ? Math.max(1, Math.ceil(current.totalItems / current.pageSize)) : 1;
  };

  /** The last left-fixed and the first right-fixed column, which cast the scroll shadows. */
  const edges = createMemo(() => {
    let left = -1;
    let right = -1;
    columns().forEach((column, index) => {
      if (column.fixed === "left") left = index;
      if (column.fixed === "right" && right === -1) right = index;
    });
    return { left, right };
  });

  /** Sticky offsets: each fixed column sits after the widths of the fixed columns before it. */
  function measureOffsets() {
    if (!table || untrack(stacked)) return;
    const cols = untrack(columns);
    const headers = table.querySelectorAll<HTMLTableCellElement>("thead th");
    if (headers.length !== cols.length) return;
    const widths = [...headers].map(th => th.getBoundingClientRect().width);
    const next: Offsets = { left: [], right: [] };
    let left = 0;
    cols.forEach((column, i) => {
      if (column.fixed !== "left") return;
      next.left[i] = left;
      left += widths[i]!;
    });
    let right = 0;
    for (let i = cols.length - 1; i >= 0; i--) {
      if (cols[i]!.fixed !== "right") continue;
      next.right[i] = right;
      right += widths[i]!;
    }
    setOffsets(prev => {
      const same = (a: (number | undefined)[], b: (number | undefined)[]) =>
        a.length === b.length && a.every((v, i) => Math.abs((v ?? 0) - (b[i] ?? 0)) < 0.1);
      return same(prev.left, next.left) && same(prev.right, next.right) ? prev : next;
    });
  }

  function measureScroll() {
    if (!viewport) return;
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    setScrolledFromLeft(viewport.scrollLeft > 0.5 && edges().left >= 0);
    setCanScrollRight(maxScroll - viewport.scrollLeft > 2 && edges().right >= 0);
  }

  // Read by the resize observer, which has no reactive owner: as a memo, a prop written as a
  // condition doesn't make Solid create a computation that is never disposed.
  const stackBelow = createMemo(() => props.stackBelow ?? 576);

  function measure() {
    if (root) setStacked(root.getBoundingClientRect().width < stackBelow());
    measureOffsets();
    measureScroll();
  }

  onMount(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (root) observer.observe(root);
    if (table) observer.observe(table);
    onCleanup(() => observer.disconnect());
  });

  // Column widths change with the content, so offsets are measured again after each render.
  createEffect(() => {
    columns();
    void props.data;
    queueMicrotask(measure);
  });

  const stickyStyle = (index: number, fixed: TableColumn<T>["fixed"]) => {
    if (!fixed || stacked()) return undefined;
    const offset = fixed === "left" ? offsets().left[index] : offsets().right[index];
    return offset === undefined ? undefined : `${fixed}: ${offset}px`;
  };

  const cellProps = (column: TableColumn<T>, index: number) => ({
    class: column.class,
    "data-align": column.align,
    "data-fixed": column.fixed,
    "data-fixed-edge":
      (column.fixed === "left" && index === edges().left) ||
      (column.fixed === "right" && index === edges().right)
        ? column.fixed
        : undefined
  });

  const isEmpty = () => props.data.length === 0;

  const hasRowAction = () => !!props.onRowClick && !!props.rowLabel;
  // The row action button goes in the first cell that the stacked layout still shows.
  const actionColumn = createMemo(() =>
    Math.max(
      0,
      columns().findIndex(column => column.stacked !== "hidden")
    )
  );

  return (
    <div
      ref={element => (root = element)}
      class={cx("bx-Table", props.class)}
      style={props.style}
      data-stacked={stacked() ? "" : undefined}
    >
      <Show when={props.loading}>
        <div class="bx-Table-loading" aria-busy="true">
          <Loader size="md" />
        </div>
      </Show>

      <ScrollArea
        class="bx-Table-scroll"
        viewportRef={element => (viewport = element)}
        onChange={measureScroll}
      >
        <table
          ref={element => (table = element)}
          class="bx-Table-table"
          aria-label={props["aria-label"]}
          aria-busy={props.loading || undefined}
          data-scrolled-left={scrolledFromLeft() ? "" : undefined}
          data-scrollable-right={canScrollRight() ? "" : undefined}
          style={stacked() ? undefined : { "min-width": props.minWidth ?? "40rem" }}
        >
          <thead>
            <tr>
              <For each={columns()}>
                {(column, index) => (
                  <th
                    {...cellProps(column, index())}
                    class={cx("bx-Table-th", column.class)}
                    scope="col"
                    style={mergeStyle(stickyStyle(index(), column.fixed), {
                      width: column.width,
                      "min-width": column.minWidth
                    })}
                  >
                    {column.header}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={props.data}>
              {(row, rowIndex) => (
                <tr
                  class="bx-Table-tr"
                  data-clickable={props.onRowClick ? "" : undefined}
                  // With a row action button, that button is the Tab stop; one per row is enough.
                  tabindex={props.onRowClick && !hasRowAction() ? 0 : undefined}
                  onClick={event => {
                    // A click on a control inside the row (a link, a row action) is that
                    // control's, not the row's.
                    const control = (event.target as Element).closest(INTERACTIVE);
                    if (
                      control &&
                      control !== event.currentTarget &&
                      event.currentTarget.contains(control)
                    )
                      return;
                    props.onRowClick?.(row, event);
                  }}
                  onKeyDown={event => {
                    if (event.key !== "Enter" || event.target !== event.currentTarget) return;
                    props.onRowClick?.(row, event);
                  }}
                >
                  <For each={columns()}>
                    {(column, index) => (
                      <td
                        {...cellProps(column, index())}
                        class={cx("bx-Table-td", column.class)}
                        data-stacked-as={column.stacked ?? "label"}
                        style={stickyStyle(index(), column.fixed)}
                      >
                        <Show when={hasRowAction() && index() === actionColumn()}>
                          <button
                            type="button"
                            class="bx-visually-hidden bx-Table-rowAction"
                            onClick={event => props.onRowClick?.(row, event)}
                          >
                            {props.rowLabel?.(row)}
                          </button>
                        </Show>
                        {/* Read out too: stacked, the header row is hidden, so this is the
                            only thing that says what the value is. */}
                        <Show when={stacked() && (column.stacked ?? "label") === "label"}>
                          <span class="bx-Table-label">{column.header}</span>
                        </Show>
                        <span class="bx-Table-value">{column.render(row, rowIndex())}</span>
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </ScrollArea>

      <Show when={isEmpty() && !props.loading}>
        <div class="bx-Table-empty" role="status">
          <span class="bx-Table-emptyIcon">{props.emptyIcon ?? <FolderEmptyIcon />}</span>
          <p class="bx-Table-emptyTitle">{props.emptyMessage ?? "No data found"}</p>
          <Show when={props.emptyDescription}>
            <p class="bx-Table-emptyDescription">{props.emptyDescription}</p>
          </Show>
        </div>
      </Show>

      <Show when={pagination()}>
        {current => (
          // Kept on an empty page past the first (e.g. its last rows were deleted), so there is
          // still a way back to the pages that have rows.
          <Show when={!isEmpty() || current().page > 1}>
            <div class="bx-Table-footer">
              <span class="bx-Table-summary">{isEmpty() ? "" : paginationSummary(current())}</span>
              <Show when={totalPages() > 1 || current().page > 1}>
                <Pagination
                  page={current().page}
                  totalPages={totalPages()}
                  onChange={page => current().onChange(page)}
                  compact={stacked()}
                />
              </Show>
            </div>
          </Show>
        )}
      </Show>
    </div>
  );
}
