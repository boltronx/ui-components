"use client";

import type { MouseEvent, ReactNode } from "react";

import { ChevronDownIcon } from "../../icons";
import { type BaseProps, cx } from "../../utils/style";
import { Button, type ButtonVariant } from "../Button/Button";
import { Menu, MenuDropdown, type MenuPosition, MenuTarget } from "../Menu/Menu";

export interface SplitButtonProps extends BaseProps {
  children?: ReactNode;
  /** Menu items (MenuItem, MenuDivider) for the arrow half. */
  dropdown?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
  leftSection?: ReactNode;
  menuPosition?: MenuPosition;
  /** Replaces the chevron on the menu half. */
  chevronIcon?: ReactNode;
  "aria-label"?: string;
  toggleAriaLabel?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function SplitButton(props: SplitButtonProps) {
  // The menu opens from its own half only: the arrow is the Menu's trigger, so a click on this
  // half doesn't toggle it, and closes it as any click outside the trigger does.
  const handlePrimaryClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (props.disabled || props.loading) return;
    props.onClick?.(event);
  };

  return (
    <Menu
      position={props.menuPosition ?? "bottom-end"}
      className={cx("bx-SplitButton-menu", props.fullWidth && "bx-SplitButton-fullWidth")}
    >
      <MenuTarget className={cx("bx-SplitButton", props.className)}>
        <Button
          className="bx-SplitButton-main"
          style={props.style}
          variant={props.variant}
          disabled={props.disabled}
          loading={props.loading}
          type={props.type ?? "button"}
          leftSection={props.leftSection}
          fullWidth={props.fullWidth}
          aria-label={props["aria-label"]}
          onClick={handlePrimaryClick}
        >
          {props.children}
        </Button>
        <Button
          className="bx-SplitButton-toggle"
          variant={props.variant}
          disabled={props.disabled || props.loading}
          aria-label={props.toggleAriaLabel ?? "More options"}
          aria-haspopup="menu"
        >
          {props.chevronIcon ?? <ChevronDownIcon />}
        </Button>
      </MenuTarget>
      <MenuDropdown>{props.dropdown}</MenuDropdown>
    </Menu>
  );
}
