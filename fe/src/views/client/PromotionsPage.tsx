import React, { useState } from "react";
import { Clock, Star, X } from "lucide-react";

interface NewsArticle {
  id: number;
  title: string;
  date: string;
  image: string;
  overlayText?: string;
  excerpt: string;
  content: string;
  author: string;
}

const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 1,
    title: "Top địa điểm ngắm pháo hoa DIFF 2026 đẹp tại Đà Nẵng",
    date: "19-05-2026",
    image: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&auto=format&fit=crop&q=80",
    overlayText: "Trọn vị\nTrọn kỳ quan",
    excerpt: "Mỗi mùa hè, Lễ hội Pháo hoa Quốc tế Đà Nẵng DIFF 2026 lại biến thành phố sông Hàn trở thành tâm điểm du lịch với những màn trình diễn ánh sáng rực rỡ bên bờ sông. Năm 2026, lễ hội dự kiến diễn ra từ ngày 30/5 đến 11/7 với 6 đêm thi đấu của nhiều đội pháo hoa quốc tế. Không chỉ săn vé khán đài, nhiều du khách hiện nay ưu tiên tìm kiếm những địa điểm vừa có view đẹp, vừa có không gian ăn uống, thư giãn để tận hưởng trọn vẹn đêm pháo hoa. Dưới đây là những tọa độ ngắm DIFF 2026 được nhiều người quan tâm tại Đà Nẵng.",
    content: "Lễ hội pháo hoa quốc tế luôn là điểm hẹn văn hóa rực rỡ nhất trong năm thu hút hàng vạn du khách. Để tận hưởng trọn vẹn những màn trình diễn ánh sáng đỉnh cao mà không phải chịu cảnh chen chúc đông đúc, Restro mang đến cho quý khách hàng không gian ban công tầng thượng hướng thẳng ra sông Hàn. Tại đây, quý khách có thể vừa thưởng thức set thực đơn vịt quay gia truyền cùng gia đình, vừa ngắm nhìn những đóa hoa lửa lung linh nở rộ trên bầu trời đêm lộng gió.",
    author: "Restro Editorial"
  },
  {
    id: 2,
    title: "Hè xứ Quảng — 'The taste of Summer'",
    date: "02-07-2025",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80",
    excerpt: "“Mùa nào thức nấy, món nào tính ấy...” Xứ Quảng không ồn ào, chỉ lặng lẽ giữ riêng mình những món ngon theo mùa – tích lũy từ làng yên bình đến gánh hàng ven biển đượm nắng. Có món mang vị đồng quê mộc mạc, có món đậm đà hương biển cả. Mỗi hương vị là một lát cắt đời sống, một lời kể nhẹ nhàng mà sâu lắng. Từ những nguyên liệu thân quen, người Quảng tạo nên những món ăn mộc mạc mà tinh tế – dành cho những ngày nắng, khi ta chỉ mong tìm về chút dịu dàng, nhẹ tênh.",
    content: "Mùa hè là mùa của những hương vị thanh mát, đậm đà từ nguồn hải sản tươi ngon và các món cuốn mộc mạc xứ Quảng. Thực đơn hè năm nay tại Restro giới thiệu các món canh chua thanh nhiệt giải độc, mỳ Quảng tôm thịt sườn non rim củ nén thơm lừng và chè hạt sen long nhãn đá bào ngọt mát lịm, hứa hẹn sẽ mang đến hành trình ẩm thực đáng nhớ chứa đựng hơi thở mát lành cho cả gia đình.",
    author: "Bếp Trưởng Restro"
  },
  {
    id: 3,
    title: "Các Địa Điểm Không Thể Bỏ Qua Vào Dịp Lễ 30/4 — 1/5 tại Đà Nẵng",
    date: "22-04-2025",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80",
    excerpt: "Nghỉ lễ 30/4 - 1/5 nên đi đâu chơi ở Đà Nẵng? Thành phố biển xinh đẹp luôn nằm trong top điểm đến yêu thích mỗi dịp lễ lớn. Nếu bạn cùng đang lên kế hoạch cho một chuyến đi nghỉ lễ thật trọn vẹn, dưới đây là những địa điểm không thể bỏ qua tại Đà Nẵng!",
    content: "Kỳ nghỉ lễ dài ngày sắp tới là thời gian lý tưởng để cùng gia đình dạo chơi và thưởng lãm nét đẹp thanh bình cổ kính của sông Hàn và phố cổ. Hãy khởi đầu ngày mới bằng việc ghé Restro để thưởng thức tô phở bò Wagyu tái lăn nóng hổi hay thưởng trà trong tiếng đàn tranh du duyên, sau đó ghé thăm các công trình di sản nghệ thuật lân cận để cảm nhận trọn vẹn nhịp sống hoài cổ tinh tế của thành phố biển xinh đẹp.",
    author: "Restro Editorial"
  },
  {
    id: 4,
    title: "Các địa điểm không thể bỏ qua trong kỳ nghỉ lễ tại Đà Nẵng",
    date: "28-04-2026",
    image: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80",
    excerpt: "Hành trình tìm lại những nét văn hóa ẩm thực truyền thống Việt Nam đầy ý nghĩa cùng gia đình trong dịp đại lễ lớn sắp tới. Hãy cùng Restro ghi lại những khoảnh khắc tụ họp ấm cúng bên bàn ăn hoài cổ.",
    content: "Dịp đại lễ này, Restro tự hào chuẩn bị sẵn sàng những không gian ẩm thực riêng tư, ấm cúng và đầy tính nghệ thuật. Chúng tôi mang đến dịch vụ đón tiếp chân thành cùng các món ăn thuần Việt tinh chọn để bữa tiệc sum vầy của gia đình bạn thêm phần trọn vẹn và ý nghĩa.",
    author: "Restro Editorial"
  },
  {
    id: 5,
    title: "Restro | Michelin Selected 2025",
    date: "12-06-2025",
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80",
    excerpt: "Restro tự hào được vinh danh trong danh mục Michelin Selected 2025. Sự ghi nhận này là động lực to lớn để tập thể Restro tiếp tục cống hiến nâng tầm ẩm thực di sản Việt Nam.",
    content: "Michelin Guide đã chính thức công bố danh sách tuyển chọn năm 2025. Restro vinh dự được xướng tên nhờ nỗ lực gìn giữ các công thức truyền thống lâu đời kết hợp chuẩn mực phục vụ cao cấp. Chúng tôi xin chân thành cảm ơn sự đồng hành và ủng hộ quý báu của tất cả quý thực khách trong thời gian qua.",
    author: "Restro Editorial"
  },
  {
    id: 6,
    title: "TOP 5 LÝ DO NÊN TỔ CHỨC TIỆC TẠI RESTRO",
    date: "12-11-2024",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
    excerpt: "Tại Restro, mỗi bữa tiệc không chỉ là dịp sum họp mà còn là một trải nghiệm đáng nhớ. Với không gian sang trọng, ưu đãi hấp dẫn và dịch vụ tận tâm, Restro luôn là lựa chọn hàng đầu cho những buổi tiệc ý nghĩa. Dưới đây là những lý do khiến Restro trở thành điểm đến lý tưởng cho các sự kiện đặc biệt của bạn.",
    content: "Chúng tôi hỗ trợ thiết kế thực đơn tiệc sự kiện tùy chọn theo yêu cầu, hỗ trợ trang trí hoa tươi, thiết bị âm thanh ánh sáng chuyên nghiệp và đặc biệt tặng kèm bánh kem/nước uống tráng miệng cao cấp cho các buổi tiệc sinh nhật hoặc kỷ niệm gia đình.",
    author: "Restro Events"
  },
  {
    id: 7,
    title: "Thưởng vị yến sào thiên nhiên Khánh Hòa tại Restro",
    date: "15-10-2024",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&auto=format&fit=crop&q=80",
    excerpt: "Sự kết hợp hoàn hảo giữa yến sào thiên nhiên bồi bổ dưỡng chưng cất cùng hạt sen Tây Hồ thanh mát, mang đến món tráng miệng giải nhiệt tuyệt hảo cho mùa hè oi bức.",
    content: "Yến sào Khánh Hòa chưng cất hạt sen là món tráng miệng bổ dưỡng hoàng gia được Restro phục vụ nóng hoặc lạnh tại sảnh tiệc. Món ăn giúp bổ khí, dưỡng thần và đem lại sinh khí tràn đầy cho quý khách sau những giờ làm việc mệt mỏi.",
    author: "Dinh Dưỡng Viên Restro"
  },
  {
    id: 8,
    title: "Restro khai xuân đón lộc — Quà tặng may mắn đầu năm 2026",
    date: "02-02-2026",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80",
    excerpt: "Nhân dịp Tết Bính Ngọ 2026, Restro dành tặng chương trình lì xì may mắn và ưu đãi đặc biệt cho tất cả bàn đặt tiệc gia đình từ mùng 2 đến mùng 10 Tết.",
    content: "Chào đón năm mới thịnh vượng, Restro gửi lời chúc an khang thịnh vượng thông qua chương trình lì xì đầu năm trực tiếp lên hóa đơn thanh toán cùng các phong bao lì xì chứa đựng quà tặng voucher hấp dẫn cho lần ghé thăm tiếp theo của gia đình bạn.",
    author: "Restro Events"
  }
];

