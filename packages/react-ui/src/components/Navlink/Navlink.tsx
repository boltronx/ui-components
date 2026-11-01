"use client";

import {
  Children,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useState
} from "react";

import { ChevronRightIcon } from "../../icons";
import { type BaseProps, cx } from "../../utils/style";

export interface NavlinkProps extends BaseProps {
  /** Element or component to render, e.g. Next.js `Link`. Default "a" with `href`, else "div". */
  component?: ElementType;
  href?: string;
  label: ReactNode;
  /** Nested links, shown in a collapsible group. */
  children?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  /** Controls whether the nested group is open. */
  opened?: boolean;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  /** Replaces the chevron shown on a link with nested links. */
  chevronIcon?: ReactNode;
  /** Indent of nested links, in px. */
  childrenOffset?: number;
  target?: string;
  rel?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

export function Navlink(props: NavlinkProps) {
  const hasChildren = Children.toArray(props.children).length > 0;
  const isDiv = !props.href && (!props.component || props.component === "div");
  const [openedState, setOpened] = useState(false);
  const opened = props.opened ?? openedState;
  const Component = props.component ?? (props.href ? "a" : "div");

  const activate = (event: MouseEvent<HTMLElement>) => {
    if (props.disabled) {
      // aria-disabled doesn't stop a link, so the navigation is cancelled here.
      event.preventDefault();
      return;
    }
    if (hasChildren && props.opened === undefined) setOpened(o => !o);
    props.onClick?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if ((event.key === "Enter" || event.key === " ") && !props.disabled) {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <div className="bx-Navlink-root">
      <Component
        className={cx("bx-Navlink", props.className)}
        style={props.style}
        data-active={props.active ? "" : undefined}
        data-disabled={props.disabled ? "" : undefined}
        data-opened={hasChildren && opened ? "" : undefined}
        href={props.href}
        target={props.target}
        rel={props.rel}
        onClick={activate}
        onKeyDown={isDiv ? handleKeyDown : undefined}
        aria-disabled={props.disabled || undefined}
        aria-current={props.active && props.href ? "page" : undefined}
        aria-expanded={hasChildren ? opened : undefined}
        role={isDiv ? "button" : undefined}
        tabIndex={isDiv && !props.disabled ? 0 : undefined}
      >
        {props.leftSection ? <span className="bx-Navlink-section">{props.leftSection}</span> : null}
        <span className="bx-Navlink-label">{props.label}</span>
        {hasChildren ? (
          <span className="bx-Navlink-section bx-Navlink-chevron">
            {props.chevronIcon ?? <ChevronRightIcon />}
          </span>
        ) : (
          props.rightSection
        )}
      </Component>

      {hasChildren && (
        <div className="bx-Navlink-collapse" data-opened={opened ? "" : undefined} inert={!opened}>
          <div
            className="bx-Navlink-children"
            style={
              props.childrenOffset !== undefined
                ? { paddingLeft: `${props.childrenOffset}px` }
                : undefined
            }
          >
            {props.children}
          </div>
        </div>
      )}
    </div>
  );
}
