import React, { useState, useEffect } from "react";
import { Seal } from "../types";
import { generateSealDataUrl } from "../utils/sealGenerator";
import { Hammer, Plus, RotateCcw, Copy, Trash } from "lucide-react";

interface SealStudioProps {
  seals: Seal[];
  onAddSeal: (seal: Seal) => void;
  onDeleteSeal: (id: string) => void;
  onStampActivePage: (sealId: string) => void;
}

export const defaultSeals: Seal[] = [
  {
    id: "seal-default-1",
    text: "昭明图书",
    shape: "square",
    style: "yang",
    font: "zhuan",
    inkBleed: 5
  },
  {
    id: "seal-default-2",
    text: "乾隆御览",
    shape: "square",
    style: "yin",
    font: "zhuan",
    inkBleed: 7
  },
  {
    id: "seal-default-3",
    text: "琴书雅玩",
    shape: "gourd",
    style: "yang",
    font: "kai",
    inkBleed: 4
  },
  {
    id: "seal-default-4",
    text: "随安阁",
    shape: "oval",
    style: "yin",
    font: "song",
    inkBleed: 6
  }
];

export const SealStudio: React.FC<SealStudioProps> = ({
  seals,
  onAddSeal,
  onDeleteSeal,
  onStampActivePage
}) => {
  // Config state for the seal being designed
  const [inputText, setInputText] = useState("得闲读书");
  const [shape, setShape] = useState<"square" | "circle" | "oval" | "gourd">("square");
  const [carvingStyle, setCarvingStyle] = useState<"yin" | "yang">("yang");
  const [font, setFont] = useState<"zhuan" | "kai" | "song">("zhuan");
  const [inkBleed, setInkBleed] = useState(5);
  const [previewUrl, setPreviewUrl] = useState("");

  // Live preview loop
  useEffect(() => {
    const mockSeal: Seal = {
      id: "seal-preview",
      text: inputText || "印章",
      shape,
      style: carvingStyle,
      font,
      inkBleed
    };
    const dataUrl = generateSealDataUrl(mockSeal);
    setPreviewUrl(dataUrl);
  }, [inputText, shape, carvingStyle, font, inkBleed]);

  const handleCreateSeal = () => {
    if (!inputText.trim()) {
      alert("请输入印文内容");
      return;
    }
    const cleanText = inputText.trim().substring(0, 4); // max 4 characters
    const newSeal: Seal = {
      id: "seal-" + Date.now(),
      text: cleanText,
      shape,
      style: carvingStyle,
      font,
      inkBleed,
      dataUrl: previewUrl // Save final image
    };
    onAddSeal(newSeal);
    // Suggest next stamp
    setInputText("");
  };

  return (
    <div className="bg-[#f4f1ea] border border-[#dcd7c9] rounded-xl p-5 shadow-sm text-[#3d2b1f]">
      <div className="flex items-center space-x-2 mb-4 border-b border-[#dcd7c9] pb-3">
        <Hammer className="text-[#8b4513] w-5 h-5" />
        <h2 className="font-semibold text-[#3d2b1f] tracking-wider font-serif">
          金石印社 (印章篆刻与钤印)
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 pb-5 border-b border-[#dcd7c9]/80">
        {/* Designer controls */}
        <div className="space-y-3.5">
          <h3 className="text-xs text-[#7c6a5a] font-serif tracking-widest">印章雕刻台</h3>

          {/* Text Input */}
          <div>
            <label className="text-[11px] text-[#7c6a5a] mb-1 font-serif block">印文内容 (1-4 字)：</label>
            <input
              type="text"
              maxLength={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="请输入印文，如：张三藏书"
              className="w-full bg-[#fcfaf2] border border-[#dcd7c9] rounded p-2 text-[#3d2b1f] text-xs font-serif focus:outline-none focus:border-[#8b4513] tracking-wider"
            />
          </div>

          {/* Shape Selection */}
          <div>
            <label className="text-[11px] text-[#7c6a5a] mb-1 font-serif block">金石形状：</label>
            <div className="grid grid-cols-4 gap-1">
              {(["square", "circle", "oval", "gourd"] as const).map((s) => {
                const label = s === "square" ? "方印" : s === "circle" ? "圆印" : s === "oval" ? "等椭" : "葫芦";
                return (
                  <button
                    key={s}
                    onClick={() => setShape(s)}
                    className={`py-1 text-[11px] font-serif border rounded cursor-pointer transition ${
                      shape === s
                        ? "border-[#8b4513] text-[#8b4513] bg-[#e8e4d9]"
                        : "border-[#dcd7c9] hover:border-[#8b4513]/40 bg-[#fcfaf2]/60 text-[#7c6a5a]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style selection */}
          <div>
            <label className="text-[11px] text-[#7c6a5a] mb-1 font-serif block">刻法阴阳：</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCarvingStyle("yang")}
                className={`py-1.5 text-xs font-serif border rounded cursor-pointer transition flex flex-col items-center justify-center ${
                  carvingStyle === "yang"
                    ? "border-[#8b4513] text-[#8b4513] bg-[#e8e4d9]"
                    : "border-[#dcd7c9] text-[#7c6a5a]"
                }`}
              >
                <span>朱文 (阳刻)</span>
                <span className="text-[9px] text-[#7c6a5a] mt-0.5 scale-90">留字空底，字红底白</span>
              </button>
              <button
                onClick={() => setCarvingStyle("yin")}
                className={`py-1.5 text-xs font-serif border rounded cursor-pointer transition flex flex-col items-center justify-center ${
                  carvingStyle === "yin"
                    ? "border-[#A61B1B] text-[#A61B1B] bg-red-50 font-bold"
                    : "border-[#dcd7c9] text-[#7c6a5a]"
                }`}
              >
                <span>白文 (阴刻)</span>
                <span className="text-[9px] text-[#A61B1B]/80 mt-0.5 scale-90">镂字实底，字白底红</span>
              </button>
            </div>
          </div>

          {/* Font selection */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {(["zhuan", "kai", "song"] as const).map((f) => {
              const label = f === "zhuan" ? "篆体风情" : f === "kai" ? "清俊楷" : "明线宋";
              return (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  className={`py-1 text-[11px] font-serif border rounded cursor-pointer transition ${
                    font === f ? "border-[#8b4513] text-[#8b4513]" : "border-[#dcd7c9] text-[#7c6a5a]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Wear weathering */}
          <div>
            <div className="flex justify-between text-[11px] text-[#7c6a5a] font-serif mb-1">
              <span>金石斑驳度 (风化/渗色)：</span>
              <span className="text-[#8b4513] font-mono font-bold">{inkBleed} 等</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={inkBleed}
              onChange={(e) => setInkBleed(parseInt(e.target.value))}
              className="w-full h-1 bg-[#dcd7c9] rounded-lg appearance-none cursor-pointer accent-[#8b4513]"
            />
          </div>
        </div>

        {/* Realtime preview & Create button */}
        <div className="flex flex-col items-center justify-between bg-[#fcfaf2] p-4 rounded-xl border border-[#dcd7c9]">
          <div className="text-center">
            <span className="text-[10px] text-[#7c6a5a] font-serif block mb-2">印章成相预览</span>
            <div className="relative w-28 h-28 border border-dashed border-[#dcd7c9] rounded-lg flex items-center justify-center bg-[#FAF8F5]/5 p-2 transition p-3">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Seal preview"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                />
              )}
            </div>
            <span className="text-[11px] text-[#A61B1B] font-serif block mt-2 tracking-widest text-[#B22222]">
              {inputText || "「玉玺」"}
            </span>
          </div>

          <button
            onClick={handleCreateSeal}
            className="w-full mt-4 py-2 bg-[#A61B1B] hover:bg-red-800 rounded text-xs font-serif font-bold text-stone-100 flex items-center justify-center gap-1 hover:shadow cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            凿刻此章 (收入印箧)
          </button>
        </div>
      </div>

      {/* Seals Chest (印章库) */}
      <div>
        <h3 className="text-xs text-[#7c6a5a] font-serif tracking-widest mb-3">印匣 (我的印章)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-1">
          {seals.map((seal) => {
            const isDefault = seal.id.startsWith("seal-default");
            return (
              <div
                key={seal.id}
                className="bg-[#fcfaf2]/80 border border-[#dcd7c9] hover:border-[#8b4513]/50 p-2.5 rounded-lg flex flex-col items-center justify-between group relative transition"
              >
                {/* Visual Seal Stamp */}
                <div className="w-14 h-14 bg-[#f4f1ea] rounded-lg p-1.5 flex items-center justify-center mb-1.5">
                  <img
                    src={seal.dataUrl || generateSealDataUrl(seal)}
                    alt={seal.text}
                    className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                  />
                </div>

                <span className="text-xs font-serif text-[#3d2b1f] tracking-wider leading-none">
                  {seal.text}
                </span>

                <div className="flex w-full gap-1 mt-2">
                  <button
                    onClick={() => onStampActivePage(seal.id)}
                    className="flex-1 py-1 bg-[#8b4513]/10 hover:bg-[#8b4513] hover:text-white text-[10px] rounded font-serif text-[#8b4513] transition cursor-pointer text-center"
                    title="在本叶上钤印该章，随后可自由拖动 and 调整大小"
                  >
                    钤印于此
                  </button>

                  {!isDefault && (
                    <button
                      onClick={() => onDeleteSeal(seal.id)}
                      className="p-1 text-[#7c6a5a] hover:text-red-400 hover:bg-[#e8e4d9] rounded transition cursor-pointer"
                      title="销毁此章"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
