import { useState, type JSX, type MouseEvent } from "react";

// 8 distinct hues derived from primary color palette
const AVATAR_COLORS = [
  "bg-[#0077B6]",
  "bg-[#0096C7]",
  "bg-[#0369A1]",
  "bg-[#1D4ED8]",
  "bg-[#6D28D9]",
  "bg-[#0F766E]",
  "bg-[#B45309]",
  "bg-[#BE185D]",
];

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name?: string;
  size?: AvatarSize;
  isOnline?: boolean;
  src?: string | null;
  onClick?: (e: MouseEvent) => void;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-32 h-32 text-4xl",
};

const DOT_SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "w-2 h-2",
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-3.5 h-3.5",
  xl: "w-8 h-8 border-4",
};

const getAvatarColor = (name?: string): string => {
  const safeName = name || "User";
  const charSum = safeName
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[charSum % AVATAR_COLORS.length];
};

const getInitials = (name?: string): string => {
  const safeName = (name || "").trim();
  if (!safeName) return "U";
  const parts = safeName.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
};

export const Avatar = ({
  name,
  size = "md",
  isOnline,
  src,
  onClick,
}: AvatarProps): JSX.Element => {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const colorClass = getAvatarColor(name);
  const initials = getInitials(name);
  const imageError = failedImageSrc === (src ?? null);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const dotSizeClass = DOT_SIZE_CLASSES[size] || DOT_SIZE_CLASSES.md;

  const isClickable = !!onClick;
  const Wrapper = isClickable ? "button" : "span";
  const wrapperProps = isClickable
    ? {
        type: "button" as const,
        onClick,
        className: "relative inline-flex shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 rounded-full transition-opacity hover:opacity-90",
        title: `View ${name}'s info`,
        "aria-label": `View ${name}'s info`,
      }
    : {
        className: "relative inline-flex shrink-0",
      };

  return (
    <Wrapper {...wrapperProps}>
      <span
        className={`${sizeClass} ${colorClass} inline-flex items-center justify-center overflow-hidden rounded-full font-semibold text-white shrink-0`}
        title={isClickable ? undefined : name}
        aria-label={isClickable ? undefined : name}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover rounded-full max-w-full max-h-full"
            loading="lazy"
            onError={() => setFailedImageSrc(src ?? null)}
          />
        ) : (
          initials
        )}
      </span>
      {isOnline !== undefined && (
        <span
          className={`${dotSizeClass} absolute bottom-0 right-0 rounded-full border-2 border-surface ${
            isOnline ? "bg-success" : "bg-text-tertiary"
          }`}
          style={
            isOnline ? { backgroundColor: "var(--color-success)" } : undefined
          }
          aria-label={isOnline ? "Online" : "Offline"}
        />
      )}
    </Wrapper>
  );
};
