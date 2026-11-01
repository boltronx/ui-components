"use client";

import {
  createContext,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useSyncExternalStore
} from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "../../icons";
import { createListStore, emptyList } from "../../utils/store";
import { cx, type StyleProp } from "../../utils/style";
import { ScrollArea, type ScrollAreaProps } from "../ScrollArea/ScrollArea";

/** Why a modal closed without a value: Escape, a backdrop click, the header close button or closeAll. */
export type ModalDismissReason = "escape" | "backdrop" | "close" | "closeAll";

export interface ModalContext<T = string> {
  close: (value?: T) => Promise<void>;
  /** Blocks dismissing (Escape, backdrop, close button), e.g. while saving. */
  lock: (locked: boolean) => void;
  locked: boolean;
}

type ModalOffset = string | number;

export type ModalPosition =
  | "centered"
  | {
      top?: ModalOffset;
      bottom?: ModalOffset;
    };

export interface ModalOptions<T = string> {
  position?: ModalPosition;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  /** Return false to keep the modal open, e.g. after asking to discard changes. */
  onBeforeClose?: (reason?: ModalDismissReason | T) => Promise<boolean> | boolean;
  /** Renders the modal; called again with a fresh context whenever it is locked or unlocked. */
  content: (ctx: ModalContext<T>) => ReactNode;
}

type ResolvedModalOptions<T = string> = Required<
  Pick<ModalOptions<T>, "closeOnEscape" | "closeOnBackdrop">
> &
  Omit<ModalOptions<T>, "closeOnEscape" | "closeOnBackdrop">;

interface ModalItem {
  id: number;
  renderContent: (ctx: ModalContext<unknown>) => ReactNode;
  close: (value?: unknown) => Promise<void>;
  lock: (locked: boolean) => void;
  locked: boolean;
  requestDismiss: (reason: Exclude<ModalDismissReason, "closeAll">) => void;
  /** Ends the modal at once, without onBeforeClose: its host is going away. */
  destroy: () => void;
  exiting: boolean;
  options: ResolvedModalOptions<unknown>;
}

function toCssLength(value: ModalOffset) {
  return typeof value === "number" ? `${value}px` : value;
}

