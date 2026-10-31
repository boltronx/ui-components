import type { JSX } from "solid-js";
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";

import { type BaseProps, cx, mergeStyle, type StyleProp } from "../../utils/style";

export type ScrollAreaType = "hover" | "auto" | "always" | "never";

interface ScrollAreaSplitType {
  desktop: ScrollAreaType;
  mobile: ScrollAreaType;
}

export interface ScrollAreaProps extends BaseProps {
  children?: JSX.Element;
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
  viewportClass?: string;
  viewportRef?: (el: HTMLDivElement) => void;
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

export function ScrollArea(props: ScrollAreaProps) {
  const [thumbH, setThumbH] = createSignal(0);
  const [thumbTop, setThumbTop] = createSignal(0);
  const [thumbW, setThumbW] = createSignal(0);
  const [thumbLeft, setThumbLeft] = createSignal(0);
  const [hasV, setHasV] = createSignal(false);
  const [hasHoriz, setHasHoriz] = createSignal(false);
  const [inside, setInside] = createSignal(false);
  const [hovered, setHovered] = createSignal(false);
  const [scrolling, setScrolling] = createSignal(false);
  const [isMobilePointer, setIsMobilePointer] = createSignal(false);

  let viewport: HTMLDivElement | undefined;
  let scrollTimer: ReturnType<typeof setTimeout> | undefined;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;

  const off = 2;
  const hoverIdleMs = 1200;
  const type = () =>
    props.type ??
    ({
      desktop: "hover",
      mobile: "never"
    } satisfies ScrollAreaSplitType);
  const size = () => props.scrollbarSize ?? 6;
  const doOffset = () => props.offsetScrollbars ?? false;

  const resolvedType = createMemo<ScrollAreaType>(() => {
    const t = type();
    if (typeof t === "string") return t;
    return isMobilePointer() ? t.mobile : t.desktop;
  });

  const visible = createMemo(() => {
    const t = resolvedType();
    if (t === "never") return false;
    if (t === "always") return true;
    if (scrolling()) return true;
    if (t === "hover") return hovered();
    return true;
  });

  // Read by the scroll listener and resize observer, which have no reactive owner: as a memo, a prop
  // written as a condition doesn't make Solid create a computation that is never disposed.
  const scrollbars = createMemo(() => props.scrollbars ?? "xy");

  const updateThumbs = () => {
    if (!viewport) return;
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } =
      viewport;
    const sb = scrollbars();

    const vScroll = sb !== "x" && scrollHeight > clientHeight + 1;
    const hScroll = sb !== "y" && scrollWidth > clientWidth + 1;
    setHasV(vScroll);
    setHasHoriz(hScroll);

    props.onChange?.({ x: scrollLeft, y: scrollTop });

    setScrolling(true);
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => setScrolling(false), 1000);

