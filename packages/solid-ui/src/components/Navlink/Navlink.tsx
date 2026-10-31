import type { JSX, ValidComponent } from "solid-js";
import {
  children as resolveChildren,
  createEffect,
  createMemo,
  createSignal,
  Show
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { ChevronRightIcon } from "../../icons";
import { type BaseProps, cx } from "../../utils/style";

export interface NavlinkProps extends BaseProps {
  /** Element or component to render, e.g. a router's `A`. Default "a" with `href`, else "div". */
  component?: ValidComponent;
  href?: string;
  label: JSX.Element;
  /** Nested links, shown in a collapsible group. */
  children?: JSX.Element;
  active?: boolean;
  disabled?: boolean;
  /** Controls whether the nested group is open. */
  opened?: boolean;
  leftSection?: JSX.Element;
  rightSection?: JSX.Element;
  /** Replaces the chevron shown on a link with nested links. */
  chevronIcon?: JSX.Element;
  /** Indent of nested links, in px. */
  childrenOffset?: number;
  target?: string;
  rel?: string;
  onClick?: (event: MouseEvent) => void;
}

export function Navlink(props: NavlinkProps) {
  const resolved = resolveChildren(() => props.children);
  const hasChildren = () => {
    const c = resolved();
    return Array.isArray(c) ? c.length > 0 : !!c;
  };
  // What the handlers read, as a memo: event handlers have no reactive owner, and reading a prop written as a
  // condition there would make Solid create a computation that is never disposed.
  const isDiv = createMemo(() => !props.href && (!props.component || props.component === "div"));
  const disabled = createMemo(() => props.disabled === true);
  const controlled = createMemo(() => props.opened !== undefined);
  const [opened, setOpened] = createSignal(false);

  createEffect(() => {
    if (props.opened !== undefined) setOpened(props.opened);
  });

  const activate = (event: MouseEvent) => {
    if (disabled()) {
      // aria-disabled doesn't stop a link, so the navigation is cancelled here.
      event.preventDefault();
      return;
    }
    if (hasChildren() && !controlled()) setOpened(o => !o);
    props.onClick?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.key === "Enter" || event.key === " ") && isDiv() && !disabled()) {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  };

  return (
    <div class="bx-Navlink-root">
      <Dynamic
        component={props.component ?? (props.href ? "a" : "div")}
        class={cx("bx-Navlink", props.class)}
        style={props.style}
        data-active={props.active ? "" : undefined}
        data-disabled={props.disabled ? "" : undefined}
        data-opened={hasChildren() && opened() ? "" : undefined}
        href={props.href}
        target={props.target}
        rel={props.rel}
        onClick={activate}
        onKeyDown={isDiv() ? handleKeyDown : undefined}
        aria-disabled={props.disabled || undefined}
        aria-current={props.active && props.href ? "page" : undefined}
        aria-expanded={hasChildren() ? opened() : undefined}
        role={isDiv() ? "button" : undefined}
        tabIndex={isDiv() && !props.disabled ? 0 : undefined}
      >
        {props.leftSection ? <span class="bx-Navlink-section">{props.leftSection}</span> : null}
        <span class="bx-Navlink-label">{props.label}</span>
        <Show when={hasChildren()} fallback={props.rightSection}>
          <span class="bx-Navlink-section bx-Navlink-chevron">
            {props.chevronIcon ?? <ChevronRightIcon />}
          </span>
        </Show>
      </Dynamic>

      <Show when={hasChildren()}>
        <div class="bx-Navlink-collapse" data-opened={opened() ? "" : undefined} inert={!opened()}>
          <div
            class="bx-Navlink-children"
            style={
              props.childrenOffset !== undefined
                ? { "padding-left": `${props.childrenOffset}px` }
                : undefined
            }
          >
            {resolved()}
          </div>
        </div>
      </Show>
    </div>
  );
}
