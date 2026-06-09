export interface Book {
  id: string;
  title: string;
  author: string;
  content: string; // The article content, containing bracket annotation e.g. "子曰：学而时习之((时：按时；习：温习；一说：学如小鸟反复展翅))，不亦说乎？"
  description?: string;
  createdAt: number;
  seals?: BookSeal[]; // Custom stamps placed on this book
  drawings?: { [pageIndex: number]: string }; // Base64 drawing canvas paths per page
}

export interface BookSeal {
  id: string;
  sealId: string; // References Seal.id
  pageIndex: number;
  xPct: number; // Position percentage x (0-100)
  yPct: number; // Position percentage y (0-100)
  scale: number; // Custom scale multiplier (0.5 to 2.0)
}

export interface Seal {
  id: string;
  text: string; // Seal text (usually 2 to 4 chinese chars, e.g. "张三藏书","乾隆御览")
  shape: "square" | "circle" | "gourd" | "oval";
  style: "yin" | "yang"; // yin: 白文 (white character on red bg), yang: 朱文 (red character, hollow bg)
  font: "zhuan" | "kai" | "song"; // seal styles
  inkBleed: number; // Ink degradation / texture level (0 to 10)
  dataUrl?: string; // Generated PNG representation as dataUrl (or computed locally)
}

export type ThemeType = "xuan" | "bamboo" | "silk" | "imperial" | "cinnabar" | "jade";

export interface LayoutConfig {
  fontFamily: "kaiti" | "fangsong" | "song" | "clerical" | "kangxi"; // custom styled ancient fonts
  fontSize: number; // typical font size for columns
  linesPerPage: number; // lines (columns) per leaf, typical: 8, 10, 12, 14
  charsPerLine: number; // characters per line, typical: 16, 20, 24, 28
  lineSpacing: number; // gap between lines
  theme: ThemeType; // Xuan paper variations
  borderStyle: "single" | "double" | "none"; // page outer border lines (乌丝/朱丝拦)
  borderType: "zhu" | "wu"; // 朱丝 (red vermilion) or 乌丝 (deep charcoal)
  showCenterLine: boolean; // 版心 vertical center line split
  showFishtail: boolean; // 版心鱼尾 decoration
  punctuationMode: "none" | "modern" | "traditional"; // traditional: side red circle "句读"
  showLineGrid: boolean; // 朱丝栏 (vertical partition grids)
}
