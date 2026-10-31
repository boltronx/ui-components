import { createRoot, createSignal, For, type JSX, Show } from "solid-js";
import { render } from "solid-js/web";

import { CloseIcon, ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from "../../icons";

export type MessageType = "success" | "error" | "warning" | "info";

export interface MessageOptions {
  /**
   * How long the message stays, in seconds. 0 (or Infinity) keeps it until it is closed, and
   * makes it closable.
   */
  seconds?: number;
  /** Replaces the icon for its type. */
  icon?: JSX.Element;
  /** Shows a button that closes the message. */
  closable?: boolean;
}

/** Closes the message, or drops it if it is still waiting in the queue. */
export type CloseMessage = () => void;

interface MessageItem {
  id: number;
  type: MessageType;
  text: string;
  icon: JSX.Element | undefined;
  closable: boolean;
  exiting: () => boolean;
  /** Holds the timer while the pointer is over the message or focus is inside it. */
  hold: (source: "pointer" | "focus", held: boolean) => void;
  close: () => void;
}

/** setTimeout's longest delay; a longer one overflows and fires at once. */
const MAX_DELAY = 2 ** 31 - 1;

/** Whether a message with this duration stays until it is closed. */
const isPersistent = (seconds: number) => !Number.isFinite(seconds) || seconds <= 0;

/** How long an announcement stays in its live region, long enough for a screen reader to read it. */
const ANNOUNCEMENT_MS = 7000;

let idCounter = 0;
let setMessages: ((updater: (prev: MessageItem[]) => MessageItem[]) => void) | undefined;
let announce: ((type: MessageType, text: string) => void) | undefined;

const ICONS: Record<MessageType, () => JSX.Element> = {
  success: () => <SuccessIcon />,
  error: () => <ErrorIcon />,
  warning: () => <WarningIcon />,
  info: () => <InfoIcon />
};

function MessageContainer() {
  const [messages, setMessageList] = createSignal<MessageItem[]>([]);
  const [statusTexts, setStatusTexts] = createSignal<{ text: string }[]>([]);
  const [alertTexts, setAlertTexts] = createSignal<{ text: string }[]>([]);
  setMessages = setMessageList;
  // The list itself isn't live, so each message is spoken once, by one of the regions below, and
  // stays readable in the list for as long as it shows. Each announcement is a new node, so the
  // same text twice in a row is still announced; it leaves once read, so browsing meets the
  // message once, in the list.
  announce = (type, text) => {
    const setTexts = type === "error" ? setAlertTexts : setStatusTexts;
    const entry = { text: type === "error" ? `Error: ${text}` : text };
    // A moment later, so a region rendered just now is in place before it changes.
    setTimeout(() => setTexts(prev => [...prev, entry]), 50);
    setTimeout(() => setTexts(prev => prev.filter(e => e !== entry)), 50 + ANNOUNCEMENT_MS);
  };

  return (
    <>
      <div
        class="bx-Message"
        role={messages().length > 0 ? "region" : undefined}
        aria-label={messages().length > 0 ? "Notifications" : undefined}
      >
        <For each={messages()}>
          {item => (
            <div
              class="bx-Message-item"
              data-type={item.type}
              data-exiting={item.exiting() ? "" : undefined}
              onPointerEnter={() => item.hold("pointer", true)}
              onPointerLeave={() => item.hold("pointer", false)}
              // Keyboard users get the same time as a pointer resting on it (WCAG 2.2.1).
              onFocusIn={() => item.hold("focus", true)}
              onFocusOut={event => {
                const next = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(next)) item.hold("focus", false);
              }}
            >
              <span class="bx-Message-content">
                <span class="bx-Message-icon">{item.icon ?? ICONS[item.type]()}</span>
                <span id={`bx-message-${item.id}`} class="bx-Message-text">
                  {item.text}
                </span>
              </span>
              <Show when={item.closable}>
                <button
                  type="button"
                  class="bx-Message-close"
                  aria-label="Close notification"
                  // Says which one it closes when several show.
                  aria-describedby={`bx-message-${item.id}`}
                  onClick={item.close}
                >
                  <CloseIcon />
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
      <div class="bx-visually-hidden" role="status" aria-label="Notifications">
        <For each={statusTexts()}>{entry => <p>{entry.text}</p>}</For>
      </div>
      {/* Errors interrupt, as an alert should; the polite region waits its turn. */}
      <div class="bx-visually-hidden" role="alert">
        <For each={alertTexts()}>{entry => <p>{entry.text}</p>}</For>
      </div>
    </>
  );
}

function ensureContainer() {
  if (setMessages) return;
  const host = document.createElement("div");
  document.body.appendChild(host);
  render(() => <MessageContainer />, host);
}

interface QueuedMessage {
  type: MessageType;
  text: string;
  icon: JSX.Element | undefined;
  seconds: number;
  closable: boolean;
  /** Set once it is on screen; until then, closing just takes it out of the queue. */
  close?: () => void;
}

const DEFAULT_LIMIT = 3;
let limit = DEFAULT_LIMIT;
/** Messages on screen and not yet leaving; at most `limit`. */
let visibleCount = 0;
/** Messages waiting for a free slot, oldest first. */
const queue: QueuedMessage[] = [];

/** Shows queued messages while there is room. */
function drain() {
  while (visibleCount < limit && queue.length > 0) display(queue.shift()!);
}

/** `options` is the seconds to show for, or an options object; defaultSeconds is used without. */
function show(
  type: MessageType,
  text: string,
  options: number | MessageOptions | undefined,
  defaultSeconds: number
): CloseMessage {
  const {
    seconds = defaultSeconds,
    icon,
    closable = false
  } = typeof options === "number" ? { seconds: options } : (options ?? {});
  // One that never leaves on its own must be closable, or it could stay on screen for good.
  const queued: QueuedMessage = {
    type,
    text,
    icon,
    seconds,
    closable: closable || isPersistent(seconds)
  };
  queue.push(queued);
  drain();
  return () => {
    if (queued.close) return queued.close();
    const index = queue.indexOf(queued);
    if (index >= 0) queue.splice(index, 1);
  };
}

function display(queued: QueuedMessage) {
  const { type, text, icon, seconds, closable } = queued;
  ensureContainer();
  const id = ++idCounter;
  visibleCount++;

  // Each message owns its exiting signal inside a root so it has a proper
  // reactive owner and is cleaned up when the message is removed.
  createRoot(dispose => {
    const [exiting, setExiting] = createSignal(false);
    // The duration starts when the message appears, not while it waits in the queue.
    const persistent = isPersistent(seconds);
    let remaining = persistent ? 0 : Math.min(seconds * 1000, MAX_DELAY);
    let startedAt = 0;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    const holds = new Set<"pointer" | "focus">();

    const dismiss = () => {
      // Closed by the button, by its close function or by the timer: whichever comes first.
      if (exiting()) return;
      clearTimeout(dismissTimer);
      dismissTimer = undefined;
      setExiting(true);
      // Its slot frees as it starts leaving, so the next message comes in without a gap.
      visibleCount--;
      drain();
      setTimeout(() => {
        setMessages!(prev => prev.filter(m => m.id !== id));
        dispose();
      }, 320);
    };

    const resume = () => {
      if (persistent || exiting() || dismissTimer !== undefined) return;
      startedAt = performance.now();
      dismissTimer = setTimeout(dismiss, remaining);
    };

    const pause = () => {
      if (exiting() || dismissTimer === undefined) return;
      clearTimeout(dismissTimer);
      dismissTimer = undefined;
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    };

    // Paused while either holds it, so leaving with the pointer doesn't restart a message that
    // still has focus inside.
    const hold = (source: "pointer" | "focus", held: boolean) => {
      if (held) holds.add(source);
      else holds.delete(source);
      if (holds.size > 0) pause();
      else resume();
    };

    // The item object is never replaced — only `exiting` (a signal) changes.
    // This keeps <For> from recreating DOM nodes during the exit transition.
    setMessages!(prev => [
      ...prev,
      { id, type, text, icon, closable, exiting, hold, close: dismiss }
    ]);
    queued.close = dismiss;
    announce!(type, text);
    if (!persistent) {
      startedAt = performance.now();
      dismissTimer = setTimeout(dismiss, remaining);
    }
  });
}

export interface MessageConfig {
  /** How many messages show at once; more wait in a queue. Default 3. */
  limit?: number;
}

/**
 * Short notifications at the top of the screen. The second argument is how long to show the
 * message, in seconds (0 keeps it until closed), or `{ seconds, icon, closable }`. Each call
 * returns a function that closes the message. Up to three show at once (see `config`); the rest
 * queue and each appears as an earlier one leaves.
 */
export const message = {
  success(text: string, options?: number | MessageOptions): CloseMessage {
    return show("success", text, options, 3);
  },
  error(text: string, options?: number | MessageOptions): CloseMessage {
    return show("error", text, options, 6);
  },
  warning(text: string, options?: number | MessageOptions): CloseMessage {
    return show("warning", text, options, 4);
  },
  info(text: string, options?: number | MessageOptions): CloseMessage {
    return show("info", text, options, 3);
  },
  /** Changes how many messages show at once. */
  config(config: MessageConfig) {
    if (config.limit !== undefined) limit = Math.max(1, Math.floor(config.limit));
    drain();
  }
};
