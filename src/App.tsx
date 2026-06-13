import React, { useState, useEffect } from "react";
import { Book, LayoutConfig, Seal } from "./types";
import { Bookshelf, defaultClassics } from "./components/Bookshelf";
import { StylePanel } from "./components/StylePanel";
import { SealStudio, defaultSeals } from "./components/SealStudio";
import { BookViewer } from "./components/BookViewer";
import { TextEditor } from "./components/TextEditor";
import { getFontFromDB, registerFontFace } from "./utils/fontLoader";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  BookOpen,
  Sliders,
  Hammer,
  FilePenLine,
  Music,
  Printer,
  ChevronRight,
  Download,
  Notebook,
  Paintbrush,
  X,
  ExternalLink,
  AlertCircle
} from "lucide-react";

// Web Audio Pentatonic Guzheng synthesizer for sensory traditional immersion
function playGuzhengPluck(pitch: number = 0) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Traditional Chinese pentatonic scale frequencies ( Gong 宫, Shang 商, Jue 角, Zhi 徵, Yu 羽 )
    // C4, D4, E4/F4, G4, A4, C5, D5, E5, G5, A5
    const pentatonicFrequencies = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    const freq = pentatonicFrequencies[Math.abs(pitch) % pentatonicFrequencies.length];

    // Primary oscillating note (wood lute warm decay)
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.type = "triangle"; // triangle wave mimics soft organic wood plucks
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // High frequency nail-scratch touch transient (琴尖触感)
    const touchOsc = ctx.createOscillator();
    const touchGain = ctx.createGain();
    touchOsc.connect(touchGain);
    touchGain.connect(ctx.destination);
    
    touchOsc.type = "sine";
    touchOsc.frequency.setValueAtTime(freq * 3, ctx.currentTime);

    // Decaying envelopes
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    touchGain.gain.setValueAtTime(0.12, ctx.currentTime);
    touchGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    // Play string
    osc.start();
    touchOsc.start();
    osc.stop(ctx.currentTime + 1.3);
    touchOsc.stop(ctx.currentTime + 0.1);
  } catch (err) {
    // browser autoplay security gates may occasionally block, fail silent silently
  }
}

