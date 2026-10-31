"use client";

import {
  createContext,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { isFromDisabled } from "../../utils/dom";
import { type BaseProps, cx } from "../../utils/style";
import { FloatingPanel, type FloatingPosition } from "../FloatingPanel/FloatingPanel";

export type MenuPosition = FloatingPosition;

/** Which item gets focus when the menu opens. */
type InitialFocus = "first" | "last";

interface MenuContextValue {
  open: boolean;
  position: MenuPosition;
  menuId: string;
  menuRef: RefObject<HTMLDivElement | null>;
  setDropdownRef: (element: HTMLDivElement | null) => void;
  handleDropdownOpen: () => void;
  trigger: HTMLElement | undefined;
  setTrigger: (element: HTMLElement | undefined) => void;
  openMenu: (focus: InitialFocus) => void;
  /** Closes the menu; with `returnFocus`, focus goes back to the trigger. */
  close: (returnFocus?: boolean) => void;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

const ITEM = '[role^="menuitem"]:not([aria-disabled="true"])';

function menuItems(dropdown: HTMLElement | null | undefined): HTMLElement[] {
  return dropdown ? Array.from(dropdown.querySelectorAll<HTMLElement>(ITEM)) : [];
}

export interface MenuProps extends BaseProps {
  children?: ReactNode;
  position?: MenuPosition;
}

/**
 * A menu button: the target opens a list of actions. Follows the WAI-ARIA menu button pattern:
 * opening moves focus into the menu, arrow keys, Home and End move between items, and Escape or
 * picking an item closes it and returns focus to the target.
 */
function MenuRoot(props: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement>();
  const menuId = `bx-menu-${useId()}`;
  const initialFocus = useRef<InitialFocus>("first");
  const openRef = useRef(open);
  openRef.current = open;
  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;
  const position = props.position ?? "bottom";

  const closeMenu = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const focusItem = useCallback((focus: InitialFocus) => {
    const items = menuItems(dropdownRef.current);
    (focus === "last" ? items.at(-1) : items[0])?.focus();
  }, []);

  const openMenu = useCallback(
    (focus: InitialFocus) => {
      initialFocus.current = focus;
      if (openRef.current) focusItem(focus);
      else setOpen(true);
    },
    [focusItem]
  );

  useEffect(() => {
    if (!open) return;
    // Anything but the trigger and the dropdown closes it, including another Menu's trigger and
    // the rest of the target, e.g. SplitButton's main half.
    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      const trigger = triggerRef.current ?? menuRef.current;
      if (trigger?.contains(target) || dropdownRef.current?.contains(target)) return;
      closeMenu();
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Handled here, so an open modal behind the menu stays open.
      event.preventDefault();
      closeMenu(true);
    };
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, closeMenu]);

  const setDropdownRef = useCallback((element: HTMLDivElement | null) => {
    dropdownRef.current = element;
  }, []);

  // Once the dropdown is placed and visible: move focus into it, as a menu button does.
  const handleDropdownOpen = useCallback(() => focusItem(initialFocus.current), [focusItem]);

  const context = useMemo<MenuContextValue>(
    () => ({
      open,
      position,
      menuId,
      menuRef,
      setDropdownRef,
      handleDropdownOpen,
      trigger,
      setTrigger,
      openMenu,
      close: closeMenu
    }),
    [open, position, menuId, setDropdownRef, handleDropdownOpen, trigger, openMenu, closeMenu]
  );

  return (
    <MenuContext value={context}>
      <div
        ref={menuRef}
        className={cx("bx-Menu", props.className)}
        style={props.style}
        data-open={open ? "" : undefined}
        onClick={event => {
          // Only the trigger toggles. The click isn't stopped: the page's own click listeners,
          // and another open Menu's outside-click check, still see it.
          const trigger = triggerRef.current ?? menuRef.current;
          if (!trigger?.contains(event.target as Node)) return;
          // A loading (aria-disabled) Button in the target still gets clicks; they do nothing.
          if (isFromDisabled(event.target, trigger)) return;
          if (openRef.current) closeMenu();
          else openMenu("first");
        }}
      >
        {props.children}
      </div>
    </MenuContext>
  );
}

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

export function MenuTarget(props: {
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const menu = useContext(MenuContext);
  // Content that isn't focusable on its own (e.g. an Avatar) makes the target itself the button.
  const [standalone, setStandalone] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const setTrigger = menu?.setTrigger;

  useLayoutEffect(() => {
    // A child already marked as the menu button (e.g. SplitButton's arrow half) wins over the
    // first focusable one.
    const focusable =
      targetRef.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ??
      targetRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      undefined;
    setStandalone(!focusable);
    setTrigger?.(focusable ?? targetRef.current ?? undefined);
  }, [setTrigger]);

  // A focusable child, e.g. an IconButton, is the menu button, so it carries the button's state.
  const element = menu?.trigger;
  const open = menu?.open ?? false;
  const menuId = menu?.menuId;
  useLayoutEffect(() => {
    if (!element || !menuId || standalone) return;
    element.setAttribute("aria-haspopup", "menu");
    element.setAttribute("aria-expanded", String(open));
    if (open) element.setAttribute("aria-controls", menuId);
    else element.removeAttribute("aria-controls");
  }, [element, open, menuId, standalone]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Only the trigger's keys, as only its clicks toggle: not SplitButton's main half.
    const trigger = menu?.trigger;
    if (!menu || !trigger?.contains(event.target as Node)) return;
    if (isFromDisabled(event.target, trigger)) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      menu.openMenu(event.key === "ArrowDown" ? "first" : "last");
      return;
    }
    if (standalone && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      targetRef.current?.click();
    }
  };

  return (
    <div
      ref={targetRef}
      className={cx("bx-Menu-target", props.className)}
      role={standalone ? "button" : undefined}
      tabIndex={standalone ? 0 : undefined}
      aria-haspopup={standalone ? "menu" : undefined}
      aria-expanded={standalone && menu ? menu.open : undefined}
      aria-controls={standalone && menu?.open ? menu.menuId : undefined}
      aria-label={standalone ? props.ariaLabel : undefined}
      onKeyDown={handleKeyDown}
    >
      {props.children}
    </div>
  );
}

export function MenuDivider(props: BaseProps) {
  return (
    <div className={cx("bx-Menu-divider", props.className)} role="separator" style={props.style} />
  );
}

function ConnectedMenuDropdown(props: {
  menu: MenuContextValue;
  children?: ReactNode;
  className?: string;
}) {
  const { menu } = props;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems(event.currentTarget);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        return focusAt(index + 1);
      case "ArrowUp":
        return focusAt(index < 0 ? -1 : index - 1);
      case "Home":
        return focusAt(0);
      case "End":
        return focusAt(-1);
      case "Tab":
        // The dropdown sits at the end of <body>, so Tab would leave the page order; go back.
        event.preventDefault();
        return menu.close(true);
    }
  };

  return (
    <FloatingPanel
      open={menu.open}
      target={menu.menuRef}
      position={menu.position}
      exitDuration={160}
      ref={menu.setDropdownRef}
      onOpen={menu.handleDropdownOpen}
      className={cx("bx-Dropdown", "bx-Menu-dropdown", props.className)}
      // The dropdown is portaled, but React passes its events up the component tree: without
      // this, a click in the menu would also reach whatever holds it, e.g. a Table row's
      // onRowClick or a clickable Card. Only React's propagation stops; document listeners (the
      // outside-click check here and elsewhere) still see the click.
      onClick={event => event.stopPropagation()}
    >
      <div
        id={menu.menuId}
        role="menu"
        className="bx-Menu-items"
        aria-label={menu.trigger?.getAttribute("aria-label") ?? undefined}
        onKeyDown={handleKeyDown}
      >
        {props.children}
      </div>
    </FloatingPanel>
  );
}

