"use client";

import { type ReactNode, useSyncExternalStore } from "react";

import { CloseIcon, ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from "../../icons";
import { createListStore, emptyList } from "../../utils/store";

export type MessageType = "success" | "error" | "warning" | "info";

export interface MessageOptions {
  /**
   * How long the message stays, in seconds. 0 (or Infinity) keeps it until it is closed, and
   * makes it closable.
   */
  seconds?: number;
  /** Replaces the icon for its type. */
  icon?: ReactNode;
  /** Shows a button that closes the message. */
  closable?: boolean;
}

/** Closes the message, or drops it if it is still waiting in the queue. */
export type CloseMessage = () => void;

interface MessageItem {
  id: number;
  type: MessageType;
  text: string;
  icon: ReactNode | undefined;
  closable: boolean;
  exiting: boolean;
  pause: () => void;
  resume: () => void;
  close: () => void;
}

let idCounter = 0;

/** setTimeout's longest delay; a longer one overflows and fires at once. */
const MAX_DELAY = 2 ** 31 - 1;

/** Whether a message with this duration stays until it is closed. */
const isPersistent = (seconds: number) => !Number.isFinite(seconds) || seconds <= 0;

const ICONS: Record<MessageType, () => ReactNode> = {
  success: () => <SuccessIcon />,
  error: () => <ErrorIcon />,
  warning: () => <WarningIcon />,
  info: () => <InfoIcon />
};

const store = /* @__PURE__ */ createListStore<MessageItem>(() => <MessageContainer />);

const TYPE_LABELS: Record<MessageType, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info"
};

interface Announcement {
  id: number;
  text: string;
  /** An error interrupts, as an alert should; the rest wait their turn. */
  assertive: boolean;
}

/**
 * What the live regions read out, apart from the message list, which stays plain content any
 * screen reader can browse. Each entry is added (a change the regions announce) and soon taken
 * out again, so the hidden copy doesn't linger beside the visible message.
 */
let announcements: Announcement[] = [];
const announcementListeners = new Set<() => void>();
const subscribeAnnouncements = (listener: () => void) => {
  announcementListeners.add(listener);
  return () => announcementListeners.delete(listener);
};
const getAnnouncements = () => announcements;
const updateAnnouncements = (updater: (prev: Announcement[]) => Announcement[]) => {
  announcements = updater(announcements);
  announcementListeners.forEach(listener => listener());
};

const ANNOUNCE_MS = 5000;

function announce(type: MessageType, text: string) {
  const id = ++idCounter;
  // After the regions have rendered, or the first message's text is missed: the root that holds
  // them mounts with it, and only a change to a region already there is announced.
  setTimeout(() => {
    updateAnnouncements(prev => [
      ...prev,
      { id, text: `${TYPE_LABELS[type]}: ${text}`, assertive: type === "error" }
    ]);
    setTimeout(() => updateAnnouncements(prev => prev.filter(a => a.id !== id)), ANNOUNCE_MS);
  }, 50);
}

function MessageContainer() {
  const messages = useSyncExternalStore(store.subscribe, store.get, emptyList);
  const live = useSyncExternalStore(subscribeAnnouncements, getAnnouncements, emptyList);

  return (
    <>
      <section className="bx-Message" aria-label="Notifications">
        {messages.map(item => (
          <div
            key={item.id}
            className="bx-Message-item"
            data-type={item.type}
            data-exiting={item.exiting ? "" : undefined}
            // Hovering or focusing it (its close button) holds it on screen (WCAG 2.2.1), so it
            // can't vanish while it is being read or under the keyboard.
            onPointerEnter={item.pause}
            onPointerLeave={item.resume}
            onFocus={item.pause}
            onBlur={item.resume}
          >
            <span className="bx-Message-content">
              <span className="bx-Message-icon">{item.icon ?? ICONS[item.type]()}</span>
              <span className="bx-Message-text">{item.text}</span>
            </span>
            {item.closable ? (
              <button
                type="button"
                className="bx-Message-close"
                aria-label="Close notification"
                onClick={item.close}
              >
                <CloseIcon />
              </button>
            ) : null}
          </div>
        ))}
      </section>
      {/* The list above isn't live, so each message is heard once, from one of these. */}
      <div className="bx-visually-hidden" role="status" aria-atomic="false">
        {live.map(a => (a.assertive ? null : <div key={a.id}>{a.text}</div>))}
      </div>
      <div className="bx-visually-hidden" role="alert" aria-atomic="false">
        {live.map(a => (a.assertive ? <div key={a.id}>{a.text}</div> : null))}
      </div>
    </>
  );
}

interface QueuedMessage {
  type: MessageType;
  text: string;
  icon: ReactNode | undefined;
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
  const id = ++idCounter;
  visibleCount++;

  let exiting = false;
  // The duration starts when the message appears, not while it waits in the queue.
  const persistent = isPersistent(seconds);
  let remaining = persistent ? 0 : Math.min(seconds * 1000, MAX_DELAY);
  let startedAt = 0;
  let dismissTimer: ReturnType<typeof setTimeout> | undefined;

  const dismiss = () => {
    // Closed by the button, by its close function or by the timer: whichever comes first.
    if (exiting) return;
    clearTimeout(dismissTimer);
    dismissTimer = undefined;
    exiting = true;
    // The item keeps its key, so React keeps its element through the exit transition.
    store.update(prev => prev.map(m => (m.id === id ? { ...m, exiting: true } : m)));
    // Its slot frees as it starts leaving, so the next message comes in without a gap.
    visibleCount--;
    drain();
    setTimeout(() => store.update(prev => prev.filter(m => m.id !== id)), 320);
  };

  // Pointer and focus each hold the message; it runs again once neither does.
  let holds = 0;

  const start = () => {
    if (persistent || exiting || holds > 0 || dismissTimer !== undefined) return;
    startedAt = performance.now();
    dismissTimer = setTimeout(dismiss, remaining);
  };

  const pause = () => {
    holds++;
    if (exiting || dismissTimer === undefined) return;
    clearTimeout(dismissTimer);
    dismissTimer = undefined;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
  };

  const resume = () => {
    holds = Math.max(0, holds - 1);
    start();
  };

  store.update(prev => [
    ...prev,
    { id, type, text, icon, closable, exiting, pause, resume, close: dismiss }
  ]);
  queued.close = dismiss;
  announce(type, text);
  start();
}

export interface MessageConfig {
  /** How many messages show at once; more wait in a queue. Default 3. */
  limit?: number;
}

/**
 * Short notifications at the top of the screen. The second argument is how long to show the
 * message, in seconds (0 keeps it until closed), or `{ seconds, icon, closable }`. Each call
 * returns a function that closes the message. Up to three show at once (see `config`); the rest
 * queue and each appears as an earlier one leaves. Call it from the browser (an event handler or
 * effect); it renders nothing on the server.
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
    // NaN would compare false with every count and stop all messages; Infinity means no limit.
    if (config.limit !== undefined && !Number.isNaN(config.limit)) {
      limit = Math.max(1, Math.floor(config.limit));
    }
    drain();
  }
};
