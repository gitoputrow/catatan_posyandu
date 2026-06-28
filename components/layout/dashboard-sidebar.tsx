"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { logout } from "@/lib/auth/api";
import { User } from "../user/types";
import { getUser } from "@/lib/user/api";

type NavigationItem = {
  href: string;
  icon: ReactNode;
  label: string;
};

type NavigationGroup = {
  icon: ReactNode;
  label: string;
  items: Array<{ href: string; label: string }>;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <GridIcon />,
  },
  {
    href: "/posyandus",
    label: "Posyandu",
    icon: <HomeIcon />,
  },
];

const navigationGroups: NavigationGroup[] = [
  {
    label: "Laporan",
    icon: <DocumentIcon />,
    items: [
      { href: "/reports/monthly-attendance", label: "Kehadiran Bulanan" },
      { href: "/reports/monthly-attendance/create", label: "Tambah Laporan" },
    ],
  },
  {
    label: "Data Balita",
    icon: <ChildrenIcon />,
    items: [
      { href: "/children", label: "List Balita" },
      { href: "/children/create", label: "Tambah Balita" },
    ],
  },
  {
    label: "Pencatatan Pertumbuhan",
    icon: <ScaleIcon />,
    items: [
      { href: "/growth-recording", label: "List Pertumbuhan" },
      { href: "/growth-recording/history", label: "Riwayat Pertumbuhan" },
      { href: "/growth-recording/create", label: "Tambah Catatan" },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(
    () => new Set(navigationGroups.map((group) => group.label)),
  );
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      const response = await getUser();
      setUser(response);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError("Gagal memuat data petugas.");
    }
  };

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Logout gagal. Silakan coba lagi.",
      );
      setIsLoggingOut(false);
    }
  }

  function toggleGroup(label: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchUser(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  return (
    <>
      <button
        aria-controls="main-sidebar"
        aria-expanded={isSidebarOpen}
        aria-label="Buka menu navigasi"
        className="fixed left-4 top-4 z-40 grid size-11 place-items-center rounded-xl border border-border bg-surface text-text-primary shadow-sm lg:hidden"
        onClick={() => setIsSidebarOpen(true)}
        type="button"
      >
        <MenuIcon />
      </button>

      {isSidebarOpen && (
        <button
          aria-label="Tutup menu navigasi"
          className="fixed inset-0 z-40 bg-text-primary/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border bg-surface px-4 py-6 shadow-xl transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:self-start lg:translate-x-0 lg:shadow-none ${isCollapsed ? "lg:w-20" : "lg:w-64"} ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="main-sidebar"
      >
        <button
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Perbesar menu" : "Perkecil menu"}
          className="absolute right-2 top-3 hidden size-8 place-items-center rounded-lg border border-border bg-surface text-text-secondary shadow-sm transition hover:bg-background hover:text-primary lg:grid"
          onClick={() => setIsCollapsed((current) => !current)}
          type="button"
        >
          <CollapseIcon collapsed={isCollapsed} />
        </button>
        <button
          aria-label="Tutup menu navigasi"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-text-secondary hover:bg-background lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        >
          ×
        </button>
        <div className={`px-3 ${isCollapsed ? "lg:hidden" : ""}`}>
          <p className="font-extrabold tracking-tight text-text-primary">
            {user?.nama ?? "Memuat Nama..."}
          </p>
          <p className="text-xs text-text-secondary mt-1 font-medium">
            {user?.jenis_petugas
              ? user.jenis_petugas.toUpperCase()
              : "Memuat Jenis Petugas..."}{" "}
            {user?.nama_posyandu
              ? `POSYANDU ${user.nama_posyandu.toUpperCase()}`
              : ""}
          </p>
          <p className="text-[13px] text-primary mt-1.5 font-semibold italic">
            {user?.nama_kelurahan
              ? `Kelurahan ${user.nama_kelurahan}`
              : "Memuat Nama Kelurahan..."}{" "}
          </p>
          {error && (
            <p className="mt-2 text-xs font-medium text-error">{error}</p>
          )}
        </div>
        <div
          className={`hidden size-10 place-items-center self-center rounded-xl bg-primary/10 text-sm font-extrabold text-primary ${isCollapsed ? "lg:grid" : ""}`}
          title={user?.nama}
        >
          {user?.nama?.trim().charAt(0).toUpperCase() || "P"}
        </div>

        <nav aria-label="Navigasi utama" className="mt-10 space-y-1">
          <p
            className={`mb-3 px-3 text-xs font-bold tracking-wider text-text-disabled ${isCollapsed ? "lg:hidden" : ""}`}
          >
            MENU UTAMA
          </p>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors ${isCollapsed ? "lg:justify-center lg:px-0" : ""} ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:bg-background hover:text-text-primary"
                }`}
                href={item.href}
                key={item.href}
                onClick={() => setIsSidebarOpen(false)}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="size-5 shrink-0">{item.icon}</span>
                <span className={isCollapsed ? "lg:hidden" : ""}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {navigationGroups.map((group) => {
            const isGroupActive = group.items.some(
              (item) => pathname === item.href,
            );
            const isExpanded = expandedGroups.has(group.label);

            return (
              <div className="pt-3" key={group.label}>
                <button
                  aria-expanded={isExpanded}
                  aria-label={group.label}
                  className={`flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-bold transition-colors hover:bg-background ${isCollapsed ? "lg:h-11 lg:justify-center lg:px-0" : ""} ${isGroupActive ? (isCollapsed ? "text-primary lg:bg-primary/10" : "text-text-primary") : "text-text-secondary"}`}
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      if (!isExpanded) toggleGroup(group.label);
                    } else toggleGroup(group.label);
                  }}
                  title={isCollapsed ? group.label : undefined}
                  type="button"
                >
                  <span className="size-5 shrink-0">{group.icon}</span>
                  <span className={isCollapsed ? "lg:hidden" : "text-start"}>
                    {group.label}
                  </span>
                  <span
                    className={`ml-auto grid size-5 place-items-center ${isCollapsed ? "lg:hidden" : ""}`}
                  >
                    <GroupChevron expanded={isExpanded} />
                  </span>
                </button>
                {isExpanded && (
                  <div
                    className={`mt-1 ml-5 space-y-1 border-l border-border pl-3 ${isCollapsed ? "lg:hidden" : ""}`}
                  >
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          className={`flex h-9 items-center rounded-lg px-3 text-xs font-semibold transition-colors ${isActive ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-background hover:text-text-primary"}`}
                          href={item.href}
                          key={item.href}
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button
          aria-label="Keluar"
          className={`mt-6 flex h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-error transition-colors hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-60 ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          type="button"
        >
          <LogoutIcon />
          <span className={isCollapsed ? "lg:hidden" : ""}>
            {isLoggingOut ? "Keluar..." : "Keluar"}
          </span>
        </button>

        <div
          className={`mt-1 rounded-xl bg-background p-4 ${isCollapsed ? "lg:hidden" : ""}`}
        >
          <p className="text-sm font-bold text-text-primary">Butuh bantuan?</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Hubungi admin RW bila ada kendala penggunaan.
          </p>
          <button className="mt-3 text-xs font-bold text-primary" type="button">
            Pusat Bantuan
          </button>
        </div>
      </aside>
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function GroupChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect height="6" rx="1" width="6" x="3" y="3" />
      <rect height="6" rx="1" width="6" x="15" y="3" />
      <rect height="6" rx="1" width="6" x="3" y="15" />
      <rect height="6" rx="1" width="6" x="15" y="15" />
    </svg>
  );
}

function ChildrenIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c.6-3.5 2.5-5.2 5.5-5.2s4.9 1.7 5.5 5.2M16 5.5a2.5 2.5 0 010 5M17.5 14.8c1.7.7 2.7 2.4 3 5.2" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect height="15" rx="3" width="16" x="4" y="5" />
      <path d="M8 12a4 4 0 018 0M12 12l2-2" />
      <path d="M7 20h10" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M3 10.5L12 3l9 7.5V21H3z" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}
