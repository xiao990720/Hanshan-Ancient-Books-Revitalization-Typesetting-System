import React, { useRef, useState, useEffect } from "react";
import { Book, LayoutConfig, BookSeal, Seal } from "../types";
import { BrushCanvas } from "./BrushCanvas";
import { Trash2, Move, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Edit3, Download } from "lucide-react";
import { generateSealDataUrl } from "../utils/sealGenerator";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface BookViewerProps {
  book: Book;
  config: LayoutConfig;
  allSeals: Seal[];
  onUpdateBook: (updated: Book) => void;
  currentPageIndex: number;
  onPageChange: (idx: number) => void;
  brushType: "none" | "zhu" | "mo" | "eraser";
  brushSize: number;
}

interface TextCharToken {
  type: "main" | "punctuation";
  char: string;
  hasPunctuation?: string; // stores punctuation associated with this main char for traditional句读 modes
}

interface TextLine {
  tokens: TextCharToken[];
  annotations?: {
    index: number; // character index in this line where notes insert
    subrows: [string[], string[]]; // double row annotation texts split in halves
  }[];
}

export const BookViewer: React.FC<BookViewerProps> = ({
  book,
  config,
  allSeals,
  onUpdateBook,
  currentPageIndex,
  onPageChange,
  brushType,
  brushSize
}) => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [draggedSealId, setDraggedSealId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeSealId, setActiveSealId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    const el = document.getElementById("book-leaf-container");
    if (!el) return;

    try {
      setIsExporting(true);
      // Wait keyframe cycles to settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(el, {
        scale: 2.5, // High resolution crisp lines
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      
      const isDualPage = config.showCenterLine;
      const pdfWidth = isDualPage ? 400 : 200;
      const pdfHeight = 300;

      const pdf = new jsPDF({
        orientation: isDualPage ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      const leafName = currentPageIndex === 0 ? "封面" : `第${currentPageIndex}叶`;
      const fileName = `《${book.title}》_${leafName}_${book.author || "佚名"}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Direct PDF export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Constants mapping themes to real colors
  const themeColors = {
    xuan: { bg: "bg-[#FAFAF7]", text: "text-[#2B2A28]", lineZhu: "rgba(166,27,27,0.7)", lineWu: "rgba(42,40,38,0.5)", borderZhu: "border-[#A61818]", borderWu: "border-[#2D2A28]" },
    bamboo: { bg: "bg-[#F3EAD5]", text: "text-[#2A2111]", lineZhu: "rgba(150,40,40,0.75)", lineWu: "rgba(60,50,40,0.55)", borderZhu: "border-[#962828]", borderWu: "border-[#4C4035]" },
    silk: { bg: "bg-[#E2D6B3]", text: "text-[#332211]", lineZhu: "rgba(143,36,36,0.8)", lineWu: "rgba(69,62,51,0.6)", borderZhu: "border-[#8F2424]", borderWu: "border-[#4A4036]" },
    imperial: { bg: "bg-[#F7DF8D]", text: "text-[#18120A]", lineZhu: "rgba(166,27,27,0.85)", lineWu: "rgba(30,28,26,0.65)", borderZhu: "border-[#A61B1B]", borderWu: "border-[#201D1A]" },
    cinnabar: { bg: "bg-[#1C0F0F]", text: "text-[#EBDFCE]", lineZhu: "rgba(224,169,59,0.75)", lineWu: "rgba(90,28,28,0.55)", borderZhu: "border-[#E0A93B]", borderWu: "border-[#5A1C1C]" },
    jade: { bg: "bg-[#E9EFE4]", text: "text-[#112413]", lineZhu: "rgba(158,46,46,0.75)", lineWu: "rgba(53,79,55,0.55)", borderZhu: "border-[#9E2E2E]", borderWu: "border-[#354F37]" }
  };

  const scheme = themeColors[config.theme] || themeColors.xuan;
  const gridLineColor = config.borderType === "zhu" ? scheme.lineZhu : scheme.lineWu;
  const outerBorderColor = config.borderType === "zhu" ? scheme.borderZhu : scheme.borderWu;

  // Font class switcher
  const getFontClass = () => {
    switch (config.fontFamily) {
      case "kangxi":
        return "tracking-normal font-kangxi";
      case "kaiti":
        return "tracking-normal font-kaiti";
      case "fangsong":
        return "tracking-normal font-fangsong";
      case "song":
        return "tracking-normal font-song";
      case "clerical":
        return "tracking-wide font-clerical";
      default:
        return "font-serif";
    }
  };

  // Parsing Algorithm: Parsing Traditional main text mixed with double-row brackets `((注解))`
  const parsedLines = React.useMemo(() => {
    const rawContent = book.content || "";
    let paragraphs = rawContent.split(/\n+/).map(p => p.trim()).filter(Boolean);
    const normalizedTitle = book.title ? book.title.trim() : "";

    const lines: TextLine[] = [];
    let currentLineTokens: TextCharToken[] = [];
    let currentLineNotes: { index: number; subrows: [string[], string[]] }[] = [];

    // Helper to start/push a constructed line safely
    const flushLine = () => {
      if (currentLineTokens.length > 0 || currentLineNotes.length > 0) {
        lines.push({
          tokens: [...currentLineTokens],
          annotations: currentLineNotes.length > 0 ? [...currentLineNotes] : undefined
        });
        currentLineTokens = [];
        currentLineNotes = [];
      }
    };

    paragraphs.forEach((p, pIdx) => {
      // Smart traditional indentation
      let indentSpaces = 1; // Default traditional body text indent: 1 space ("低一格")
      
      const isShort = p.length <= 15;
      const hasPunct = /[，。？！；：、“”‘’《》〕〕•]/.test(p);
      const isAuthorIndicator = /撰|著|作|注|校|氏|译|编|等/.test(p) || p.endsWith("氏");

      // Title detection: short, no punctuation, contains certain genres or matches title/volume indicators
      const isTitle = isShort && !hasPunct && !isAuthorIndicator && (
        p.endsWith("卷") || 
        p.endsWith("章") || 
        p.endsWith("篇") || 
        p.endsWith("记") || 
        p.endsWith("经") || 
        p.endsWith("传") || 
        p.endsWith("录") || 
        p.endsWith("说") || 
        p.endsWith("序") || 
        p.endsWith("集") || 
        p.endsWith("诀") || 
        p.endsWith("句") ||
        p.includes("·") ||
        p === normalizedTitle ||
        (pIdx === 0 && !hasPunct)
      );

      // Author/Lower title block detection: short, contains key authorship identifiers, or immediately follows the title
      const isAuthor = isShort && !hasPunct && (isAuthorIndicator || (pIdx === 1 && !hasPunct));

      if (isTitle) {
        indentSpaces = 0; // "标题要定格" -> No indent space
      } else if (isAuthor) {
        indentSpaces = 4; // lowered by 4 spaces
      } else {
        indentSpaces = 1; // body text starts lowered by 1 space, matching the woodblock style precisely
      }

      for (let s = 0; s < indentSpaces; s++) {
        currentLineTokens.push({ type: "main", char: "　" });
      }

      let i = 0;
      while (i < p.length) {
        // If we encounter dual-bracket notation
        if (p.substring(i, i + 2) === "((") {
          let closingIdx = p.indexOf("))", i + 2);
          if (closingIdx === -1) closingIdx = p.length;

          const notesText = p.substring(i + 2, closingIdx).trim();
          i = closingIdx === p.length ? p.length : closingIdx + 2;

          if (notesText) {
            // Split commentary text into two equal halves for double-row stacking
            const charsArray = notesText.split("");
            const mid = Math.ceil(charsArray.length / 2);
            const row1 = charsArray.slice(0, mid);
            const row2 = charsArray.slice(mid);

            // Cost of double row characters vertically is equivalent to length of longer subrow
            const cellHeightCost = Math.max(row1.length, row2.length);

            // Wrap check: if annotation overflows current column heights, wrap it
            if (currentLineTokens.length + cellHeightCost > config.charsPerLine) {
              // Wrap current line to give the note a proper home
              flushLine();
            }

            currentLineNotes.push({
              index: currentLineTokens.length,
              subrows: [row1, row2]
            });

            // Put a space-occupier in main columns to mark note insertion bounds so mapping knows offsets
            // Each vertical unit height cost is added as special note placeholders
            for (let c = 0; c < cellHeightCost; c++) {
              currentLineTokens.push({ type: "punctuation", char: "ANNOTATION_CELL_OCCUPIER" });
            }
          }
        } else {
          const char = p[i];
          i++;

          // Check if punctuation
          const isPunct = /[，。？！；：、“”‘’《》〔〕〔〕•]/.test(char);

          if (isPunct) {
            if (config.punctuationMode !== "none") {
              // Both traditional and modern are stamped inside margins of preceding main character
              if (currentLineTokens.length > 0) {
                const lastToken = currentLineTokens[currentLineTokens.length - 1];
                if (lastToken.type === "main") {
                  lastToken.hasPunctuation = (lastToken.hasPunctuation || "") + char;
                }
              }
            }
            // in "none", we ignore it
          } else {
            // Normal character
            currentLineTokens.push({ type: "main", char });
          }
        }

        // Fit line segments according to Config capacities
        // Once standard tokens hit charsPerLine height threshold, flush
        if (currentLineTokens.length >= config.charsPerLine) {
          // If we are right at limit, split line
          const overflow = currentLineTokens.slice(config.charsPerLine);
          currentLineTokens = currentLineTokens.slice(0, config.charsPerLine);
          flushLine();
          currentLineTokens = overflow;
        }
      }

      flushLine(); // end of paragraph is an absolute line break
    });

    return lines;
  }, [book.content, config.charsPerLine, config.punctuationMode]);

  // Paginate vertical lines. Each screen/leaf has exact limits: `linesPerPage`
  const pages: TextLine[][] = React.useMemo(() => {
    const list: TextLine[][] = [];
    let currentLeafLines: TextLine[] = [];

    parsedLines.forEach((line) => {
      currentLeafLines.push(line);
      if (currentLeafLines.length >= config.linesPerPage) {
        list.push([...currentLeafLines]);
        currentLeafLines = [];
      }
    });

    if (currentLeafLines.length > 0) {
      list.push([...currentLeafLines]);
    }

    return list.length > 0 ? list : [[]];
  }, [parsedLines, config.linesPerPage]);

  const totalPages = pages.length + 1;

  // Sync parent current index constraints
  useEffect(() => {
    if (currentPageIndex >= totalPages) {
      onPageChange(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPageIndex, onPageChange]);

  // Dragging and Dropping Seal instances on page layouts
  const handleSealDragStart = (e: React.MouseEvent, sealId: string) => {
    e.stopPropagation();
    setDraggedSealId(sealId);
    setActiveSealId(sealId);

    const sealEl = e.currentTarget as HTMLElement;
    const rect = sealEl.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2
    });
  };

  const handlePageMouseMove = (e: React.MouseEvent, pageIdx: number) => {
    if (!draggedSealId) return;

    const pageLeaf = e.currentTarget as HTMLElement;
    const rect = pageLeaf.getBoundingClientRect();

    // Calculate mouse position relative to standard dimensions
    const rawX = e.clientX - rect.left - dragOffset.x;
    const rawY = e.clientY - rect.top - dragOffset.y;

    // Convert into percentage
    const xPct = Math.min(95, Math.max(2, (rawX / rect.width) * 100));
    const yPct = Math.min(95, Math.max(2, (rawY / rect.height) * 100));

    // Update active book seal coordinate
    const updatedSeals = (book.seals || []).map((s) => {
      if (s.id === draggedSealId) {
        return { ...s, pageIndex: pageIdx, xPct, yPct };
      }
      return s;
    });

    onUpdateBook({ ...book, seals: updatedSeals });
  };

  const handleSealDragEnd = () => {
    setDraggedSealId(null);
  };

  const deleteStampedSeal = (sealId: string) => {
    const remaining = (book.seals || []).filter((s) => s.id !== sealId);
    onUpdateBook({ ...book, seals: remaining });
    setActiveSealId(null);
  };

  const scaleStampedSeal = (sealId: string, factor: number) => {
    const updated = (book.seals || []).map((s) => {
      if (s.id === sealId) {
        return { ...s, scale: Math.min(2.0, Math.max(0.4, s.scale + factor)) };
      }
      return s;
    });
    onUpdateBook({ ...book, seals: updated });
  };

  // Drawing handwriting handler
  const savePageSignature = (idx: number, dataUrl: string) => {
    const currentDrawings = book.drawings || {};
    if (dataUrl === "") {
      delete currentDrawings[idx];
    } else {
      currentDrawings[idx] = dataUrl;
    }
    onUpdateBook({ ...book, drawings: { ...currentDrawings } });
  };

  // Traditional Chinese numbers converter for authentic block-print folio numbering
  const toChineseNumerals = (num: number): string => {
    const chns = ["○", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    if (num <= 10) return chns[num];
    if (num < 20) return "十" + (num % 10 !== 0 ? chns[num % 10] : "");
    const tens = Math.floor(num / 10);
    const units = num % 10;
    return chns[tens] + "十" + (units !== 0 ? chns[units] : "");
  };

  const renderColumn = (colIdx: number) => {
    const line = pages[currentPageIndex - 1]?.[colIdx];
    return (
      <div
        key={colIdx}
        className="relative flex flex-col justify-start items-center h-full select-none"
        style={{
          width: `${100 / (config.showCenterLine ? Math.ceil(config.linesPerPage / 2) : config.linesPerPage)}%`,
          minWidth: "20px",
          outline: "none"
        }}
      >
        {/* Vertical partitioning ink lines (朱丝栏 / 乌丝栏) - rendered on left border of each RTL column */}
        {config.showLineGrid && colIdx < config.linesPerPage - 1 && (
          <div
            className="absolute left-0 top-0 bottom-0 w-[1px] select-none pointer-events-none animate-fade-in"
            style={{
              borderLeft: `1px solid ${gridLineColor}`,
              opacity: 0.65
            }}
          />
        )}

        {/* Characters stack column */}
        <div
          className={`flex flex-col items-center w-full leading-none select-none h-full justify-start ${getFontClass()}`}
          style={{
            fontSize: `${config.fontSize}px`,
            letterSpacing: "0.15em"
          }}
        >
          {line &&
            (() => {
              let skippedCells = 0;

              return line.tokens.map((token, charIdx) => {
                // If this cell is occupied by small note block, we skip rendering as main word
                if (token.char === "ANNOTATION_CELL_OCCUPIER") {
                  if (skippedCells > 0) {
                    skippedCells--;
                    return null;
                  }

                  // Active Note retrieval
                  const noteData = line.annotations?.find(
                    (note) => note.index === charIdx
                  );
                  if (noteData) {
                    skippedCells = Math.max(noteData.subrows[0].length, noteData.subrows[1].length) - 1;

                    // Stacking double columns horizontally side-by-side using flex inline
                    return (
                      <div
                        key={`note-${charIdx}`}
                        className="inline-flex flex-row leading-normal mx-0.5 justify-center items-start text-stone-500 z-5 scale-90"
                        style={{
                          fontSize: "0.52em",
                          lineHeight: "1.25",
                          letterSpacing: "0.08em"
                        }}
                      >
                        {/* Subrow 1 */}
                        <div className="flex flex-col items-center">
                          {noteData.subrows[0].map((c, n1) => (
                            <span key={`n1-${n1}`} className="w-auto h-auto leading-none mb-0.5 select-none">{c}</span>
                          ))}
                        </div>
                        {/* Gap spacer */}
                        <div className="w-[1.5px]" />
                        {/* Subrow 2 */}
                        <div className="flex flex-col items-center">
                          {noteData.subrows[1].map((c, n2) => (
                            <span key={`n2-${n2}`} className="w-auto h-auto leading-none mb-0.5 select-none">{c}</span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }

                const isSpace = token.char === "　";

                return (
                  <div
                    key={`char-${charIdx}`}
                    className="relative flex items-center justify-center select-none"
                    style={{
                      height: "1.32em",
                      width: "1.32em",
                      opacity: isSpace ? 0 : 1
                    }}
                  >
                    <span>{token.char}</span>

                    {/* Traditional or Modern Punctuation side marks (句读亦或标点皆悬于字右) */}
                    {token.hasPunctuation && (
                      config.punctuationMode === "traditional" ? (
                        <span
                          className={`absolute select-none pointer-events-none rounded-full flex items-center justify-center ${
                            config.theme === "cinnabar" ? "border-amber-400" : "border-[#A61B1B]"
                          } border`}
                          style={{
                            width: "5px",
                            height: "5px",
                            right: "-4.5px",
                            bottom: "-2px"
                          }}
                        />
                      ) : (
                        <span
                          className="absolute select-none pointer-events-none flex flex-col items-center justify-center font-serif font-bold text-center leading-none"
                          style={{
                            fontSize: "0.55em",
                            color: config.theme === "cinnabar" ? "#fbbf24" : "#A61B1B",
                            right: "-0.45em",
                            top: "0.15em",
                            width: "0.8em"
                          }}
                        >
                          {token.hasPunctuation.split("").map((pChar, uidx) => (
                            <span key={uidx} className="leading-none mb-0.5">{pChar}</span>
                          ))}
                        </span>
                      )
                    )}
                  </div>
                );
              });
            })()}
        </div>
      </div>
    );
  };

  const renderCenterSpine = () => {
    return (
      <div
        className="w-12 mx-3 flex flex-col justify-between items-center py-2 select-none border-l border-r pointer-events-none z-5 relative shrink-0"
        style={{
          borderColor: gridLineColor,
          color: config.borderType === "zhu" ? "rgba(166,27,27,0.75)" : "rgba(42,40,38,0.6)"
        }}
      >
        {/* Spine fishtail top */}
        {config.showFishtail && (
          <div
            className="w-5 h-2.5 bg-current select-none opacity-80 mb-2 shrink-0"
            style={{
              clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)" // visual arrow down (鱼尾状)
            }}
          />
        )}

        {/* Vertical mini writing showing Book details & page count */}
        <div className="flex-1 flex flex-col items-center text-[10px] sm:text-[11px] font-serif leading-4 py-4 self-center select-none tracking-widest h-full justify-center shrink-0 min-h-[300px]">
          <div className="text-[11px] font-serif flex flex-col items-center gap-0.5 opacity-80 w-full shrink-0">
            {currentPageIndex === 0 ? (
              <>
                <span>扉</span>
                <span>页</span>
              </>
            ) : (
              <>
                <span>第</span>
                {toChineseNumerals(currentPageIndex).split("").map((c, i) => (
                  <span key={`spine-p-${i}`} className="font-serif font-bold">{c}</span>
                ))}
                <span>叶</span>
              </>
            )}
          </div>
        </div>

        {/* Spine fishmouth bottom */}
        {config.showFishtail && (
          <div
            className="w-5 h-2.5 bg-current select-none opacity-80 mt-2 shrink-0"
            style={{
              clipPath: "polygon(0% 100%, 100% 100%, 50% 0%)" // visual arrow up
            }}
          />
        )}
      </div>
    );
  };

  const renderCoverPageContents = () => {
    const linesCount = config.linesPerPage;
    const isDual = config.showCenterLine;

    // Right page of cover (Front Cover 封面)
    const renderFrontCover = () => {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full relative font-serif px-4">
          
          {/* Traditional vermilion decorative rectangular title border (书笺框 / 题签) */}
          <div 
            className="w-20 sm:w-24 border-2 border-double rounded flex flex-col items-center justify-center p-3 py-6 shrink-0 relative bg-[#8b4513]/5 animate-fade-in"
            style={{ 
              borderColor: config.borderType === "zhu" ? scheme.lineZhu : "rgba(42,40,38,0.75)",
              borderWidth: "3px",
              boxShadow: "0 0 10px rgba(0,0,0,0.03)"
            }}
          >
            {/* Title Text (Vertical) */}
            <h1 
              className={`leading-none font-bold text-center select-none ${getFontClass()}`}
              style={{
                fontSize: "1.8em",
                writingMode: "vertical-rl",
                textOrientation: "upright",
                letterSpacing: "0.2em",
                lineHeight: "1.1"
              }}
            >
              {book.title || "古籍古卷"}
            </h1>
          </div>

          {/* Author or edition in lower-left vertical text */}
          <div 
            className="absolute left-4 sm:left-6 bottom-1/4 flex flex-col items-center leading-none text-stone-600 select-none scale-95"
            style={{ 
              writingMode: "vertical-rl", 
              textOrientation: "upright",
              fontSize: "12px",
              letterSpacing: "0.25em"
            }}
          >
            {book.author ? `${book.author} 撰` : "佚名 重辑"}
          </div>
        </div>
      );
    };

    // Left page of cover (Inside flap / Summary 提要)
    const renderPrefaceFlap = () => {
      // Split description text into vertical columns.
      const rawDesc = book.description || "卷中诗词文赋，皆平生心血。句读虽简，奥义存焉。或有不敏之处，尚企同好指疵。朱墨错迕，藏诸名山，传之其人。";
      const charLimit = Math.max(10, Math.min(15, config.charsPerLine - 2)); // vertical spaces
      
      // Let's split into lines
      const descLines: string[] = [];
      let currentStr = "";
      for (let i = 0; i < rawDesc.length; i++) {
        const char = rawDesc[i];
        if (char === "\n") {
          if (currentStr) {
            descLines.push(currentStr);
            currentStr = "";
          }
          continue;
        }
        currentStr += char;
        if (currentStr.length >= charLimit) {
          descLines.push(currentStr);
          currentStr = "";
        }
      }
      if (currentStr) {
        descLines.push(currentStr);
      }

      // We fit up to max columns. Suppose we show up to 5 columns.
      const maxColumns = Math.max(3, Math.min(5, Math.ceil(linesCount / 2) - 1));
      const colsToRender = descLines.slice(0, maxColumns - 1);
      
      return (
        <div className="flex-1 flex flex-row items-stretch justify-around h-full font-serif px-2 sm:px-4">
          
          {/* Preface Header Column at the rightmost */}
          <div 
            className="relative flex flex-col justify-start items-center h-full select-none"
            style={{ width: `${100 / maxColumns}%` }}
          >
            {config.showLineGrid && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-[1px]" 
                style={{ borderLeft: `1px solid ${gridLineColor}`, opacity: 0.5 }}
              />
            )}
            <div 
              className={`flex flex-col items-center w-full leading-none text-[#8b4513] font-bold ${getFontClass()}`}
              style={{ fontSize: `${config.fontSize * 0.9}px`, letterSpacing: "0.2em", writingMode: "vertical-rl", textOrientation: "upright" }}
            >
              其书提要
            </div>
          </div>

          {/* Description columns wrapping vertically */}
          {Array.from({ length: maxColumns - 1 }).map((_, colIdx) => {
            const colText = colsToRender[colIdx] || "";
            return (
              <div 
                key={`preface-col-${colIdx}`}
                className="relative flex flex-col justify-start items-center h-full select-none"
                style={{ width: `${100 / maxColumns}%` }}
              >
                {config.showLineGrid && colIdx < maxColumns - 2 && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-[1px]" 
                    style={{ borderLeft: `1px solid ${gridLineColor}`, opacity: 0.5 }}
                  />
                )}
                
                <div 
                  className={`flex flex-col items-center w-full leading-relaxed text-stone-500 ${getFontClass()}`}
                  style={{ 
                    fontSize: `${config.fontSize * 0.75}px`, 
                    letterSpacing: "0.15em",
                    writingMode: "vertical-rl",
                    textOrientation: "upright"
                  }}
                >
                  {colText.split("").map((c, i) => (
                    <span key={i} className="mb-0.5 leading-normal">{c}</span>
                  ))}
                </div>
              </div>
            );
          })}

        </div>
      );
    };

    if (isDual) {
      return (
        <div className="flex-1 w-full flex flex-row items-stretch h-full relative z-10 select-none">
          {/* Right Page: Cover main label (Front page on right under RTL) */}
          <div 
            className="flex-1 flex flex-col h-full justify-center"
            style={{ width: `calc(50% - 24px)` }}
          >
            {renderFrontCover()}
          </div>

          {/* Center Column border spine */}
          {renderCenterSpine()}

          {/* Left Page: Preface Flap */}
          <div 
            className="flex-1 flex flex-col h-full justify-center"
            style={{ width: `calc(50% - 24px)` }}
          >
            {renderPrefaceFlap()}
          </div>
        </div>
      );
    } else {
      // Single cover page
      return (
        <div className="flex-1 w-full flex flex-row items-stretch h-full relative z-10 select-none">
          {renderFrontCover()}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col items-center w-full select-none" id="book-viewer">
      {/* Horizontal leaf scroller simulating Accordion binding (RTL - Right to Left reading orientation) */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-[#dcd7c9]/40 pb-3">
        <div className="flex flex-wrap items-center gap-3 font-serif">
          <div className="text-xs text-[#7c6a5a] flex items-center flex-wrap gap-2">
            <span>页规：半页 {config.linesPerPage} 行，每行 {config.charsPerLine} 字。 </span>
            <span className="text-[#8b4513] font-mono font-bold select-none mr-2">目前分划 {totalPages} 叶 (合册)</span>
            <span className="bg-amber-100/90 text-amber-950 px-1.5 py-0.5 rounded text-[10px] border border-amber-200/60 font-bold font-serif whitespace-nowrap">
              纸张规格：单页 20 × 30 厘米 (折扇合编)
            </span>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 p-1 px-3 bg-[#8b4513]/15 hover:bg-[#8b4513] text-[#8b4513] hover:text-white rounded text-xs transition-all border border-[#8b4513]/30 hover:border-transparent font-bold cursor-pointer font-serif select-none focus:outline-none"
            title="将当前这页经美化排版、盖红印和毛笔批注的宋体纸页，直接保存成高画质 PDF 文件"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? "正在存制中..." : "直接导出 PDF"}
          </button>
        </div>

        {/* Traditional navigation buttons */}
        <div className="flex items-center space-x-2 font-serif">
          {/* Ancient book reading goes Right to Left: meaning clicking Left Arrow advances to Page index + 1 (leftward), clicking Right Arrow retreats page index - 1 (rightward) */}
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === totalPages - 1}
            className={`p-1.5 px-3 rounded border text-xs flex items-center gap-1 transition-all cursor-pointer ${
              currentPageIndex === totalPages - 1
                ? "border-[#dcd7c9] text-[#7c6a5a]/50 bg-[#f4f1ea]/50"
                : "border-[#dcd7c9] text-[#3d2b1f] hover:border-[#8b4513] hover:text-[#8b4513] bg-[#fcfaf2]/60"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            前叶 (左翻)
          </button>
          
          <span className="text-xs font-serif text-[#7c6a5a] px-3 py-1 bg-[#fcfaf2]/80 rounded border border-[#dcd7c9]">
            {currentPageIndex === 0 ? (
              <span className="text-[#8b4513] font-bold">书首 · 封面</span>
            ) : (
              <>
                正文第 <span className="font-mono text-[#8b4513] font-bold">{currentPageIndex}</span> / {totalPages - 1} 叶
              </>
            )}
          </span>

          <button
            onClick={() => onPageChange(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
            className={`p-1.5 px-3 rounded border text-xs flex items-center gap-1 transition-all cursor-pointer ${
              currentPageIndex === 0
                ? "border-[#dcd7c9] text-[#7c6a5a]/50 bg-[#f4f1ea]/50"
                : "border-[#dcd7c9] text-[#3d2b1f] hover:border-[#8b4513] hover:text-[#8b4513] bg-[#fcfaf2]/60"
            }`}
          >
            后叶 (右归)
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Book simulation viewport */}
      <div
        ref={viewerRef}
        className="w-full flex items-center justify-center p-3 sm:p-6 overflow-x-auto select-none"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="flex items-stretch gap-6 relative p-2">
          
          {/* Active page rendering */}
          {(currentPageIndex === 0 || pages[currentPageIndex - 1]) && (
            <div
              id="book-leaf-container"
              onMouseMove={(e) => handlePageMouseMove(e, currentPageIndex)}
              onMouseUp={handleSealDragEnd}
              onMouseLeave={handleSealDragEnd}
              className={`relative ${scheme.bg} ${scheme.text} rounded-lg shadow-xl flex select-none transition-all duration-300 px-10 sm:px-12 overflow-hidden w-full max-w-full md:max-w-none self-center shrink-0 ${
                config.showCenterLine
                  ? "aspect-[40/30] md:w-[800px] md:h-[600px]"
                  : "aspect-[20/30] md:w-[400px] md:h-[600px]"
              } ${
                config.borderStyle === "none"
                  ? "border-0 shadow-lg"
                  : config.borderStyle === "single"
                    ? `border-[3px] ${outerBorderColor}`
                    : `border-[6px] ${outerBorderColor}`
              }`}
              style={{
                direction: "rtl", // RTL container orientation so columns print right-to-left
                paddingTop: config.showCenterLine ? "12.5%" : "25%",
                paddingBottom: config.showCenterLine ? "7.5%" : "15%"
              }}
            >
              {/* High-fidelity Traditional Inner Frame (四周双边内细线) */}
              {config.borderStyle === "double" && (
                <div 
                  className="absolute pointer-events-none select-none z-0" 
                  style={{
                    top: '5px',
                    bottom: '5px',
                    left: '5px',
                    right: '5px',
                    border: `1px solid ${gridLineColor}`,
                    opacity: 0.75
                  }}
                />
              )}

              {/* Cover Contents or Normal Contents rendering conditional */}
              {currentPageIndex === 0 ? (
                renderCoverPageContents()
              ) : (
                (() => {
                  const linesCount = config.linesPerPage;
                  const rightCount = config.showCenterLine ? Math.ceil(linesCount / 2) : linesCount;
                  const leftCount = config.showCenterLine ? (linesCount - rightCount) : 0;

                  return (
                    <div className="flex-1 w-full flex flex-row items-stretch h-full relative z-10 animate-fade-in">
                      
                      {/* Right Page (First half of RTL lines) */}
                      <div 
                        className="flex-1 flex flex-row items-stretch justify-around h-full"
                        style={{ width: config.showCenterLine ? `calc(50% - 24px)` : '100%' }}
                      >
                        {Array.from({ length: rightCount }).map((_, rIdx) => renderColumn(rIdx))}
                      </div>

                      {/* Centered Folding Spine Column (版心) */}
                      {config.showCenterLine && renderCenterSpine()}

                      {/* Left Page (Second half of RTL lines) */}
                      {config.showCenterLine && leftCount > 0 && (
                        <div 
                          className="flex-1 flex flex-row items-stretch justify-around h-full"
                          style={{ width: `calc(50% - 24px)` }}
                        >
                          {Array.from({ length: leftCount }).map((_, lIdx) => renderColumn(rightCount + lIdx))}
                        </div>
                      )}

                    </div>
                  );
                })()
              )}



              {/* Overlay: Interactive stamp seals dragging canvas */}
              {(book.seals || [])
                .filter((bs) => bs.pageIndex === currentPageIndex)
                .map((bs) => {
                  const sealTemplate = allSeals.find((s) => s.id === bs.sealId);
                  if (!sealTemplate) return null;

                  const isFocused = activeSealId === bs.id;
                  const finalScale = bs.scale || 1.0;

                  return (
                    <div
                      key={bs.id}
                      onMouseDown={(e) => handleSealDragStart(e, bs.id)}
                      className={`absolute select-all select-none origin-center cursor-move transition-shadow z-20 group`}
                      style={{
                        left: `${bs.xPct}%`,
                        top: `${bs.yPct}%`,
                        transform: `translate(-50%, -50%) scale(${finalScale})`,
                        outline: isFocused ? "2px dashed #8b4513" : "none"
                      }}
                    >
                      <img
                        src={sealTemplate.dataUrl || generateSealDataUrl(sealTemplate)}
                        alt={sealTemplate.text}
                        className="w-16 h-16 object-contain pointer-events-none drop-shadow-md select-none"
                        referrerPolicy="no-referrer"
                      />

                      {/* Mini float seal adjust controls */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-[#f4f1ea] border border-[#dcd7c9] rounded p-1 shadow-md opacity-0 group-hover:opacity-100 transition pointer-events-auto select-none z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            scaleStampedSeal(bs.id, -0.15);
                          }}
                          className="p-0.5 hover:bg-[#e8e4d9] rounded text-[#8b4513] pointer-events-auto cursor-pointer"
                          title="缩章"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            scaleStampedSeal(bs.id, 0.15);
                          }}
                          className="p-0.5 hover:bg-[#e8e4d9] rounded text-[#8b4513] pointer-events-auto cursor-pointer"
                          title="扩章"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStampedSeal(bs.id);
                          }}
                          className="p-0.5 hover:bg-red-50 rounded text-[#A61B1B] pointer-events-auto cursor-pointer"
                          title="起章 (移去盖印)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Hand painted overlays */}
              <BrushCanvas
                pageIndex={currentPageIndex}
                width={config.showCenterLine ? 800 : 400} // internal canvas coordinate grid matches physical aspect ratio
                height={600}
                brushType={brushType}
                brushSize={brushSize}
                savedDrawing={book.drawings ? book.drawings[currentPageIndex] : undefined}
                onSaveDrawing={(idx, dataUrl) => savePageSignature(idx, dataUrl)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
