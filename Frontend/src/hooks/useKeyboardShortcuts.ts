import { useEffect } from "react";

interface ShortcutHandlers {
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleRaiseHand?: () => void;
  onLeave?: () => void;
  enabled?: boolean;
}

/**
 * Custom hook to register global keyboard shortcuts for meeting controls.
 * - Ctrl+D / Cmd+D: Mute/Unmute Mic
 * - Ctrl+E / Cmd+E: Camera On/Off
 * - Ctrl+Shift+H / Cmd+Shift+H: Raise/Lower Hand
 * - Space: Push to talk / toggle mic (when not typing in an input)
 */
export const useKeyboardShortcuts = ({
  onToggleMic,
  onToggleCamera,
  onToggleRaiseHand,
  enabled = true,
}: ShortcutHandlers): void => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses inside input/textarea/editable elements
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl + D / Cmd + D -> Mic
      if (cmdOrCtrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        onToggleMic?.();
      }

      // Ctrl + E / Cmd + E -> Camera
      if (cmdOrCtrl && e.key.toLowerCase() === "e") {
        e.preventDefault();
        onToggleCamera?.();
      }

      // Ctrl + Shift + H / Cmd + Shift + H -> Hand
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        onToggleRaiseHand?.();
      }

      // Space -> Toggle Mic
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        onToggleMic?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleMic, onToggleCamera, onToggleRaiseHand, enabled]);
};
