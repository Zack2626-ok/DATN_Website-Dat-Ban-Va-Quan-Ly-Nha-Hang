import React, { useState, useEffect } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";

interface MenuItem {
  name: string;
  price: number;
  unit: string;
  desc?: string;
  isHot?: boolean;
}

interface PageContent {
  title: string;
  subtitle: string;
  image: string;
  description: string;
  items: MenuItem[];
}

interface MenuSpread {
  category: string;
  title: string;
  leftPage: PageContent;
  rightPage: PageContent;
}

const MENU_SPREADS: MenuSpread[] = [
  {
    category: "Khai Vị & Gỏi Cuộn",
    title: "Khai Vị Cổ Truyền & Gỏi Cuộn Di Sản",
    leftPage: {
      title: "Khai Vị Cổ Truyền",
      subtitle: "Khai Vị Đầu Bếp Gợi Ý — Chef's Appetizers",
      image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&auto=format&fit=crop&q=80",
      description: "Hương vị khai vị nhẹ nhàng đánh thức vị giác bằng những nguyên liệu mộc mạc tinh túy nhất từ mọi miền Tổ quốc.",
      items: [
        { name: "Nem rán giòn phố cổ Hà Nội", price: 95000, unit: "Dĩa", desc: "Thịt heo băm nhuyễn chiên cùng mộc nhĩ, miến dong chín vàng giòn rụm.", isHot: true },
        { name: "Chả giò cua bể Hải Phòng cuốn chặt", price: 125000, unit: "Dĩa", desc: "Cua bể tươi ngon béo ngậy trộn nấm mèo bọc trong vỏ bánh tráng giòn dai." },
        { name: "Bánh bột lọc tôm sông đất cố đô", price: 75000, unit: "Chén", desc: "Bột lọc trong suốt dẻo dai bọc tôm sông rim đậm đà chan nước mắm chua ngọt.", isHot: true },
        { name: "Nem lụi nướng sả tươi Hội An", price: 110000, unit: "Phần", desc: "Thịt heo giã nhuyễn bọc sả nướng than hoa ăn kèm rau sống và sốt đậu phộng." },
        { name: "Bánh xèo miền Tây sông nước vàng giòn", price: 115000, unit: "Cái", desc: "Bánh xèo nhân giá đỗ, tôm thịt vỏ mỏng giòn rụm cuốn cải xanh ăn kèm nước mắm tỏi ớt đặc sắc." }
      ]
    },
    rightPage: {
      title: "Gỏi & Cuộn Mộc Mạc",
      subtitle: "Gỏi Cuộn Di Sản Việt — Heritage Salads & Rolls",
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
      description: "Sự tươi mát của rau sống bản địa hòa quyện cùng vị ngọt tôm thịt, điểm xuyết nước sốt đậm đà bí truyền.",
      items: [
        { name: "Gỏi ngó sen tôm thịt", price: 145000, unit: "Dĩa", desc: "Ngó sen giòn sần sật trộn tôm đất tươi ngọt, thịt ba chỉ luộc và rau thơm.", isHot: true },
        { name: "Gỏi hoa chuối bắp bò Tây Bắc", price: 135000, unit: "Dĩa", desc: "Hoa chuối bào sợi mỏng bóp chua ngọt cùng bắp bò luộc mềm và lạc rang." },
        { name: "Cuốn diếp cải xanh tôm sông", price: 85000, unit: "Dĩa", desc: "Tôm luộc, thịt ba rọi và bún tươi cuộn gọn trong lá cải xanh mát chấm tương đậu béo." },
        { name: "Phở cuốn thịt bò tơ nướng Hà Nội", price: 120000, unit: "Dĩa", desc: "Thịt bò xào lăn thơm phức cuốn trong bánh phở mềm mịn kèm rau thơm.", isHot: true },
        { name: "Gỏi xoài xanh tôm khô đất chua ngọt", price: 95000, unit: "Dĩa", desc: "Xoài xanh bào sợi chua thanh trộn tôm khô đất cay nồng đặc sắc." }
      ]
    }
  },
  {
    category: "Hải Sản & Món Quay",
    title: "Vị Biển Miền Trung & Vịt Quay Gia Truyền",
    leftPage: {
      title: "Hải Sản Tươi Sống",
      subtitle: "Vị Biển Miền Trung — Central Coast Seafood",
      image: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800&auto=format&fit=crop&q=80",
      description: "Đánh bắt tươi sống trong ngày, giữ nguyên vị ngọt đậm đà, tươi ngon của biển khơi miền Trung nắng gió.",
      items: [
        { name: "Sò dương nướng sốt mỡ hành sa tế", price: 159000, unit: "Dĩa", desc: "Sò tươi dai ngọt hòa quyện cùng sa tế thơm nồng.", isHot: true },
        { name: "Cá chình nướng nghệ đất sét Hội An", price: 420000, unit: "Phần", desc: "Cá chình béo ngậy ướp nghệ tươi nướng niêu đất sực mùi thơm thảo mộc." },
        { name: "Cá mú đỏ hấp tàu xì Hồng Kông", price: 480000, unit: "Con", desc: "Cá mú đỏ thịt ngọt chắc nướng chín tới cùng nước tương tàu xì hảo hạng." },
        { name: "Tôm hùm bông đút lò phô mai đút lò", price: 1250000, unit: "Con", desc: "Tôm hùm thượng hạng nướng phô mai đút lò thơm lừng quyến rũ.", isHot: true },
        { name: "Hàu sữa Nha Trang nướng bơ tỏi", price: 180000, unit: "Phần", desc: "Hàu sữa béo ngậy nướng sốt bơ tỏi thơm giòn." }
      ]
    },
    rightPage: {
      title: "Vịt Quay Cung Đình",
      subtitle: "Vịt Quay Gia Truyền ",
      image: "https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=800&auto=format&fit=crop&q=80",
      description: "Thịt vịt tẩm ướp 12 loại thảo mộc cung đình theo công thức bí truyền độc bản, da giòn bóng bẩy giòn rụm.",
      items: [
        { name: "Vịt quay gia truyền nguyên con", price: 1090000, unit: "Con", desc: "Ăn kèm bánh bao hấp/chiên và sốt chấm tương đen truyền thống.", isHot: true },
        { name: "Vịt quay gia truyền nửa con", price: 590000, unit: "Phần", desc: "Phù hợp cho nhóm khách nhỏ thưởng thức nét tinh túy ẩm thực." },
        { name: "Sườn heo nướng lá mắc mật Lạng Sơn", price: 280000, unit: "Dĩa", desc: "Sườn heo tảng ướp mật ong rừng cùng lá mắc mật thơm dịu." },
        { name: "Bò tơ nướng lụi bản gang sả ớt", price: 340000, unit: "Phần", desc: "Bò tơ mềm ngọt nướng cháy xém cạnh trên bản gang nóng hổi.", isHot: true },
        { name: "Heo sữa quay giòn giòn da", price: 1450000, unit: "Con", desc: "Heo sữa nguyên con quay giòn da đỏ bóng ăn kèm dưa kiệu." }
      ]
    }
  },
  {
    category: "Mâm Cơm & Món Sợi",
    title: "Mâm Cơm Sum Họp & Tinh Hoa Món Sợi",
    leftPage: {
      title: "Mâm Cơm Sum Họp",
      subtitle: "Combo Sung Túc & Combo Thịnh Soạn",
      image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
      description: "Hội tụ đầy đủ hương vị đặc sản ba miền Bắc - Trung - Nam, mang ý nghĩa chúc gia đình sum vầy an khang.",
      items: [
        { name: "Combo Sung Túc (3 - 4 người)", price: 2300000, unit: "Set", desc: "Gồm gỏi ngó sen, gà nướng xôi phồng, cá kho tộ, canh chua Nam Bộ và cơm niêu đất.", isHot: true },
        { name: "Combo Thịnh Soạn (5 - 6 người)", price: 2830000, unit: "Set", desc: "Bổ sung hàu nướng bơ tỏi, heo quay bánh hỏi và lẩu hải sản chua cay thập cẩm." },
        { name: "Combo Phố Cổ Hội An hội tụ", price: 1850000, unit: "Set", desc: "Trải nghiệm trọn vẹn đặc sản cơm gà Hội An, cao lầu thịt xá xíu và bánh vạc tai vạc.", isHot: true },
        { name: "Cơm niêu đất xá xíu hoàng kim hạt dẻo", price: 145000, unit: "Niêu", desc: "Cơm niêu nóng hổi phủ thịt xá xíu mềm thơm, trứng muối bùi béo ngọt ngào." },
        { name: "Canh chua cá lóc Nam Bộ chuẩn vị", price: 120000, unit: "Tô", desc: "Nước dùng cá lóc tươi nấu chua chua ngọt ngọt cùng dứa, dọc mùng và me quả." }
      ]
    },
    rightPage: {
      title: "Món Sợi Truyền Thống",
      subtitle: "Tinh Hoa Sợi Gạo Việt Nam — Noodles",
      image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80",
      description: "Bánh tráng làm thủ công từ gạo mới thơm, nước dùng ninh hầm xương ống nguyên chất 24h trong veo, thanh ngọt tự nhiên.",
      items: [
        { name: "Mỳ Quảng gà ta trứng cút đặc sản", price: 85000, unit: "Tô", desc: "Sợi mỳ vàng dai cùng gà ta kho đậm đà, rắc lạc rang và bánh đa giòn rụm." },
        { name: "Mỳ Quảng tôm thịt sườn non rút xương", price: 95000, unit: "Tô", desc: "Sự kết hợp tuyệt vời của tôm sông rim ngọt và sườn non ninh mềm mượt." },
        { name: "Phở bò Wagyu tái lăn đặc biệt", price: 185000, unit: "Tô", desc: "Sự giao thoa ẩm thực Việt Nhật với thịt bò Wagyu xào tái lăn cùng hành hoa.", isHot: true },
        { name: "Bún bò Huế ngự uyển chân giò", price: 90000, unit: "Tô", desc: "Nước dùng cay nồng mùi sả mắm ruốc đặc trưng, ăn kèm chả cua bể." },
        { name: "Bún chả nem cua bể Hà Nội nướng chao", price: 95000, unit: "Phần", desc: "Thịt viên nướng cháy cạnh thơm lừng ăn kèm nem cua bể giòn ngọt ngào." }
      ]
    }
  },
  {
    category: "Thức Uống & Tráng Miệng",
    title: "Trà Thảo Mộc, Sinh Tố Nhiệt Đới & Cocktails",
    leftPage: {
      title: "Hương Trà & Tráng Miệng",
      subtitle: "Trà Thảo Mộc & Chè Cung Đình",
      image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=800&auto=format&fit=crop&q=80",
      description: "Thức trà ướp hoa nhài thanh mát, hạt sen long nhãn ngọt thanh và sâm dứa thanh lọc cơ thể dồi dào sức sống.",
      items: [
        { name: "Trà ô long sen vàng kem sữa béo", price: 65000, unit: "Ly", desc: "Trà ô long mộc mạc thơm lừng lớp kem phô mai béo ngậy mặn mặn." },
        { name: "Trà đào cam sả hạt chia tươi", price: 55000, unit: "Ly", desc: "Hương sả nồng ấm hòa quyện đào lát giòn ngọt mọng nước." },
        { name: "Chè hạt sen long nhãn Huế", price: 45000, unit: "Chén", desc: "Hạt sen bùi dẻo bọc trong nhãn lồng cùi dày ngọt lịm.", isHot: true },
        { name: "Sữa chua hoa quả đác hạt dẻo", price: 50000, unit: "Ly", desc: "Sữa chua lên men tự nhiên trộn cùng dâu tây, kiwi và hạt đác rim mật." },
        { name: "Chè trôi nước ngũ sắc trân châu", price: 40000, unit: "Chén", desc: "Bánh trôi nước năm màu dẻo dai nhân đậu xanh chan nước cốt dừa béo." }
      ]
    },
    rightPage: {
      title: "Cocktails & Sinh Tố",
      subtitle: "Sinh Tố Nhiệt Đới & Cocktails Độc Bản",
      image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80",
      description: "Trái cây chín mọng nhiệt đới xay kem béo kết hợp bộ sưu tập cocktail pha chế sáng tạo đánh thức mọi giác quan.",
      items: [
        { name: "Sinh tố bơ dừa sáp béo ngậy", price: 75000, unit: "Ly", desc: "Bơ sáp Đắk Lắk xay nhuyễn cùng sữa đặc và nước cốt dừa thơm béo." },
        { name: "Nước ép cam xoài tươi nhiệt đới", price: 60000, unit: "Ly", desc: "Cung cấp vitamin dồi dào từ cam vàng và xoài cát chín thơm ngon." },
        { name: "Cocktail Restro Signature", price: 165000, unit: "Ly", desc: "Sự kết hợp tinh tế giữa rượu Gin, nước cốt chanh dây, lá bạc hà tươi mát.", isHot: true },
        { name: "Sâm dứa sữa dừa đá bào Hội An", price: 40000, unit: "Ly", desc: "Thức uống tuổi thơ giải nhiệt nhanh chóng." },
        { name: "Cà phê cốt dừa Hà Nội thơm nồng", price: 55000, unit: "Ly", desc: "Cà phê espresso sánh đậm xay cùng đá và cốt dừa sánh béo ngậy." }
      ]
    }
  }
];

