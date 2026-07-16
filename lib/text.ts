// Content data (song / album / disc titles) is frequently Japanese. Tag those
// nodes with lang="ja" so the :lang(ja) rule in globals.css swaps in the
// Japanese gothic stack (Mixed-Script Rule).
const JP = /[぀-ヿ㐀-鿿]/;

/** True when the string contains hiragana, katakana, or CJK ideographs. */
export function isJapanese(text: string): boolean {
  return JP.test(text);
}

/** Fold text for case- and script-insensitive matching: lowercase + katakana→
 *  hiragana, so a kana query matches either script (and romaji/English fold by
 *  case). The catalog's name_en is already romaji, so all three scripts collapse
 *  onto one comparable form. Used by search (see lib/api/search.ts). */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
