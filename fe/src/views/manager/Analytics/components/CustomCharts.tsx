import React, { useState, useMemo } from "react";
import { formatCurrency } from "../../../../utils/formatCurrency";
import type { RevenueTimePoint, PeakHourData, TopItem } from "../services/analyticsService";

interface CustomChartsProps {
  timelineData: RevenueTimePoint[];
  peakHourData: PeakHourData[];
  topItems: TopItem[];
  isLoading: boolean;
}

// Hàm chuyển đổi tọa độ lượng giác sang cung SVG để vẽ Doughnut Chart
const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number): string => {
  const startRad = ((startAngle - 90) * Math.PI) / 180.0;
  const endRad = ((endAngle - 90) * Math.PI) / 180.0;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
};

export const CustomCharts: React.FC<CustomChartsProps> = ({
  timelineData,
  peakHourData,
  topItems,
  isLoading,
}) => {
  // State phục vụ tooltip của Line Chart
  const [hoveredTimelineIdx, setHoveredTimelineIdx] = useState<number | null>(null);
  
  // State phục vụ tooltip của Bar Chart
  const [hoveredBarHour, setHoveredBarHour] = useState<number | null>(null);

  // State phục vụ hover của Doughnut Chart
  const [hoveredDoughnutIdx, setHoveredDoughnutIdx] = useState<number | null>(null);

  // Colors cho Doughnut chart
  const doughnutColors = ["#FF5A5F", "#818CF8", "#34D399", "#FB7185", "#FBBF24"];

  // ============================================================================
  // A. XỬ LÝ DỮ LIỆU LINE CHART (REVENUE TIMELINE)
  // ============================================================================
  const lineChartData = useMemo(() => {
    if (timelineData.length === 0) {
      return {
        points: [],
        maxRevenue: 0,
        pathD: "",
        areaD: "",
        chartHeight: 140,
        paddingTop: 20,
        paddingLeft: 50,
        width: 600,
        height: 180,
        paddingBottom: 20
      };
    }

    const maxRevenue = Math.max(...timelineData.map((d) => d.revenue)) || 1000000;
    
    // Kích thước khung viewBox: 600x200
    const width = 600;
    const height = 180;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const stepX = timelineData.length > 1 ? chartWidth / (timelineData.length - 1) : chartWidth;
    
    const points = timelineData.map((d, idx) => {
      const x = paddingLeft + idx * stepX;
      // Tránh chia cho 0. Y hướng xuống nên lấy chartHeight trừ đi tỉ lệ tương ứng
      const ratio = d.revenue / maxRevenue;
      const y = paddingTop + chartHeight * (1 - ratio);
      return { x, y, label: d.label, revenue: d.revenue, orderCount: d.orderCount };
    });

    // Tạo đường nối mềm (Cubic Bezier)
    let pathD = "";
    let areaD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX1 = p0.x + (p1.x - p0.x) / 3;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
        const cpY2 = p1.y;
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
      }
      
      // Tạo vùng tô màu gradient (Area) bên dưới đường line
      areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    }

    return { points, maxRevenue, pathD, areaD, chartHeight, paddingTop, paddingLeft, width, height, paddingBottom };
  }, [timelineData]);

  // ============================================================================
  // B. XỬ LÝ DỮ LIỆU DOUGHNUT CHART (TOP 5 ITEMS)
  // ============================================================================
  const doughnutSegments = useMemo(() => {
    if (topItems.length === 0) return [];
    
    const totalQty = topItems.reduce((sum, item) => sum + item.quantity, 0) || 1;
    let accumulatedAngle = 0;

    return topItems.map((item, idx) => {
      const percentage = item.quantity / totalQty;
      const angle = percentage * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle = endAngle;

      return {
        item,
        startAngle,
        endAngle,
        color: doughnutColors[idx % doughnutColors.length],
        percentageVal: Math.round(percentage * 100)
      };
    });
  }, [topItems]);

  // ============================================================================
  // C. XỬ LÝ DỮ LIỆU BAR CHART (PEAK HOURS)
  // ============================================================================
  const barChartData = useMemo(() => {
    if (peakHourData.length === 0) return { bars: [], maxCount: 0 };
    
    const maxCount = Math.max(...peakHourData.map((d) => d.count)) || 1;
    const height = 140; // Chiều cao tối đa cột
    
    const bars = peakHourData.map((d) => {
      const ratio = d.count / maxCount;
      const barHeight = ratio * height;
      return {
        hour: d.hour,
        count: d.count,
        percentage: d.percentage,
        barHeight,
      };
    });

    return { bars, maxCount };
  }, [peakHourData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl border border-sky-50 bg-white lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-2xl border border-sky-50 bg-white lg:col-span-1" />
        <div className="h-64 animate-pulse rounded-2xl border border-sky-50 bg-white lg:col-span-3" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      
      {/* 1. BIỂU ĐỒ DOANH THU THEO THỜI GIAN (LINE CHART) */}
      <div className="relative rounded-2xl border border-sky-100 bg-white p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-black text-slate-700 font-display">
            Diễn biến doanh thu & Đơn hàng
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Biểu đồ biểu diễn dòng tiền bán lẻ theo thời gian thực</p>
        </div>

        {/* Vẽ biểu đồ bằng SVG */}
        <div className="relative mt-4 flex-1">
          {lineChartData.points.length > 0 ? (
            <svg
              className="w-full h-48 overflow-visible cursor-crosshair"
              viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`}
              preserveAspectRatio="none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                // Ánh xạ sang tọa độ viewBox (600px)
                const svgX = (mouseX / rect.width) * lineChartData.width;
                
                // Tìm điểm mốc có tọa độ x gần nhất với chuột
                let closestIdx = 0;
                let minDiff = Infinity;
                lineChartData.points.forEach((pt, idx) => {
                  const diff = Math.abs(pt.x - svgX);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = idx;
                  }
                });
                setHoveredTimelineIdx(closestIdx);
              }}
              onMouseLeave={() => setHoveredTimelineIdx(null)}
            >
              {/* Định nghĩa Gradient đổ bóng Area */}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5A5F" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#FF5A5F" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Vẽ lưới Grid đứt quãng */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = lineChartData.paddingTop + lineChartData.chartHeight * ratio;
                return (
                  <line
                    key={idx}
                    x1={lineChartData.paddingLeft}
                    y1={y}
                    x2={lineChartData.width - 20}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                );
              })}

              {/* Area fill */}
              {lineChartData.areaD && (
                <path d={lineChartData.areaD} fill="url(#areaGradient)" className="transition-all duration-500" />
              )}

              {/* Line path */}
              {lineChartData.pathD && (
                <path
                  d={lineChartData.pathD}
                  fill="none"
                  stroke="#FF5A5F"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              )}

              {/* Tương tác khi di chuột (Quét trục dọc X) */}
              {hoveredTimelineIdx !== null && lineChartData.points[hoveredTimelineIdx] && (
                <>
                  {/* Trục dọc quét qua điểm */}
                  <line
                    x1={lineChartData.points[hoveredTimelineIdx].x}
                    y1={lineChartData.paddingTop}
                    x2={lineChartData.points[hoveredTimelineIdx].x}
                    y2={lineChartData.height - lineChartData.paddingBottom}
                    stroke="#FF5A5F"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  {/* Điểm nhấn vòng tròn lớn */}
                  <circle
                    cx={lineChartData.points[hoveredTimelineIdx].x}
                    cy={lineChartData.points[hoveredTimelineIdx].y}
                    r="6"
                    fill="#FF5A5F"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="shadow-sm"
                  />
                </>
              )}

              {/* Các điểm dữ liệu dạng vòng tròn nhỏ */}
              {lineChartData.points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill={hoveredTimelineIdx === idx ? "#FF5A5F" : "#FFFFFF"}
                  stroke="#FF5A5F"
                  strokeWidth="1.5"
                  className="transition-all duration-150"
                />
              ))}

              {/* Nhãn trục X (Ngày / Giờ) */}
              {lineChartData.points.map((pt, idx) => {
                // Chỉ hiển thị nhãn xen kẽ nếu số lượng mốc dữ liệu quá nhiều
                const shouldShow = lineChartData.points.length <= 10 || idx % 2 === 0 || idx === lineChartData.points.length - 1;
                if (!shouldShow) return null;
                return (
                  <text
                    key={idx}
                    x={pt.x}
                    y={lineChartData.height - 2}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {pt.label}
                  </text>
                );
              })}

              {/* Nhãn chỉ dẫn trục Y (Giá trị doanh thu cao nhất/thấp nhất) */}
              <text
                x={4}
                y={lineChartData.paddingTop + 4}
                fill="#94A3B8"
                fontSize="9"
                fontWeight="black"
              >
                {Math.round(lineChartData.maxRevenue / 1000).toLocaleString()}k
              </text>
              <text
                x={4}
                y={lineChartData.height - lineChartData.paddingBottom}
                fill="#94A3B8"
                fontSize="9"
                fontWeight="black"
              >
                0đ
              </text>
            </svg>
          ) : (
            <div className="flex h-48 items-center justify-center text-xs font-semibold text-gray-400">
              Không có dữ liệu trong khoảng thời gian này
            </div>
          )}

          {/* Hộp Tooltip động vẽ bằng HTML phủ lên SVG */}
          {hoveredTimelineIdx !== null && lineChartData.points[hoveredTimelineIdx] && (
            <div
              className="absolute pointer-events-none rounded-xl border border-sky-50 bg-white/95 p-3 shadow-md backdrop-blur-xs flex flex-col gap-0.5 transition-all duration-75"
              style={{
                left: `${(lineChartData.points[hoveredTimelineIdx].x / lineChartData.width) * 100}%`,
                top: `${(lineChartData.points[hoveredTimelineIdx].y / lineChartData.height) * 100}%`,
                transform: "translate(-50%, -100%)",
                marginTop: "-12px",
                zIndex: 10,
              }}
            >
              <span className="text-[10px] font-black text-gray-400">
                Mốc: {lineChartData.points[hoveredTimelineIdx].label}
              </span>
              <span className="text-xs font-black text-sky-600">
                DT: {formatCurrency(lineChartData.points[hoveredTimelineIdx].revenue)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Sản lượng: {lineChartData.points[hoveredTimelineIdx].orderCount} hóa đơn
              </span>
            </div>
          )}
        </div>

        {/* Chú giải chân trang */}
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Doanh thu (đơn vị: VNĐ)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-sky-500 bg-white" /> Điểm mốc thống kê
          </span>
        </div>
      </div>

      {/* 2. BIỂU ĐỒ TOP 5 MÓN ĂN BÁN CHẠY (DOUGHNUT CHART) */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm lg:col-span-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-black text-slate-700 font-display">
            Top 5 món ăn bán chạy nhất
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Xếp hạng theo sản lượng đĩa phục vụ hoàn tất</p>
        </div>

        {topItems.length > 0 ? (
          <div className="my-auto flex flex-col items-center gap-4 py-2">
            {/* Vòng tròn SVG Doughnut */}
            <div className="relative h-32 w-32">
              <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="35" fill="transparent" stroke="#F1F5F9" strokeWidth="12" />
                {doughnutSegments.map((seg, idx) => {
                  const isHovered = hoveredDoughnutIdx === idx;
                  const r = isHovered ? 37 : 35;
                  const strokeWidth = isHovered ? 14 : 12;
                  
                  return (
                    <path
                      key={idx}
                      d={describeArc(50, 50, r, seg.startAngle, seg.endAngle)}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      onMouseEnter={() => setHoveredDoughnutIdx(idx)}
                      onMouseLeave={() => setHoveredDoughnutIdx(null)}
                      className="cursor-pointer transition-all duration-200"
                    />
                  );
                })}
              </svg>

              {/* Chú giải chính giữa vòng tròn */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {hoveredDoughnutIdx !== null && doughnutSegments[hoveredDoughnutIdx] ? (
                  <>
                    <span className="text-lg font-black text-slate-700 leading-none">
                      {doughnutSegments[hoveredDoughnutIdx].percentageVal}%
                    </span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {doughnutSegments[hoveredDoughnutIdx].item.name.slice(0, 10)}...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black text-slate-700 leading-none">TOP 5</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Món nổi bật
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Danh sách chú thích bên dưới */}
            <div className="w-full space-y-1.5 border-t border-sky-50 pt-3 text-[11px] font-semibold text-slate-500">
              {doughnutSegments.map((seg, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredDoughnutIdx(idx)}
                  onMouseLeave={() => setHoveredDoughnutIdx(null)}
                  className={`flex items-center justify-between rounded-lg p-1 transition-all ${
                    hoveredDoughnutIdx === idx ? "bg-sky-50/50 scale-102" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate max-w-[120px]">{seg.item.name}</span>
                  </span>
                  <span className="font-black text-slate-700">
                    {seg.item.quantity} đĩa ({seg.percentageVal}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center text-xs font-semibold text-gray-400">
            Không có dữ liệu
          </div>
        )}
      </div>

      {/* 3. BIỂU ĐỒ GIỜ CAO ĐIỂM (BAR CHART) */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm lg:col-span-3 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-black text-slate-700 font-display">
            Phân tích giờ cao điểm trong ngày
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Số lượng đơn hàng được mở theo giờ để bố trí nhân lực bếp & phục vụ</p>
        </div>

        {barChartData.bars.length > 0 ? (
          <div className="relative mt-5 flex-1">
            {/* Lưới phân phối Bar Chart bằng HTML/Tailwind */}
            <div className="relative flex h-40 items-end justify-between border-b border-sky-50 pb-2 px-2">
              
              {/* Thước kẻ trục ngang chỉ dẫn */}
              <div className="absolute left-0 bottom-2 w-full border-b border-sky-50 pointer-events-none" />

              {barChartData.bars.map((bar, idx) => {
                const isHovered = hoveredBarHour === bar.hour;
                
                return (
                  <div
                    key={idx}
                    className="relative flex flex-col items-center flex-1 group"
                    style={{ minWidth: "18px" }}
                  >
                    {/* Cột Bar */}
                    <div
                      onMouseEnter={() => setHoveredBarHour(bar.hour)}
                      onMouseLeave={() => setHoveredBarHour(null)}
                      style={{ height: `${bar.barHeight}px` }}
                      className={`w-4/5 sm:w-8 max-w-10 rounded-t-md transition-all duration-300 cursor-pointer ${
                        isHovered 
                          ? "bg-sky-500" 
                          : bar.count === barChartData.maxCount 
                          ? "bg-sky-500/80" // Cột max nhất thì màu đậm hơn tí
                          : "bg-sky-500/40 hover:bg-sky-500/60"
                      }`}
                    />

                    {/* Nhãn giờ bên dưới cột */}
                    <span className="mt-2 text-[9px] font-black text-gray-400">
                      {bar.hour}h
                    </span>

                    {/* Tooltip nhỏ ngay trên đỉnh cột khi hover */}
                    {isHovered && (
                      <div className="absolute -top-12 z-10 w-24 rounded-lg bg-gray-900 px-2 py-1.5 text-center text-[9px] font-bold text-white shadow-md animate-fade-in pointer-events-none">
                        <div>Giờ: {bar.hour}:00</div>
                        <div className="text-sky-600">{bar.count} đơn ({bar.percentage}%)</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-xs font-semibold text-gray-400">
            Không tìm thấy thông tin ca làm việc
          </div>
        )}

        <div className="mt-3 flex items-center justify-center gap-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded-xs bg-sky-500/40" /> Thấp điểm
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded-xs bg-sky-500" /> Cao điểm
          </span>
        </div>
      </div>

    </div>
  );
};
export default CustomCharts;
