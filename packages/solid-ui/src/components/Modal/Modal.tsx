import {
  type Accessor,
  createContext,
  createEffect,
  createRoot,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  onCleanup,
  Show,
  splitProps,
  useContext
} from "solid-js";
import { Portal, render } from "solid-js/web";

import { CloseIcon } from "../../icons";
import { cx, type StyleProp } from "../../utils/style";
import { ScrollArea, type ScrollAreaProps } from "../ScrollArea/ScrollArea";

/** Why a modal closed without a value: Escape, a backdrop click, the header close button or closeAll. */
export type ModalDismissReason = "escape" | "backdrop" | "close" | "closeAll";

export interface ModalContext<T = string> {
  close: (value?: T) => Promise<void>;
  /** Blocks dismissing (Escape, backdrop, close button), e.g. while saving. */
  lock: (locked: boolean) => void;
  locked: Accessor<boolean>;
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
  content: (ctx: ModalContext<T>) => JSX.Element;
}

type ResolvedModalOptions<T = string> = Required<
  Pick<ModalOptions<T>, "closeOnEscape" | "closeOnBackdrop">
> &
  Omit<ModalOptions<T>, "closeOnEscape" | "closeOnBackdrop">;

interface ModalItem extends ModalContext<unknown> {
  id: number;
  renderContent: (ctx: ModalContext<unknown>) => JSX.Element;
  requestDismiss: (reason: Exclude<ModalDismissReason, "closeAll">) => void;
  /** Ends the modal at once, without onBeforeClose: its host is going away. */
  destroy: () => void;
  exiting: Accessor<boolean>;
  options: ResolvedModalOptions<unknown>;
}

function toCssLength(value: ModalOffset) {
  return typeof value === "number" ? `${value}px` : value;
}

