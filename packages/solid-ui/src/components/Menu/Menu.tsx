import type { Accessor, JSX } from "solid-js";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  onMount,
  Show,
  useContext
} from "solid-js";

import { type BaseProps, cx } from "../../utils/style";
import { FloatingPanel, type FloatingPosition } from "../FloatingPanel/FloatingPanel";

export type MenuPosition = FloatingPosition;

/** Which item gets focus when the menu opens. */
type InitialFocus = "first" | "last";

interface MenuContextValue {
  open: Accessor<boolean>;
  position: Accessor<MenuPosition>;
  menuId: string;
  menuRef: Accessor<HTMLDivElement | undefined>;
  setDropdownRef: (element: HTMLDivElement | undefined) => void;
  /** The dropdown is shown: focus moves into it, as a menu button does. */
  onDropdownOpen: () => void;
  trigger: Accessor<HTMLElement | undefined>;
  setTrigger: (element: HTMLElement | undefined) => void;
  openMenu: (focus: InitialFocus) => void;
  /** Closes the menu; with `returnFocus`, focus goes back to the trigger. */
  close: (returnFocus?: boolean) => void;
}

const MenuContext = createContext<MenuContextValue>();

const ITEM = '[role^="menuitem"]:not([aria-disabled="true"])';

function menuItems(dropdown: HTMLElement | undefined): HTMLElement[] {
  return dropdown ? Array.from(dropdown.querySelectorAll<HTMLElement>(ITEM)) : [];
}

export interface MenuProps extends BaseProps {
  children?: JSX.Element;
  position?: MenuPosition;
}

/**
 * A menu button: the target opens a list of actions. Follows the WAI-ARIA menu button pattern:
 * opening moves focus into the menu, arrow keys, Home and End move between items, and Escape or
 * picking an item closes it and returns focus to the target.
 */
function MenuRoot(props: MenuProps) {
  let menuRef: HTMLDivElement | undefined;
  let dropdownRef: HTMLDivElement | undefined;
  const [open, setOpen] = createSignal(false);
  const [trigger, setTrigger] = createSignal<HTMLElement>();
  const menuId = `bx-menu-${createUniqueId()}`;
  let initialFocus: InitialFocus = "first";
  const position = () => props.position ?? "bottom";

  const closeMenu = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) trigger()?.focus();
  };

  const focusItem = (focus: InitialFocus) => {
    const items = menuItems(dropdownRef);
    (focus === "last" ? items.at(-1) : items[0])?.focus();
  };

  const openMenu = (focus: InitialFocus) => {
    initialFocus = focus;
    if (open()) focusItem(focus);
    else setOpen(true);
  };

  /** The element whose clicks toggle the menu: the menu button, once MenuTarget has found it. */
  const toggle = () => trigger() ?? menuRef;

  // Anything else closes it, including other content beside the target, e.g. SplitButton's main half.
  const closeOnOutsideClick = (event: MouseEvent) => {
    const target = event.target as Node;
    if (toggle()?.contains(target) || dropdownRef?.contains(target)) return;
    closeMenu();
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    // Handled here, so an open modal behind the menu stays open.
    event.preventDefault();
    closeMenu(true);
  };

  createEffect(() => {
    if (!open()) return;
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    onCleanup(() => {
      document.removeEventListener("click", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    });
  });

  const context: MenuContextValue = {
    open,
    position,
    menuId,
    menuRef: () => menuRef,
    setDropdownRef: element => (dropdownRef = element),
    onDropdownOpen: () => focusItem(initialFocus),
    trigger,
    setTrigger,
    openMenu,
    close: closeMenu
  };

  return (
    <MenuContext.Provider value={context}>
      <div
        ref={el => (menuRef = el)}
        class={cx("bx-Menu", props.class)}
        style={props.style}
        data-open={open() ? "" : undefined}
        onClick={event => {
          if (!toggle()?.contains(event.target as Node)) return;
          if (open()) closeMenu();
          else openMenu("first");
        }}
      >
        {props.children}
      </div>
    </MenuContext.Provider>
  );
}

const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

