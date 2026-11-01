// The icons the components draw by default, on a 24px grid with a 2px round stroke. They are
// internal: apps bring their own icon set, and each component takes a prop to swap these out.
import type { JSX } from "solid-js";

interface IconProps {
  class?: string;
}

function Icon(props: IconProps & { children: JSX.Element }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class={props.class}
    >
      {props.children}
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M6.5 9.5L12 15l5.5-5.5" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M14.5 6.5L9 12l5.5 5.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M9.5 6.5L15 12l-5.5 5.5" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M7 7l10 10M17 7L7 17" />
    </Icon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M2.5 12C4.6 7.9 8 5.5 12 5.5s7.4 2.4 9.5 6.5c-2.1 4.1-5.5 6.5-9.5 6.5S4.6 16.1 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M9.8 5.8A9 9 0 0 1 12 5.5c4 0 7.4 2.4 9.5 6.5a15 15 0 0 1-2.3 3.3M15.7 17.3A8.6 8.6 0 0 1 12 18.5c-4 0-7.4-2.4-9.5-6.5a14.6 14.6 0 0 1 3.8-4.8" />
      <path d="M10 10.2a2.75 2.75 0 0 0 3.8 3.8" />
      <path d="M3.5 3.5l17 17" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icon>
  );
}

export function FolderEmptyIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
      <path d="M9.5 14h5" />
    </Icon>
  );
}

export function SuccessIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </Icon>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </Icon>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <path d="M10.3 4.6a2 2 0 0 1 3.4 0l7 12a2 2 0 0 1-1.7 3H5a2 2 0 0 1-1.7-3z" />
      <path d="M12 9.5V13M12 16.5v.01" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon class={props.class}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.75v.01" />
    </Icon>
  );
}