export const PromotionsPage: React.FC = () => {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  return (
    <div className="bg-[#fdfcf7] min-h-screen text-[#2a221c] font-sans pb-20">
      
      {/* Visual Hero Banner (Pottery Background) */}
      <section className="relative h-[300px] w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=1600&auto=format&fit=crop&q=80"
          alt="Tin tức di sản Restro"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
        
        <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-4 text-center text-white">
          <span className="mb-2 text-client-secondary text-xs uppercase font-bold tracking-widest flex items-center gap-1.5 justify-center">
            <Star size={12} className="fill-client-secondary text-client-secondary" /> Restro Chronicle <Star size={12} className="fill-client-secondary text-client-secondary" />
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-wide text-white">Tin Tức</h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-300 max-w-md">
            Trang chủ / Tin tức
          </p>
        </div>
      </section>

      {/* Masonry Grid Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 [column-fill:balance] w-full">
          {NEWS_ARTICLES.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="break-inside-avoid bg-white border border-client-accent rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-300 cursor-pointer mb-8 group flex flex-col"
            >
              {/* Photo Area */}
              <div className="relative overflow-hidden w-full">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-auto object-cover group-hover:scale-103 transition-transform duration-500 max-h-[450px]"
                />
                
                {/* Stamp overlay if styled */}
                <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-xs text-white text-[9px] uppercase font-black px-2.5 py-1 rounded-sm shadow-xs border border-white/20">
                  Restro
                </div>

                {/* Calligraphic Visual Overlay text if present */}
                {article.overlayText && (
                  <div className="absolute inset-0 bg-black/25 flex flex-col justify-center items-center text-center p-4">
                    <p className="text-client-secondary font-serif italic text-2xl font-bold whitespace-pre-line leading-tight drop-shadow-md">
                      {article.overlayText}
                    </p>
                  </div>
                )}
              </div>

              {/* Text info block */}
              <div className="p-6 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-bold text-lg text-client-text mb-2 font-display leading-snug group-hover:text-client-primary transition-colors">
                    {article.title}
                  </h3>
                  
                  <span className="text-[10px] uppercase font-bold tracking-wider text-client-muted block mb-4">
                    {article.date}
                  </span>

                  <p className="text-xs text-client-muted leading-relaxed mb-6 font-serif">
                    {article.excerpt}
                  </p>
                </div>

                <div className="text-xs font-bold text-client-primary group-hover:underline flex items-center gap-1 mt-auto">
                  Chi tiết &rarr;
                </div>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* FULL READ ARTICLE POPUP MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-client-accent relative animate-slide-in flex flex-col max-h-[85vh]">
            {/* Close Button */}
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>

            {/* Modal Banner */}
            <div className="relative h-64 shrink-0 bg-client-accent">
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="bg-client-secondary text-client-text text-[9px] uppercase font-black px-2.5 py-1 rounded-full inline-block mb-3 shadow-xs">
                  Restro Chronicle
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white drop-shadow-sm leading-tight">
                  {selectedArticle.title}
                </h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-client-muted leading-relaxed font-serif scrollbar-thin">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-client-primary border-b border-[#f0eae1] pb-3 mb-2">
                <span className="flex items-center gap-1.5"><Clock size={12} /> {selectedArticle.date}</span>
                <span>Tác giả: {selectedArticle.author}</span>
              </div>
              
              <p className="font-bold text-[#36271c]">
                {selectedArticle.excerpt}
              </p>
              
              <p className="whitespace-pre-line text-[#5c4f43]">
                {selectedArticle.content}
              </p>

              <div className="pt-6 border-t border-[#f0eae1] text-[10px] text-center text-client-muted uppercase font-bold tracking-widest">
                Restro Restaurant — Kết Nối Tình Thân Qua Ẩm Thực
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
