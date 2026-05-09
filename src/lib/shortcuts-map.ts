/** Default keybindings. Override via window.cmsUi.shortcuts. */

export interface ShortcutMap {
  focusSearch: string;
  toggleHelp: string;
  openCommand: string;
  closeOverlay: string;
  goto: Record<string, string>;
}

export const defaultShortcuts: ShortcutMap = {
  focusSearch: '/',          // focus the page's search input
  toggleHelp:  '?',          // show shortcut cheatsheet
  openCommand: 'mod+k',      // command palette (Cmd+K / Ctrl+K)
  closeOverlay: 'Escape',    // dismiss palette/modal/popovers

  // Two-key chord prefix (e.g. "g d" = goto dashboard)
  goto: {
    'd': '/',                // dashboard
    'i': '/inventory',       // inventory
    's': '/settings',
  },
};

/** Parse a chord like "mod+k" / "shift+/" against a KeyboardEvent. */
export function matchesChord(ev: KeyboardEvent, chord: string): boolean {
  const parts = chord.toLowerCase().split('+');
  const key = parts.pop() ?? '';
  const want = new Set(parts);

  const mod = ev.metaKey || ev.ctrlKey;
  if (want.has('mod') && !mod) return false;
  if (!want.has('mod') && (ev.metaKey || ev.ctrlKey)) return false;
  if (want.has('shift') && !ev.shiftKey) return false;
  if (!want.has('shift') && ev.shiftKey && key.length === 1) {
    // allow "?" via shift+/ etc. when explicit
  }
  if (want.has('alt') && !ev.altKey) return false;

  // Normalise key: 'Escape' literal vs single-char
  if (key.length === 1) return ev.key.toLowerCase() === key;
  return ev.key === chord.split('+').pop();
}

/** Are we typing in an editable element? Used to suppress global shortcuts. */
export function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}