    if (inside() && resolvedType() === "hover") {
      setHovered(true);
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (!scrolling()) setHovered(false);
      }, hoverIdleMs);
    }

    if (vScroll) {
      const trackH = clientHeight - off * 2;
      const ratio = clientHeight / scrollHeight;
      const h = Math.max(ratio * trackH, 24);
      const maxScroll = scrollHeight - clientHeight;
      const top = maxScroll > 0 ? ((trackH - h) * scrollTop) / maxScroll : 0;
      setThumbH(h);
      setThumbTop(top);
    }
    if (hScroll) {
      const trackW = clientWidth - off * 2;
      const ratio = clientWidth / scrollWidth;
      const w = Math.max(ratio * trackW, 24);
      const maxScroll = scrollWidth - clientWidth;
      const left = maxScroll > 0 ? ((trackW - w) * scrollLeft) / maxScroll : 0;
      setThumbW(w);
      setThumbLeft(left);
    }
  };

  onMount(() => {
    const mobilePointerQuery = window.matchMedia("(pointer: coarse), (hover: none)");
    const updatePointer = () => setIsMobilePointer(mobilePointerQuery.matches);
    updatePointer();

    const vp = viewport;
    if (!vp) return;
    vp.addEventListener("scroll", updateThumbs, { passive: true });

    mobilePointerQuery.addEventListener("change", updatePointer);

    const ro = new ResizeObserver(updateThumbs);
    ro.observe(vp);
    updateThumbs();

    onCleanup(() => {
      vp.removeEventListener("scroll", updateThumbs);
      mobilePointerQuery.removeEventListener("change", updatePointer);
      ro.disconnect();
      clearTimeout(scrollTimer);
      clearTimeout(hoverTimer);
    });
  });

  createEffect(() => {
    void props.offsetScrollbars;
    if (viewport) updateThumbs();
  });

  const makeDrag = (axis: "v" | "h") => (e: MouseEvent) => {
    e.preventDefault();
    const vp = viewport;
    if (!vp) return;
    const start = axis === "v" ? e.clientY : e.clientX;
    const startScroll = axis === "v" ? vp.scrollTop : vp.scrollLeft;
    const totalScroll = axis === "v" ? vp.scrollHeight : vp.scrollWidth;
    const clientSize = axis === "v" ? vp.clientHeight : vp.clientWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = (axis === "v" ? ev.clientY : ev.clientX) - start;
      if (axis === "v") vp.scrollTop = startScroll + delta * (totalScroll / clientSize);
      else vp.scrollLeft = startScroll + delta * (totalScroll / clientSize);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const markHoverActivity = () => {
    if (!inside() || resolvedType() !== "hover") return;
    setHovered(true);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (!scrolling()) setHovered(false);
    }, hoverIdleMs);
  };

  return (
    <div
      class={cx("bx-ScrollArea", props.class)}
      style={mergeStyle(props.style, {
        height: typeof props.height === "number" ? `${props.height}px` : props.height,
        width: typeof props.width === "number" ? `${props.width}px` : props.width
      })}
      onMouseEnter={() => {
        setInside(true);
        markHoverActivity();
      }}
      onMouseMove={markHoverActivity}
      onMouseLeave={() => {
        setInside(false);
        clearTimeout(hoverTimer);
        if (resolvedType() === "hover") setHovered(false);
      }}
    >
      <div
        ref={el => {
          viewport = el;
          props.viewportRef?.(el);
        }}
        class={cx("bx-ScrollArea-viewport", props.viewportClass)}
        tabindex={props.focusable ? 0 : undefined}
        role={props.focusable ? "region" : undefined}
        aria-label={props["aria-label"]}
        style={mergeStyle(props.viewportStyle, {
          "padding-right": doOffset() && hasV() ? `${size() + off}px` : "",
          "padding-bottom": doOffset() && hasHoriz() ? `${size() + off}px` : "",
          "overscroll-behavior": props.overscrollBehavior
        })}
        data-scrollbars={props.scrollbars ?? "xy"}
      >
        {props.children}
      </div>

      <div
        class="bx-ScrollArea-scrollbar"
        data-orientation="vertical"
        style={{
          width: `${size()}px`,
          top: `${off}px`,
          right: `${off}px`,
          bottom: `${off}px`,
          opacity: visible() && hasV() ? 1 : 0,
          "pointer-events": visible() && hasV() ? "auto" : "none"
        }}
      >
        <div
          class="bx-ScrollArea-thumb"
          style={{ height: `${thumbH()}px`, transform: `translateY(${thumbTop()}px)` }}
          onMouseDown={makeDrag("v")}
        />
      </div>

      <div
        class="bx-ScrollArea-scrollbar"
        data-orientation="horizontal"
        style={{
          height: `${size()}px`,
          left: `${off}px`,
          right: `${off}px`,
          bottom: `${off}px`,
          opacity: visible() && hasHoriz() ? 1 : 0,
          "pointer-events": visible() && hasHoriz() ? "auto" : "none"
        }}
      >
        <div
          class="bx-ScrollArea-thumb"
          style={{ width: `${thumbW()}px`, transform: `translateX(${thumbLeft()}px)` }}
          onMouseDown={makeDrag("h")}
        />
      </div>
    </div>
  );
}
