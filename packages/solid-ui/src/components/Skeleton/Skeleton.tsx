import { type BaseProps, cx, mergeStyle, type SizeProp } from "../../utils/style";

export interface SkeletonProps extends BaseProps {
  height?: SizeProp;
  width?: SizeProp;
  radius?: SizeProp;
  circle?: boolean;
  /** Default true. */
  animate?: boolean;
}

const toLength = (size: SizeProp | undefined) => (typeof size === "number" ? `${size}px` : size);

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class={cx("bx-Skeleton", props.class)}
      data-animate={props.animate !== false ? "" : undefined}
      data-circle={props.circle ? "" : undefined}
      aria-hidden="true"
      style={mergeStyle(props.style, {
        height: toLength(props.height),
        width: toLength(props.width),
        "border-radius": props.circle ? undefined : toLength(props.radius)
      })}
    />
  );
}
