import React from "react";
import { Book } from "../types";
import { BookOpen, Trash2, Plus, RotateCcw } from "lucide-react";

interface BookshelfProps {
  books: Book[];
  activeBookId: string;
  onSelectBook: (id: string) => void;
  onDeleteBook: (id: string) => void;
  onAddNewBook: () => void;
  onResetDefaultClassics: () => void;
}

export const defaultClassics: Book[] = [
  {
    id: "classic-1",
    title: "论语·学而",
    author: "孔子及弟子",
    content: "子曰((孔子说))：“学而时习之((温习、实践))，不亦说乎((喜悦、愉快))？有朋自远方来，不亦乐乎？人不知而不愠((怨恨、愤怒))，不亦君子乎？”\n\n曾子曰：“吾日三省吾身((自身言行检验))：为人谋而不忠乎((尽心竭力))？与朋友交而不信乎((诚信相守))？传不习乎((温习和应用所学))？”",
    description: "《论语》是儒家经典之一，记录孔子及其弟子的言行。主要论述做人、治学与处世之道。",
    createdAt: 1717900000000,
    seals: [
      { id: "s1", sealId: "seal-default-1", pageIndex: 0, xPct: 84, yPct: 15, scale: 0.9 },
      { id: "s2", sealId: "seal-default-2", pageIndex: 1, xPct: 15, yPct: 82, scale: 0.8 }
    ]
  },
  {
    id: "classic-2",
    title: "老子·道德经",
    author: "老子",
    content: "道可道((言说名状))，非常道((恒久不变之道))。名可名，非常名。无名天地之始；有名万物之母。\n\n故常无欲((静穆虚静))，以观其妙；常有欲((感物起意))，以观其徼((机微、轮廓))。此两者同出而异名，同谓之玄((深邃莫测))。玄之又玄，众妙之门。",
    description: "东方哲学巨著《道德经》，开篇阐释“道”与“名”的终极本体论及宇宙起源机微之妙。",
    createdAt: 1717900100000,
    seals: [
      { id: "s3", sealId: "seal-default-3", pageIndex: 0, xPct: 85, yPct: 12, scale: 0.9 }
    ]
  },
  {
    id: "classic-3",
    title: "诗经·周南·关雎",
    author: "佚名",
    content: "关关雎鸠((睢鸠：水鸟，声关关))，在河之洲。窈窕淑女((窈窕：娴静美好；淑：善良))，君子好逑。\n\n参差荇菜((荇菜：一种浅水植物))，左右流之((流：捞取之意))。窈窕淑女，寤寐求之((寤：醒；寐：卧寐))。\n\n求之不得，寤寐思服((思：叹词；服：思念))。悠哉悠哉((悠：深长：思念无尽))，辗转反侧。\n\n参差荇菜，左右采之。窈窕淑女，琴瑟友之((琴瑟：古乐器，比喻亲密交好))。\n\n参差荇菜，左右芼之((芼：选择、择取))。窈窕淑女，钟鼓乐之。",
    description: "《诗经》首篇，写古代青年男女之倾慕。钟鼓琴瑟，诗意婉转，极富音律之美。",
    createdAt: 1717900200000,
    seals: [
      { id: "s4", sealId: "seal-default-1", pageIndex: 0, xPct: 85, yPct: 15, scale: 0.8 },
      { id: "s5", sealId: "seal-default-4", pageIndex: 2, xPct: 15, yPct: 80, scale: 0.95 }
    ]
  },
  {
    id: "classic-4",
    title: "桃花源记",
    author: "陶渊明",
    content: "晋太元中((东晋太元年间))，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷((落花纷呈))。渔人甚异之((异：感到惊异))，复前行，欲穷其林。\n\n林尽水源，便得一山，山有小口，仿佛若有光。便舍船，从口入。初极狭，才通人。复行数十步，豁然开朗((大开阔界))。土地平旷，屋舍俨然((排列齐整))，有良田、美池、桑竹之属。阡陌交通((田间小路交错))，鸡犬相闻。其中往来种作，男女衣着，悉如外人。黄发垂髫((垂髫：童子：黄发：老人))，并怡然自乐。",
    description: "东晋陶渊明名篇，描写独立于尘世之外的和谐乌托邦——桃源乐土。",
    createdAt: 1717900300000,
    seals: [
      { id: "s6", sealId: "seal-default-2", pageIndex: 0, xPct: 86, yPct: 15, scale: 0.85 }
    ]
  }
];

