import { createMemo, type JSX } from "solid-js";

import { ChevronDownIcon } from "../../icons";
import { type BaseProps, cx } from "../../utils/style";
import { Button, type ButtonVariant } from "../Button/Button";
import { Menu, MenuDropdown, type MenuPosition, MenuTarget } from "../Menu/Menu";

export interface SplitButtonProps extends BaseProps {
  children?: JSX.Element;
  /** Menu items (MenuItem, MenuDivider) for the arrow half. */
  dropdown?: JSX.Element;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
  leftSection?: JSX.Element;
  menuPosition?: MenuPosition;
  /** Replaces the chevron on the menu half. */
  chevronIcon?: JSX.Element;
  "aria-label"?: string;
  toggleAriaLabel?: string;
  onClick?: (event: MouseEvent) => void;
}

export function SplitButton(props: SplitButtonProps) {
  // Read by the click handler, as a memo: event handlers have no reactive owner, and reading a prop written as a
  // condition there would make Solid create a computation that is never disposed.
  const blocked = createMemo(() => props.disabled === true || props.loading === true);

  // The menu opens from its own half only: Menu toggles on clicks on its trigger, the arrow half,
  // and treats a click here like any other outside it, closing an open menu.
  const handlePrimaryClick = (event: MouseEvent) => {
    if (blocked()) return;
    props.onClick?.(event);
  };

  return (
    <Menu
      position={props.menuPosition ?? "bottom-end"}
      class={cx("bx-SplitButton-menu", props.fullWidth && "bx-SplitButton-fullWidth")}
    >
      <MenuTarget class={cx("bx-SplitButton", props.class)}>
        <Button
          class="bx-SplitButton-main"
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
          class="bx-SplitButton-toggle"
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
