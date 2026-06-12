import React, { useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { createOrder, placeOrder } from "../../store/orderSlice";
import { setTableStatus } from "../../store/tableSlice";
import { TABLE_STATUS } from "../../constants/tableStatus";
import { ORDER_STATUS } from "../../constants/orderStatus";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Flame,
  Award,
  BookOpen,
  CheckCircle,
  Phone,
  Mail,
  User,
  ShoppingBag,
  QrCode,
  Receipt,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";

/**
 * HomeView - Core landing view containing reservation widgets and menu highlights
 */
export const HomeView: React.FC = () => {
  const dispatch = useAppDispatch();
  const menuItems = useAppSelector((state) => state.menu.items);
  const tables = useAppSelector((state) => state.tables.tables);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedZone, setSelectedZone] = useState<string>("All");
  const [bookingTable, setBookingTable] = useState<{ id: string; name: string } | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(2);
  const [time, setTime] = useState("19:00");
  const [successBooking, setSuccessBooking] = useState<string | null>(null);

  // Cart State
  const [cart, setCart] = useState<{ item: any; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout Form State
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutNote, setCheckoutNote] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  // Checkout Success / Payment QR Modal State
  const [placedOrderInfo, setPlacedOrderInfo] = useState<{
    id: string;
    totalAmount: number;
    receiptUrl?: string;
  } | null>(null);

  // Categories
  const categories = [
    { value: "all", label: "Tất cả" },
    { value: "Khai vị", label: "Món khai vị" },
    { value: "Món chính", label: "Món chính" },
    { value: "Lẩu", label: "Lẩu" },
    { value: "Đồ uống", label: "Đồ uống" },
    { value: "Tráng miệng", label: "Tráng miệng" },
  ];

  // Filtering Menu
  const filteredMenu = useMemo(() => {
    if (activeCategory === "all") return menuItems;
    return menuItems.filter((item) => item.category === activeCategory);
  }, [menuItems, activeCategory]);

  // Filtering Tables by Zone
  const filteredTables = useMemo(() => {
    if (selectedZone === "All") return tables;
    return tables.filter((table) => table.zone === selectedZone);
  }, [tables, selectedZone]);

  const handleOpenBooking = (tableId: string, tableName: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (table && table.status === TABLE_STATUS.AVAILABLE) {
      setBookingTable({ id: tableId, name: tableName });
      setGuests(table.seats);
    }
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingTable || !name || !phone) return;

    const orderId = "booking_" + Math.random().toString(36).substr(2, 9);

    dispatch(
      createOrder({
        id: orderId,
        tableId: bookingTable.id,
        tableName: bookingTable.name,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || undefined,
        guestCount: guests,
        items: [],
        status: ORDER_STATUS.CONFIRMED,
        totalAmount: 0,
      })
    );

    dispatch(
      setTableStatus({
        id: bookingTable.id,
        status: TABLE_STATUS.RESERVED,
        currentOrderId: orderId,
      })
    );

    setSuccessBooking(`${bookingTable.name} has been successfully reserved for ${name} at ${time}.`);
    setBookingTable(null);

    // Reset Form
    setName("");
    setPhone("");
    setEmail("");
  };

  const handleAddToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
    setIsCartOpen(true); // Open the cart drawer automatically
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, c) => sum + c.quantity, 0);
  }, [cart]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !checkoutName || !checkoutPhone || !checkoutAddress) return;

    setIsSubmittingOrder(true);
    const orderId = "ord_del_" + Math.random().toString(36).substr(2, 9);
    
    const orderItems = cart.map((c) => ({
      menuItemId: c.item.id,
      name: c.item.name,
      price: c.item.price,
      quantity: c.quantity,
    }));

    const orderPayload = {
      id: orderId,
      items: orderItems,
      status: ORDER_STATUS.CONFIRMED,
      totalAmount: cartTotal,
      customerName: checkoutName,
      customerPhone: checkoutPhone,
      customerEmail: checkoutEmail || undefined,
      guestCount: 1,
      deliveryAddress: checkoutAddress,
      orderType: "delivery" as const,
    };

    try {
      const resultAction = await dispatch(placeOrder(orderPayload));
      
      if (placeOrder.fulfilled.match(resultAction)) {
        const payload = resultAction.payload as any;
        setPlacedOrderInfo({
          id: payload.id,
          totalAmount: payload.totalAmount,
          receiptUrl: payload.receiptUrl,
        });
        
        // Reset Cart and Checkout states
        setCart([]);
        setCheckoutName("");
        setCheckoutPhone("");
        setCheckoutAddress("");
        setCheckoutEmail("");
        setCheckoutNote("");
        setIsCartOpen(false);
      } else {
        alert("Đã xảy ra lỗi khi tạo đơn hàng. Vui lòng kiểm tra kết nối với backend!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối máy chủ backend!");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section id="hero" className="relative px-6 md:px-12 py-20 md:py-32 flex flex-col md:flex-row items-center gap-12 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex flex-col items-start gap-6 animate-slide-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-brand-primary font-bold tracking-wider">
            <Award size={14} /> 3 Michelin Stars Gastronomy
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold font-display leading-[1.1] tracking-tight text-white">
            Artisanal Dining <br />
            <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-white bg-clip-text text-transparent">
              Elevated For Connoisseurs
            </span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
            Enter a sanctuary of premium flavors where every recipe is a poem and every table holds an unforgettable gourmet adventure. Located in the heart of Saigon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <a
              href="#reserve"
              className="px-8 py-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-dark font-extrabold tracking-widest rounded-xl transition-all shadow-lg text-center cursor-pointer"
            >
              BOOK YOUR TABLE
            </a>
            <a
              href="#menu"
              className="px-8 py-4 border border-white/10 hover:border-white/30 hover:bg-white/5 text-white font-extrabold tracking-widest rounded-xl transition-all text-center cursor-pointer"
            >
              EXPLORE CURATED MENU
            </a>
          </div>
        </div>

        {/* Hero Visual Box */}
        <div className="flex-1 w-full flex justify-center items-center animate-fade-in">
          <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-2 bg-brand-dark-light">
            <div className="relative w-full h-full rounded-2xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80"
                alt="Gourmet steak plated elegantly"
                className="w-full h-full object-cover brightness-90 hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 glass p-4 rounded-xl border border-white/10">
                <p className="text-xs font-semibold text-brand-primary tracking-wider uppercase mb-1">Món ngon mỗi tuần</p>
                <h4 className="text-lg font-bold text-white mb-0.5">Bò lúc lắc thượng hạng</h4>
                <p className="text-xs text-zinc-400">Thịt bò Mỹ mềm mọng xào xốt thơm lừng ăn kèm khoai tây chiên giòn.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="bg-brand-dark-light border-y border-white/5 px-6 md:px-12 py-24 w-full">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-brand-primary font-bold text-sm tracking-widest uppercase">Gastronomic Masterpieces</span>
              <h3 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-white">
                Chef's Seasonal Menu
              </h3>
            </div>
            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
                    activeCategory === cat.value
                      ? "bg-brand-primary text-brand-dark shadow-[0_4px_12px_rgba(197,168,128,0.2)]"
                      : "bg-white/5 text-zinc-400 hover:text-white border border-white/5 hover:border-white/10"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className={`group glass rounded-2xl border border-white/5 overflow-hidden flex flex-col transition-all duration-300 hover:border-white/15 hover:shadow-xl ${
                  !item.inStock ? "opacity-60" : ""
                }`}
              >
                {/* Image Showcase */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Badges on Image */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {item.isBestSeller && (
                      <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md bg-amber-500 text-black shadow-lg">
                        Best Seller
                      </span>
                    )}
                    {item.isSpicy && (
                      <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md bg-rose-600 text-white flex items-center gap-1 shadow-lg">
                        <Flame size={10} /> Spicy
                      </span>
                    )}
                  </div>
                  
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="px-4 py-2 border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-black tracking-widest uppercase rounded-lg">
                        Temporary Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors">
                        {item.name}
                      </h4>
                      <span className="text-xl font-bold text-brand-primary">
                        {(item.price * 1000).toLocaleString("vi-VN")} vnđ
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-xs text-zinc-500 capitalize">
                      Category: <strong className="text-zinc-300 font-semibold">{item.category}</strong>
                    </span>
                    {item.inStock ? (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="px-3.5 py-1.5 rounded-lg bg-brand-primary text-brand-dark hover:bg-brand-primary-hover font-bold text-[10px] tracking-wider transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={11} /> CHỌN MÓN
                      </button>
                    ) : (
                      <span className="text-xs text-rose-400 font-bold flex items-center gap-1">
                        Hết hàng
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reservation & Visual Table Map */}
      <section id="reserve" className="px-6 md:px-12 py-24 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
            <span className="text-brand-primary font-bold text-sm tracking-widest uppercase">Interactive Booking</span>
            <h3 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-white">
              Choose Your Dining Table
            </h3>
            <p className="text-zinc-400 text-sm">
              Explore our live table mapping layout. Pick your preferred dining ambiance (Tầng 1, Tầng 2, Sân vườn). Live table status is synced instantly.
            </p>
          </div>

          {/* Success Booking Notice */}
          {successBooking && (
            <div className="glass bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl flex items-start gap-4 max-w-3xl mx-auto w-full animate-fade-in">
              <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={20} />
              <div className="flex-1 flex flex-col gap-1">
                <h4 className="text-sm font-bold text-emerald-300">Reservation Confirmed!</h4>
                <p className="text-xs text-zinc-300">{successBooking}</p>
                <p className="text-[10px] text-zinc-400 mt-1">Our host will call you shortly to confirm dinner details. You can view this reservation at the host station.</p>
              </div>
              <button
                onClick={() => setSuccessBooking(null)}
                className="text-xs font-bold text-emerald-400 hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Table Map Filter & Status Guides */}
          <div className="glass border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 bg-brand-dark-light">
            {/* Zone filters */}
            <div className="flex flex-wrap gap-2">
              {["All", "Tầng 1", "Tầng 2", "Sân vườn"].map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
                    selectedZone === zone
                      ? "bg-brand-primary text-brand-dark font-extrabold"
                      : "bg-white/5 text-zinc-400 border border-white/5 hover:border-white/10"
                  }`}
                >
                  {zone === "All" ? "Tất cả khu vực" : zone}
                </button>
              ))}
            </div>

            {/* Status Guide */}
            <div className="flex flex-wrap gap-6 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </span>
                <span>Available (Click to book)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </span>
                <span>Reserved (Not available)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                </span>
                <span>Dining / Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </span>
                <span>Cleaning</span>
              </div>
            </div>
          </div>

          {/* Graphical Table Map Layout */}
          <div className="glass border border-white/5 rounded-3xl p-8 md:p-12 bg-black/40 relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {filteredTables.map((table) => {
                const isAvailable = table.status === TABLE_STATUS.AVAILABLE;
                const statusColor =
                  table.status === TABLE_STATUS.AVAILABLE
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400 hover:bg-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/5"
                    : table.status === TABLE_STATUS.RESERVED
                    ? "border-amber-500/30 bg-amber-500/5 cursor-not-allowed opacity-80"
                    : table.status === TABLE_STATUS.OCCUPIED
                    ? "border-rose-500/30 bg-rose-500/5 cursor-not-allowed opacity-80"
                    : "border-blue-500/30 bg-blue-500/5 cursor-not-allowed opacity-80";

                return (
                  <div
                    key={table.id}
                    onClick={() => isAvailable && handleOpenBooking(table.id, table.name)}
                    className={`relative p-6 border rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 ${statusColor} ${
                      isAvailable ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="absolute top-3 right-3 text-[10px] font-bold text-zinc-500 bg-white/5 px-2 py-0.5 rounded-md">
                      {table.seats} Seats
                    </div>

                    <div className="text-zinc-500 text-[10px] tracking-widest uppercase font-semibold">
                      {table.zone}
                    </div>

                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed ${
                        table.status === TABLE_STATUS.AVAILABLE
                          ? "border-emerald-500/30 text-emerald-400"
                          : table.status === TABLE_STATUS.RESERVED
                          ? "border-amber-500/30 text-amber-400"
                          : table.status === TABLE_STATUS.OCCUPIED
                          ? "border-rose-500/30 text-rose-400"
                          : "border-blue-500/30 text-blue-400"
                      }`}
                    >
                      <span className="font-display font-black text-sm">T-{table.name.split(" ").pop()}</span>
                    </div>

                    <div className="font-bold text-sm text-white">{table.name}</div>
                    
                    <Badge status={table.status} type="table" className="mt-1" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* The Experience Section */}
      <section id="about" className="bg-brand-dark-light border-t border-white/5 px-6 md:px-12 py-24 w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Award size={24} />
            </div>
            <h4 className="text-xl font-bold font-display text-white">World Class Chefs</h4>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Curated by chefs trained in Michelin-starred Parisian kitchens, combining local organic Vietnamese ingredients with classic French culinary philosophies.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <MapPin size={24} />
            </div>
            <h4 className="text-xl font-bold font-display text-white">Bespoke Ambiance</h4>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Enjoy custom lighting, carefully selected French jazz, private VIP booths, and window seats looking out over the glittering cityscape.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <BookOpen size={24} />
            </div>
            <h4 className="text-xl font-bold font-display text-white">Simulated Real-time Integration</h4>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Our dashboard is fully reactive. Staff instantly see table reservation triggers, order submissions, and meal preparations in the backend workstation.
            </p>
          </div>
        </div>
      </section>

      {/* Booking Form Modal */}
      <Modal
        isOpen={bookingTable !== null}
        onClose={() => setBookingTable(null)}
        title={`Reserve ${bookingTable?.name || ""}`}
        size="md"
      >
        <form onSubmit={handleConfirmBooking} className="flex flex-col gap-5">
          <div className="text-xs text-zinc-400 bg-white/5 p-3 rounded-lg border border-white/5">
            <strong>Table Guidelines:</strong> Seating capacity is up to <strong>{guests} guests</strong>. Selected tables are held for 15 minutes past the booking schedule.
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Full Name *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><User size={16} /></span>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Phone Number *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Phone size={16} /></span>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Mail size={16} /></span>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Guests Count</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Users size={16} /></span>
                <input
                  type="number"
                  min={1}
                  max={guests}
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Date</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Calendar size={16} /></span>
                <input
                  type="date"
                  defaultValue="2026-06-12"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Time Slot</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Clock size={16} /></span>
                <input
                  type="text"
                  placeholder="e.g. 19:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setBookingTable(null)}
              className="px-5 py-2.5 text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-extrabold bg-brand-primary hover:bg-brand-primary-hover text-brand-dark rounded-lg transition-colors cursor-pointer"
            >
              CONFIRM RESERVATION
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Cart Button */}
      {cartItemsCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-brand-primary hover:bg-brand-primary-hover text-brand-dark p-4 rounded-full shadow-2xl border border-white/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 animate-bounce"
        >
          <ShoppingBag size={20} />
          <span className="w-5 h-5 rounded-full bg-brand-dark text-brand-primary text-[10px] font-black flex items-center justify-center">
            {cartItemsCount}
          </span>
        </button>
      )}

      {/* Cart Drawer Backdrop */}
      {isCartOpen && (
        <div
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-all duration-300"
        />
      )}

      {/* Cart Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-brand-dark-light border-l border-white/5 shadow-2xl z-50 flex flex-col transition-transform duration-300 transform ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-brand-dark">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-brand-primary" size={20} />
            <h3 className="text-lg font-black font-display text-white tracking-tight">Giỏ Hàng Của Bạn</h3>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm italic flex flex-col gap-2 font-medium">
              <span>Giỏ hàng trống.</span>
              <span>Hãy chọn món ăn từ thực đơn của chúng tôi!</span>
            </div>
          ) : (
            <>
              {/* Selected Items List */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Danh sách món đã chọn</span>
                <div className="flex flex-col gap-2.5">
                  {cart.map((c) => (
                    <div key={c.item.id} className="flex justify-between items-center p-3 glass rounded-xl border border-white/5 gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{c.item.name}</h4>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {(c.item.price * 1000).toLocaleString("vi-VN")} vnđ
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRemoveFromCart(c.item.id)}
                          className="w-5 h-5 rounded bg-white/5 text-zinc-400 font-bold text-xs flex items-center justify-center hover:bg-white/10 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold text-white text-xs px-1 min-w-[12px] text-center">{c.quantity}</span>
                        <button
                          onClick={() => handleAddToCart(c.item)}
                          className="w-5 h-5 rounded bg-white/5 text-zinc-400 font-bold text-xs flex items-center justify-center hover:bg-white/10 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-bold text-brand-primary shrink-0 w-20 text-right">
                        {(c.item.price * c.quantity * 1000).toLocaleString("vi-VN")} vnđ
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-4 border-t border-white/5 pt-5 mt-auto">
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-1">Thông tin giao hàng</span>
                
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên người nhận"
                    value={checkoutName}
                    onChange={(e) => setCheckoutName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                {/* Phone & Email Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0901234567"
                      value={checkoutPhone}
                      onChange={(e) => setCheckoutPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Email (Nhận HĐ)</label>
                    <input
                      type="email"
                      placeholder="e.g. name@mail.com"
                      value={checkoutEmail}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Địa chỉ giao hàng *</label>
                  <input
                    type="text"
                    required
                    placeholder="Số nhà, Tên đường, Phường/Quận"
                    value={checkoutAddress}
                    onChange={(e) => setCheckoutAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>

                {/* Note */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Ghi chú giao hàng</label>
                  <textarea
                    placeholder="e.g. Giao giờ hành chính, gọi trước khi giao..."
                    value={checkoutNote}
                    onChange={(e) => setCheckoutNote(e.target.value)}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary transition-colors resize-none"
                  />
                </div>

                {/* Totals and Order Button */}
                <div className="border-t border-white/5 pt-4 flex flex-col gap-3.5 mt-2">
                  <div className="flex justify-between items-center text-sm font-bold text-white">
                    <span>Tổng tiền thanh toán:</span>
                    <span className="text-brand-primary text-base font-black">
                      {(cartTotal * 1000).toLocaleString("vi-VN")} vnđ
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-zinc-700 disabled:text-zinc-550 text-brand-dark rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-lg text-center cursor-pointer font-display"
                  >
                    {isSubmittingOrder ? "ĐANG XỬ LÝ..." : "XÁC NHẬN ĐẶT HÀNG"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Placed Order / Payment QR Success Modal */}
      {placedOrderInfo && (
        <Modal
          isOpen={placedOrderInfo !== null}
          onClose={() => setPlacedOrderInfo(null)}
          title="Thanh toán & Xác nhận đơn hàng"
          size="md"
        >
          <div className="flex flex-col gap-5 text-slate-800">
            {/* Visual Header */}
            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <h4 className="font-extrabold text-xs text-emerald-800">Đặt hàng thành công!</h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                  Đơn hàng của bạn (<strong className="font-mono text-xs">{placedOrderInfo.id}</strong>) đã được lưu vào hệ thống và bắt đầu xử lý.
                </p>
              </div>
            </div>

            {/* Payment Transition / QR code segment */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-1.5">
                <QrCode className="text-admin-primary shrink-0" size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cổng thanh toán điện tử</span>
              </div>
              <h5 className="font-bold text-xs text-slate-700">Quét mã QR sau để thanh toán nhanh qua Ngân hàng</h5>
              
              {/* QR Image Box */}
              <div className="w-36 h-36 border border-slate-250 bg-white p-2 rounded-xl flex items-center justify-center shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=STB_ResManager_Order_${placedOrderInfo.id}_Amount_${placedOrderInfo.totalAmount * 1000}`}
                  alt="QR Code Payment"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-[10px] text-slate-500 leading-relaxed max-w-xs font-semibold">
                <div>Ngân hàng: <strong>Sacombank</strong></div>
                <div>Số tài khoản: <strong>0200 9876 5432</strong></div>
                <div>Chủ tài khoản: <strong>RESMANAGER CULINARY GROUP</strong></div>
                <div>Số tiền: <strong className="text-rose-500">{(placedOrderInfo.totalAmount * 1000).toLocaleString("vi-VN")} vnđ</strong></div>
                <div className="mt-1 font-mono text-[9px] bg-slate-200 border border-slate-250 px-2 py-0.5 rounded inline-block text-slate-700">
                  Nội dung chuyển khoản: STB {placedOrderInfo.id}
                </div>
              </div>
            </div>

            {/* Email receipt confirmation download/view link */}
            {placedOrderInfo.receiptUrl && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                <Receipt className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <h4 className="font-extrabold text-xs text-blue-800">Xác nhận email của bạn</h4>
                  <p className="text-[11px] text-blue-700 leading-relaxed mt-0.5">
                    Hóa đơn biên lai đã được lưu trên hệ thống và gửi email xác nhận. Bạn có thể bấm liên kết dưới đây để xem trực tiếp hóa đơn:
                  </p>
                  <a
                    href={`http://localhost:5000${placedOrderInfo.receiptUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-850 underline mt-1.5 cursor-pointer"
                  >
                    Xem hóa đơn điện tử của tôi (HTML Receipt) <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => setPlacedOrderInfo(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer font-display transition-colors shadow-sm"
              >
                ĐÃ HOÀN THÀNH THANH TOÁN
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