function resolvePlacement(position: ModalPosition | undefined): {
  placement: "center" | "top" | "bottom";
  style?: CSSProperties;
} {
  if (position === undefined || position === "centered") return { placement: "center" };
  const top = position.top === undefined ? undefined : toCssLength(position.top);
  const bottom = position.bottom === undefined ? undefined : toCssLength(position.bottom);
  const offset = (value: string) => ({ "--bx-modal-offset": value }) as CSSProperties;
  // Both given: a bottom sheet on phones, where the thumb is, and a top dialog elsewhere.
  if (top !== undefined && bottom !== undefined) {
    return window.matchMedia("(max-width: 431px)").matches
      ? { placement: "bottom", style: offset(bottom) }
      : { placement: "top", style: offset(top) };
  }
  if (top !== undefined) return { placement: "top", style: offset(top) };
  if (bottom !== undefined) return { placement: "bottom", style: offset(bottom) };
  return { placement: "center" };
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Moves focus into a modal that just opened, unless something in it already took focus. */
function focusModal(wrap: HTMLElement) {
  if (wrap.contains(document.activeElement)) return;
  const dialog = wrap.querySelector<HTMLElement>('[role="dialog"]');
  (dialog ?? wrap.querySelector<HTMLElement>(TABBABLE))?.focus();
}

/** Keeps Tab and Shift+Tab inside the modal. */
function trapTab(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const wrap = event.currentTarget;
  const items = Array.from(wrap.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    element => !element.closest("[hidden], [inert]")
  );
  const first = items[0];
  const last = items.at(-1);
  const active = document.activeElement;
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (event.shiftKey && (active === first || !items.includes(active as HTMLElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * For closes nobody awaits (Escape, the backdrop, the close button, closeAll): an onBeforeClose
 * that throws keeps the modal open, and its error is logged instead of left unhandled.
 */
function reportCloseError(error: unknown) {
  console.error(error);
}

let idCounter = 0;
const store = /* @__PURE__ */ createListStore<ModalItem>(() => <ModalContainer fallback />);

function ModalWrap({ item }: { item: ModalItem }) {
  const placement = resolvePlacement(item.options.position);
  const focusOnMount = useCallback((element: HTMLDivElement | null) => {
    if (element) queueMicrotask(() => focusModal(element));
  }, []);
  return (
    <div
      className="bx-Modal-wrap"
      data-placement={placement.placement}
      data-exiting={item.exiting ? "" : undefined}
      data-bx-modal={item.id}
      style={placement.style}
      role="presentation"
      ref={focusOnMount}
      onKeyDown={trapTab}
    >
      <div className="bx-Modal-overlay" onClick={() => item.requestDismiss("backdrop")} />
      {item.renderContent({ close: item.close, lock: item.lock, locked: item.locked })}
    </div>
  );
}

const noServerHost = () => false;

// Counted, as two containers can show modals at once while a ModalHost takes over from the
// fallback root: the one handing over mustn't unlock the page under the other's open modal.
let scrollLocks = 0;

function lockScroll() {
  if (scrollLocks++ === 0) document.documentElement.classList.add("bx-scroll-locked");
  return () => {
    if (--scrollLocks === 0) document.documentElement.classList.remove("bx-scroll-locked");
  };
}

/** The modal list: in the store's own root (`fallback`), or in a ModalHost inside the app. */
function ModalContainer(props: { fallback?: boolean }) {
  const modals = useSyncExternalStore(store.subscribe, store.get, emptyList);
  const hosted = useSyncExternalStore(store.subscribe, store.hosted, noServerHost);
  const anyOpen = modals.length > 0;
  const active = !(props.fallback && hosted);

  useEffect(() => {
    if (!active || !anyOpen) return;
    // Released when this container stops showing modals or unmounts (e.g. its ModalHost goes),
    // or the page stays locked.
    return lockScroll();
  }, [active, anyOpen]);

  // A ModalHost took over, so its copy of the list shows the modals instead.
  if (!active) return null;
  return (
    <div className="bx-Modal" role="presentation">
      {modals.map(item => (
        <ModalWrap key={item.id} item={item} />
      ))}
    </div>
  );
}

interface ModalSectionProps {
  children?: ReactNode;
  className?: string;
  style?: StyleProp;
}

const TitleIdContext = createContext<string | undefined>(undefined);

function ModalRoot(props: ModalSectionProps & { "aria-label"?: string }) {
  const titleId = `bx-modal-title-${useId()}`;
  return (
    <TitleIdContext value={titleId}>
      <section
        className={cx("bx-Modal-card", props.className)}
        role="dialog"
        aria-modal="true"
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-label"] ? undefined : titleId}
        tabIndex={-1}
        style={props.style}
      >
        {props.children}
      </section>
    </TitleIdContext>
  );
}

function ModalHeader(
  props: ModalSectionProps &
    // `never` accepts the `close` of a modal typed with any value, e.g. modal.open<"ok">.
    Partial<Pick<ModalContext<never>, "close" | "locked">> & {
      lock?: unknown;
      title?: ReactNode;
      /** Default true. */
      closable?: boolean;
      /** Replaces the cross on the close button. */
      closeIcon?: ReactNode;
    }
) {
  const titleId = useContext(TitleIdContext);
  return (
    <header className={cx("bx-Modal-header", props.className)} style={props.style}>
      {props.children ?? (
        <>
          <h2 id={titleId} className="bx-Modal-title">
            {props.title}
          </h2>
          {props.closable !== false && (
            <button
              type="button"
              className="bx-Modal-close"
              aria-label="Close"
              disabled={props.locked}
              onClick={() =>
                (props.close as ((reason: "close") => Promise<void>) | undefined)?.("close")?.catch(
                  reportCloseError
                )
              }
            >
              {props.closeIcon ?? <CloseIcon />}
            </button>
          )}
        </>
      )}
    </header>
  );
}

function ModalBody({ className, viewportClassName, ...rest }: ScrollAreaProps) {
  return (
    <ScrollArea
      {...rest}
      className={cx("bx-Modal-body", className)}
      viewportClassName={cx("bx-Modal-viewport", viewportClassName)}
    />
  );
}

function ModalFooter(props: ModalSectionProps) {
  return (
    <footer className={cx("bx-Modal-footer", props.className)} style={props.style}>
      {props.children}
    </footer>
  );
}

const subscribeNever = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * Where modals render. Optional: without it, the first `modal.open` renders them in a root of
 * their own, which can't see the app's context. Put it inside your providers (a router,
 * ReadOnlyProvider, a theme) so modal content can use them. Renders nothing on the server.
 */
export function ModalHost() {
  const isClient = useSyncExternalStore(subscribeNever, onClient, onServer);
  useEffect(() => {
    const removeHost = store.addHost();
    return () => {
      removeHost();
      // The last host is going (e.g. its layout unmounted): its modals go with it, settled as
      // "closeAll", rather than stay open and unseen with an Escape listener and a page that
      // can't scroll. Their content needed this host's providers, so it can't move elsewhere.
      if (!store.hosted()) for (const item of store.get()) item.destroy();
    };
  }, []);
  return isClient ? createPortal(<ModalContainer />, document.body) : null;
}

/** Opens a modal and resolves with the value passed to `close`, or the dismiss reason. */
function open<T = string>(options: ModalOptions<T>): Promise<T | ModalDismissReason | undefined> {
  const id = ++idCounter;
  // Focus goes back here on close, as a dialog should.
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const resolvedOptions: ResolvedModalOptions<T> = {
    closeOnEscape: true,
    closeOnBackdrop: true,
    position: "centered",
    ...options
  };

  return new Promise<T | ModalDismissReason | undefined>(resolve => {
    let closed = false;
    // Set while onBeforeClose decides, so a second dismissal doesn't ask it again.
    let deciding = false;
    let locked = false;
    // The decided close while its exit animation runs, so destroy can cut it short.
    let exit:
      { value: T | ModalDismissReason | undefined; frame: number; timer?: number } | undefined;

    const patch = (changes: Partial<ModalItem>) =>
      store.update(prev => prev.map(item => (item.id === id ? { ...item, ...changes } : item)));
    const remove = () => store.update(prev => prev.filter(item => item.id !== id));
    const isTopModal = () => store.get().at(-1)?.id === id;

    const close = async (value?: T | ModalDismissReason | undefined) => {
      if (closed || deciding) return;
      if (resolvedOptions.onBeforeClose) {
        deciding = true;
        try {
          if (!(await resolvedOptions.onBeforeClose(value))) return;
        } finally {
          deciding = false;
        }
        // Destroyed with its host while onBeforeClose was deciding.
        if (closed) return;
      }
      closed = true;
      window.removeEventListener("keydown", onKeyDown);
      patch({ exiting: true });

      // Let the exit state paint before starting teardown timing.
      const frame = requestAnimationFrame(() => {
        exit!.timer = window.setTimeout(() => {
          exit = undefined;
          // Only when focus is in the modal (or already lost), so a field the app focused keeps
          // it. Checked before the removal renders, which React does after this returns.
          const active = document.activeElement;
          const wrap = document.querySelector(`[data-bx-modal="${id}"]`);
          const focusInModal = !active || active === document.body || !!wrap?.contains(active);
          remove();
          if (focusInModal && opener?.isConnected) opener.focus();
          resolve(value);
        }, 220);
      });
      exit = { value, frame };
    };

    const destroy = () => {
      // Mid exit animation: it goes now, with the value its close already decided, and its
      // pending callbacks are cancelled so its content can't outlive the host (e.g. in the
      // store's own root, without the host's providers).
      if (exit) {
        cancelAnimationFrame(exit.frame);
        clearTimeout(exit.timer);
        const { value } = exit;
        exit = undefined;
        remove();
        resolve(value);
        return;
      }
      if (closed) return;
      closed = true;
      window.removeEventListener("keydown", onKeyDown);
      remove();
      resolve("closeAll");
    };

    const requestDismiss = (reason: Exclude<ModalDismissReason, "closeAll">) => {
      if (closed || locked || !isTopModal()) return;
      if (reason === "escape" && !resolvedOptions.closeOnEscape) return;
      if (reason === "backdrop" && !resolvedOptions.closeOnBackdrop) return;
      close(reason).catch(reportCloseError);
    };

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      // Skip an Escape already handled inside the modal, e.g. one that closed a Select dropdown.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      requestDismiss("escape");
    };

    window.addEventListener("keydown", onKeyDown);

    store.update(prev => [
      ...prev,
      {
        id,
        renderContent: options.content as (ctx: ModalContext<unknown>) => ReactNode,
        close: close as (value?: unknown) => Promise<void>,
        requestDismiss,
        destroy,
        lock: (value: boolean) => {
          locked = value;
          patch({ locked: value });
        },
        locked,
        exiting: false,
        options: resolvedOptions as ResolvedModalOptions<unknown>
      }
    ]);
  });
}

function closeAll() {
  for (const item of store.get()) item.close("closeAll").catch(reportCloseError);
}

/** Opens modals from anywhere in the browser, e.g. a click handler. Renders nothing on the server. */
export const modal = {
  open,
  closeAll
};

// Marked pure so bundlers can drop Modal from apps that never import it.
export const Modal = /* @__PURE__ */ Object.assign(ModalRoot, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter
});
