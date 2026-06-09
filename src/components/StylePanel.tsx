import React, { useRef, useState } from "react";
import { LayoutConfig, ThemeType } from "../types";
import { Sliders, RotateCcw, Palette, Layout, Type as FontIcon, Upload, Trash2, CheckCircle2 } from "lucide-react";
import { saveFontToDB, registerFontFace, unregisterCustomFont, clearFontFromDB } from "../utils/fontLoader";

interface StylePanelProps {
  config: LayoutConfig;
  onConfigChange: (config: Partial<LayoutConfig>) => void;
  onResetConfig: () => void;
  customFontName: string;
  onFontUploaded: (name: string) => void;
  onFontCleared: () => void;
}

export const StylePanel: React.FC<StylePanelProps> = ({
  config,
  onConfigChange,
  onResetConfig,
  customFontName,
  onFontUploaded,
  onFontCleared
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorState, setErrorState] = useState<string>("");

  const handleUploadFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorState("");
    
    // Check file size (IndexedDB can handle big assets, but warning helpful)
    if (file.size > 25 * 1024 * 1024) {
      setErrorState("字体文件偏大，可能会占用较多浏览器主存。");
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        
        // Unregister existing first
        unregisterCustomFont();
        
        // Load and register the font
        await registerFontFace(buffer);
        
        // Persist to Local DB
        await saveFontToDB(buffer, file.name);
        
        onFontUploaded(file.name);
      } catch (err) {
        console.error("加载字体文件错误:", err);
        setErrorState("未成功解析为有效中文字体。请配合选用 .ttf / .otf / .woff2 格式古籍字宝。");
      }
    };
    reader.onerror = () => {
      setErrorState("读取文件出错。");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearCustomFont = async () => {
    try {
      unregisterCustomFont();
      await clearFontFromDB();
      onFontCleared();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setErrorState("");
    } catch (err) {
      console.error(err);
    }
  };

  const themes: { id: ThemeType; name: string; bg: string; text: string; desc: string }[] = [
    {
      id: "xuan",
      name: "宣纸暖白",
      bg: "bg-[#FAF8F5]",
      text: "text-stone-800",
      desc: "宣德洁白，纤维温润"
    },
    {
      id: "bamboo",
      name: "古旧竹黄",
      bg: "bg-[#F3EAD5]",
      text: "text-[#2B2313]",
      desc: "临溪古竹，黄染幽雅"
    },
    {
      id: "silk",
      name: "绢丝老褐",
      bg: "bg-[#E6DAB9]",
      text: "text-[#3D2E14]",
      desc: "宋画绢本，古雅致密"
    },
    {
      id: "imperial",
      name: "殿苑明黄",
      bg: "bg-[#F7E19C]",
      text: "text-stone-900",
      desc: "皇家御览，蜡黄富丽"
    },
    {
      id: "cinnabar",
      name: "朱砂玄黑",
      bg: "bg-[#1E1111]",
      text: "text-stone-200",
      desc: "黑朱砂本，庄严凝重"
    },
    {
      id: "jade",
      name: "御制碧玉",
      bg: "bg-[#EAEFE4]",
      text: "text-[#1F2F20]",
      desc: "琢玉澄心，青荧剔透"
    }
  ];

  const borderStyles: { id: "single" | "double" | "none"; name: string }[] = [
    { id: "single", name: "单边" },
    { id: "double", name: "双边 (传统)" },
    { id: "none", name: "无边框" }
  ];

  const fonts: { id: "kaiti" | "fangsong" | "song" | "clerical" | "kangxi"; name: string; desc: string }[] = [
    { id: "kangxi", name: "康熙字典体", desc: "古雅朴质，清代金石风骨" },
    { id: "kaiti", name: "法帖楷体", desc: "端正清秀，仿写本风姿" },
    { id: "fangsong", name: "聚珍仿宋", desc: "明清刻本，风骨清劲" },
    { id: "song", name: "匠心宋体", desc: "横轻竖重，宋明版画刻字" },
    { id: "clerical", name: "石鼓隶书", desc: "字形宽扁，蚕头雁尾之势" }
  ];

  return (
    <div className="bg-[#f4f1ea] border border-[#dcd7c9] rounded-xl p-5 shadow-sm text-[#3d2b1f]">
      <div className="flex items-center justify-between mb-4 border-b border-[#dcd7c9] pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="text-[#8b4513] w-5 h-5" />
          <h2 className="font-semibold text-[#3d2b1f] tracking-wider font-serif">
            古籍刻书规制 (排版设置)
          </h2>
        </div>
        <button
          onClick={onResetConfig}
          className="p-1 px-2 hover:bg-[#e8e4d9] rounded text-[11px] text-[#7c6a5a] hover:text-[#8b4513] flex items-center gap-1 cursor-pointer transition border border-[#dcd7c9]"
        >
          <RotateCcw className="w-3 h-3" />
          默认规制
        </button>
      </div>

      <div className="space-y-5">
        {/* Font Selection */}
        <div>
          <label className="text-xs text-[#7c6a5a] font-serif tracking-widest flex items-center mb-2 gap-1.5">
            <FontIcon className="w-3.5 h-3.5 text-[#8b4513]/80" />
            字形规矩
          </label>
          <div className="grid grid-cols-2 gap-2">
            {fonts.map((f) => {
              const active = config.fontFamily === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onConfigChange({ fontFamily: f.id })}
                  className={`p-2 rounded text-left border flex flex-col transition cursor-pointer ${
                    active
                      ? "bg-[#e8e4d9] border-[#8b4513] text-[#8b4513]"
                      : "bg-[#fcfaf2]/60 border-[#dcd7c9] text-[#3d2b1f] hover:border-[#8b4513]/45 hover:bg-[#fcfaf2]"
                  }`}
                >
                  <span className="text-xs font-serif font-bold">{f.name}</span>
                  <span className="text-[10px] text-[#7c6a5a] mt-0.5 mt-auto truncate">{f.desc}</span>
                </button>
              );
            })}
          </div>

          {/* User Custom Font Upload block - specifically for Kangxi / or selectable */}
          {config.fontFamily === "kangxi" && (
            <div className="mt-2.5 p-3 rounded-lg bg-[#fcfaf2]/90 border border-[#dcd7c9] flex flex-col gap-2 transition animate-fade-in text-xs font-serif">
              <div className="flex justify-between items-center text-[#7c6a5a] border-b border-[#dcd7c9]/60 pb-1.5 mb-1">
                <span className="font-bold">自备康熙古籍字宝</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#8b4513]/10 text-[#8b4513] rounded font-sans uppercase font-bold">
                  上传配置
                </span>
              </div>
              
              {customFontName ? (
                <div className="flex items-center justify-between bg-[#f4f1ea] p-2 rounded border border-[#dcd7c9]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-mono text-[11px] truncate text-[#3d2b1f] font-bold" title={customFontName}>
                      {customFontName}
                    </span>
                  </div>
                  <button
                    onClick={handleClearCustomFont}
                    className="p-1 text-[#A61B1B] hover:bg-red-50 rounded transition cursor-pointer flex items-center gap-0.5 scale-95 shrink-0"
                    title="卸载自定义字体，恢复云端Fallback"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[10px]">卸载</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] text-[#7c6a5a] leading-relaxed">
                    由于传统中文字数过万，内置云端字体加载稍慢且生僻字易缺。强烈建议您上传您本地优秀的 <b>康熙康熙字典体 (.ttf/.otf/.woff2)</b> 以获取纤毫毕现的极速离线古金石风。
                  </p>
                  <label className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-[#8b4513]/40 hover:border-[#8b4513] hover:bg-[#e8e4d9]/20 rounded-md cursor-pointer transition text-[#8b4513] bg-[#fcfaf2] text-center font-bold">
                    <Upload className="w-3.5 h-3.5" />
                    <span>上传自备字典体文件</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ttf,.otf,.woff2,.woff"
                      onChange={handleUploadFont}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
              {errorState && (
                <p className="text-[10px] text-[#A61B1B] bg-red-50 p-1.5 rounded border border-red-200 mt-1">
                  {errorState}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Paper & Ink Palette */}
        <div>
          <label className="text-xs text-[#7c6a5a] font-serif tracking-widest flex items-center mb-2 gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#8b4513]/80" />
            宣纸墨色 (纸张颜色)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => {
              const active = config.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onConfigChange({ theme: t.id })}
                  className={`p-1.5 rounded border transition flex flex-col items-center justify-center cursor-pointer text-center ${
                    active ? "border-[#8b4513] bg-[#e8e4d9]/50" : "border-[#dcd7c9] hover:border-[#8b4513]/40 bg-[#fcfaf2]/60"
                  }`}
                  title={t.desc}
                >
                  <div className={`w-5 h-5 rounded-full ${t.bg} border border-[#dcd7c9] mb-1`}></div>
                  <span className="text-[11px] font-serif">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Framing & Guidelines */}
        <div>
          <label className="text-xs text-[#7c6a5a] font-serif tracking-widest flex items-center mb-2 gap-1.5">
            <Layout className="w-3.5 h-3.5 text-[#8b4513]/80" />
            朱墨栏杆 (边框与行格)
          </label>
          <div className="space-y-2.5 bg-[#fcfaf2]/80 p-3 rounded-lg border border-[#dcd7c9]">
            {/* Outline Style */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#7c6a5a] font-serif">印网外框：</span>
              <div className="flex rounded border border-[#dcd7c9] p-0.5 bg-[#f4f1ea]">
                {borderStyles.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onConfigChange({ borderStyle: item.id })}
                    className={`px-2 py-0.5 text-[10px] font-serif rounded cursor-pointer ${
                      config.borderStyle === item.id ? "bg-[#8b4513] text-white" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Ink Type: Vermillion vs. Charcoal */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#7c6a5a] font-serif">格栏颜料：</span>
              <div className="flex rounded border border-[#dcd7c9] p-0.5 bg-[#f4f1ea]">
                <button
                  onClick={() => onConfigChange({ borderType: "zhu" })}
                  className={`px-3 py-0.5 text-[10px] font-serif rounded cursor-pointer ${
                    config.borderType === "zhu" ? "bg-[#A61B1B] text-white animate-pulse" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
                  }`}
                >
                  朱砂栏 (朱红)
                </button>
                <button
                  onClick={() => onConfigChange({ borderType: "wu" })}
                  className={`px-3 py-0.5 text-[10px] font-serif rounded cursor-pointer ${
                    config.borderType === "wu" ? "bg-[#7c6a5a] text-white" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
                  }`}
                >
                  乌丝栏 (黑灰)
                </button>
              </div>
            </div>

            {/* Line Grid */}
            <div className="flex items-center justify-between border-t border-[#dcd7c9]/60 pt-2 mt-1">
              <span className="text-xs text-[#7c6a5a] font-serif">打印行界 (乌/朱丝栏)：</span>
              <input
                type="checkbox"
                checked={config.showLineGrid}
                onChange={(e) => onConfigChange({ showLineGrid: e.target.checked })}
                className="rounded text-[#8b4513] bg-[#f4f1ea] border-[#dcd7c9] w-3.5 h-3.5 cursor-pointer accent-[#8b4513]"
              />
            </div>

            {/* Center fold column (版心) */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#7c6a5a] font-serif">对称版心 (书名页码)：</span>
              <input
                type="checkbox"
                checked={config.showCenterLine}
                onChange={(e) => onConfigChange({ showCenterLine: e.target.checked })}
                className="rounded text-[#8b4513] bg-[#f4f1ea] border-[#dcd7c9] w-3.5 h-3.5 cursor-pointer accent-[#8b4513]"
              />
            </div>

            {/* Fold mark: Fishtail (鱼尾) */}
            {config.showCenterLine && (
              <div className="flex items-center justify-between border-t border-[#dcd7c9]/60 pt-2 transition text-fade-in">
                <span className="text-xs text-[#7c6a5a] font-serif">版心鱼尾 (双鱼尾契)：</span>
                <input
                  type="checkbox"
                  checked={config.showFishtail}
                  onChange={(e) => onConfigChange({ showFishtail: e.target.checked })}
                  className="rounded text-[#8b4513] bg-[#f4f1ea] border-[#dcd7c9] w-3.5 h-3.5 cursor-pointer accent-[#8b4513]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Layout metrics sliders */}
        <div>
          <label className="text-xs text-[#7c6a5a] font-serif tracking-widest flex items-center mb-2 gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#8b4513]/80" />
            叶子格式 (版面行数与字数)
          </label>
          <div className="space-y-3 bg-[#fcfaf2]/80 p-3 rounded-lg border border-[#dcd7c9]">
            {/* Custom Paper Size indicator */}
            <div className="flex justify-between items-center bg-[#8b4513]/5 p-2 rounded border border-[#8b4513]/10 mb-1">
              <span className="text-xs font-serif text-[#3d2b1f] font-bold">书册纸张开本：</span>
              <span className="text-xs font-mono text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded font-bold border border-amber-200/50">
                单页 20 × 30 厘米 (传统竖本开本)
              </span>
            </div>

            {/* Columns (Lines) Per Page */}
            <div>
              <div className="flex justify-between text-xs text-[#7c6a5a] mb-1">
                <span className="font-serif">半页行数 (列数)：</span>
                <span className="font-mono text-[#8b4513] font-bold">{config.linesPerPage} 行</span>
              </div>
              <input
                type="range"
                min="6"
                max="14"
                step="1"
                value={config.linesPerPage}
                onChange={(e) => onConfigChange({ linesPerPage: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#dcd7c9] rounded-lg appearance-none cursor-pointer accent-[#8b4513]"
              />
              <div className="flex justify-between text-[9px] text-[#7c6a5a]/70 mt-0.5">
                <span>6 行 (阔行)</span>
                <span>10 行 (十行本)</span>
                <span>14 行 (密字)</span>
              </div>
            </div>

            {/* Characters Per Column */}
            <div>
              <div className="flex justify-between text-xs text-[#7c6a5a] mb-1">
                <span className="font-serif">每行字数 (容字)：</span>
                <span className="font-mono text-[#8b4513] font-bold">{config.charsPerLine} 字</span>
              </div>
              <input
                type="range"
                min="12"
                max="32"
                step="2"
                value={config.charsPerLine}
                onChange={(e) => onConfigChange({ charsPerLine: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#dcd7c9] rounded-lg appearance-none cursor-pointer accent-[#8b4513]"
              />
              <div className="flex justify-between text-[9px] text-[#7c6a5a]/70 mt-0.5">
                <span>12 字</span>
                <span>22 字</span>
                <span>32 字</span>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between text-xs text-[#7c6a5a] mb-1">
                <span className="font-serif">字形体量 (大小)：</span>
                <span className="font-mono text-[#8b4513] font-bold">{config.fontSize} 像素</span>
              </div>
              <input
                type="range"
                min="14"
                max="26"
                step="1"
                value={config.fontSize}
                onChange={(e) => onConfigChange({ fontSize: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#dcd7c9] rounded-lg appearance-none cursor-pointer accent-[#8b4513]"
              />
            </div>

            {/* Column spacing */}
            <div>
              <div className="flex justify-between text-xs text-[#7c6a5a] mb-1">
                <span className="font-serif">行距宽窄 (行距)：</span>
                <span className="font-mono text-[#8b4513] font-bold">{(config.lineSpacing / 10).toFixed(1)} 倍</span>
              </div>
              <input
                type="range"
                min="18"
                max="34"
                step="1"
                value={config.lineSpacing}
                onChange={(e) => onConfigChange({ lineSpacing: parseInt(e.target.value) })}
                className="w-full h-1 bg-[#dcd7c9] rounded-lg appearance-none cursor-pointer accent-[#8b4513]"
              />
            </div>
          </div>
        </div>

        {/* Punctuation styles */}
        <div>
          <label className="text-xs text-[#7c6a5a] font-serif tracking-widest flex items-center mb-1.5 gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#8b4513]/80" />
            句读断折 (句读形式)
          </label>
          <div className="grid grid-cols-3 gap-1 bg-[#fcfaf2]/80 p-1.5 rounded-lg border border-[#dcd7c9]">
            <button
              onClick={() => onConfigChange({ punctuationMode: "none" })}
              className={`py-1.5 text-xs font-serif rounded cursor-pointer transition ${
                config.punctuationMode === "none" ? "bg-[#8b4513] text-[#fcfaf2]" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
              }`}
              title="无标点，传统未断句原本"
            >
              无标点
            </button>
            <button
              onClick={() => onConfigChange({ punctuationMode: "traditional" })}
              className={`py-1.5 text-xs font-serif rounded cursor-pointer transition ${
                config.punctuationMode === "traditional" ? "bg-[#A61B1B] text-white" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
              }`}
              title="字旁侧施以朱砂圈点，为传统句读"
            >
              朱笔句读
            </button>
            <button
              onClick={() => onConfigChange({ punctuationMode: "modern" })}
              className={`py-1.5 text-xs font-serif rounded cursor-pointer transition ${
                config.punctuationMode === "modern" ? "bg-[#7c6a5a] text-white" : "text-[#7c6a5a] hover:text-[#3d2b1f]"
              }`}
              title="现代通用标点符号"
            >
              现代标点
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
