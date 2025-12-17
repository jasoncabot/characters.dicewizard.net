import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@headlessui/react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { LoginForm } from "./components/LoginForm";
import { CharacterList } from "./components/CharacterList";
import { CharacterSheet } from "./components/CharacterSheet";
import { Campaigns } from "./components/Campaigns";
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
  const [view, setView] = useState<"list" | "new" | "edit" | "campaigns">(
    "list",
  );
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null,
  );

  // Auto-navigate new users to character creation
  useEffect(() => {
    if (isNewUser) {
      setTimeout(() => {
        setView("new");
        clearNewUserFlag();
      }, 0);
    }
  }, [isNewUser, clearNewUserFlag]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NotesCommandPalette />
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <h1 className="text-xl font-bold text-white">
              D&D Character Sheets
            </h1>
            <div className="ml-6 flex gap-2">
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${view === "list" || view === "new" || view === "edit" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
                onClick={() => setView("list")}
              >
                Characters
              </button>
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${view === "campaigns" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
                onClick={() => setView("campaigns")}
              >
                Campaigns
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="cursor-default text-slate-400">
              Welcome,{" "}
              <span className="font-medium text-purple-400">
                {user?.username}
              </span>
            </span>
            <Button
              onClick={logout}
              className="cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none active:bg-slate-600"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
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

        {view === "campaigns" && <Campaigns />}

        {(view === "new" || view === "edit") && (
          <CharacterSheet
            character={selectedCharacter}
            onBack={() => {
              setView("list");
              setSelectedCharacter(null);
            }}
            onSaved={() => {
              setView("list");
              setSelectedCharacter(null);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-700/50 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500">
          Self-hosted D&D Character Sheets • Built with Go + React
        </div>
      </footer>
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
