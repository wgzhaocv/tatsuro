// Content data (song / album / disc titles) is frequently Japanese. Tag those
// nodes with lang="ja" so the :lang(ja) rule in globals.css swaps in the
// Japanese gothic stack (Mixed-Script Rule).
const JP = /[぀-ヿ㐀-鿿]/;

/** True when the string contains hiragana, katakana, or CJK ideographs. */
export function isJapanese(text: string): boolean {
  return JP.test(text);
}
