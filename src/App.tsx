import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import BotWizard from './components/BotWizard';
import WidgetEmbed from './components/WidgetEmbed';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'dashboard' | 'create' | 'widget'>('dashboard');
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (view === 'create') {
    return (
      <BotWizard
        onComplete={() => {
          setView('dashboard');
        }}
      />
    );
  }

  if (view === 'widget' && selectedBotId) {
    return (
      <WidgetEmbed
        botId={selectedBotId}
        onBack={() => {
          setView('dashboard');
          setSelectedBotId(null);
        }}
      />
    );
  }

  return (
    <Dashboard
      onCreateBot={() => setView('create')}
      onViewWidget={(botId) => {
        setSelectedBotId(botId);
        setView('widget');
      }}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
