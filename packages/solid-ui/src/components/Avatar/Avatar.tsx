import { type BaseProps, cx, mergeStyle } from "../../utils/style";

let segmenter: Intl.Segmenter | undefined;

/**
 * The characters a reader sees, so an emoji, a flag or an accented letter is never cut in half;
 * `charAt` would split them into broken halves.
 */
function graphemes(text: string): string[] {
  if (typeof Intl.Segmenter !== "function") return Array.from(text);
  segmenter ??= new Intl.Segmenter();
  return Array.from(segmenter.segment(text), part => part.segment);
}

/** Initials for a name: "Ada Lovelace" -> "AL"; one word gives its first two letters. */
export function getInitials(name: string, twoChars = true): string {
  const trimmed = name.trim();
  const first = (text: string) => graphemes(text)[0] ?? "";
  if (!twoChars) return first(trimmed);
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${first(words[0]!)}${first(words[1]!)}`;
  return graphemes(trimmed).slice(0, 2).join("");
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
      class={cx("bx-Avatar", props.class)}
      role="img"
      aria-label={props.label}
      style={mergeStyle(props.style, { "background-color": props.color })}
    >
      {getInitials(props.label, props.twoChars ?? true)}
    </div>
  );
}
