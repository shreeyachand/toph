import Icon from "./Icon";

interface NavItem {
  icon: string;
  label: string;
  active?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { icon: "chart-line", label: "Dashboard", active: true, badge: "1" },
      { icon: "audio-lines", label: "Activity Logs" },
      { icon: "map", label: "Map" },
    ],
  },
  {
    title: "Compliance",
    items: [
      { icon: "book-check", label: "Audit Manager" },
      { icon: "files", label: "Reports" },
      { icon: "calendar", label: "Schedule" },
    ],
  },
  {
    title: "Team Management",
    items: [
      { icon: "users", label: "Employees" },
      { icon: "chart-pie", label: "Performance" },
      { icon: "mail", label: "Messages" },
    ],
  },
  {
    title: "Other",
    items: [
      { icon: "cog", label: "Settings" },
      { icon: "handshake", label: "Support" },
    ],
  },
];

export default function Sidebar({
  farm,
  role,
}: {
  farm: string;
  role: string;
}) {
  return (
    <aside className="hidden lg:flex w-[270px] shrink-0 flex-col rounded-2xl border border-[#ececec] bg-white p-4">
      {/* User header */}
      <div className="flex items-center gap-2.5 px-1 pb-4">
        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#146c44] text-[15px] font-semibold text-white">
          {farm.charAt(0)}
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-black">{farm}</p>
          <p className="flex items-center gap-1 text-[12px] text-[#b3b3b3]">
            <Icon name="user-star" size={10} />
            {role}
          </p>
        </div>
        <button
          aria-label="Inbox"
          className="ml-auto rounded-lg p-1.5 text-[#4d4d4d] hover:bg-[#f5f5f5]"
        >
          <Icon name="inbox" size={16} />
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 space-y-5 overflow-y-auto nice-scroll">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#b3b3b3]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors ${
                      item.active
                        ? "bg-[#f2f2f2] font-medium text-black"
                        : "text-[#4d4d4d] hover:bg-[#f8f8f8]"
                    }`}
                  >
                    <Icon name={item.icon} size={16} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="flex h-[18px] min-w-[28px] items-center justify-center rounded-full bg-[#b9e2c6] px-1.5 text-[11px] font-semibold text-[#0b3d25]">
                        {item.badge}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="space-y-0.5 pt-4">
        {[
          { icon: "arrow-right-left", label: "Switch User" },
          { icon: "log-out", label: "Log Out" },
        ].map((item) => (
          <a
            key={item.label}
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] text-[#4d4d4d] hover:bg-[#f8f8f8]"
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </a>
        ))}
      </div>
    </aside>
  );
}
