import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  Send,
  BookOpen,
  FileText,
  Library,
  BarChart2,
} from "lucide-react";

function Footer() {
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!feedback.trim()) return;
    setSent(true);
    setFeedback("");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <footer style={{ backgroundColor: "#1e3a5f" }}>
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Cột 1: Brand */}
          <div>
            <div className="mb-4">
              <span className="text-white font-extrabold text-2xl tracking-tight">
                Math<span style={{ color: "#f5a623" }}>Pro</span>
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              Hệ thống luyện thi Toán hàng đầu dành cho học sinh THPT. Học tập
              thông minh, thành công bền vững.
            </p>
            <div className="flex items-center gap-4 mb-4">
              <Link
                to="/topics"
                className="flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors"
              >
                <BookOpen size={14} />
                Luyện tập
              </Link>
              <Link
                to="/exams"
                className="flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors"
              >
                <FileText size={14} />
                Đề thi
              </Link>
              <Link
                to="/documents"
                className="flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors"
              >
                <Library size={14} />
                Tài liệu
              </Link>
            </div>
            <p className="text-white/30 text-xs">
              Đây là sản phẩm đồ án tốt nghiệp năm 2026 - sinh viên Lê Đức Huy -
              2022DHHTTT01 - K17 - Trường Công nghệ thông tin và Truyền thông -
              Đại học Công nghiệp Hà Nội
          </p>
          </div>

          {/* Cột 2: Liên hệ */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest mb-5">
              Liên hệ
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Phone
                  size={15}
                  style={{ color: "#f5a623" }}
                  className="flex-shrink-0"
                />
                SĐT: hehhe
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Mail
                  size={15}
                  style={{ color: "#f5a623" }}
                  className="flex-shrink-0"
                />
                lehuy9031@gmail.com
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Library
                  size={15}
                  style={{ color: "#f5a623" }}
                  className="flex-shrink-0"
                />
                <Link
                  to="/documents"
                  className="hover:text-white transition-colors"
                >
                  Tài liệu học tập
                </Link>
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <BarChart2
                  size={15}
                  style={{ color: "#f5a623" }}
                  className="flex-shrink-0"
                />
                <Link
                  to="/stats"
                  className="hover:text-white transition-colors"
                >
                  Thống kê học tập
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Gửi phản hồi */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest mb-5">
              Gửi phản hồi
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ý kiến của bạn..."
                className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none text-white placeholder-white/40"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#f5a623";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.15)";
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                onClick={handleSend}
                className="px-3 py-2.5 rounded-lg text-white flex items-center justify-center transition-colors"
                style={{ backgroundColor: "#f5a623" }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e09410";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f5a623";
                }}
              >
                <Send size={16} />
              </button>
            </div>
            {sent && (
              <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                ✓ Cảm ơn phản hồi của bạn!
              </p>
            )}
            <p className="text-white/30 text-xs mt-5 leading-relaxed">
              Nếu bạn cần hỗ trợ gấp, hãy gửi email trực tiếp đến
              <a
                href="mailto:lehuy9031@gmail.com"
                className="text-white/50 hover:text-white ml-1 transition-colors"
              >
                lehuy9031@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/30 text-xs">
            © 2026 MathPro Education System. All rights reserved.
          </p>
          <div className="flex gap-5">
            <a
              href="#"
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              Liên hệ
            </a>
            <a
              href="mailto:support@mathpro.vn"
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              Email
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
