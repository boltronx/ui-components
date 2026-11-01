"use client";

import {
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";

import { useLatest } from "../../utils/form";
import { useMergedRefs } from "../../utils/refs";
import { type BaseProps, cx, mergeStyle, type StyleProp } from "../../utils/style";

export type ScrollAreaType = "hover" | "auto" | "always" | "never";

interface ScrollAreaSplitType {
  desktop: ScrollAreaType;
  mobile: ScrollAreaType;
}

export interface ScrollAreaProps extends BaseProps {
  children?: ReactNode;
  height?: string | number;
  width?: string | number;
  type?: ScrollAreaType | ScrollAreaSplitType;
  scrollbarSize?: number;
  offsetScrollbars?: boolean;
  /** The axes it scrolls on, with a scrollbar each; the other axis is left to the page. Default "xy". */
  scrollbars?: "x" | "y" | "xy";
  /**
   * What happens past either end. "auto" (default) scrolls the page on, like any scroll box;
   * "contain" stops there, for panels such as a sidebar; "none" also drops the bounce effect.
   */
  overscrollBehavior?: "auto" | "contain" | "none";
  viewportStyle?: StyleProp;
  viewportClassName?: string;
  viewportRef?: Ref<HTMLDivElement>;
  /**
   * Makes the scrolling area a Tab stop, so keyboard users can scroll it with the arrow keys in
   * browsers that don't do this for them (Safari, older Chrome). Use it for content with nothing
   * focusable inside, such as a block of terms; give it an `aria-label` too.
   */
  focusable?: boolean;
  /** Names the area for screen readers; needed with `focusable`. */
  "aria-label"?: string;
  onChange?: (pos: { x: number; y: number }) => void;
}

const DEFAULT_TYPE: ScrollAreaSplitType = { desktop: "hover", mobile: "never" };
const off = 2;
const hoverIdleMs = 1200;

export function ScrollArea(props: ScrollAreaProps) {
  const [thumbs, setThumbs] = useState({ h: 0, top: 0, w: 0, left: 0 });
  const [hasV, setHasV] = useState(false);
  const [hasHoriz, setHasHoriz] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [isMobilePointer, setIsMobilePointer] = useState(false);

  const viewport = useRef<HTMLDivElement>(null);
  const viewportRef = useMergedRefs(viewport, props.viewportRef);
  const inside = useRef(false);
  const scrollingRef = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const type = props.type ?? DEFAULT_TYPE;
  const size = props.scrollbarSize ?? 6;
  const doOffset = props.offsetScrollbars ?? false;
  const resolvedType: ScrollAreaType =
    typeof type === "string" ? type : isMobilePointer ? type.mobile : type.desktop;
  const visible =
    resolvedType === "never"
      ? false
      : resolvedType === "always" || scrolling
        ? true
        : resolvedType === "hover"
          ? hovered
          : true;

  const latest = useLatest({ props, resolvedType });

  const markHoverActivity = useCallback(() => {
    if (!inside.current || latest.current.resolvedType !== "hover") return;
    setHovered(true);
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      if (!scrollingRef.current) setHovered(false);
    }, hoverIdleMs);
  }, [latest]);

  const updateThumbs = useCallback(() => {
    const vp = viewport.current;
    if (!vp) return;
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = vp;
    const { props } = latest.current;
    const sb = props.scrollbars ?? "xy";

    const vScroll = sb !== "x" && scrollHeight > clientHeight + 1;
    const hScroll = sb !== "y" && scrollWidth > clientWidth + 1;
    setHasV(vScroll);
    setHasHoriz(hScroll);

    props.onChange?.({ x: scrollLeft, y: scrollTop });

    scrollingRef.current = true;
    setScrolling(true);
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      scrollingRef.current = false;
      setScrolling(false);
    }, 1000);

    markHoverActivity();

    setThumbs(prev => {
      const next = { ...prev };
      if (vScroll) {
        const trackH = clientHeight - off * 2;
        const h = Math.max((clientHeight / scrollHeight) * trackH, 24);
        const maxScroll = scrollHeight - clientHeight;
        next.h = h;
        next.top = maxScroll > 0 ? ((trackH - h) * scrollTop) / maxScroll : 0;
      }
      if (hScroll) {
        const trackW = clientWidth - off * 2;
        const w = Math.max((clientWidth / scrollWidth) * trackW, 24);
        const maxScroll = scrollWidth - clientWidth;
        next.w = w;
        next.left = maxScroll > 0 ? ((trackW - w) * scrollLeft) / maxScroll : 0;
      }
      return next;
    });
  }, [latest, markHoverActivity]);

  useEffect(() => {
    const mobilePointerQuery = window.matchMedia("(pointer: coarse), (hover: none)");
    const updatePointer = () => setIsMobilePointer(mobilePointerQuery.matches);
    updatePointer();

    const vp = viewport.current;
    if (!vp) return;
    vp.addEventListener("scroll", updateThumbs, { passive: true });
    mobilePointerQuery.addEventListener("change", updatePointer);

    const ro = new ResizeObserver(updateThumbs);
    ro.observe(vp);
    updateThumbs();

    return () => {
      vp.removeEventListener("scroll", updateThumbs);
      mobilePointerQuery.removeEventListener("change", updatePointer);
      ro.disconnect();
      clearTimeout(scrollTimer.current);
      clearTimeout(hoverTimer.current);
    };
  }, [updateThumbs]);

  useLayoutEffect(() => {
    if (viewport.current) updateThumbs();
  }, [props.offsetScrollbars, updateThumbs]);

  // Ends a thumb drag still in progress, so unmounting mid-drag leaves no document listeners.
  const endDrag = useRef<() => void>(undefined);
  useEffect(() => () => endDrag.current?.(), []);

  const makeDrag = (axis: "v" | "h") => (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const vp = viewport.current;
    if (!vp) return;
    endDrag.current?.();
    const start = axis === "v" ? e.clientY : e.clientX;
    const startScroll = axis === "v" ? vp.scrollTop : vp.scrollLeft;
    const totalScroll = axis === "v" ? vp.scrollHeight : vp.scrollWidth;
    const clientSize = axis === "v" ? vp.clientHeight : vp.clientWidth;

    const onMove = (ev: globalThis.MouseEvent) => {
      const delta = (axis === "v" ? ev.clientY : ev.clientX) - start;
      if (axis === "v") vp.scrollTop = startScroll + delta * (totalScroll / clientSize);
      else vp.scrollLeft = startScroll + delta * (totalScroll / clientSize);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      endDrag.current = undefined;
    };
    endDrag.current = onUp;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className={cx("bx-ScrollArea", props.className)}
      style={mergeStyle(props.style, {
        height: typeof props.height === "number" ? `${props.height}px` : props.height,
        width: typeof props.width === "number" ? `${props.width}px` : props.width
      })}
      onMouseEnter={() => {
        inside.current = true;
        markHoverActivity();
      }}
      onMouseMove={markHoverActivity}
      onMouseLeave={() => {
        inside.current = false;
        clearTimeout(hoverTimer.current);
        if (resolvedType === "hover") setHovered(false);
      }}
    >
      <div
        ref={viewportRef}
        className={cx("bx-ScrollArea-viewport", props.viewportClassName)}
        tabIndex={props.focusable ? 0 : undefined}
        role={props.focusable ? "region" : undefined}
        aria-label={props["aria-label"]}
        style={mergeStyle(props.viewportStyle, {
          paddingRight: doOffset && hasV ? `${size + off}px` : undefined,
          paddingBottom: doOffset && hasHoriz ? `${size + off}px` : undefined,
          overscrollBehavior: props.overscrollBehavior
        })}
        data-scrollbars={props.scrollbars ?? "xy"}
      >
        {props.children}
      </div>

      <div
        className="bx-ScrollArea-scrollbar"
        data-orientation="vertical"
        style={{
          width: `${size}px`,
          top: `${off}px`,
          right: `${off}px`,
          bottom: `${off}px`,
          opacity: visible && hasV ? 1 : 0,
          pointerEvents: visible && hasV ? "auto" : "none"
        }}
      >
        <div
          className="bx-ScrollArea-thumb"
          style={{ height: `${thumbs.h}px`, transform: `translateY(${thumbs.top}px)` }}
          onMouseDown={makeDrag("v")}
        />
      </div>

      <div
        className="bx-ScrollArea-scrollbar"
        data-orientation="horizontal"
        style={{
          height: `${size}px`,
          left: `${off}px`,
          right: `${off}px`,
          bottom: `${off}px`,
          opacity: visible && hasHoriz ? 1 : 0,
          pointerEvents: visible && hasHoriz ? "auto" : "none"
        }}
      >
        <div
          className="bx-ScrollArea-thumb"
          style={{ width: `${thumbs.w}px`, transform: `translateX(${thumbs.left}px)` }}
          onMouseDown={makeDrag("h")}
        />
      </div>
    </div>
  );
}
