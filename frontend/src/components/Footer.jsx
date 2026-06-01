export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-3xl animate-pulse">🏸</span>
          <span className="text-xl font-black tracking-tight text-white">
            Badminton<span className="text-green-500">Hub</span>
          </span>
        </div>
        <p className="text-xs md:text-sm font-medium text-slate-500">
          Nền tảng đặt sân và quản lý lịch thi đấu cầu lông trực tuyến chuyên nghiệp.
        </p>
        <div className="w-12 h-[1px] bg-slate-800 mx-auto my-6"></div>
        <p className="text-[10px] md:text-xs text-slate-600 font-semibold tracking-wider uppercase">
          © {new Date().getFullYear()} BadmintonHub. Thiết kế với sự hoàn mỹ.
        </p>
      </div>
    </footer>
  );
}