export function MenuDropdown(props: { children?: ReactNode; className?: string }) {
  const menu = useContext(MenuContext);
  if (menu) return <ConnectedMenuDropdown menu={menu} {...props} />;
  return (
    <div className={cx("bx-Dropdown", "bx-Menu-dropdown", props.className)} role="menu">
      {props.children}
    </div>
  );
}

export interface MenuItemProps extends BaseProps {
  label?: ReactNode;
  children?: ReactNode;
  leftSection?: ReactNode;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  /** Marks the current choice in a set, e.g. the active theme; it is announced as checked. */
  selected?: boolean;
  danger?: boolean;
}

export function MenuItem(props: MenuItemProps) {
  const menu = useContext(MenuContext);
  const activate = (event: MouseEvent<HTMLDivElement>) => {
    if (props.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    props.onClick?.(event);
    menu?.close(true);
  };

  return (
    <div
      className={cx("bx-Menu-item", props.className)}
      style={props.style}
      data-disabled={props.disabled ? "" : undefined}
      data-selected={props.selected ? "" : undefined}
      data-danger={props.danger ? "" : undefined}
      role={props.selected === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={props.selected === undefined ? undefined : props.selected}
      // Focus moves between items with the arrow keys, so items are not separate Tab stops.
      tabIndex={-1}
      aria-disabled={props.disabled === true}
      onClick={activate}
      onKeyDown={event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.currentTarget.click();
      }}
    >
      {props.leftSection}
      {props.label ?? props.children}
    </div>
  );
}

// Marked pure so bundlers can drop Menu from apps that never import it; a plain
// `Menu.Target = ...` assignment counts as a side effect and would keep it.
export const Menu = /* @__PURE__ */ Object.assign(MenuRoot, {
  Target: MenuTarget,
  Dropdown: MenuDropdown,
  Divider: MenuDivider,
  Item: MenuItem
});
