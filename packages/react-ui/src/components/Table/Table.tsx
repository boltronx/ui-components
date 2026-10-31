"use client";

import {
  type CSSProperties,
  type Key,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { FolderEmptyIcon } from "../../icons";
import { useLatest } from "../../utils/form";
import { type BaseProps, cx, mergeStyle } from "../../utils/style";
import { Loader } from "../Loader/Loader";
import { Pagination } from "../Pagination/Pagination";
import { ScrollArea } from "../ScrollArea/ScrollArea";

export interface TableColumn<T> {
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  align?: "left" | "center" | "right";
  /** Column width, e.g. "8rem". */
  width?: string;
  minWidth?: string;
  /** Stays in view while the table scrolls sideways. */
  fixed?: "left" | "right";
  hidden?: boolean;
  /** Class for the column's header and cells. */
  className?: string;
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
  /** A stable key for each row, e.g. its id. Default the row's index. */
  rowKey?: (row: T, index: number) => Key;
  "aria-label"?: string;
  /** Shows an overlay over the current rows instead of replacing them. */
  loading?: boolean;
  emptyMessage?: ReactNode;
  emptyDescription?: ReactNode;
  /** Replaces the empty folder shown when there are no rows. */
  emptyIcon?: ReactNode;
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
  onRowClick?: (
    row: T,
    event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>
  ) => void;
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
  const [stacked, setStacked] = useState(false);
  const [scrolledFromLeft, setScrolledFromLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [offsets, setOffsets] = useState<Offsets>({ left: [], right: [] });
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLTableElement>(null);

  const columns = useMemo(() => props.columns.filter(column => !column.hidden), [props.columns]);
  const pagination = props.pagination;
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize))
    : 1;

  /** The last left-fixed and the first right-fixed column, which cast the scroll shadows. */
  const edges = useMemo(() => {
    let left = -1;
    let right = -1;
    columns.forEach((column, index) => {
      if (column.fixed === "left") left = index;
      if (column.fixed === "right" && right === -1) right = index;
    });
    return { left, right };
  }, [columns]);

  const latest = useLatest({ columns, edges, stacked, stackBelow: props.stackBelow });

  /** Sticky offsets: each fixed column sits after the widths of the fixed columns before it. */
  const measureOffsets = useCallback(
    (isStacked: boolean) => {
      const element = table.current;
      if (!element || isStacked) return;
      const cols = latest.current.columns;
      const headers = element.querySelectorAll<HTMLTableCellElement>("thead th");
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
    },
    [latest]
  );

  const measureScroll = useCallback(() => {
    const vp = viewport.current;
    if (!vp) return;
    const { edges } = latest.current;
    const maxScroll = Math.max(0, vp.scrollWidth - vp.clientWidth);
    setScrolledFromLeft(vp.scrollLeft > 0.5 && edges.left >= 0);
    setCanScrollRight(maxScroll - vp.scrollLeft > 2 && edges.right >= 0);
  }, [latest]);

  const measure = useCallback(() => {
    let isStacked = latest.current.stacked;
    if (root.current) {
      isStacked = root.current.getBoundingClientRect().width < (latest.current.stackBelow ?? 576);
      setStacked(isStacked);
    }
    measureOffsets(isStacked);
    measureScroll();
  }, [latest, measureOffsets, measureScroll]);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    if (table.current) observer.observe(table.current);
    return () => observer.disconnect();
  }, [measure]);

  // Column widths change with the content, so offsets are measured again after each render.
  useLayoutEffect(measure, [measure, columns, props.data]);

  const stickyStyle = (
    index: number,
    fixed: TableColumn<T>["fixed"]
  ): CSSProperties | undefined => {
    if (!fixed || stacked) return undefined;
    const offset = fixed === "left" ? offsets.left[index] : offsets.right[index];
    return offset === undefined ? undefined : { [fixed]: `${offset}px` };
  };

  const cellProps = (column: TableColumn<T>, index: number) => ({
    "data-align": column.align,
    "data-fixed": column.fixed,
    "data-fixed-edge":
      (column.fixed === "left" && index === edges.left) ||
      (column.fixed === "right" && index === edges.right)
        ? column.fixed
        : undefined
  });

  const isEmpty = props.data.length === 0;

  const hasRowAction = !!props.onRowClick && !!props.rowLabel;
  // The row action button goes in the first cell that the stacked layout still shows.
  const actionColumn = Math.max(
    0,
    columns.findIndex(column => column.stacked !== "hidden")
  );

  return (
    <div
      ref={root}
      className={cx("bx-Table", props.className)}
      style={props.style}
      data-stacked={stacked ? "" : undefined}
    >
      {props.loading && (
        <div className="bx-Table-loading" aria-busy="true">
          <Loader size="md" />
        </div>
      )}

      <ScrollArea className="bx-Table-scroll" viewportRef={viewport} onChange={measureScroll}>
        <table
          ref={table}
          className="bx-Table-table"
          aria-label={props["aria-label"]}
          aria-busy={props.loading || undefined}
          data-scrolled-left={scrolledFromLeft ? "" : undefined}
          data-scrollable-right={canScrollRight ? "" : undefined}
          style={stacked ? undefined : { minWidth: props.minWidth ?? "40rem" }}
        >
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  {...cellProps(column, index)}
                  className={cx("bx-Table-th", column.className)}
                  scope="col"
                  style={mergeStyle(stickyStyle(index, column.fixed), {
                    width: column.width,
                    minWidth: column.minWidth
                  })}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.data.map((row, rowIndex) => (
              <tr
                key={props.rowKey?.(row, rowIndex) ?? rowIndex}
                className="bx-Table-tr"
                data-clickable={props.onRowClick ? "" : undefined}
                // With a row action button, that button is the Tab stop; one per row is enough.
                tabIndex={props.onRowClick && !hasRowAction ? 0 : undefined}
                onClick={event => {
                  // A click on a control inside the row (a link, a row action) is that
                  // control's, not the row's.
                  const control = (event.target as Element).closest(INTERACTIVE);
                  if (
                    control &&
                    control !== event.currentTarget &&
                    event.currentTarget.contains(control)
                  ) {
                    return;
                  }
                  props.onRowClick?.(row, event);
                }}
                onKeyDown={event => {
                  if (event.key !== "Enter" || event.target !== event.currentTarget) return;
                  props.onRowClick?.(row, event);
                }}
              >
                {columns.map((column, index) => (
                  <td
                    key={index}
                    {...cellProps(column, index)}
                    className={cx("bx-Table-td", column.className)}
                    data-stacked-as={column.stacked ?? "label"}
                    style={stickyStyle(index, column.fixed)}
                  >
                    {/*
                      Read out with the value: stacked, the header row is hidden, so screen
                      readers have no column header to pair the cell with.
                    */}
                    {hasRowAction && index === actionColumn && (
                      <button
                        type="button"
                        className="bx-visually-hidden bx-Table-rowAction"
                        // Clicks the row itself, so onRowClick gets the row's event as always.
                        // Its own click stops here: the row's bubbles on to the Table's
                        // ancestors, so they see one click, not two.
                        onClick={event => {
                          event.stopPropagation();
                          event.currentTarget.closest("tr")?.click();
                        }}
                      >
                        {props.rowLabel?.(row)}
                      </button>
                    )}
                    {stacked && (column.stacked ?? "label") === "label" && (
                      <span className="bx-Table-label">{column.header}</span>
                    )}
                    <span className="bx-Table-value">{column.render(row, rowIndex)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {isEmpty && !props.loading && (
        <div className="bx-Table-empty" role="status">
          <span className="bx-Table-emptyIcon">{props.emptyIcon ?? <FolderEmptyIcon />}</span>
          <p className="bx-Table-emptyTitle">{props.emptyMessage ?? "No data found"}</p>
          {props.emptyDescription ? (
            <p className="bx-Table-emptyDescription">{props.emptyDescription}</p>
          ) : null}
        </div>
      )}

      {/*
        Kept on an empty page past the first (e.g. its last rows were deleted), so there is
        still a way back to the pages that have rows.
      */}
      {pagination && (!isEmpty || pagination.page > 1) && (
        <div className="bx-Table-footer">
          <span className="bx-Table-summary">{isEmpty ? "" : paginationSummary(pagination)}</span>
          {(totalPages > 1 || pagination.page > 1) && (
            <Pagination
              page={pagination.page}
              totalPages={totalPages}
              onChange={page => pagination.onChange(page)}
              compact={stacked}
            />
          )}
        </div>
      )}
    </div>
  );
}
