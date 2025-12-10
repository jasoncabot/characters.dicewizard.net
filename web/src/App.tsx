import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginForm } from './components/LoginForm';
import { CharacterList } from './components/CharacterList';
import { CharacterSheet } from './components/CharacterSheet';
import type { Character } from './types/character';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppContent() {
  const { isAuthenticated, isLoading, user, logout, isNewUser, clearNewUserFlag } = useAuth();
  const [view, setView] = useState<'list' | 'new' | 'edit'>('list');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  // Auto-navigate new users to character creation
  useEffect(() => {
    if (isNewUser) {
      setView('new');
      clearNewUserFlag();
    }
  }, [isNewUser, clearNewUserFlag]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <h1 className="text-xl font-bold text-white">D&D Character Sheets</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              Welcome, <span className="text-purple-400 font-medium">{user?.username}</span>
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'list' && (
          <CharacterList
            onSelect={(character) => {
              setSelectedCharacter(character);
              setView('edit');
            }}
            onNew={() => {
              setSelectedCharacter(null);
              setView('new');
            }}
          />
        )}

        {(view === 'new' || view === 'edit') && (
          <CharacterSheet
            character={selectedCharacter}
            onBack={() => {
              setView('list');
              setSelectedCharacter(null);
            }}
            onSaved={() => {
              setView('list');
              setSelectedCharacter(null);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
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
