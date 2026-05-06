import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard, FileQuestion, FileText, Users, BarChart3,
  ChevronDown, ChevronRight, Plus, List, Upload, LogOut, User, AlertCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";

/**
 * TeacherLayout — Layout dành riêng cho giáo viên.
 * Bao gồm Sidebar cố định bên trái và vùng nội dung chính bên phải.
 * Lưu ý: Route /teacher đã được ProtectedRoute bảo vệ với requiredRole="teacher"
 */
function TeacherLayout() {
  const { user, logout } = useAuth();
  const [openMenus, setOpenMenus] = useState(["questions", "exams"]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleMenu = (menu) => {
    setOpenMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu],
    );
  };

  // --- Component NavItem ---
  const SidebarItem = ({ to, icon: Icon, label, subItems = [], menuKey }) => {
    const isAccordion = subItems.length > 0;
    const isOpen = openMenus.includes(menuKey);

    const baseClass =
      "flex items-center gap-3 px-4 py-3 transition-all duration-200";
    const activeClass = "bg-[#2c4e7a] border-l-4 border-white text-white";
    const inactiveClass = "text-white/70 hover:bg-white/10 hover:text-white";

    if (!isAccordion) {
      return (
        <NavLink
          to={to}
          className={({ isActive }) =>
            `${baseClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <Icon size={18} />
          <span className="text-sm font-medium">{label}</span>
        </NavLink>
      );
    }

    return (
      <div>
        <button
          onClick={() => toggleMenu(menuKey)}
          className={`w-full ${baseClass} ${inactiveClass} justify-between`}
        >
          <div className="flex items-center gap-3">
            <Icon size={18} />
            <span className="text-sm font-medium">{label}</span>
          </div>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {isOpen && (
          <div className="bg-[#162a45]/50 py-1">
            {subItems.map((sub, idx) => (
              <NavLink
                key={idx}
                to={sub.to}
                className={({ isActive }) => `
                  flex items-center gap-2 pl-12 pr-4 py-2 text-xs transition-colors
                  ${isActive ? "text-white font-bold" : "text-white/50 hover:text-white"}
                `}
              >
                {sub.icon && <sub.icon size={12} />}
                {sub.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* SIDEBAR (240px) */}
      <aside className="w-60 bg-[#1e3a5f] flex flex-col fixed inset-y-0 left-0 z-20 shadow-xl">
        {/* Profile Header */}
        <div className="p-6 border-b border-white/10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5a623] flex items-center justify-center text-3xl shadow-lg mb-3">
            👨‍🏫
          </div>
          <p className="text-white font-bold text-base">
            {user?.username || "Giáo viên"}
          </p>
          <span className="mt-1 px-2.5 py-0.5 bg-[#f5a623] text-[#1e3a5f] text-[10px] font-black uppercase rounded-full">
            Giáo viên
          </span>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <SidebarItem to="/teacher" icon={LayoutDashboard} label="Tổng quan" />

          <SidebarItem
            icon={FileQuestion}
            label="Quản lý câu hỏi"
            menuKey="questions"
            subItems={[
              { to: "/teacher/questions", label: "Danh sách", icon: List },
              { to: "/teacher/questions/add", label: "Thêm mới", icon: Plus },
              {
                to: "/teacher/questions/upload",
                label: "Upload PDF",
                icon: Upload,
              },
            ]}
          />

          <SidebarItem
            icon={FileText}
            label="Quản lý đề thi"
            menuKey="exams"
            subItems={[
              { to: "/teacher/exams", label: "Danh sách", icon: List },
              { to: "/teacher/exams/add", label: "Thêm mới", icon: Plus },
            ]}
          />

          <SidebarItem
            to="/teacher/documents"
            icon={FileText}
            label="Tài liệu"
          />
          <SidebarItem to="/teacher/students" icon={Users} label="Học sinh" />
          <SidebarItem to="/teacher/stats" icon={BarChart3} label="Thống kê" />
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT (flex-1) */}
      <main className="flex-1 ml-60 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-[#1e3a5f]">
            Hệ thống Quản lý MathPro
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-800">
                {user?.username}
              </p>
              <p className="text-[10px] text-gray-400">Đang trực tuyến</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[#1e3a5f]">
              <User size={18} />
            </div>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Confirm Logout */}
      <ConfirmModal
        open={showLogoutModal}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi trang quản lý không?"
        confirmLabel="Đăng xuất"
        cancelLabel="Ở lại"
        confirmVariant="danger"
        icon={<LogOut size={28} />}
        onConfirm={() => { setShowLogoutModal(false); logout(); }}
        onCancel={() => setShowLogoutModal(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

export default TeacherLayout;