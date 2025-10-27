import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Bot } from '../lib/supabase';
import { Bot as BotIcon, Plus, LogOut, MessageSquare, Eye, Trash2, ExternalLink } from 'lucide-react';

export default function Dashboard({ onCreateBot, onViewWidget }: {
  onCreateBot: () => void;
  onViewWidget: (botId: string) => void;
}) {
  const { user, signOut } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, { conversations: number; messages: number }>>({});

  useEffect(() => {
    loadBots();
  }, [user]);

  const loadBots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBots(data || []);

      const statsPromises = (data || []).map(async (bot) => {
        const { count: convCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('bot_id', bot.id);

        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', (
            await supabase
              .from('conversations')
              .select('id')
              .eq('bot_id', bot.id)
          ).data?.map(c => c.id) || []);

        return {
          botId: bot.id,
          conversations: convCount || 0,
          messages: msgCount || 0,
        };
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce((acc, stat) => {
        acc[stat.botId] = {
          conversations: stat.conversations,
          messages: stat.messages,
        };
        return acc;
      }, {} as Record<string, { conversations: number; messages: number }>);

      setStats(statsMap);
    } catch (error: any) {
      console.error('Error loading bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBotStatus = async (botId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bots')
        .update({ is_active: !currentStatus })
        .eq('id', botId);

      if (error) throw error;

      loadBots();
    } catch (error: any) {
      alert('Ошибка изменения статуса: ' + error.message);
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого бота? Это действие необратимо.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId);

      if (error) throw error;

      loadBots();
    } catch (error: any) {
      alert('Ошибка удаления бота: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <BotIcon className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">AI Agent Platform</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Выход
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Мои боты</h2>
            <p className="text-slate-600 mt-1">
              Управляйте своими ИИ-ассистентами
            </p>
          </div>
          <button
            onClick={onCreateBot}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Создать бота
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 mt-4">Загрузка...</p>
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <BotIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              У вас пока нет ботов
            </h3>
            <p className="text-slate-600 mb-6">
              Создайте своего первого ИИ-ассистента за несколько минут
            </p>
            <button
              onClick={onCreateBot}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Создать бота
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BotIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{bot.name}</h3>
                      <p className="text-sm text-slate-600">{bot.company_name}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    bot.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {bot.is_active ? 'Активен' : 'Неактивен'}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {bot.industry && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Сфера:</span> {bot.industry}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Стиль:</span> {bot.style}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Язык:</span> {bot.language}
                  </p>
                </div>

                <div className="flex gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MessageSquare className="w-4 h-4 text-slate-600" />
                      <span className="text-xs text-slate-600">Диалоги</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {stats[bot.id]?.conversations || 0}
                    </p>
                  </div>
                  <div className="flex-1 text-center border-l border-slate-200">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MessageSquare className="w-4 h-4 text-slate-600" />
                      <span className="text-xs text-slate-600">Сообщения</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {stats[bot.id]?.messages || 0}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onViewWidget(bot.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Виджет
                  </button>
                  <button
                    onClick={() => toggleBotStatus(bot.id, bot.is_active)}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      bot.is_active
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {bot.is_active ? 'Отключить' : 'Включить'}
                  </button>
                  <button
                    onClick={() => deleteBot(bot.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