const defaultLayoutConfig: LayoutConfig = {
  fontFamily: "kaiti",
  fontSize: 20,
  linesPerPage: 10,
  charsPerLine: 20,
  lineSpacing: 24,
  theme: "xuan",
  borderStyle: "double",
  borderType: "zhu",
  showCenterLine: true,
  showFishtail: true,
  punctuationMode: "traditional",
  showLineGrid: true
};

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string>("");
  const [seals, setSeals] = useState<Seal[]>([]);
  const [config, setConfig] = useState<LayoutConfig>(defaultLayoutConfig);
  const [activeTab, setActiveTab] = useState<"shelf" | "style" | "seal" | "scribe">("spine");

  // Audio mute gate
  const [guzhengAudioEnabled, setGuzhengAudioEnabled] = useState(false);

  // active leaf tracking index within current book structure
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Custom uploaded Kangxi font name
  const [customFontName, setCustomFontName] = useState<string>("");

  // Ink handwriting states
  const [brushType, setBrushType] = useState<"none" | "zhu" | "mo" | "eraser">("none");
  const [brushSize, setBrushSize] = useState<number>(4);

  // Print Dialog guide banner modal helper
  const [showPrintModal, setShowPrintModal] = useState(false);

  // 1. Core State Initializations
  useEffect(() => {
    // Books initial load
    const storedBooks = localStorage.getItem("ancient_bookshelf");
    if (storedBooks) {
      const parsed = JSON.parse(storedBooks);
      setBooks(parsed);
      if (parsed.length > 0) setActiveBookId(parsed[0].id);
    } else {
      setBooks(defaultClassics);
      setActiveBookId(defaultClassics[0].id);
      localStorage.setItem("ancient_bookshelf", JSON.stringify(defaultClassics));
    }

    // Seals initial load
    const storedSeals = localStorage.getItem("ancient_seals");
    if (storedSeals) {
      setSeals(JSON.parse(storedSeals));
    } else {
      setSeals(defaultSeals);
      localStorage.setItem("ancient_seals", JSON.stringify(defaultSeals));
    }

    // Config initial load
    const storedConfig = localStorage.getItem("ancient_layout_config");
    if (storedConfig) {
      setConfig(JSON.parse(storedConfig));
    }

    // Dynamic IndexedDB user uploaded font load
    getFontFromDB().then((saved) => {
      if (saved) {
        registerFontFace(saved.buffer)
          .then(() => {
            setCustomFontName(saved.name);
          })
          .catch((err) => {
            console.error("Startup custom font registration failed:", err);
          });
      }
    });
  }, []);

  const activeBook = books.find((b) => b.id === activeBookId) || books[0];

  const getActiveBookPageCount = React.useCallback((text: string) => {
    if (!activeBook) return { totalPages: 1, cursorPage: 1 };
    const rawContent = text || "";
    let paragraphs = rawContent.split(/\n+/).map(p => p.trim()).filter(Boolean);
    const normalizedTitle = activeBook.title ? activeBook.title.trim() : "";

    const lines: any[] = [];
    let currentLineTokens: any[] = [];

    const flushLine = () => {
      if (currentLineTokens.length > 0) {
        lines.push(currentLineTokens);
        currentLineTokens = [];
      }
    };

    paragraphs.forEach((p, pIdx) => {
      if (p === "===换页===" || p === "===換頁===") {
        lines.push({ isPageBreak: true });
        return;
      }
      if (p === "===空列===" || p === "===空行===") {
        lines.push({ isEmptyColumn: true });
        return;
      }
      let forceZeroIndent = false;
      if (p.startsWith("【顶格】") || p.startsWith("【定格】") || p.startsWith("【頂格】")) {
        forceZeroIndent = true;
        p = p.substring(4);
      }

      let indentSpaces = 1;
      const isShort = p.length <= 15;
      const hasPunct = /[，。？！；：、“”‘’《》〔〕〔〕•]/.test(p);
      const isAuthorIndicator = /撰|著|作|注|校|氏|译|编|等/.test(p) || p.endsWith("氏");

      const isTitle = isShort && !hasPunct && !isAuthorIndicator && (
        p.endsWith("卷") || p.endsWith("章") || p.endsWith("篇") || 
        p.endsWith("记") || p.endsWith("经") || p.endsWith("传") || 
        p.endsWith("录") || p.endsWith("说") || p.endsWith("序") || 
        p.endsWith("集") || p.endsWith("诀") || p.endsWith("句") ||
        p.includes("·") || p === normalizedTitle || (pIdx === 0 && !hasPunct)
      );

      const isAuthor = isShort && !hasPunct && (isAuthorIndicator || (pIdx === 1 && !hasPunct));

      if (forceZeroIndent) {
        indentSpaces = 0;
      } else if (isTitle) {
        indentSpaces = 0;
      } else if (isAuthor) {
        indentSpaces = 4;
      } else {
        indentSpaces = 1;
      }

      for (let s = 0; s < indentSpaces; s++) {
        currentLineTokens.push("space");
      }

      let i = 0;
      while (i < p.length) {
        if (p.substring(i, i + 2) === "((") {
          let closingIdx = p.indexOf("))", i + 2);
          if (closingIdx === -1) closingIdx = p.length;
          const notesText = p.substring(i + 2, closingIdx).trim();
          i = closingIdx === p.length ? p.length : closingIdx + 2;

          if (notesText) {
            const charsArray = notesText.split("");
            const mid = Math.ceil(charsArray.length / 2);
            const row1 = charsArray.slice(0, mid);
            const row2 = charsArray.slice(mid);
            const cellHeightCost = Math.max(row1.length, row2.length);

            if (currentLineTokens.length + cellHeightCost > config.charsPerLine) {
              flushLine();
            }
            for (let c = 0; c < cellHeightCost; c++) {
              currentLineTokens.push("note");
            }
          }
        } else {
          const char = p[i];
          i++;
          const isPunct = /[，。？！；：、“”‘’《》〔〕〔〕•]/.test(char);
          if (!isPunct) {
            currentLineTokens.push("char");
          }
        }

        if (currentLineTokens.length >= config.charsPerLine) {
          const overflow = currentLineTokens.slice(config.charsPerLine);
          currentLineTokens = currentLineTokens.slice(0, config.charsPerLine);
          flushLine();
          currentLineTokens = overflow;
        }
      }
      flushLine();
    });

    let currentLeafLines = 0;
    let pageCount = 0;
    lines.forEach(line => {
      if (line.isPageBreak) {
        if (currentLeafLines > 0) {
          pageCount++;
          currentLeafLines = 0;
        }
        return;
      }
      currentLeafLines++;
      if (currentLeafLines >= config.linesPerPage) {
        pageCount++;
        currentLeafLines = 0;
      }
    });

    if (currentLeafLines > 0) {
      pageCount++;
    }

    return { totalPages: (pageCount > 0 ? pageCount : 1) + 1, cursorPage: (pageCount > 0 ? pageCount : 1) };
  }, [activeBook, config.charsPerLine, config.linesPerPage]);

  const activeBookTotalPages = React.useMemo(() => {
    if (!activeBook) return 1;
    return getActiveBookPageCount(activeBook.content || "").totalPages;
  }, [activeBook, getActiveBookPageCount]);

  const handleCursorPageJump = (cursorIndex: number) => {
    if (!activeBook) return;
    const textUpToCursor = (activeBook.content || "").substring(0, cursorIndex);
    const cursorPageResult = getActiveBookPageCount(textUpToCursor);
    const targetPage = cursorPageResult.cursorPage; // 0 is cover, content starts at 1, so the `cursorPage` correctly maps to the content page index!
    if (targetPage !== currentPageIndex && targetPage < activeBookTotalPages) {
      setCurrentPageIndex(targetPage);
    }
  };

  // Helper sound plucks
  const triggerPluck = (pitchOffset: number = 0) => {
    if (guzhengAudioEnabled) {
      playGuzhengPluck(pitchOffset);
    }
  };

  // State sync and updates
  const updateBooksAndPersist = (newBooks: Book[]) => {
    setBooks(newBooks);
    localStorage.setItem("ancient_bookshelf", JSON.stringify(newBooks));
  };

  const handleUpdateActiveBook = (updatedBook: Book) => {
    const list = books.map((b) => (b.id === updatedBook.id ? updatedBook : b));
    updateBooksAndPersist(list);
  };

  const handleSelectBook = (bookId: string) => {
    setActiveBookId(bookId);
    setCurrentPageIndex(0);
    setBrushType("none"); // Reset painting state for safety when changing manus
    triggerPluck(2);
  };

  const handleDeleteBook = (bookId: string) => {
    const list = books.filter((b) => b.id !== bookId);
    updateBooksAndPersist(list);
    if (activeBookId === bookId && list.length > 0) {
      setActiveBookId(list[0].id);
    }
    triggerPluck(4);
  };

  const handleResetDefaultClassics = () => {
    updateBooksAndPersist(defaultClassics);
    setActiveBookId(defaultClassics[0].id);
    setCurrentPageIndex(0);
    setBrushType("none");
    triggerPluck(1);
  };

  const handleCreateNewBookFile = () => {
    const newBook: Book = {
      id: "book-" + Date.now(),
      title: "自撰卷轴册页",
      author: "少陵居士",
      content: "请在此处编辑、录入您的诗篇绝句或经典散文。利用右侧 [Scribe · 修缮与 AI 研读] 面板中的 AI 智能句读、文言互译工具轻松完成出版活化效果。还可以镌刻个人红印盖在上面，或者提笔书写您的读书朱批墨宝评论。",
      description: "一册澄心创作的手稿竹帛叶，收录在昭明藏书阁中。",
      createdAt: Date.now(),
      seals: []
    };
    const expanded = [newBook, ...books];
    updateBooksAndPersist(expanded);
    setActiveBookId(newBook.id);
    setCurrentPageIndex(0);
    setBrushType("none");
    triggerPluck(5);
  };

  // Seal storage management
  const handleAddCustomSeal = (newSeal: Seal) => {
    const expanded = [newSeal, ...seals];
    setSeals(expanded);
    localStorage.setItem("ancient_seals", JSON.stringify(expanded));
    triggerPluck(8);
  };

  const handleDeleteCustomSeal = (sealId: string) => {
    const list = seals.filter((s) => s.id !== sealId);
    setSeals(list);
    localStorage.setItem("ancient_seals", JSON.stringify(list));
    triggerPluck(9);
  };

  // Stamp current active page sheet
  const handleStampActivePage = (sealId: string) => {
    if (!activeBook) return;
    const currentSealsOnBook = activeBook.seals || [];
    const newStampedSeal = {
      id: "stamped-seal-" + Date.now(),
      sealId,
      pageIndex: currentPageIndex,
      xPct: 78,
      yPct: 24,
      scale: 0.95
    };
    handleUpdateActiveBook({
      ...activeBook,
      seals: [...currentSealsOnBook, newStampedSeal]
    });
    triggerPluck(6);
  };

  // Settings sync
  const handleUpdateConfig = (newConfig: Partial<LayoutConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem("ancient_layout_config", JSON.stringify(updated));
    triggerPluck(3);
  };

  const handleResetConfigToTraditional = () => {
    setConfig(defaultLayoutConfig);
    localStorage.setItem("ancient_layout_config", JSON.stringify(defaultLayoutConfig));
    triggerPluck(1);
  };

  // Page index flips
  const handlePageChange = (idx: number) => {
    setCurrentPageIndex(idx);
    triggerPluck(Math.abs(idx - currentPageIndex) + 2);
  };

  // Browser Print trigger helper
  const handlePrintDocument = () => {
    triggerPluck(10);
    setShowPrintModal(true);
    try {
      window.print();
    } catch (err) {
      console.warn("Iframe blocked window.print():", err);
    }
  };

  // Safe oklch/oklab conversion to rgb/rgba using 1x1 canvas context
  const getStyleProxyApp = (style: CSSStyleDeclaration): CSSStyleDeclaration => {
    // 1x1 canvas cached local reference
    let appCanvas = document.getElementById("temp-app-color-canvas") as HTMLCanvasElement;
    if (!appCanvas) {
      appCanvas = document.createElement("canvas");
      appCanvas.id = "temp-app-color-canvas";
      appCanvas.width = 1;
      appCanvas.height = 1;
      appCanvas.style.display = "none";
      document.body.appendChild(appCanvas);
    }
    const appCtx = appCanvas.getContext("2d", { willReadFrequently: true });

    const parseColorToRgb = (colorStr: string): string => {
      if (!colorStr) return "rgba(0,0,0,0)";
      if (colorStr.startsWith("rgb") || colorStr.startsWith("#")) {
        return colorStr;
      }
      try {
        if (appCtx) {
          appCtx.clearRect(0, 0, 1, 1);
          appCtx.fillStyle = colorStr;
          appCtx.fillRect(0, 0, 1, 1);
          const imgData = appCtx.getImageData(0, 0, 1, 1).data;
          const r = imgData[0];
          const g = imgData[1];
          const b = imgData[2];
          const a = (imgData[3] / 255).toFixed(3);
          return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
      } catch (e) {
        console.warn("App color conversion failed for color:", colorStr, e);
      }
      return "rgba(0,0,0,0)";
    };

    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const val = target.getPropertyValue(propertyName);
            if (val && (val.includes("oklch") || val.includes("oklab"))) {
              return parseColorToRgb(val);
            }
            return val;
          };
        }
        const val = (target as any)[prop];
        if (typeof val === "function") {
          return (val as Function).bind(target);
        }
        if (typeof val === "string" && (val.includes("oklch") || val.includes("oklab"))) {
          return parseColorToRgb(val);
        }
        return val;
      }
    });
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportRange, setExportRange] = useState<"current" | "entire">("entire");
  const [exportStatusPDF, setExportStatusPDF] = useState("");

  const handleDirectExportPDF = async () => {
    const originalGetComputedStyle = window.getComputedStyle;

    try {
      setIsExportingPDF(true);
      triggerPluck(8);
      setExportStatusPDF("正在校正古册排版...");

      // Wait a little bit for rendering
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Temporarily override computed styles to intercept oklch/oklab values to sRGB equivalent
      window.getComputedStyle = function (element: Element, pseudoElt?: string | null) {
        const style = originalGetComputedStyle.call(window, element, pseudoElt || null);
        return getStyleProxyApp(style);
      };

      const isDualPage = config.showCenterLine;
      const pdfWidth = isDualPage ? 400 : 200;
      const pdfHeight = 300;
      const orientation = isDualPage ? "landscape" : "portrait";

      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });

      if (exportRange === "current") {
        setExportStatusPDF(`正在印制第 ${currentPageIndex === 0 ? "封面" : currentPageIndex} 叶...`);
        const el = document.getElementById("book-leaf-container");
        if (!el) {
          alert("无法获取书页容器！");
          return;
        }

        const canvas = await html2canvas(el, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          onclone: (clonedDoc) => {
            const clonedEl = clonedDoc.getElementById(el.id);
            if (!clonedEl) return;
            // Copy canvas pixel data to cloned document
            const originalCanvases = el.querySelectorAll("canvas");
            const clonedCanvases = clonedEl.querySelectorAll("canvas");
            originalCanvases.forEach((origCanvas, idx) => {
              const clonedCanvas = clonedCanvases[idx];
              if (clonedCanvas) {
                try {
                  const img = clonedDoc.createElement("img");
                  img.src = (origCanvas as HTMLCanvasElement).toDataURL("image/png");
                  img.className = clonedCanvas.className;
                  img.style.cssText = clonedCanvas.style.cssText;
                  img.style.position = "absolute";
                  img.style.left = "0";
                  img.style.top = "0";
                  img.style.width = "100%";
                  img.style.height = "100%";
                  img.style.zIndex = "10";
                  clonedCanvas.parentNode?.replaceChild(img, clonedCanvas);
                } catch (e) {
                  console.error("Failed to copy canvas to clone in App current page export:", e);
                }
              }
            });

            const styleTags = clonedDoc.querySelectorAll("style");
            styleTags.forEach((styleTag) => {
              if (styleTag.textContent) {
                styleTag.textContent = styleTag.textContent
                  .replace(/oklch\([^)]+\)/g, "rgba(0,0,0,0)")
                  .replace(/oklab\([^)]+\)/g, "rgba(0,0,0,0)");
              }
            });
            const clonedWindow = clonedDoc.defaultView;
            if (clonedWindow) {
              const originalClonedGetComputedStyle = clonedWindow.getComputedStyle;
              clonedWindow.getComputedStyle = function (element: Element, pseudoElt?: string | null) {
                const style = originalClonedGetComputedStyle.call(clonedWindow, element, pseudoElt || null);
                return getStyleProxyApp(style);
              };
            }
          },
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
        const leafName = currentPageIndex === 0 ? "封面" : `第${currentPageIndex}叶`;
        const fileName = `《${activeBook?.title || "寒山古卷"}》_${leafName}_${activeBook?.author || "佚名"}.pdf`;
        pdf.save(fileName);
        setShowPrintModal(false);
      } else {
        // Entire book sequential export query by offscreen containers
        for (let i = 0; i < activeBookTotalPages; i++) {
          const leafLabel = i === 0 ? "书首·封面" : `第 ${i} 叶`;
          setExportStatusPDF(`正在印制${leafLabel} (共 ${activeBookTotalPages} 页)...`);
          
          await new Promise((resolve) => setTimeout(resolve, 80)); // let threads breathe

          const el = document.getElementById(`book-leaf-container-export-page-${i}`);
          if (!el) {
            console.warn(`Export page elements for index ${i} not found!`);
            continue;
          }

          const canvas = await html2canvas(el, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            onclone: (clonedDoc) => {
              const clonedEl = clonedDoc.getElementById(el.id);
              if (!clonedEl) return;
              // Copy canvas pixel data to cloned document
              const originalCanvases = el.querySelectorAll("canvas");
              const clonedCanvases = clonedEl.querySelectorAll("canvas");
              originalCanvases.forEach((origCanvas, idx) => {
                const clonedCanvas = clonedCanvases[idx];
                if (clonedCanvas) {
                  try {
                    const img = clonedDoc.createElement("img");
                    img.src = (origCanvas as HTMLCanvasElement).toDataURL("image/png");
                    img.className = clonedCanvas.className;
                    img.style.cssText = clonedCanvas.style.cssText;
                    img.style.position = "absolute";
                    img.style.left = "0";
                    img.style.top = "0";
                    img.style.width = "100%";
                    img.style.height = "100%";
                    img.style.zIndex = "10";
                    clonedCanvas.parentNode?.replaceChild(img, clonedCanvas);
                  } catch (e) {
                    console.error("Failed to copy canvas to clone in App book export:", e);
                  }
                }
              });

              const styleTags = clonedDoc.querySelectorAll("style");
              styleTags.forEach((styleTag) => {
                if (styleTag.textContent) {
                  styleTag.textContent = styleTag.textContent
                    .replace(/oklch\([^)]+\)/g, "rgba(0,0,0,0)")
                    .replace(/oklab\([^)]+\)/g, "rgba(0,0,0,0)");
                }
              });
              const clonedWindow = clonedDoc.defaultView;
              if (clonedWindow) {
                const originalClonedGetComputedStyle = clonedWindow.getComputedStyle;
                clonedWindow.getComputedStyle = function (element: Element, pseudoElt?: string | null) {
                  const style = originalClonedGetComputedStyle.call(clonedWindow, element, pseudoElt || null);
                  return getStyleProxyApp(style);
                };
              }
            },
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          if (i > 0) {
            pdf.addPage([pdfWidth, pdfHeight], orientation);
          }
          pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
        }

        const fileName = `《${activeBook?.title || "寒山古卷"}》_全书合卷_${activeBook?.author || "佚名"}.pdf`;
        pdf.save(fileName);
        setShowPrintModal(false);
      }
    } catch (error) {
      console.error("Direct PDF export failed:", error);
      alert("极速印制 PDF 失败，已为您退回编辑台！");
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
      setIsExportingPDF(false);
      setExportStatusPDF("");
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#f9f7f2] text-[#3d2b1f] font-sans flex flex-col selection:bg-[#e8e4d9] selection:text-[#3d2b1f]">
      
      {/* Visual Top Bar Theme */}
      <header className="bg-[#f4f1ea] border-b border-[#dcd7c9] p-4 px-6 flex justify-between items-center z-10 sticky top-0 shadow-sm animate-fade-in">
        <div className="flex items-center space-x-3">
          <div className="bg-[#5a3a22] p-2 rounded-lg shadow border border-[#5a3a22]/60 shrink-0">
            <Notebook className="w-5 h-5 text-[#f4f1ea]" />
          </div>
          <div>
            <h1 className="text-[#3d2b1f] font-serif font-bold text-base sm:text-lg tracking-[0.16em]">
              寒山书舍 · 古籍活化排版系统
            </h1>
            <p className="text-[10px] sm:text-xs text-[#7c6a5a] font-serif mt-0.5 tracking-wider hidden sm:block">
              东方数字人文活化交互台。让文字流归古典竹素，施朱点句读，钤印金石，朱砂评阅。
            </p>
          </div>
        </div>

        {/* Sensory utilities */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setGuzhengAudioEnabled(!guzhengAudioEnabled)}
            className={`p-2 rounded-full border text-xs font-serif flex items-center gap-1.5 transition cursor-pointer select-none ${
              guzhengAudioEnabled
                ? "bg-[#e8e4d9] border-[#8b4513]/40 text-[#8b4513]"
                : "border-[#dcd7c9] text-[#7c6a5a] hover:text-[#3d2b1f]"
            }`}
            title="拨动琴弦伴奏：点击、翻书或盖印等交互将产生空灵五声音律"
          >
            <Music className={`w-3.5 h-3.5 ${guzhengAudioEnabled ? "animate-bounce" : ""}`} />
            <span className="text-[11px] font-serif hidden md:inline">古典古音：{guzhengAudioEnabled ? "启" : "关"}</span>
          </button>

          <button
            onClick={handlePrintDocument}
            className="p-2 py-1.5 px-3 bg-[#8b4513] hover:bg-[#6b3410] rounded text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-xs font-serif transition-all"
            title="打印或将当前精美排版的页面导出为 PDF/图片"
          >
            <Printer className="w-3.5 h-3.5 text-[#f4f1ea]" />
            <span className="hidden sm:inline">导出印制</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 lg:min-h-0 max-w-[1600px] 2xl:max-w-none 2xl:px-12 w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch h-full">
        
        {/* Left Column (Golden proportions: 61.8%) - Interactive Book Viewer viewport */}
        <section className="flex flex-col justify-between space-y-4 lg:flex-[1.618] lg:min-w-0 min-h-[60vh] lg:min-h-0 h-full">
          {activeBook ? (
            <div className="bg-[#e5e1d7] rounded-2xl border border-[#dcd7c9] p-5 shadow-lg flex flex-col justify-between flex-1 relative overflow-hidden min-h-0">
              
              {/* Title tag decoration */}
              <div className="flex items-center justify-between border-b border-[#dcd7c9] pb-3 mb-2 shrink-0">
                <div className="flex items-center space-x-1.5 font-serif font-bold text-[#3d2b1f] tracking-widest text-sm">
                  <span className="w-2.5 h-2.5 bg-[#A61B1B] rounded-sm shrink-0" />
                  <h2>《 {activeBook.title} 》影照书叶</h2>
                </div>
                {activeBook.author && (
                  <span className="text-xs text-[#7c6a5a] font-serif">作者：{activeBook.author}</span>
                )}
              </div>

              {/* Core vertical pagination scrollable sheet */}
              <BookViewer
                book={activeBook}
                config={config}
                allSeals={seals}
                currentPageIndex={currentPageIndex}
                onPageChange={handlePageChange}
                onUpdateBook={handleUpdateActiveBook}
                brushType={brushType}
                brushSize={brushSize}
              />

              {/* Ink Calligraphy Paint Overlay controller */}
              <div className="border-t border-[#dcd7c9] pt-4 mt-2 select-none flex flex-wrap items-center justify-between gap-3 bg-[#f4f1ea] p-3.5 rounded-xl border border-[#dcd7c9]/80 shrink-0">
                <div className="flex items-center space-x-2 shrink-0">
                  <Paintbrush className="w-4 h-4 text-[#7c6a5a] shrink-0" />
                  <span className="text-xs text-[#3d2b1f] font-serif tracking-widest">朱批墨宝：</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 font-serif text-[11px]">
                  {/* Selector 1: Passive reading/seal drag */}
                  <button
                    onClick={() => {
                      setBrushType("none");
                      triggerPluck(1);
                    }}
                    className={`px-2.5 py-1.5 rounded border transition cursor-pointer ${
                      brushType === "none"
                        ? "bg-[#e8e4d9] border-[#8b4513] text-[#3d2b1f] font-bold shadow-sm"
                        : "border-[#dcd7c9] bg-[#fcfaf2] text-[#7c6a5a] hover:bg-[#e8e4d9] hover:text-[#3d2b1f]"
                    }`}
                    title="普通叶面，支持拖置印章位置或双击扩缩"
                  >
                    阅卷拖章
                  </button>

                  {/* Selector 2: Red Cinnabar brush */}
                  <button
                    onClick={() => {
                      setBrushType("zhu");
                      triggerPluck(1);
                    }}
                    className={`px-2.5 py-1.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                      brushType === "zhu"
                        ? "bg-[#e8e4d9] border-[#A61B1B] text-[#A61B1B] font-bold shadow-sm"
                        : "border-[#dcd7c9] bg-[#fcfaf2] text-[#7c6a5a] hover:bg-[#e8e4d9] hover:text-[#3d2b1f]"
                    }`}
                    title="朱笔：红泥漆笔，绘制古典句读红圈或书写批注"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-600 block shrink-0" />
                    朱批笔点
                  </button>

                  {/* Selector 3: Black Pine ink brush */}
                  <button
                    onClick={() => {
                      setBrushType("mo");
                      triggerPluck(1);
                    }}
                    className={`px-2.5 py-1.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                      brushType === "mo"
                        ? "bg-[#e8e4d9] border-[#3d2b1f] text-[#3d2b1f] font-bold shadow-sm"
                        : "border-[#dcd7c9] bg-[#fcfaf2] text-[#7c6a5a] hover:bg-[#e8e4d9] hover:text-[#3d2b1f]"
                    }`}
                    title="墨笔：徽墨松烟，写本批改笔画"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#2c2c2c] block shrink-0 border border-stone-400" />
                    徽墨墨宝
                  </button>

                  {/* Selector 4: Eraser */}
                  <button
                    onClick={() => {
                      setBrushType("eraser");
                      triggerPluck(1);
                    }}
                    className={`px-2.5 py-1.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                      brushType === "eraser"
                        ? "bg-[#e8e4d9] border-[#8b4513] text-[#8b4513] font-bold shadow-sm"
                        : "border-[#dcd7c9] bg-[#fcfaf2] text-[#7c6a5a] hover:bg-[#e8e4d9] hover:text-[#3d2b1f]"
                    }`}
                    title="擦除笔改"
                  >
                    擦刮
                  </button>
                </div>

                {/* Brush size settings */}
                {brushType !== "none" && (
                  <div className="flex items-center space-x-1 border border-[#dcd7c9] p-0.5 rounded bg-[#fcfaf2] text-[10px] font-serif shrink-0">
                    <button
                      onClick={() => setBrushSize(2)}
                      className={`px-2 py-0.5 rounded transition ${
                        brushSize === 2 ? "bg-[#8b4513] text-[#fcfaf2]" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
                      }`}
                    >
                      小
                    </button>
                    <button
                      onClick={() => setBrushSize(4)}
                      className={`px-2 py-0.5 rounded transition ${
                        brushSize === 4 ? "bg-[#8b4513] text-[#fcfaf2]" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
                      }`}
                    >
                      中
                    </button>
                    <button
                      onClick={() => setBrushSize(8)}
                      className={`px-2 py-0.5 rounded transition ${
                        brushSize === 8 ? "bg-[#8b4513] text-[#fcfaf2]" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
                      }`}
                    >
                      粗
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#f4f1ea] border border-[#dcd7c9] rounded-2xl h-[560px] flex items-center justify-center p-8 text-[#7c6a5a] text-sm font-serif">
              古卷加载中，请稍候...
            </div>
          )}

          {/* Interactive Tutorial Guide line footer */}
          <div className="bg-[#f4f1ea] border border-[#dcd7c9] p-4 rounded-xl text-xs text-[#7c6a5a] font-serif leading-relaxed">
            <span className="font-bold text-[#8b4513] text-[13px] block mb-1">💡 墨砚活化技：</span>
            <span>
              1. <b>大字夹注</b>：在正文字词后面，用 `((这里写注释))` 包裹即可产出古典<b>双列小字夹注</b>。
              <br />
              2. <b>金石钤印</b>：在「金石刻印」中篆刻出你想要的印章，点击「钤印于此」后，可在左侧书叶上<b>用鼠标自由拖拽位置</b>，甚至悬停在章上方可以扩容缩放其大小。
              <br />
              3. <b>提笔批注</b>：开启「朱批笔点」或「徽墨墨宝」直接像毛笔一样在书页上书写评圈，支持对每页分别记录您的墨笔手迹，充满墨宝古风韵味。
            </span>
          </div>
        </section>

        {/* Right Column (Golden proportions: 38.2%) - Scribe toolbox panels */}
        <section className="flex flex-col space-y-4 lg:flex-1 lg:min-w-0 h-full">
          
          {/* Action Tabs for Scribes Chest */}
          <div className="flex border border-[#dcd7c9] p-0.5 rounded-lg bg-[#f4f1ea] font-serif select-none shrink-0 text-xs">
            <button
              onClick={() => {
                setActiveTab("shelf");
                triggerPluck(1);
              }}
              className={`flex-1 py-2 text-center rounded-md font-bold cursor-pointer transition flex items-center justify-center gap-1 ${
                activeTab === "shelf" ? "bg-[#8b4513]/10 text-[#8b4513] font-bold" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              藏书旧馆
            </button>
            <button
              onClick={() => {
                setActiveTab("style");
                triggerPluck(1);
              }}
              className={`flex-1 py-2 text-center rounded-md font-bold cursor-pointer transition flex items-center justify-center gap-1 ${
                activeTab === "style" ? "bg-[#8b4513]/10 text-[#8b4513] font-bold" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              刻书规制
            </button>
            <button
              onClick={() => {
                setActiveTab("seal");
                triggerPluck(1);
              }}
              className={`flex-1 py-2 text-center rounded-md font-bold cursor-pointer transition flex items-center justify-center gap-1 ${
                activeTab === "seal" ? "bg-[#8b4513]/10 text-[#8b4513] font-bold" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              金石刻印
            </button>
            <button
              onClick={() => {
                setActiveTab("scribe");
                triggerPluck(1);
              }}
              className={`flex-1 py-2 text-center rounded-md font-bold cursor-pointer transition flex items-center justify-center gap-1 ${
                activeTab === "scribe" ? "bg-[#8b4513]/10 text-[#8b4513] font-bold" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
              }`}
            >
              <FilePenLine className="w-3.5 h-3.5" />
              修缮与 AI
            </button>
          </div>

          {/* Active Tab rendering container */}
          <div className="flex-1 min-h-[400px] lg:min-h-0 overflow-y-auto pr-2 pb-12 -mr-2">
            {activeTab === "shelf" && (
              <Bookshelf
                books={books}
                activeBookId={activeBookId}
                onSelectBook={handleSelectBook}
                onDeleteBook={handleDeleteBook}
                onAddNewBook={handleCreateNewBookFile}
                onResetDefaultClassics={handleResetDefaultClassics}
              />
            )}

            {activeTab === "style" && (
              <StylePanel
                config={config}
                onConfigChange={handleUpdateConfig}
                onResetConfig={handleResetConfigToTraditional}
                customFontName={customFontName}
                onFontUploaded={(name) => setCustomFontName(name)}
                onFontCleared={() => setCustomFontName("")}
              />
            )}

            {activeTab === "seal" && (
              <SealStudio
                seals={seals}
                onAddSeal={handleAddCustomSeal}
                onDeleteSeal={handleDeleteCustomSeal}
                onStampActivePage={handleStampActivePage}
              />
            )}

            {activeTab === "scribe" && activeBook && (
              <TextEditor
                allBooks={books}
                book={activeBook}
                onUpdateBook={handleUpdateActiveBook}
                onCursorPageJump={handleCursorPageJump}
              />
            )}
          </div>
        </section>
      </main>

      {/* Footer layout */}
      <footer className="bg-[#f4f1ea] border-t border-[#dcd7c9] p-4 text-center text-[10px] text-[#7c6a5a] font-serif tracking-widest select-none">
        <div>寒山书舍数字人文项目 · © 庚子年宣德印像数字化传承工坊 · 谨以传承东方至美雅韵</div>
        <div className="mt-1 scale-95 origin-center text-[#7c6a5a]/70 font-sans">
          Powered by Gemini 3.5 Flash Model & Cloud Run Full-Stack Engine
        </div>
      </footer>

      {/* Guided Print Modal Utility */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm print:hidden">
          <div className="bg-[#faf8f3] border-4 border-[#8b4513] rounded-2xl max-w-lg w-full shadow-2xl p-6 font-serif relative transition-all animate-scale-up">
            <button
              onClick={() => {
                setShowPrintModal(false);
                triggerPluck(1);
              }}
              className="absolute top-4 right-4 p-1 rounded-full text-[#7c6a5a] hover:text-[#8b4513] hover:bg-[#e8e4d9]/40 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[#8b4513] border-b border-[#dcd7c9] pb-3 mb-4">
              <Printer className="w-5 h-5 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold tracking-wider">古卷印装与 PDF 导出指南</h2>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-[#3d2b1f] leading-relaxed">
              {/* Alert: Iframe Warning */}
              <div className="bg-[#BE1E2D]/5 border border-[#BE1E2D]/30 p-3 rounded-lg flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 text-[#BE1E2D] shrink-0 mt-0.5" />
                <div className="flex-1 font-serif text-[11px] text-[#2c1d1a]">
                  <span className="font-bold text-[#BE1E2D] block mb-0.5">⚠️ 嵌入式浏览器沙箱重点提示：</span>
                  由于您当前处于 AI Studio 的 <b>“嵌套 iframe 预览”</b> 中，部分浏览器因安全策略会直接<b>屏蔽或拦截</b>直接调起的打印界面。
                  <p className="mt-1 font-bold text-[#8b4513]">
                    【终极方案】请点击预览窗口右上方的图标 <span className="underline">「在新标签页中打开」 ↗</span> 按钮。在新打开的单独网页中，点击「导出印制」或按下快捷键 <kbd className="bg-[#e8e4d9]/50 px-1 rounded font-sans pr-0.5 text-[#3d2b1f]/90">Ctrl + P</kbd> (Mac 用户: <kbd className="bg-[#e8e4d9]/50 px-1 rounded font-sans pr-0.5 text-[#3d2b1f]/90">Cmd + P</kbd>)，即可极致顺畅地调出系统打印/导出为 PDF！
                  </p>
                </div>
              </div>

              {/* Steps configuration */}
              <div className="p-3 bg-[#e8e4d9]/30 rounded-lg border border-[#dcd7c9]/80 text-[12px]">
                <h3 className="font-bold text-[#8b4513] mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#8b4513] rounded-full" />
                  打印或保存 PDF 建议设定：
                </h3>
                <ul className="list-decimal list-inside space-y-1 text-[#4a3a2d]">
                  <li>
                    <b>排版方向</b>：建议选择 <b>「横向 (Landscape)」</b> 纸张方向，最契合传统古籍书叶。
                  </li>
                  <li>
                    <b>背景图形 (关键)</b>：必须勾选启用 <b>「背景图形 (Background Graphics)」</b>，方可印出宣纸材质底色、朱红格栏和您的金石红印。
                  </li>
                  <li>
                    <b>页边距</b>：选择 <b>「无密/无边距 (None)」</b> 或者 <b>「最小 (Minimum)」</b>，让宋体书叶完美饱满。
                  </li>
                  <li>
                    <b>页眉页脚</b>：勾选 <b>「去处 / 关闭 (Disabled)」</b>，隐藏浏览器自带的网址、时间、标题边角杂讯。
                  </li>
                </ul>
              </div>

              {/* Export scope selector */}
              <div className="bg-[#faf8f3] border-2 border-[#8b4513]/40 p-4 rounded-xl flex flex-col gap-3">
                <span className="font-bold text-[#8b4513] text-[13px] flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-[#8b4513]" />
                  请指定存制导出范围：
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setExportRange("current");
                      triggerPluck(1);
                    }}
                    type="button"
                    className={`p-2.5 rounded-lg border font-serif text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      exportRange === "current"
                        ? "bg-[#8b4513]/10 border-[#8b4513] text-[#8b4513]"
                        : "bg-white/60 border-[#dcd7c9] text-[#7c6a5a] hover:bg-[#e8e4d9]/30"
                    }`}
                  >
                    <span>仅导出当前叶</span>
                    <span className="text-[10px] text-stone-400 font-normal">单叶朱线红印版本</span>
                  </button>
                  <button
                    onClick={() => {
                      setExportRange("entire");
                      triggerPluck(1);
                    }}
                    type="button"
                    className={`p-2.5 rounded-lg border font-serif text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      exportRange === "entire"
                        ? "bg-[#A61B1B]/10 border-[#A61B1B] text-[#A61B1B]"
                        : "bg-white/60 border-[#dcd7c9] text-[#7c6a5a] hover:bg-[#e8e4d9]/30"
                    }`}
                  >
                    <span>装订全书古本</span>
                    <span className="text-[10px] text-stone-400 font-normal">合卷共 {activeBookTotalPages} 页</span>
                  </button>
                </div>
              </div>

              {isExportingPDF && exportStatusPDF && (
                <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-[#8b4513]/30 border-t-[#8b4513] rounded-full animate-spin" />
                  <span className="text-xs text-[#8b4513] font-bold font-mono">{exportStatusPDF}</span>
                </div>
              )}

              {/* Confirm trigger button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-[#dcd7c9]/40 text-xs">
                <button
                  onClick={() => {
                    setShowPrintModal(false);
                    triggerPluck(1);
                  }}
                  className="px-4 py-2.5 bg-[#8b4513]/10 hover:bg-[#8b4513]/20 text-[#8b4513] rounded-md transition font-bold cursor-pointer text-center"
                >
                  继续编辑
                </button>
                <button
                  onClick={handleDirectExportPDF}
                  disabled={isExportingPDF}
                  className="px-5 py-2.5 bg-[#A61B1B] hover:bg-[#831212] text-white rounded-md transition font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {isExportingPDF ? "正在极速制作 PDF 中..." : "直接生成并导出 PDF (推荐)"}
                </button>
                <button
                  onClick={() => {
                    triggerPluck(6);
                    try {
                      window.print();
                    } catch (e) {
                      console.log(e);
                    }
                  }}
                  className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-750 rounded-md transition font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  title="对于某些特定高阶纸张套印或保存整书册目的高阶用户"
                >
                  <Printer className="w-3.5 h-3.5 text-stone-600" />
                  唤醒传统系统打印盘
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
