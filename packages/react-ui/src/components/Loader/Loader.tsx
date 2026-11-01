import { type BaseProps, cx, mergeStyle } from "../../utils/style";

export interface LoaderProps extends BaseProps {
  size?: "xs" | "sm" | "md" | "lg";
  /** Any CSS color. Default the primary color. */
  color?: string;
  variant?: "oval" | "dots" | "bars";
  /** Accessible name. Default "Loading". */
  label?: string;
}

export function Loader(props: LoaderProps) {
  const variant = props.variant ?? "oval";

  return (
    <span
      className={cx("bx-Loader", props.className)}
      style={mergeStyle(props.style, { color: props.color })}
      data-variant={variant}
      data-size={props.size ?? "sm"}
      role="status"
      aria-label={props.label ?? "Loading"}
    >
      {variant === "oval" ? (
        <span className="bx-Loader-oval" />
      ) : (
        [0, 1, 2].map(i => <span key={i} className="bx-Loader-item" />)
      )}
    </span>
  );
}
