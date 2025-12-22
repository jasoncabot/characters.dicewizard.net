import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { LoginForm } from "./components/LoginForm";
import { CharacterList } from "./components/CharacterList";
import { CharacterSheet } from "./components/CharacterSheet";
import { CharacterCreationWizard } from "./components/CharacterCreationWizard";
import { Campaigns } from "./components/Campaigns";
import { PlayerPortal } from "./components/PlayerPortal";
import { PlayerViewModal } from "./components/PlayerViewModal";
import { Sidebar } from "./components/Sidebar";
import type { Character } from "./types/character";
import { NotesCommandPalette } from "./components/NotesCommandPalette";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppContent() {
  const {
    isAuthenticated,
    isLoading,
    user,
    logout,
    isNewUser,
    clearNewUserFlag,
  } = useAuth();
  const [path, setPath] = useState(() => window.location.pathname || "/");
  const [view, setView] = useState<
    "list" | "new" | "edit" | "campaigns" | "player"
  >(() => {
    const p = window.location.pathname || "/";
    if (p.startsWith("/player")) return "player";
    if (p === "/campaigns") return "campaigns";
    return "list";
  });
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null,
  );
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const isPlayerRoute = path.startsWith("/player");
  const playerId = (() => {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 2 && parts[0] === "player") {
      const id = Number(parts[1]);
      return Number.isFinite(id) ? id : null;
    }
    return null;
  })();
  const isPlayerTable = isPlayerRoute && !!playerId;

  const navigate = (to: string) => {
    if (to === path) return;
    window.history.pushState({}, "", to);
    setPath(to || "/");

    // Sync view with path
    if (to.startsWith("/player")) {
      setView("player");
    } else if (to === "/campaigns") {
      setView("campaigns");
    } else if (to === "/") {
      setView("list");
    }
  };

  useEffect(() => {
    const handler = () => {
      const newPath = window.location.pathname || "/";
      setPath(newPath);

      // Sync view with path on back/forward
      if (newPath.startsWith("/player")) {
        setView("player");
      } else if (newPath === "/campaigns") {
        setView("campaigns");
      } else if (newPath === "/") {
        setView("list");
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Auto-navigate new users to character creation
  useEffect(() => {
    if (isNewUser) {
      setTimeout(() => {
        setView("new");
        clearNewUserFlag();
      }, 0);
    }
  }, [isNewUser, clearNewUserFlag]);

  const handleNavigate = (navId: string) => {
    switch (navId) {
      case "list":
        setView("list");
        navigate("/");
        break;
      case "campaigns":
        setView("campaigns");
        navigate("/campaigns");
        break;
      case "player":
        setView("player");
        navigate("/player");
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Player table view - full screen, no sidebar
  if (isPlayerTable) {
    return (
      <div className="h-screen w-screen bg-slate-950">
        <NotesCommandPalette />
        <PlayerViewModal
          campaignId={playerId!}
          onClose={() => navigate("/player")}
          variant="page"
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NotesCommandPalette />

      {/* Sidebar */}
      <Sidebar
        currentView={view}
        onNavigate={handleNavigate}
        username={user?.username || ""}
        onLogout={logout}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <main className="flex-1 overflow-y-auto">
          <div className="h-full w-full">
            {isPlayerRoute ? (
              <PlayerPortal
                onBack={() => navigate("/campaigns")}
                onOpenPlayerView={(id) => navigate(`/player/${id}`)}
              />
            ) : (
              <>
                {view === "list" && (
                  <CharacterList
                    onSelect={(character) => {
                      setSelectedCharacter(character);
                      setView("edit");
                    }}
                    onNew={() => {
                      setSelectedCharacter(null);
                      setView("new");
                    }}
                  />
                )}

                {view === "campaigns" && (
                  <Campaigns
                    onOpenPlayerPortal={() => navigate("/player")}
                    onOpenPlayerView={(id) => navigate(`/player/${id}`)}
                  />
                )}

                {view === "player" && (
                  <PlayerPortal
                    onBack={() => navigate("/campaigns")}
                    onOpenPlayerView={(id) => navigate(`/player/${id}`)}
                  />
                )}

                {view === "new" && (
                  <CharacterCreationWizard
                    onBack={() => {
                      setView("list");
                      navigate("/");
                    }}
                    onSaved={() => {
                      setView("list");
                      navigate("/");
                    }}
                  />
                )}

                {view === "edit" && (
                  <CharacterSheet
                    character={selectedCharacter}
                    onBack={() => {
                      setView("list");
                      setSelectedCharacter(null);
                      navigate("/");
                    }}
                    onSaved={() => {
                      setView("list");
                      setSelectedCharacter(null);
                      navigate("/");
                    }}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
