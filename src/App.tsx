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
  const [guzhengAudioEnabled, setGuzhengAudioEnabled] = useState(true);

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

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDirectExportPDF = async () => {
    const el = document.getElementById("book-leaf-container");
    if (!el) {
      alert("未能在页面上找到书页！请确认页面上已加载古卷。");
      return;
    }

    try {
      setIsExportingPDF(true);
      triggerPluck(8);

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
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      const fileName = `《${activeBook?.title || "寒山古卷"}》_第${currentPageIndex + 1}叶_${activeBook?.author || "佚名"}.pdf`;
      pdf.save(fileName);
      triggerPluck(5);
      
      // Close modal after successful export
      setShowPrintModal(false);
    } catch (error) {
      console.error("Direct PDF export failed:", error);
      alert("直接下载 PDF 失败，请尝试传统打印或在新标签页中打开！");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f7f2] text-[#3d2b1f] font-sans flex flex-col selection:bg-[#e8e4d9] selection:text-[#3d2b1f]">
      
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column (Golden proportions: 7 cols) - Interactive Book Viewer viewport */}
        <section className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {activeBook ? (
            <div className="bg-[#e5e1d7] rounded-2xl border border-[#dcd7c9] p-5 shadow-lg flex flex-col justify-between flex-1 relative overflow-hidden">
              
              {/* Title tag decoration */}
              <div className="flex items-center justify-between border-b border-[#dcd7c9] pb-3 mb-2">
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
              <div className="border-t border-[#dcd7c9] pt-4 mt-2 select-none flex flex-wrap items-center justify-between gap-3 bg-[#f4f1ea] p-3.5 rounded-xl border border-[#dcd7c9]/80">
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

        {/* Right Column (Golden proportions: 5 cols) - Scribe toolbox panels */}
        <section className="lg:col-span-5 flex flex-col space-y-4">
          
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
          <div className="flex-1 min-h-[460px]">
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
                book={activeBook}
                onUpdateBook={handleUpdateActiveBook}
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
