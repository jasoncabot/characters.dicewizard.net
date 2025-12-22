import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";

interface NavItem {
  name: string;
  id: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  username: string;
  onLogout: () => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const navigation: NavItem[] = [
  {
    name: "Characters",
    id: "list",
    icon: (
      <svg
        className="h-6 w-6 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    ),
  },
  {
    name: "Campaigns",
    id: "campaigns",
    icon: (
      <svg
        className="h-6 w-6 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
  {
    name: "Player Table",
    id: "player",
    icon: (
      <svg
        className="h-6 w-6 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
        />
      </svg>
    ),
  },
];

function UserAvatar({ username }: { username: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

function Logo() {
  return (
    <img
      src="/portraits/orc-druid.svg"
      alt="D&D Characters"
      className="h-8 w-8 shrink-0"
    />
  );
}

function isActiveNav(id: string, currentView: string): boolean {
  if (id === "list") {
    return (
      currentView === "list" || currentView === "new" || currentView === "edit"
    );
  }
  return currentView === id;
}

export function Sidebar({
  currentView,
  onNavigate,
  username,
  onLogout,
  expanded,
  onExpandedChange,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const setExpanded = onExpandedChange;

  return (
    <>
      {/* Mobile hamburger header */}
      <div className="fixed top-0 left-0 z-50 flex h-14 w-full items-center border-b border-slate-700/50 bg-slate-900/95 px-4 backdrop-blur-sm lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <div className="ml-3 flex items-center gap-2">
          <Logo />
          <span className="text-lg font-bold text-white">D&D Sheets</span>
        </div>
      </div>

      {/* Mobile full-screen dialog */}
      <Transition show={mobileOpen} as={Fragment}>
        <Dialog
          onClose={() => setMobileOpen(false)}
          className="relative z-50 lg:hidden"
        >
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/80" />
          </TransitionChild>

          <TransitionChild
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <DialogPanel className="fixed inset-0 flex w-full flex-col bg-slate-900">
              {/* Mobile header with close button */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700/50 px-4">
                <div className="flex items-center gap-2">
                  <Logo />
                  <span className="text-lg font-bold text-white">
                    D&D Sheets
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Mobile navigation */}
              <nav className="flex-1 space-y-1 px-4 py-6">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileOpen(false);
                    }}
                    className={`group flex w-full items-center gap-4 rounded-lg px-4 py-3 text-base font-medium transition ${
                      isActiveNav(item.id, currentView)
                        ? "bg-purple-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </button>
                ))}
              </nav>

              {/* Mobile user section */}
              <div className="shrink-0 border-t border-slate-700/50 p-4">
                <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3">
                  <UserAvatar username={username} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{username}</p>
                    <p className="text-xs text-slate-400">Signed in</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileOpen(false);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                    />
                  </svg>
                  Sign out
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>

      {/* Desktop sidebar */}
      <div
        className={`hidden h-screen shrink-0 border-r border-slate-700/50 bg-slate-900 transition-all duration-300 lg:flex lg:flex-col ${
          expanded ? "w-64" : "w-16"
        }`}
      >
        {/* Logo / Brand */}
        <div
          className={`flex shrink-0 items-center border-b border-slate-700/50 py-4 ${
            expanded ? "px-4" : "justify-center px-2"
          }`}
        >
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-3 rounded-lg p-1 transition hover:bg-slate-800/50"
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Logo />
            {expanded && (
              <span className="text-lg font-bold whitespace-nowrap text-white">
                D&D Sheets
              </span>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActiveNav(item.id, currentView)
                  ? "bg-purple-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              } ${expanded ? "justify-start gap-3" : "justify-center"}`}
              title={!expanded ? item.name : undefined}
            >
              {item.icon}
              {expanded && <span>{item.name}</span>}
            </button>
          ))}
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-slate-700/50 p-2">
          <div
            className={`flex items-center rounded-lg p-2 ${
              expanded ? "gap-3" : "justify-center"
            }`}
          >
            <UserAvatar username={username} />
            {expanded && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-white">
                  {username}
                </span>
                <button
                  onClick={onLogout}
                  className="text-left text-xs text-slate-400 hover:text-purple-400"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
          {!expanded && (
            <button
              onClick={onLogout}
              className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Sign out"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