export const Bookshelf: React.FC<BookshelfProps> = ({
  books,
  activeBookId,
  onSelectBook,
  onDeleteBook,
  onAddNewBook,
  onResetDefaultClassics
}) => {
  return (
    <div className="bg-[#f4f1ea] border border-[#dcd7c9] rounded-xl p-5 shadow-sm text-[#3d2b1f]">
      <div className="flex items-center justify-between mb-4 border-b border-[#dcd7c9] pb-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="text-[#8b4513] w-5 h-5" />
          <h2 className="font-semibold text-[#3d2b1f] tracking-wider font-serif">
            昭明藏书阁 (书架)
          </h2>
        </div>
        <div className="flex space-x-1.5">
          <button
            onClick={onResetDefaultClassics}
            title="恢复默认古典文献"
            className="p-1 px-2 border border-[#dcd7c9] rounded text-xs text-[#7c6a5a] hover:text-[#8b4513] hover:bg-[#e8e4d9] transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
          <button
            onClick={onAddNewBook}
            className="p-1.5 px-3 bg-[#8b4513] hover:bg-[#6b3410] rounded text-xs font-medium text-white flex items-center justify-center gap-1 hover:shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            著书
          </button>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="text-center py-8 text-[#7c6a5a] text-sm font-serif">
          暂无藏书，请点击“著书”开始创作或点击重置加载古典经典。
        </div>
      ) : (
        <div className="flex flex-col space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {books.map((book, idx) => {
            const isActive = book.id === activeBookId;
            return (
              <div
                key={book.id}
                onClick={() => onSelectBook(book.id)}
                className={`relative group p-3.5 rounded-lg border flex flex-col transition cursor-pointer ${
                  isActive
                    ? "bg-[#e8e4d9] border-[#8b4513] shadow-sm"
                    : "bg-[#fcfaf2]/60 border-[#dcd7c9] hover:border-[#8b4513]/50 hover:bg-[#fcfaf2]"
                }`}
              >
                {/* Visual antique styled roll tag */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs text-[#7c6a5a] px-1 border border-[#dcd7c9] rounded bg-[#e8e4d9]/40">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className={`font-serif text-sm tracking-widest font-medium ${
                        isActive ? "text-[#8b4513] font-bold" : "text-[#3d2b1f] group-hover:text-[#8b4513]"
                      }`}
                    >
                      {book.title}
                    </h3>
                  </div>

                  {/* We shield delete button on default books (unless duplicates) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定要将《${book.title}》从藏书架移出吗？`)) {
                        onDeleteBook(book.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#e8e4d9] text-[#7c6a5a] hover:text-[#A61B1B] transition cursor-pointer"
                    title="移除此藏书并销毁随附印章"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-1.5 flex justify-between items-center text-[11px] text-[#7c6a5a] font-serif">
                  <span>著者：{book.author || "佚名"}</span>
                  <span className="scale-90 origin-right">
                    {book.seals ? book.seals.length : 0} 钤
                  </span>
                </div>

                {book.description && (
                  <p className="mt-2 text-[#7c6a5a]/80 line-clamp-2 text-xs leading-relaxed">
                    {book.description}
                  </p>
                )}

                {/* Sandalwood shelf line representation */}
                <div className="absolute bottom-0 left-3 right-3 h-[1px] bg-[#dcd7c9] group-hover:bg-[#8b4513]/30 transition animate-pulse"></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decorative Traditional Calligraphic Proverb */}
      <div className="mt-5 text-center text-[11px] font-serif text-[#7c6a5a] border-t border-[#dcd7c9]/60 pt-3">
        “腹有诗书气自华，最是书香能致远。”
      </div>
    </div>
  );
};
