import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Star, Award, Heart, Leaf } from "lucide-react";

export const HomeView: React.FC = () => {
  return (
    <div className="bg-[#fdfcf7] min-h-screen text-[#2a221c] font-sans">
      
      {/* 1. HERO BANNER SECTION (Full width wood theme) */}
      <section className="relative h-[600px] w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&auto=format&fit=crop&q=80"
          alt="Không gian bếp lửa Restro"
          className="absolute inset-0 h-full w-full object-cover transform scale-105 transition-transform duration-[10000ms]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-client-secondary/20 px-3.5 py-1 text-xs font-bold text-client-secondary backdrop-blur-md border border-client-secondary/30">
            <Star size={14} className="fill-client-secondary text-client-secondary" />
            Không Gian Ẩm Thực Di Sản &amp; Sự Kiện
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-display">
            Về Chúng Tôi
            <span className="block text-client-secondary mt-1">Hành Trình Hương Vị</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-200 sm:text-lg leading-relaxed">
            Nơi hội tụ nét tinh túy ẩm thực truyền thống ba miền Việt Nam. Cùng Restro tìm lại hương vị đầm ấm xưa cũ trong một không gian cổ kính thanh lịch.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/booking"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-client-primary px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-client-primary-hover hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Đặt bàn ngay
              <ChevronRight size={18} />
            </Link>
            <Link
              to="/menu"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/80 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Xem thực đơn
            </Link>
          </div>
        </div>
      </section>

      {/* 2. RED BANNER: TẦM NHÌN & SỨ MỆNH */}
      <section className="bg-client-primary py-12 px-4 relative overflow-hidden text-center text-white">
        {/* Subtle decorative line sketches */}
        <div className="absolute left-6 bottom-0 w-24 h-24 opacity-10 pointer-events-none border-t border-r border-white rounded-tr-full"></div>
        <div className="absolute right-6 top-0 w-24 h-24 opacity-10 pointer-events-none border-b border-l border-white rounded-bl-full"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="text-[11px] tracking-widest font-black text-client-secondary uppercase block mb-2">Tầm Nhìn &amp; Sứ Mệnh</span>
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-wide mb-4">Gìn Giữ Hương Vị Di Sản</h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl mx-auto font-serif italic">
            "Tại Restro, chúng tôi hướng tới sứ mệnh gìn giữ và tôn vinh bản sắc ẩm thực truyền thống Việt Nam. Bằng lòng nhiệt thành, sự tinh chọn tỉ mỉ nguyên liệu và lòng mến khách sâu sắc, Restro kiến tạo những khoảnh khắc tụ họp ấm áp đầy yêu thương bên mâm cơm trọn vị."
          </p>
        </div>
      </section>

      {/* 3. CREAM SECTION: CÂU CHUYỆN THƯƠNG HIỆU */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          
          {/* Left portrait concept art */}
          <div className="relative">
            <div className="absolute inset-0 border-2 border-double border-client-secondary/50 rounded-2xl transform translate-x-3 translate-y-3 pointer-events-none"></div>
            <div className="relative h-[480px] overflow-hidden rounded-2xl shadow-xl border border-client-accent">
              <img
                src="https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80"
                alt="Nghệ thuật trà chiều truyền thống Restro"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-client-accent">
                <span className="text-[10px] uppercase font-bold text-client-primary tracking-wider block">Góc di sản</span>
                <span className="text-sm font-bold font-display text-[#36271c]">Nguyên bản nghệ thuật ấm thực Việt Nam</span>
              </div>
            </div>
          </div>

          {/* Right story text */}
          <div className="space-y-6">
            <span className="text-xs font-black text-client-primary uppercase tracking-widest block">Câu chuyện thương hiệu</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-[#36271c]">Khơi Nguồn Ký Ức Đầm Ấm</h2>
            <p className="text-sm text-client-muted leading-relaxed font-serif">
              Restro ra đời như một nốt nhạc trầm tĩnh giữa lòng phố thị náo nhiệt, vẽ lại ký ức bình yên về những gian bếp khói tỏa chiều tà, nơi cả nhà quây quần bên mâm cơm gạo mới dẻo thơm. Chúng tôi tin rằng mỗi món ăn không chỉ dừng lại ở hương vị vị giác, mà còn chứa đựng cả một câu chuyện tâm tình về đất và người Việt Nam.
            </p>
            <p className="text-sm text-client-muted leading-relaxed font-serif">
              Từng bát mỳ Quảng vàng óng đượm sả nghệ, từng thớ thịt vịt quay gia truyền giòn bì tẩm ướp thảo mộc hay tách trà ô long sen vàng bùi béo,... tất cả đều được chế tác tỉ mỉ từ bàn tay tài hoa của các đầu bếp am tường phong vị bản xứ. Restro trân trọng từng nguyên liệu tươi non nhất được thu hoạch từ vườn quê xa xôi, mang trọn vẹn linh hồn ẩm thực thuần khiết vào bàn ăn của thực khách.
            </p>
            <div className="pt-4">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 text-sm font-bold text-client-primary hover:text-client-primary-hover transition-colors"
              >
                Khám phá thực đơn ấn phẩm 3D &rarr;
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 4. DARK GREEN SECTION: TRIẾT LÝ THƯƠNG HIỆU */}
      <section className="bg-[#212e27] text-[#f4f2e9] py-20 px-4">
        <div className="max-w-7xl mx-auto relative">
          {/* Gold double line layout decor */}
          <div className="absolute inset-x-0 -top-6 h-px bg-gradient-to-r from-transparent via-[#dfb05b]/30 to-transparent"></div>
          <div className="absolute inset-x-0 -bottom-6 h-px bg-gradient-to-r from-transparent via-[#dfb05b]/30 to-transparent"></div>

          <div className="text-center mb-16">
            <span className="text-client-secondary text-sm font-serif italic block mb-2">"Trọn Vẹn"</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-white tracking-wide">Triết Lý Restro</h2>
            <p className="mt-3 text-[#b4c3b9] max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">
              Trải nghiệm ẩm thực trọn vẹn hòa quyện tinh tế giữa ba yếu tố cốt lõi: Ẩm thực nguyên bản, dịch vụ chân thành và không gian hoài niệm.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            
            {/* Column 1: Ẩm thực */}
            <div className="bg-black/10 rounded-2xl p-6 border border-[#dfb05b]/10 flex flex-col justify-between hover:border-[#dfb05b]/30 transition-colors">
              <div>
                <div className="relative h-44 overflow-hidden rounded-xl mb-6">
                  <img
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
                    alt="Ẩm thực Restro"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold font-display text-client-secondary mb-2 flex items-center gap-2">
                  <Leaf size={18} className="text-client-secondary" /> Ẩm thực nguyên bản
                </h3>
                <p className="text-xs text-[#b4c3b9] leading-relaxed">
                  Nguyên liệu sạch tự nhiên, cam kết không phụ gia tổng hợp. Hương vị ngọt thơm cốt tủy tự nhiên từ xương hầm và các loài thảo mộc dân dã tốt cho sức khỏe.
                </p>
              </div>
            </div>

            {/* Column 2: Con người */}
            <div className="bg-black/10 rounded-2xl p-6 border border-[#dfb05b]/10 flex flex-col justify-between hover:border-[#dfb05b]/30 transition-colors">
              <div>
                <div className="relative h-44 overflow-hidden rounded-xl mb-6">
                  <img
                    src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80"
                    alt="Con người Restro"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold font-display text-client-secondary mb-2 flex items-center gap-2">
                  <Heart size={18} className="text-client-secondary" /> Phục vụ chân thành
                </h3>
                <p className="text-xs text-[#b4c3b9] leading-relaxed">
                  Đội ngũ đón tiếp niềm nở chu đáo như đón người thân trở về nhà. Sự tinh tế trong chăm sóc từng chi tiết nhỏ đem lại sự thoải mái tuyệt đối cho quý khách.
                </p>
              </div>
            </div>

            {/* Column 3: Không gian */}
            <div className="bg-black/10 rounded-2xl p-6 border border-[#dfb05b]/10 flex flex-col justify-between hover:border-[#dfb05b]/30 transition-colors">
              <div>
                <div className="relative h-44 overflow-hidden rounded-xl mb-6">
                  <img
                    src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80"
                    alt="Không gian Restro"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold font-display text-client-secondary mb-2 flex items-center gap-2">
                  <Award size={18} className="text-client-secondary" /> Không gian Đông Dương
                </h3>
                <p className="text-xs text-[#b4c3b9] leading-relaxed">
                  Kiến trúc Indochine kết hợp gạch hoa cổ, đèn lồng ấm và tranh sơn mài tạo cảm giác trầm mặc thanh lịch, đưa quý khách quay về thập niên cũ đầy lãng mạn.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};