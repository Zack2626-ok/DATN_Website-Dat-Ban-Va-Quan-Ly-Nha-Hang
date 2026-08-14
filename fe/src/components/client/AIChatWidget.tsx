import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, CheckCircle2, Calendar, Users, Clock } from "lucide-react";
import { sendAIChatMessage } from "../../services/customerService";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  bookingSuccess?: boolean;
  bookingData?: any;
}

/**
 * AIChatWidget Component
 * Floating conversational AI Agent powered by Gemini 3.6 Flash.
 * Handles natural conversation, restaurant QA, auto-table allocation, and automated booking creation.
 */
export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "ai",
      text: "Xin chào! Em là Trợ lý AI Lễ tân của ResManager. Em có thể giải đáp thắc mắc về nhà hàng hoặc giúp anh/chị đặt bàn tự động bằng câu chat tự nhiên (ví dụ: 'Cho anh đặt bàn 4 người 7h tối mai ở sân vườn'). Anh/chị cần hỗ trợ gì ạ?",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = inputText.trim();
    if (!userText || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      // Build conversation history format for API
      const history = messages
        .filter((m) => m.id !== "welcome-msg")
        .map((m) => ({
          role: (m.sender === "user" ? "user" : "model") as "user" | "model",
          text: m.text,
        }));

      const res = await sendAIChatMessage({
        text: userText,
        messages: history,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.reply || "Dạ em có thể hỗ trợ anh/chị đặt bàn ạ!",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        bookingSuccess: res.booking_created,
        bookingData: res.booking,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("Lỗi gửi tin nhắn AI Chat Widget:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "Rất tiếc, hệ thống AI đang bận một chút. Anh/chị có thể gõ câu đặt bàn khác hoặc chọn mục Đặt Bàn trên menu nhé!",
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3.5 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-purple-500/25 active:scale-95 cursor-pointer"
          aria-label="Mở Trợ lý AI"
        >
          <div className="relative">
            <Bot size={22} className="text-amber-300" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300"></span>
            </span>
          </div>
          <span className="text-sm font-bold tracking-wide">Trợ lý AI Đặt bàn</span>
        </button>
      )}

      {/* Chat Modal Box */}
      {isOpen && (
        <div className="flex h-[560px] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-purple-950/20 bg-white shadow-2xl animate-fade-in sm:w-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-xs">
                <Sparkles size={18} className="text-amber-300" />
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
                  ResManager AI Agent
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                    Gemini 3.6
                  </span>
                </h3>
                <p className="text-[11px] text-purple-200">Trợ lý lễ tân tự động 24/7</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-purple-200 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${msg.sender === "user"
                      ? "bg-purple-600 text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                    }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                  {/* Render Booking Success Card if booking created */}
                  {msg.bookingSuccess && msg.bookingData && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 shadow-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 mb-1.5">
                        <CheckCircle2 size={16} />
                        Đã tự động giữ bàn thành công!
                      </div>
                      <div className="space-y-1.5 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-emerald-600 shrink-0" />
                          <span>Mã booking: <strong>{msg.bookingData.confirmation_code}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-emerald-600 shrink-0" />
                          <span>Số khách: <strong>{msg.bookingData.party_size} người</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-emerald-600 shrink-0" />
                          <span>
                            Giờ hẹn: <strong>{msg.bookingData.start_time ? new Date(msg.bookingData.start_time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "N/A"}</strong>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 pt-1 border-t border-emerald-200/60">
                          <span className="font-bold text-emerald-800">
                            Bàn xếp: {
                              msg.bookingData.table_assignments && msg.bookingData.table_assignments.length > 0
                                ? msg.bookingData.table_assignments.map((t: any) => t.table_name).join(", ")
                                : msg.bookingData.table_name || "Đang xếp bàn"
                            } {msg.bookingData.area_name ? `(${msg.bookingData.area_name})` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] text-slate-400">{msg.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <Sparkles size={14} className="animate-spin text-purple-600" />
                AI đang suy nghĩ câu trả lời...
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Hỏi AI hoặc gõ câu đặt bàn tự nhiên..."
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-purple-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:opacity-40 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
