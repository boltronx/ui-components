"use client";

import {
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

import { useLatest } from "../../utils/form";
import { cx } from "../../utils/style";

export type FloatingPosition =
  "bottom" | "bottom-end" | "top" | "top-end" | "left" | "left-end" | "right" | "right-end";

export interface FloatingPanelProps {
  open: boolean;
  target: RefObject<HTMLElement | null>;
  children?: ReactNode;
  className?: string;
  position?: FloatingPosition;
  matchTargetWidth?: boolean;
  /** With `matchTargetWidth`, the narrowest the panel gets, in px; a wider target still sets its width. */
  minWidth?: number;
  gap?: number;
  viewportPadding?: number;
  exitDuration?: number;
  ref?: (element: HTMLDivElement | null) => void;
  /**
   * Called once per opening, when the panel has been placed and shown. Move focus into it here:
   * until then it is hidden, and browsers don't focus hidden elements.
   */
  onOpen?: (element: HTMLDivElement) => void;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

type Coordinates = {
  top: number;
  left: number;
  position: FloatingPosition;
  width?: number;
};

function oppositePosition(position: FloatingPosition): FloatingPosition {
  const [side, alignment] = position.split("-") as [string, string | undefined];
  const opposite = { bottom: "top", top: "bottom", left: "right", right: "left" }[side];
  return `${opposite}${alignment ? `-${alignment}` : ""}` as FloatingPosition;
}

function coordinatesFor(
  position: FloatingPosition,
  target: DOMRect,
  panel: Pick<DOMRect, "width" | "height">,
  gap: number
) {
  let top = target.bottom + gap;
  let left = target.left;

  switch (position) {
    case "bottom-end":
      left = target.right - panel.width;
      break;
    case "top":
      top = target.top - panel.height - gap;
      break;
    case "top-end":
      top = target.top - panel.height - gap;
      left = target.right - panel.width;
      break;
    case "right":
      top = target.top;
      left = target.right + gap;
      break;
    case "right-end":
      top = target.bottom - panel.height;
      left = target.right + gap;
      break;
    case "left":
      top = target.top;
      left = target.left - panel.width - gap;
      break;
    case "left-end":
      top = target.bottom - panel.height;
      left = target.left - panel.width - gap;
      break;
  }

  return { top, left };
}

function isTargetVisible(target: HTMLElement, targetRect: DOMRect) {
  if (!target.isConnected || targetRect.width === 0 || targetRect.height === 0) return false;

  const targetStyle = window.getComputedStyle(target);
  if (targetStyle.display === "none" || targetStyle.visibility === "hidden") return false;

  let visibleTop = 0;
  let visibleRight = window.innerWidth;
  let visibleBottom = window.innerHeight;
  let visibleLeft = 0;

  for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const style = window.getComputedStyle(ancestor);
    const clipsX = /^(auto|clip|hidden|scroll)$/.test(style.overflowX);
    const clipsY = /^(auto|clip|hidden|scroll)$/.test(style.overflowY);
    if (!clipsX && !clipsY) continue;

    const rect = ancestor.getBoundingClientRect();
    if (clipsX) {
      visibleLeft = Math.max(visibleLeft, rect.left);
      visibleRight = Math.min(visibleRight, rect.right);
    }
    if (clipsY) {
      visibleTop = Math.max(visibleTop, rect.top);
      visibleBottom = Math.min(visibleBottom, rect.bottom);
    }
  }

  return (
    Math.max(targetRect.left, visibleLeft) < Math.min(targetRect.right, visibleRight) &&
    Math.max(targetRect.top, visibleTop) < Math.min(targetRect.bottom, visibleBottom)
  );
}

/**
 * A panel portaled to <body> and placed next to `target`, flipping to the other side when there
 * is no room. It renders nothing on the server: it only mounts once opened. After that it stays
 * mounted, hidden while closed, so its content keeps its state between openings (a calendar's
 * month, a list's scroll).
 */
export function FloatingPanel(props: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const rafId = useRef<number | undefined>(undefined);
  const latest = useLatest(props);
  // Whether it has ever opened, and whether it is showing (open, or in its exit transition).
  const [created, setCreated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [positioned, setPositioned] = useState(false);
  const [coords, setCoords] = useState<Coordinates>({ top: 0, left: 0, position: "bottom" });

  const updatePosition = useCallback(() => {
    const options = latest.current;
    const target = options.target.current;
    const panel = panelRef.current;
    if (!target || !panel) return;
    // Not displayed yet (a reopening whose `mounted` hasn't committed): it measures 0×0, and
    // placing it now would show it in the same commit that displays it, skipping the opening
    // transition. The update that follows `mounted` places it.
    if (panel.hidden) return;

    const targetRect = target.getBoundingClientRect();
    if (!isTargetVisible(target, targetRect)) {
      setPositioned(false);
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const padding = options.viewportPadding ?? 8;
    const matchedWidth = options.matchTargetWidth
      ? Math.min(Math.max(targetRect.width, options.minWidth ?? 0), window.innerWidth - padding * 2)
      : undefined;
    const measuredPanel = {
      width: matchedWidth ?? panelRect.width,
      height: panelRect.height
    };
    const gap = options.gap ?? 4;
    const preferred = options.position ?? "bottom";
    const preferredSide = preferred.split("-")[0];
    const spaces = {
      bottom: window.innerHeight - targetRect.bottom - gap - padding,
      top: targetRect.top - gap - padding,
      right: window.innerWidth - targetRect.right - gap - padding,
      left: targetRect.left - gap - padding
    };
    const panelSize =
      preferredSide === "bottom" || preferredSide === "top"
        ? measuredPanel.height
        : measuredPanel.width;
    const opposite = oppositePosition(preferred);
    const oppositeSide = opposite.split("-")[0] as keyof typeof spaces;
    const resolved =
      spaces[preferredSide as keyof typeof spaces] < panelSize &&
      spaces[oppositeSide] > spaces[preferredSide as keyof typeof spaces]
        ? opposite
        : preferred;
    const raw = coordinatesFor(resolved, targetRect, measuredPanel, gap);

    setCoords({
      top: Math.max(
        padding,
        Math.min(raw.top, window.innerHeight - measuredPanel.height - padding)
      ),
      left: Math.max(
        padding,
        Math.min(raw.left, window.innerWidth - measuredPanel.width - padding)
      ),
      position: resolved,
      width: matchedWidth
    });
    setPositioned(true);
  }, [latest]);

  const schedulePositionUpdate = useCallback(() => {
    if (rafId.current !== undefined) return;
    rafId.current = window.requestAnimationFrame(() => {
      rafId.current = undefined;
      updatePosition();
    });
  }, [updatePosition]);

  // Mounts on open; on close, unmounts after the exit transition. `positioned` is cleared once the
  // panel is gone, not when it opens: an opening must start unplaced, or `onOpen` would run in the
  // render that opens it, while the panel is still display: none and can't take focus. Reopened
  // during its exit transition, it stays placed, so the transition just turns back.
  useEffect(() => {
    if (props.open) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
      setCreated(true);
      setMounted(true);
      schedulePositionUpdate();
      return;
    }

    const exitDuration = latest.current.exitDuration ?? 0;
    if (exitDuration === 0) {
      setMounted(false);
      setPositioned(false);
      return;
    }
    closeTimer.current = window.setTimeout(() => {
      setMounted(false);
      setPositioned(false);
      closeTimer.current = undefined;
    }, exitDuration);
  }, [props.open, latest, schedulePositionUpdate]);

  // Follows the target while open.
  useEffect(() => {
    if (!props.open) return;
    schedulePositionUpdate();
    const resizeObserver = new ResizeObserver(schedulePositionUpdate);
    const target = latest.current.target.current;
    if (target) resizeObserver.observe(target);
    if (panelRef.current) resizeObserver.observe(panelRef.current);
    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, { capture: true, passive: true });

    return () => {
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      resizeObserver.disconnect();
      if (rafId.current !== undefined) window.cancelAnimationFrame(rafId.current);
      rafId.current = undefined;
    };
  }, [props.open, mounted, latest, schedulePositionUpdate]);

  // Runs after the commit that removed `visibility: hidden`, so the panel can take focus.
  const announcedOpen = useRef(false);
  useLayoutEffect(() => {
    if (!props.open) {
      announcedOpen.current = false;
      return;
    }
    if (!positioned || announcedOpen.current || !panelRef.current) return;
    announcedOpen.current = true;
    latest.current.onOpen?.(panelRef.current);
  }, [props.open, positioned, latest]);

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
      if (rafId.current !== undefined) window.cancelAnimationFrame(rafId.current);
    },
    []
  );

  const setPanel = useCallback(
    (element: HTMLDivElement | null) => {
      panelRef.current = element;
      latest.current.ref?.(element);
      if (element) schedulePositionUpdate();
    },
    [latest, schedulePositionUpdate]
  );

  // Without an exit transition the panel hides in the render that closes it. Waiting for the
  // effect would paint one more frame, showing whatever closing changed, e.g. a cleared search.
  if (!created) return null;
  const hidden = !mounted || (!props.open && !(props.exitDuration ?? 0));
  return createPortal(
    <div
      ref={setPanel}
      hidden={hidden}
      className={cx("bx-FloatingPanel", props.className)}
      // Open only once placed: the panel is first laid out unseen, in its closed styles, so a
      // stylesheet's opening transition (fade, slide) runs from there instead of being skipped.
      data-open={String(props.open && positioned)}
      data-position={coords.position}
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: coords.width === undefined ? undefined : `${coords.width}px`,
        visibility: positioned ? undefined : "hidden"
      }}
      onClick={event => props.onClick?.(event)}
    >
      {props.children}
    </div>,
    document.body
  );
}