function resolvePlacement(position: ModalPosition | undefined): {
  placement: "center" | "top" | "bottom";
  style?: JSX.CSSProperties;
} {
  if (position === undefined || position === "centered") return { placement: "center" };
  const top = position.top === undefined ? undefined : toCssLength(position.top);
  const bottom = position.bottom === undefined ? undefined : toCssLength(position.bottom);
  // Both given: a bottom sheet on phones, where the thumb is, and a top dialog elsewhere.
  if (top !== undefined && bottom !== undefined) {
    return window.matchMedia("(max-width: 431px)").matches
      ? { placement: "bottom", style: { "--bx-modal-offset": bottom } }
      : { placement: "top", style: { "--bx-modal-offset": top } };
  }
  if (top !== undefined) return { placement: "top", style: { "--bx-modal-offset": top } };
  if (bottom !== undefined) return { placement: "bottom", style: { "--bx-modal-offset": bottom } };
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
function trapTab(event: KeyboardEvent) {
  if (event.key !== "Tab" || event.defaultPrevented) return;
  const wrap = event.currentTarget as HTMLElement;
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

let idCounter = 0;
let getModals: (() => ModalItem[]) | undefined;
let setModals: ((updater: (prev: ModalItem[]) => ModalItem[]) => void) | undefined;

function ModalContainer() {
  const [modals, setModalList] = createSignal<ModalItem[]>([]);
  getModals = modals;
  setModals = setModalList;

  createEffect(() => {
    document.documentElement.classList.toggle("bx-scroll-locked", modals().length > 0);
  });
  onCleanup(() => {
    document.documentElement.classList.remove("bx-scroll-locked");
    // An unmounted ModalHost hands over to a fresh container on the next open.
    if (setModals === setModalList) {
      getModals = undefined;
      setModals = undefined;
    }
    // Its modals go with it, so their promises settle and their key listeners come off.
    for (const item of modals()) item.destroy();
  });

  return (
    <div class="bx-Modal" role="presentation">
      <For each={modals()}>
        {item => {
          const placement = resolvePlacement(item.options.position);
          return (
            <div
              class="bx-Modal-wrap"
              data-placement={placement.placement}
              data-exiting={item.exiting() ? "" : undefined}
              style={placement.style}
              role="presentation"
              ref={element => queueMicrotask(() => focusModal(element))}
              onKeyDown={trapTab}
            >
              <div class="bx-Modal-overlay" onClick={() => item.requestDismiss("backdrop")} />
              {item.renderContent({ close: item.close, lock: item.lock, locked: item.locked })}
            </div>
          );
        }}
      </For>
    </div>
  );
}

interface ModalSectionProps {
  children?: JSX.Element;
  class?: string;
  style?: StyleProp;
}

const TitleIdContext = createContext<string>();

function ModalRoot(props: ModalSectionProps & { "aria-label"?: string }) {
  const titleId = `bx-modal-title-${createUniqueId()}`;
  return (
    <TitleIdContext.Provider value={titleId}>
      <section
        class={cx("bx-Modal-card", props.class)}
        role="dialog"
        aria-modal="true"
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-label"] ? undefined : titleId}
        tabindex={-1}
        style={props.style}
      >
        {props.children}
      </section>
    </TitleIdContext.Provider>
  );
}

function ModalHeader(
  props: ModalSectionProps &
    // `never` accepts the `close` of a modal typed with any value, e.g. modal.open<"ok">.
    Partial<Pick<ModalContext<never>, "close" | "locked">> & {
      title?: JSX.Element;
      /** Default true. */
      closable?: boolean;
      /** Replaces the cross on the close button. */
      closeIcon?: JSX.Element;
    }
) {
  const titleId = useContext(TitleIdContext);
  return (
    <header class={cx("bx-Modal-header", props.class)} style={props.style}>
      <Show
        when={props.children}
        fallback={
          <>
            <h2 id={titleId} class="bx-Modal-title">
              {props.title}
            </h2>
            <Show when={props.closable !== false}>
              <button
                type="button"
                class="bx-Modal-close"
                aria-label="Close"
                disabled={props.locked?.()}
                onClick={() =>
                  (props.close as ((reason: "close") => Promise<void>) | undefined)?.(
                    "close"
                  ).catch(reportCloseError)
                }
              >
                {props.closeIcon ?? <CloseIcon />}
              </button>
            </Show>
          </>
        }
      >
        {props.children}
      </Show>
    </header>
  );
}

function ModalBody(props: ScrollAreaProps) {
  const [local, rest] = splitProps(props, ["class", "viewportClass"]);
  return (
    <ScrollArea
      {...rest}
      class={cx("bx-Modal-body", local.class)}
      viewportClass={cx("bx-Modal-viewport", local.viewportClass)}
    />
  );
}

function ModalFooter(props: ModalSectionProps) {
  return (
    <footer class={cx("bx-Modal-footer", props.class)} style={props.style}>
      {props.children}
    </footer>
  );
}

/**
 * Where modals render. Optional: without it, the first `modal.open` renders them in a root of
 * their own, which can't see the app's context. Put it inside your providers (a router,
 * ReadOnlyProvider, a theme) so modal content can use them, e.g. `useNavigate`.
 */
export function ModalHost() {
  return (
    <Portal>
      <ModalContainer />
    </Portal>
  );
}

function ensureContainer() {
  if (setModals) return;
  const host = document.createElement("div");
  document.body.appendChild(host);
  render(() => <ModalContainer />, host);
}

/** Opens a modal and resolves with the value passed to `close`, or the dismiss reason. */
function open<T = string>(options: ModalOptions<T>): Promise<T | ModalDismissReason | undefined> {
  ensureContainer();
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
    createRoot(dispose => {
      const [exiting, setExiting] = createSignal(false);
      const [locked, setLocked] = createSignal(false);
      let closed = false;
      // Set while onBeforeClose decides, so a second dismissal doesn't ask it again.
      let deciding = false;

      const isTopModal = () => getModals?.().at(-1)?.id === id;

      const close = async (value?: T | ModalDismissReason | undefined) => {
        if (closed || deciding) return;
        if (resolvedOptions.onBeforeClose) {
          deciding = true;
          try {
            // A rejection keeps the modal open and reaches the caller of close().
            if (!(await resolvedOptions.onBeforeClose(value))) return;
          } finally {
            deciding = false;
          }
          // Destroyed with its host while onBeforeClose was deciding.
          if (closed) return;
        }
        closed = true;
        window.removeEventListener("keydown", onKeyDown);
        setExiting(true);

        // Let the exit state paint before starting teardown timing.
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            setModals?.(prev => prev.filter(item => item.id !== id));
            // Only when focus was lost with the modal, so a field the app focused keeps it.
            const focusLost = !document.activeElement || document.activeElement === document.body;
            if (focusLost && opener?.isConnected) opener.focus();
            resolve(value);
            dispose();
          }, 220);
        });
      };

      const requestDismiss = (reason: Exclude<ModalDismissReason, "closeAll">) => {
        if (closed || locked() || !isTopModal()) return;
        if (reason === "escape" && !resolvedOptions.closeOnEscape) return;
        if (reason === "backdrop" && !resolvedOptions.closeOnBackdrop) return;
        close(reason).catch(reportCloseError);
      };

      const destroy = () => {
        if (closed) return;
        closed = true;
        window.removeEventListener("keydown", onKeyDown);
        resolve("closeAll");
        dispose();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        // Skip an Escape already handled inside the modal, e.g. one that closed a Select dropdown.
        if (event.key !== "Escape" || event.defaultPrevented) return;
        requestDismiss("escape");
      };

      window.addEventListener("keydown", onKeyDown);

      setModals?.(prev => [
        ...prev,
        {
          id,
          renderContent: options.content,
          close,
          requestDismiss,
          destroy,
          lock: (value: boolean) => setLocked(value),
          locked,
          exiting,
          options: resolvedOptions
        } as unknown as ModalItem
      ]);
    });
  });
}

/**
 * A dismissal (Escape, backdrop, the header close button, closeAll) has no caller to hand an onBeforeClose error to, so it
 * is reported like an uncaught error, and the modal stays open.
 */
function reportCloseError(error: unknown) {
  if (typeof globalThis.reportError === "function") globalThis.reportError(error);
  else
    queueMicrotask(() => {
      throw error;
    });
}

function closeAll() {
  for (const item of getModals?.() ?? []) item.close("closeAll").catch(reportCloseError);
}

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