export function MenuTarget(props: { children?: JSX.Element; class?: string; ariaLabel?: string }) {
  const menu = useContext(MenuContext);
  // Content that isn't focusable on its own (e.g. an Avatar) makes the target itself the button.
  const [standalone, setStandalone] = createSignal(false);
  let targetRef: HTMLDivElement | undefined;

  onMount(() => {
    // A child already marked as the menu button (e.g. SplitButton's arrow half) wins over the
    // first focusable one.
    const focusable =
      targetRef?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ??
      targetRef?.querySelector<HTMLElement>(FOCUSABLE) ??
      undefined;
    setStandalone(!focusable);
    menu?.setTrigger(focusable ?? targetRef);
  });

  // A focusable child, e.g. an IconButton, is the menu button, so it carries the button's state.
  createEffect(() => {
    const element = menu?.trigger();
    if (!menu || !element || standalone()) return;
    element.setAttribute("aria-haspopup", "menu");
    element.setAttribute("aria-expanded", String(menu.open()));
    if (menu.open()) element.setAttribute("aria-controls", menu.menuId);
    else element.removeAttribute("aria-controls");
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!menu) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      menu.openMenu(event.key === "ArrowDown" ? "first" : "last");
      return;
    }
    if (standalone() && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      targetRef?.click();
    }
  };

  return (
    <div
      ref={el => (targetRef = el)}
      class={cx("bx-Menu-target", props.class)}
      role={standalone() ? "button" : undefined}
      tabIndex={standalone() ? 0 : undefined}
      aria-haspopup={standalone() ? "menu" : undefined}
      aria-expanded={standalone() && menu ? menu.open() : undefined}
      aria-controls={standalone() && menu?.open() ? menu.menuId : undefined}
      aria-label={standalone() ? props.ariaLabel : undefined}
      onKeyDown={handleKeyDown}
    >
      {props.children}
    </div>
  );
}

export function MenuDivider(props: BaseProps) {
  return <div class={cx("bx-Menu-divider", props.class)} role="separator" style={props.style} />;
}

function StaticMenuDropdown(props: { children?: JSX.Element; class?: string }) {
  return (
    <div class={cx("bx-Dropdown", "bx-Menu-dropdown", props.class)} role="menu">
      {props.children}
    </div>
  );
}

function ConnectedMenuDropdown(props: { children?: JSX.Element; class?: string }) {
  const menu = useContext(MenuContext)!;

  const handleKeyDown = (event: KeyboardEvent) => {
    const items = menuItems(event.currentTarget as HTMLElement);
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
        // The dropdown sits at the end of <body>. Focus goes back to the trigger first, so the
        // browser's Tab moves on from there to the next element, not off the page.
        return menu.close(true);
    }
  };

  return (
    <FloatingPanel
      open={menu.open()}
      target={menu.menuRef}
      position={menu.position()}
      exitDuration={160}
      ref={menu.setDropdownRef}
      onOpen={menu.onDropdownOpen}
      class={cx("bx-Dropdown", "bx-Menu-dropdown", props.class)}
      onClick={event => event.stopPropagation()}
    >
      <div
        id={menu.menuId}
        role="menu"
        class="bx-Menu-items"
        aria-label={menu.trigger()?.getAttribute("aria-label") ?? undefined}
        onKeyDown={handleKeyDown}
      >
        {props.children}
      </div>
    </FloatingPanel>
  );
}

export function MenuDropdown(props: { children?: JSX.Element; class?: string }) {
  return (
    <Show when={useContext(MenuContext)} fallback={<StaticMenuDropdown {...props} />}>
      <ConnectedMenuDropdown {...props} />
    </Show>
  );
}

export interface MenuItemProps extends BaseProps {
  label?: JSX.Element;
  children?: JSX.Element;
  leftSection?: JSX.Element;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  /** Marks the current choice in a set, e.g. the active theme; it is announced as checked. */
  selected?: boolean;
  danger?: boolean;
}

export function MenuItem(props: MenuItemProps) {
  const menu = useContext(MenuContext);
  // Read by the click handler, as a memo: event handlers have no reactive owner, and reading a prop written as a
  // condition there would make Solid create a computation that is never disposed.
  const disabled = createMemo(() => props.disabled === true);
  const activate = (event: MouseEvent) => {
    if (disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // Closed first, so focus is back on the trigger when the action runs: a modal it opens then
    // returns focus there, not to this item, which is gone by the time the modal closes.
    menu?.close(true);
    props.onClick?.(event);
  };

  return (
    <div
      class={cx("bx-Menu-item", props.class)}
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