export const MenuPage: React.FC = () => {
  // Navigation states
  const [spreadIndex, setSpreadIndex] = useState(0);
  
  // Animation states
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [displayIndex, setDisplayIndex] = useState(0);

  // Synchronize displayIndex with spreadIndex after animation halfpoint
  useEffect(() => {
    if (isFlipping) {
      const timer = setTimeout(() => {
        setDisplayIndex(spreadIndex);
      }, 300); // 300ms is exactly when Y rotation is at 90 degrees
      return () => clearTimeout(timer);
    } else {
      setDisplayIndex(spreadIndex);
    }
  }, [spreadIndex, isFlipping]);

  const handlePrevPage = () => {
    if (isFlipping) return;
    setFlipDirection("prev");
    setIsFlipping(true);
    setSpreadIndex((prev) => (prev > 0 ? prev - 1 : MENU_SPREADS.length - 1));
    setTimeout(() => {
      setIsFlipping(false);
    }, 700); // Full animation takes 700ms
  };

  const handleNextPage = () => {
    if (isFlipping) return;
    setFlipDirection("next");
    setIsFlipping(true);
    setSpreadIndex((prev) => (prev < MENU_SPREADS.length - 1 ? prev + 1 : 0));
    setTimeout(() => {
      setIsFlipping(false);
    }, 700);
  };

  // Get active spread contents
  const currentSpread = MENU_SPREADS[displayIndex];
  
  // Get transitional content during page turning
  const nextIndex = spreadIndex;
  const prevIndex = displayIndex;
  const nextSpread = MENU_SPREADS[nextIndex];
  const prevSpread = MENU_SPREADS[prevIndex];

  return (
    <div className="bg-[#1a1410] min-h-screen text-[#2a221c] py-16 px-4 md:px-8 relative overflow-hidden font-sans">
      {/* 3D Page flip CSS styles */}
      <style>{`
        .perspective-book {
          perspective: 2200px;
        }
        .book-container {
          transform-style: preserve-3d;
          position: relative;
        }
        .page-turning-right {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 50%;
          z-index: 30;
          transform-style: preserve-3d;
          transform-origin: left center;
          animation: flipToLeft 0.7s cubic-bezier(0.645, 0.045, 0.355, 1) forwards;
        }
        .page-turning-left {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 50%;
          z-index: 30;
          transform-style: preserve-3d;
          transform-origin: right center;
          animation: flipToRight 0.7s cubic-bezier(0.645, 0.045, 0.355, 1) forwards;
        }
        .face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          background: #fdfcf7;
        }
        .face-back {
          transform: rotateY(180deg);
        }
        @keyframes flipToLeft {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(-180deg);
          }
        }
        @keyframes flipToRight {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(180deg);
          }
        }
      `}</style>

      {/* Background patterns */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-repeat bg-[radial-gradient(#dfb05b_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Header Title */}
        <div className="text-center mb-16 text-[#fdfbf7]">
          <span className="flex items-center justify-center gap-1.5 text-client-secondary text-sm font-bold uppercase tracking-widest mb-3">
            <Sparkles size={16} /> Tinh Hoa Ẩm Thực Truyền Thống <Sparkles size={16} />
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-wide text-white">Thực Đơn Ấn Phẩm</h1>
          <p className="mt-3 text-[#c9bfae] max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Khám phá trọn vẹn thực đơn 8 trang đặc sắc của nhà hàng. Sử dụng hai mũi tên bên cạnh để lật giở từng trang thực đơn đầy sống động.
          </p>
        </div>

        {/* Immersive Book Shell */}
        <div className="relative mx-auto max-w-6xl perspective-book">
          {/* Flip buttons floating on sides for larger screens */}
          <button
            onClick={handlePrevPage}
            disabled={isFlipping}
            className="absolute left-[-60px] top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center h-14 w-14 rounded-full border-2 border-[#dfb05b]/40 bg-[#2d231a] text-[#dfb05b] hover:bg-client-primary hover:text-white transition-all shadow-xl cursor-pointer disabled:opacity-50 z-40"
            aria-label="Trang trước"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={handleNextPage}
            disabled={isFlipping}
            className="absolute right-[-60px] top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center h-14 w-14 rounded-full border-2 border-[#dfb05b]/40 bg-[#2d231a] text-[#dfb05b] hover:bg-client-primary hover:text-white transition-all shadow-xl cursor-pointer disabled:opacity-50 z-40"
            aria-label="Trang sau"
          >
            <ChevronRight size={28} />
          </button>

          {/* Opened Menu Book Container */}
          <div className="bg-[#fcfaf5] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] border-8 border-[#30251c] relative min-h-[630px] overflow-hidden flex flex-col md:flex-row book-container">
            
            {/* Book Spine (Middle Shadow Effect) */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-8 bg-gradient-to-r from-black/15 via-transparent to-black/15 z-20 hidden md:block border-l border-r border-black/5"></div>
            
            {/* 3D FLIPPING ANIMATED PAGE LAYER */}
            {isFlipping && flipDirection === "next" && (
              <div className="page-turning-right hidden md:block">
                {/* Front side of flipping page (current right page content) */}
                <div className="face p-6 sm:p-10 border-l border-[#e7deb8]/40 relative bg-[#fdfcf7] bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#fbfaf0_100%)] shadow-[-5px_0_15px_rgba(0,0,0,0.15)]">
                  <div className="absolute inset-4 border-2 border-double border-client-secondary/40 rounded-xl pointer-events-none"></div>
                  <div className="relative z-10 p-2 sm:p-4 h-full flex flex-col justify-between">
                    <div>
                      <div className="text-center mb-6">
                        <span className="text-[10px] tracking-widest font-black text-client-primary uppercase block mb-1">
                          {prevSpread.rightPage.subtitle}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#36271c] px-4 border-b border-client-secondary/20 pb-2 inline-block">
                          {prevSpread.rightPage.title}
                        </h2>
                      </div>
                      <div className="relative h-44 overflow-hidden rounded-lg border border-client-secondary/20 mb-6 shadow-xs">
                        <img src={prevSpread.rightPage.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-4">
                        {prevSpread.rightPage.items.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-baseline gap-2 text-xs opacity-50">
                            <span className="font-bold text-[#2c2017]">{item.name}</span>
                            <span className="border-b border-dotted border-client-secondary/30 flex-1 mx-2 h-1"></span>
                            <span className="font-black text-client-primary font-mono">{item.price.toLocaleString("vi-VN")}đ</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-center text-[10px] text-client-muted uppercase font-bold tracking-widest">
                      Trang {displayIndex * 2 + 2}
                    </div>
                  </div>
                </div>
                {/* Back side of flipping page (new left page content) */}
                <div className="face face-back p-6 sm:p-10 border-r border-[#e7deb8]/40 relative bg-[#fdfcf7] bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#fbfaf0_100%)] shadow-[5px_0_15px_rgba(0,0,0,0.15)]">
                  <div className="absolute inset-4 border-2 border-double border-client-secondary/40 rounded-xl pointer-events-none"></div>
                  <div className="relative z-10 p-2 sm:p-4 h-full flex flex-col justify-between">
                    <div>
                      <div className="text-center mb-6">
                        <span className="text-[10px] tracking-widest font-black text-client-primary uppercase block mb-1">
                          {nextSpread.leftPage.subtitle}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#36271c] px-4 border-b border-client-secondary/20 pb-2 inline-block">
                          {nextSpread.leftPage.title}
                        </h2>
                      </div>
                      <div className="relative h-44 overflow-hidden rounded-lg border border-client-secondary/20 mb-6 shadow-xs">
                        <img src={nextSpread.leftPage.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-4">
                        {nextSpread.leftPage.items.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-baseline gap-2 text-xs opacity-50">
                            <span className="font-bold text-[#2c2017]">{item.name}</span>
                            <span className="border-b border-dotted border-client-secondary/30 flex-1 mx-2 h-1"></span>
                            <span className="font-black text-client-primary font-mono">{item.price.toLocaleString("vi-VN")}đ</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-center text-[10px] text-client-muted uppercase font-bold tracking-widest">
                      Trang {nextIndex * 2 + 1}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isFlipping && flipDirection === "prev" && (
              <div className="page-turning-left hidden md:block">
                {/* Front side of flipping page (current left page content) */}
                <div className="face p-6 sm:p-10 border-r border-[#e7deb8]/40 relative bg-[#fdfcf7] bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#fbfaf0_100%)] shadow-[5px_0_15px_rgba(0,0,0,0.15)]">
                  <div className="absolute inset-4 border-2 border-double border-client-secondary/40 rounded-xl pointer-events-none"></div>
                  <div className="relative z-10 p-2 sm:p-4 h-full flex flex-col justify-between">
                    <div>
                      <div className="text-center mb-6">
                        <span className="text-[10px] tracking-widest font-black text-client-primary uppercase block mb-1">
                          {prevSpread.leftPage.subtitle}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#36271c] px-4 border-b border-client-secondary/20 pb-2 inline-block">
                          {prevSpread.leftPage.title}
                        </h2>
                      </div>
                      <div className="relative h-44 overflow-hidden rounded-lg border border-client-secondary/20 mb-6 shadow-xs">
                        <img src={prevSpread.leftPage.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-4">
                        {prevSpread.leftPage.items.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-baseline gap-2 text-xs opacity-50">
                            <span className="font-bold text-[#2c2017]">{item.name}</span>
                            <span className="border-b border-dotted border-client-secondary/30 flex-1 mx-2 h-1"></span>
                            <span className="font-black text-client-primary font-mono">{item.price.toLocaleString("vi-VN")}đ</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-center text-[10px] text-client-muted uppercase font-bold tracking-widest">
                      Trang {displayIndex * 2 + 1}
                    </div>
                  </div>
                </div>
                {/* Back side of flipping page (new right page content) */}
                <div className="face face-back p-6 sm:p-10 border-l border-[#e7deb8]/40 relative bg-[#fdfcf7] bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#fbfaf0_100%)] shadow-[-5px_0_15px_rgba(0,0,0,0.15)]">
                  <div className="absolute inset-4 border-2 border-double border-client-secondary/40 rounded-xl pointer-events-none"></div>
                  <div className="relative z-10 p-2 sm:p-4 h-full flex flex-col justify-between">
                    <div>
                      <div className="text-center mb-6">
                        <span className="text-[10px] tracking-widest font-black text-client-primary uppercase block mb-1">
                          {nextSpread.rightPage.subtitle}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#36271c] px-4 border-b border-client-secondary/20 pb-2 inline-block">
                          {nextSpread.rightPage.title}
                        </h2>
                      </div>
                      <div className="relative h-44 overflow-hidden rounded-lg border border-client-secondary/20 mb-6 shadow-xs">
                        <img src={nextSpread.rightPage.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-4">
                        {nextSpread.rightPage.items.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-baseline gap-2 text-xs opacity-50">
                            <span className="font-bold text-[#2c2017]">{item.name}</span>
                            <span className="border-b border-dotted border-client-secondary/30 flex-1 mx-2 h-1"></span>
                            <span className="font-black text-client-primary font-mono">{item.price.toLocaleString("vi-VN")}đ</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-center text-[10px] text-client-muted uppercase font-bold tracking-widest">
                      Trang {nextIndex * 2 + 2}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UNDERLYING LEFT PAGE */}
            <div className="flex-1 p-6 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#e7deb8]/40 relative bg-[#fdfcf7] bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#fbfaf0_100%)]">
              {/* Gold double border decorator */}
              <div className="absolute inset-4 border-2 border-double border-client-secondary/40 rounded-xl pointer-events-none"></div>
              
              <div className="relative z-10 p-2 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Category Header */}
                  <div className="text-center mb-6">
                    <span className="text-[10px] tracking-widest font-black text-client-primary uppercase block mb-1">
                      {currentSpread.leftPage.subtitle}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#36271c] px-4 border-b border-client-secondary/20 pb-2 inline-block">
                      {currentSpread.leftPage.title}
                    </h2>
                  </div>

                  {/* Food visual banner */}
                  <div className="relative h-44 overflow-hidden rounded-lg border border-client-secondary/20 mb-6 shadow-sm">
                    <img
                      src={currentSpread.leftPage.image}
                      alt={currentSpread.leftPage.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <p className="text-white text-xs italic line-clamp-2 leading-relaxed">
                        {currentSpread.leftPage.description}
                      </p>
                    </div>
                  </div>

                  {/* Menu Items List */}
                  <div className="space-y-4">
                    {currentSpread.leftPage.items.map((item, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="font-bold text-base text-[#2c2017] group-hover:text-client-primary transition-colors flex items-center gap-1">
                            {item.isHot && <Star size={12} className="fill-client-secondary text-client-secondary shrink-0" />}
                            {item.name}
                          </span>
                          <span className="border-b-2 border-dotted border-client-secondary/30 flex-1 mx-2 h-1 min-w-[20px]"></span>
                          <span className="font-black text-client-primary font-mono text-sm whitespace-nowrap">
                            {item.price.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        {item.desc && (
                          <p className="text-[11px] text-client-muted italic mt-0.5 ml-0 leading-relaxed">
                            {item.desc}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 text-center text-[10px] text-client-muted uppercase font-bold tracking-widest">
                 Restro - Trang {displayIndex * 2 + 1}
                </div>
              </div>
            </div>

            {/* UNDERLYING RIGHT PAGE */}
            <div className="flex-1 p-6 sm:p-10 flex flex-col justify-between relative bg-[#fdfcf7] bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#fbfaf0_100%)]">
              {/* Gold double border decorator */}
              <div className="absolute inset-4 border-2 border-double border-client-secondary/40 rounded-xl pointer-events-none"></div>

              <div className="relative z-10 p-2 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Category Header */}
                  <div className="text-center mb-6">
                    <span className="text-[10px] tracking-widest font-black text-client-primary uppercase block mb-1">
                      {currentSpread.rightPage.subtitle}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#36271c] px-4 border-b border-client-secondary/20 pb-2 inline-block">
                      {currentSpread.rightPage.title}
                    </h2>
                  </div>

                  {/* Food visual banner */}
                  <div className="relative h-44 overflow-hidden rounded-lg border border-client-secondary/20 mb-6 shadow-sm">
                    <img
                      src={currentSpread.rightPage.image}
                      alt={currentSpread.rightPage.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <p className="text-white text-xs italic line-clamp-2 leading-relaxed">
                        {currentSpread.rightPage.description}
                      </p>
                    </div>
                  </div>

                  {/* Menu Items List */}
                  <div className="space-y-4">
                    {currentSpread.rightPage.items.map((item, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="font-bold text-base text-[#2c2017] group-hover:text-client-primary transition-colors flex items-center gap-1">
                            {item.isHot && <Star size={12} className="fill-client-secondary text-client-secondary shrink-0" />}
                            {item.name}
                          </span>
                          <span className="border-b-2 border-dotted border-client-secondary/30 flex-1 mx-2 h-1 min-w-[20px]"></span>
                          <span className="font-black text-client-primary font-mono text-sm whitespace-nowrap">
                            {item.price.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        {item.desc && (
                          <p className="text-[11px] text-client-muted italic mt-0.5 ml-0 leading-relaxed">
                            {item.desc}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 text-center text-[10px] text-[#7b6f65] uppercase font-bold tracking-widest">
                  Restro — Trang {displayIndex * 2 + 2}
                </div>
              </div>
            </div>

          </div>

          {/* Book bottom indicators for navigation & mobile view */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={handlePrevPage}
              disabled={isFlipping}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-[#dfb05b]/30 bg-[#2d231a] text-[#dfb05b] hover:text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Trang trước
            </button>
            <span className="text-[#c9bfae] text-xs font-bold uppercase tracking-widest bg-[#2d231a] px-4 py-2 rounded-lg border border-[#3e3125]">
              Trang {spreadIndex * 2 + 1} — {spreadIndex * 2 + 2} / {MENU_SPREADS.length * 2}
            </span>
            <button
              onClick={handleNextPage}
              disabled={isFlipping}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-[#dfb05b]/30 bg-[#2d231a] text-[#dfb05b] hover:text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              Trang sau <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Footer Booklet Note */}
        <div className="mt-16 text-center text-xs text-[#c9bfae] border-t border-[#3e3125] pt-6 max-w-lg mx-auto leading-relaxed">
          <BookOpen size={18} className="mx-auto mb-2 text-client-secondary" />
          <p>Dữ liệu mang tính chất tham khảo thực tế tại sảnh. Hương vị ẩm thực và giá trị món ăn có thể thay đổi tùy thuộc vào thời điểm mùa vụ và yêu cầu chế biến đặc biệt.</p>
        </div>
      </div>
    </div>
  );
};
