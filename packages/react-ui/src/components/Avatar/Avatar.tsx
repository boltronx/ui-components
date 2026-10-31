import { type BaseProps, cx, mergeStyle } from "../../utils/style";

let segmenter: Intl.Segmenter | undefined;

/**
 * The first `count` characters as a reader sees them: charAt would split an emoji or 𠮷 in half,
 * and code points would still split a flag (🇵🇭), a ZWJ emoji (👩‍💻) or a combined accent (é).
 */
function leading(text: string, count = 1): string {
  if (typeof Intl.Segmenter !== "function") return Array.from(text).slice(0, count).join("");
  segmenter ??= new Intl.Segmenter();
  const parts: string[] = [];
  for (const { segment } of segmenter.segment(text)) {
    if (parts.length === count) break;
    parts.push(segment);
  }
  return parts.join("");
}

/** Initials for a name: "Ada Lovelace" -> "AL"; one word gives its first two letters. */
export function getInitials(name: string, twoChars = true): string {
  const trimmed = name.trim();
  if (!twoChars) return leading(trimmed);
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${leading(words[0]!)}${leading(words[1]!)}`;
  return leading(trimmed, 2);
}

export interface AvatarProps extends BaseProps {
  /** The person's name: shown as initials and used as the accessible name. */
  label: string;
  /** Default true. */
  twoChars?: boolean;
  /** Background color. Default the primary color. */
  color?: string;
}

export function Avatar(props: AvatarProps) {
  return (
    <div
      className={cx("bx-Avatar", props.className)}
      role="img"
      aria-label={props.label}
      style={mergeStyle(props.style, { backgroundColor: props.color })}
    >
      {getInitials(props.label, props.twoChars ?? true)}
    </div>
  );
}
