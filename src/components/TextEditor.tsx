import React, { useState } from "react";
import { Book } from "../types";
import { Sparkles, FileText, ChevronRight, Edit3, Type, Info, Check, HelpCircle, RefreshCw, Layers } from "lucide-react";

interface TextEditorProps {
  allBooks?: Book[];
  book: Book;
  onUpdateBook: (updated: Book) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ allBooks = [], book, onUpdateBook }) => {
  const [activeTab, setActiveTab] = useState<"content" | "meta" | "ai">("content");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [aiResultNote, setAiResultNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [translationDirection, setTranslationDirection] = useState<"modernToClassical" | "classicalToModern">("modernToClassical");

  const [showImportMenu, setShowImportMenu] = useState(false);
  const [selectedBooksForImport, setSelectedBooksForImport] = useState<string[]>([]);
  const [insertPageBreakOnImport, setInsertPageBreakOnImport] = useState(true);

  const handleChange = (field: keyof Book, value: string) => {
    onUpdateBook({
      ...book,
      [field]: value
    });
  };

  // Quick Wrap annotator shortcut
  const handleWrapSelectedTextWithAnnotation = () => {
    const textarea = document.getElementById("book-content-textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    if (!selectedText) {
      alert("请先用鼠标在编辑框中框选一段文字，然后再点击本按键包裹其为「双行双栏小字注释」。");
      return;
    }

    const wrapped = `((注解：${selectedText}))`;
    const newContent = text.slice(0, start) + wrapped + text.slice(end);
    handleChange("content", newContent);

    // Reset selection focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + wrapped.length);
    }, 50);
  };

  const handleImportAndMerge = () => {
    if (selectedBooksForImport.length === 0) return;
    
    const separator = insertPageBreakOnImport ? "\n\n===换页===\n\n" : "\n\n";

    const importedContents = allBooks
      .filter((b) => selectedBooksForImport.includes(b.id))
      .map((b) => `${b.title}\n${b.content}`)
      .join(separator);

    const newContent = book.content.trim() 
      ? `${book.content}${separator}${importedContents}` 
      : importedContents;

    handleChange("content", newContent);
    setShowImportMenu(false);
    setSelectedBooksForImport([]);
  };

  // Server AI trigger proxies
  const triggerAiPunctuation = async () => {
    if (!book.content.trim()) return;
    setAiLoading(true);
    setAiAction("punctuate");
    setErrorMessage(null);
    setAiResultNote(null);

    try {
      const res = await fetch("/api/ai/punctuate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: book.content })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "断句请求失败，请确认服务端 API 秘钥配置。");
      }

      const data = await res.json();
      if (data.punctuatedText) {
        handleChange("content", data.punctuatedText);
        handleChange("description", data.intro || book.description || "");
        setAiResultNote(`句读校正完毕：已经自动为您编配现代标点并提炼断篇结构，同时在「朱笔句读」模式中自动点亮了红圈旁注。`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "由于外部线路或缺少 API 秘钥，AI 研墨出了点小问题。");
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  const triggerAiTranslation = async () => {
    if (!book.content.trim()) return;
    setAiLoading(true);
    setAiAction("translate");
    setErrorMessage(null);
    setAiResultNote(null);

    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: book.content,
          direction: translationDirection
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "翻译请求失败。");
      }

      const data = await res.json();
      if (data.translatedText) {
        handleChange("content", data.translatedText);
        setAiResultNote(`古今互译完毕：${data.stylisticNote || "文字已洗炼锤炼。"}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "翻译请求失败。您可以在 [Settings > Secrets] 确认 GEMINI_API_KEY 无误。");
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  const triggerAiAnnotation = async () => {
    if (!book.content.trim()) return;
    setAiLoading(true);
    setAiAction("annotate");
    setErrorMessage(null);
    setAiResultNote(null);

    try {
      const res = await fetch("/api/ai/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: book.content })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "生成脂批小字夹注失败。");
      }

      const data = await res.json();
      if (data.annotatedText) {
        handleChange("content", data.annotatedText);
        setAiResultNote(`小字批注插入成功：已在此卷经典正文处增补了 ${data.annotationCount || "数"} 处智能双行侧边批注，请在预览面板中滑动查看其美感效果。`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "生成双行小字注失败。");
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  return (
    <div className="bg-[#f4f1ea] border border-[#dcd7c9] rounded-xl p-5 shadow-sm text-[#3d2b1f] flex flex-col h-full min-h-[480px]">
      {/* Upper tabs selectors */}
      <div className="grid grid-cols-3 gap-1 bg-[#fcfaf2]/60 p-1 rounded-lg border border-[#dcd7c9] mb-4 select-none">
        <button
          onClick={() => setActiveTab("content")}
          className={`py-2 text-xs font-serif rounded flex items-center justify-center gap-1.5 cursor-pointer transition ${
            activeTab === "content" ? "bg-[#8b4513] font-bold text-white" : "text-[#7c6a5a] hover:text-[#8b4513]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          修缮正文
        </button>
        <button
          onClick={() => setActiveTab("meta")}
          className={`py-2 text-xs font-serif rounded flex items-center justify-center gap-1.5 cursor-pointer transition ${
            activeTab === "meta" ? "bg-[#8b4513] font-bold text-white" : "text-[#7c6a5a] hover:text-[#8b4513]"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          卷册题签
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`py-2 text-xs font-serif rounded flex items-center justify-center gap-1.5 cursor-pointer transition ${
            activeTab === "ai" ? "bg-[#8b4513] font-bold text-white" : "text-[#7c6a5a] hover:text-[#8b4513]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          翰林 AI 助手
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex flex-col min-h-[300px]">
        {/* Tab 1: Text Editor Scroll */}
        {activeTab === "content" && (
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between relative">
              <span className="text-[11px] text-[#7c6a5a] font-serif leading-relaxed">
                请输入一篇文章，使用双层半角括号包裹注释： `((我的批注内容))`，即可编译为双行夹注。<br/>段首添加 <b>【顶格】</b> 可强制该段落取消缩进定格排版。换页可以单独占一行输入 <b>===换页===</b>。
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportMenu(!showImportMenu)}
                  className="px-2 py-1 border border-[#8b4513]/60 hover:bg-[#e8e4d9] text-[10px] rounded font-serif text-[#8b4513] flex items-center gap-1 cursor-pointer transition-colors"
                  title="基于多篇文章进行同时合并排版"
                >
                  <Layers className="w-3 h-3" />
                  导入并排文章
                </button>
                <button
                  onClick={handleWrapSelectedTextWithAnnotation}
                  className="px-2 py-1 border border-[#8b4513]/60 hover:bg-[#e8e4d9] text-[10px] rounded font-serif text-[#8b4513] flex items-center gap-1 cursor-pointer transition-colors"
                  title="圈定字符转为小字双行注"
                >
                  <Type className="w-3 h-3" />
                  框选插入注解
                </button>
              </div>

              {/* Import Menu Popover */}
              {showImportMenu && (
                <div className="absolute right-0 top-8 w-64 bg-[#fcfaf2] border border-[#8b4513] rounded-lg shadow-xl z-20 p-3 font-serif flex flex-col gap-2">
                  <div className="text-[11px] font-bold text-[#8b4513]">选择需要合并排版的文章：</div>
                  <div className="max-h-40 overflow-y-auto flex flex-col gap-1 border border-[#dcd7c9] p-1 rounded bg-white">
                    {allBooks.filter(b => b.id !== book.id).length > 0 ? (
                      allBooks.filter(b => b.id !== book.id).map(b => (
                        <label key={b.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#e8e4d9]/50 p-1 rounded text-xs text-[#3d2b1f]">
                          <input 
                            type="checkbox" 
                            className="accent-[#8b4513]"
                            checked={selectedBooksForImport.includes(b.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBooksForImport([...selectedBooksForImport, b.id]);
                              } else {
                                setSelectedBooksForImport(selectedBooksForImport.filter(id => id !== b.id));
                              }
                            }}
                          />
                          <span className="truncate">{b.title}</span>
                        </label>
                      ))
                    ) : (
                      <span className="text-[10px] text-stone-400 p-2">书架没有其他文章</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 px-1 py-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#5c4a3d] hover:text-[#8b4513]">
                      <input 
                        type="checkbox" 
                        className="accent-[#8b4513]"
                        checked={insertPageBreakOnImport}
                        onChange={(e) => setInsertPageBreakOnImport(e.target.checked)}
                      />
                      <span>文章之间自动插入换页符</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 mt-1">
                    <button 
                      onClick={() => setShowImportMenu(false)}
                      className="text-[10px] px-2 py-1 border border-[#dcd7c9] rounded hover:bg-[#e8e4d9] text-[#7c6a5a]"
                    >
                      取消
                    </button>
                    <button 
                      onClick={handleImportAndMerge}
                      disabled={selectedBooksForImport.length === 0}
                      className="text-[10px] px-2 py-1 bg-[#8b4513] text-white rounded hover:bg-[#6b3410] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      载入选中文章
                    </button>
                  </div>
                </div>
              )}
            </div>

            <textarea
              id="book-content-textarea"
              value={book.content}
              onChange={(e) => handleChange("content", e.target.value)}
              placeholder="子曰：学而时习之（在你想加注解的字词旁，添加双扩号如：((温习实践)) 即可输出古典双行小字。），不亦说乎？..."
              className="w-full flex-1 min-h-[220px] bg-[#fcfaf2] border border-[#dcd7c9] p-4 rounded-lg text-[#3d2b1f] font-serif text-[13px] leading-relaxed tracking-wide focus:outline-none focus:border-[#8b4513] resize-none"
            />
            
            <div className="text-[10px] text-[#7c6a5a] text-right">
              当前卷长：<span className="font-mono text-[#8b4513] font-bold">{book.content.length}</span> 汉字
            </div>
          </div>
        )}

        {/* Tab 2: Metadatas */}
        {activeTab === "meta" && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs text-[#7c6a5a] font-serif block mb-1">典籍书名 (卷册题签)：</label>
              <input
                type="text"
                value={book.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="例如：论语·学而"
                className="w-full bg-[#fcfaf2] border border-[#dcd7c9] rounded p-2.5 text-[#3d2b1f] text-sm font-serif focus:outline-none focus:border-[#8b4513] tracking-wider"
              />
            </div>

            {/* Author */}
            <div>
              <label className="text-xs text-[#7c6a5a] font-serif block mb-1">著者 (或抄写者)：</label>
              <input
                type="text"
                value={book.author}
                onChange={(e) => handleChange("author", e.target.value)}
                placeholder="例如：孔子及弟子 / 宋代监刻"
                className="w-full bg-[#fcfaf2] border border-[#dcd7c9] rounded p-2.5 text-[#3d2b1f] text-sm font-serif focus:outline-none focus:border-[#8b4513] tracking-wider"
              />
            </div>

            {/* Summary description */}
            <div>
              <label className="text-xs text-[#7c6a5a] font-serif block mb-1">典籍导言 (书影大意解说)：</label>
              <textarea
                value={book.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="简单记叙此册书页出版源流、版本传承演变等背景信息..."
                className="w-full h-24 bg-[#fcfaf2] border border-[#dcd7c9] rounded p-2.5 text-[#3d2b1f] text-xs font-serif leading-relaxed focus:outline-none focus:border-[#8b4513] resize-none"
              />
            </div>
          </div>
        )}

        {/* Tab 3: AI Scribes Assistants */}
        {activeTab === "ai" && (
          <div className="space-y-5 flex flex-col justify-between flex-1">
            <div className="space-y-4">
              <h3 className="text-xs font-serif text-[#8b4513] tracking-wider flex items-center gap-1 bg-[#e8e4d9]/50 p-2 rounded border border-[#8b4513]/30">
                <Sparkles className="w-4 h-4 text-[#8b4513]" />
                翰林院 AI 笔墨服务器已开启，支持如下典籍活化操作：
              </h3>

              {/* Action 1: Punctuation */}
              <div className="p-3 bg-[#fcfaf2]/60 rounded-lg border border-[#dcd7c9] flex items-start justify-between gap-3 group hover:border-[#8b4513]/30 hover:bg-[#fcfaf2] transition-all">
                <div className="space-y-1">
                  <h4 className="text-xs font-serif font-bold text-[#3d2b1f]">自动句读与断句润色</h4>
                  <p className="text-[10px] text-[#7c6a5a] leading-normal">智能分析全卷无标点文言文，完成句子拆划、现代标点匹配，并赋予「朱笔圈点」句读坐标。</p>
                </div>
                <button
                  onClick={triggerAiPunctuation}
                  disabled={aiLoading}
                  className="px-3 py-1.5 bg-[#8b4513] hover:bg-[#6b3410] text-[11px] text-white font-serif rounded cursor-pointer transition-colors whitespace-nowrap"
                >
                  断句润色
                </button>
              </div>

              {/* Action 2: Translation */}
              <div className="p-3 bg-[#fcfaf2]/60 rounded-lg border border-[#dcd7c9] flex flex-col gap-3 group hover:border-[#8b4513]/30 hover:bg-[#fcfaf2] transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-serif font-bold text-[#3d2b1f]">古今文白互译</h4>
                    <p className="text-[10px] text-[#7c6a5a] leading-normal">将大白话文章重构润色，转化成考究对仗、言简意赅的古风散文；或将古典晦涩文言释为流畅白话文。</p>
                  </div>
                  <button
                    onClick={triggerAiTranslation}
                    disabled={aiLoading}
                    className="px-3 py-1.5 bg-[#8b4513] hover:bg-[#6b3410] text-[11px] text-white font-serif rounded cursor-pointer transition-colors whitespace-nowrap"
                  >
                    翻译转化
                  </button>
                </div>
                {/* translation choices switcher */}
                <div className="flex border border-[#dcd7c9] p-0.5 rounded bg-[#f4f1ea] self-end text-[10px] font-serif">
                  <button
                    onClick={() => setTranslationDirection("modernToClassical")}
                    className={`px-2 py-0.5 rounded cursor-pointer transition ${
                      translationDirection === "modernToClassical" ? "bg-[#8b4513] text-white" : "text-[#7c6a5a]"
                    }`}
                  >
                    白话文 ➔ 秀雅古文
                  </button>
                  <button
                    onClick={() => setTranslationDirection("classicalToModern")}
                    className={`px-2 py-0.5 rounded cursor-pointer transition ${
                      translationDirection === "classicalToModern" ? "bg-[#8b4513] text-white" : "text-[#7c6a5a]"
                    }`}
                  >
                    古籍文言 ➔ 现代白话
                  </button>
                </div>
              </div>

              {/* Action 3: Annotations */}
              <div className="p-3 bg-[#fcfaf2]/60 rounded-lg border border-[#dcd7c9] flex items-start justify-between gap-3 group hover:border-[#8b4513]/30 hover:bg-[#fcfaf2] transition-all">
                <div className="space-y-1">
                  <h4 className="text-xs font-serif font-bold text-[#3d2b1f]">智能夹注脂批</h4>
                  <p className="text-[10px] text-[#7c6a5a] leading-normal">精析文章微言大义，智能提炼词汇要点。在名物字词或篇节高潮处自动穿插 `((夹注释言))` 括号小字列。</p>
                </div>
                <button
                  onClick={triggerAiAnnotation}
                  disabled={aiLoading}
                  className="px-3 py-1.5 bg-[#A61B1B] hover:bg-red-800 text-[11px] text-white font-serif rounded cursor-pointer transition-colors whitespace-nowrap"
                >
                  增补批注
                </button>
              </div>
            </div>

            {/* AI Action Status Logs / Callbacks */}
            <div className="mt-4 pt-3 border-t border-[#dcd7c9] min-h-[60px]">
              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-2 text-center text-xs text-[#8b4513] font-serif animate-pulse gap-1">
                  <RefreshCw className="animate-spin w-4 h-4 text-[#8b4513]" />
                  <span>
                    {aiAction === "punctuate"
                      ? "翰林院提笔断句句读中..."
                      : aiAction === "translate"
                      ? "翰林院研墨翻译卷牍中..."
                      : "朱笔穿插脂批夹注评点中..."}
                  </span>
                </div>
              )}

              {aiResultNote && !aiLoading && (
                <div className="p-2.5 bg-[#e8e4d9]/50 border border-[#8b4513]/40 rounded-lg text-[#8b4513] text-[11px] leading-relaxed font-serif flex items-start gap-1.5">
                  <Check className="w-4 h-4 shrink-0 text-[#8b4513] mt-0.5" />
                  <span>{aiResultNote}</span>
                </div>
              )}

              {errorMessage && !aiLoading && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-[#A61B1B] text-[11px] leading-normal font-serif">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>⚠️ 研墨出神 (提示信息):</span>
                  </p>
                  <p className="mt-1 leading-normal font-mono text-[10px] bg-[#FAF8F5] p-1.5 rounded border border-[#dcd7c9] overflow-x-auto select-text">
                    {errorMessage}
                  </p>
                  <p className="text-[9px] text-[#7c6a5a] mt-1.5">
                    这通常是因为当前环境没有配好 API Key 运行，您可在右上角“Secrets(密钥)”配置面板添加 GEMINI_API_KEY。您仍可在本地纯手工增减双括号 `((注解文本))` 完成完美的双行古典排版！
                  </p>
                </div>
              )}

              {!aiLoading && !aiResultNote && !errorMessage && (
                <div className="text-center py-3 text-[10px] text-[#7c6a5a] font-serif flex items-center justify-center gap-1 select-none">
                  <HelpCircle className="w-3.5 h-3.5" />
                  提示：通过 AI 自动转化生成的文本随时会在当前编辑框中替换更新，请注意保存藏书。
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
