import { type BaseProps, cx, mergeStyle } from "../../utils/style";

/**
 * One character as a reader sees it: a flag (🇵🇭), or a code point with the marks, skin tones and
 * tags that join it (é, 👍🏽, 🏴󠁧󠁢󠁥󠁮󠁧󠁿), and the ZWJ emoji it begins (👩‍💻). Not Intl.Segmenter, which
 * Firefox lacks before 125 and whose rules vary with each engine's Unicode version: the server
 * and the browser must give the same initials, or hydration fails.
 */
const CHARACTER =
  /\p{Regional_Indicator}{2}|\P{M}[\p{M}\p{Emoji_Modifier}\u{E0020}-\u{E007F}]*(?:\u200D\P{M}[\p{M}\p{Emoji_Modifier}]*)*/gu;

/** The first `count` characters: charAt would split 𠮷 in half, and code points a flag or é. */
function leading(text: string, count = 1): string {
  return (text.match(CHARACTER) ?? []).slice(0, count).join("");
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
