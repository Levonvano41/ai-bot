import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Bot } from '../lib/supabase';
import { Copy, Check, ArrowLeft, AlertCircle } from 'lucide-react';
import ChatWidget from './ChatWidget';

export default function WidgetEmbed({ botId, onBack }: { botId: string; onBack: () => void }) {
  const { user } = useAuth();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadBot();
  }, [botId]);

  const loadBot = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      setBot(data);
    } catch (error) {
      console.error('Error loading bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const embedCode = `<!-- AI Chat Widget -->
<div id="ai-chat-widget"></div>
<script type="module">
  import React from 'https://esm.sh/react@18.3.1';
  import ReactDOM from 'https://esm.sh/react-dom@18.3.1/client';

  const ChatWidget = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const sessionId = 'session_' + Date.now() + '_' + Math.random();

    React.useEffect(() => {
      setMessages([{
        role: 'assistant',
        content: 'Здравствуйте! Чем могу помочь?'
      }]);
    }, []);

    const sendMessage = async () => {
      if (!input.trim() || loading) return;

      const userMessage = input.trim();
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setLoading(true);

      try {
        const response = await fetch(
          '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}',
            },
            body: JSON.stringify({
              botId: '${botId}',
              message: userMessage,
              sessionId: sessionId,
              apiKey: 'YOUR_GEMINI_API_KEY'
            }),
          }
        );

        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Извините, произошла ошибка.'
        }]);
      } finally {
        setLoading(false);
      }
    };

    return React.createElement('div', {
      style: { position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }
    },
      !isOpen ?
        React.createElement('button', {
          onClick: () => setIsOpen(true),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
          }
        }, '💬 ${bot?.name || 'Чат'}')
      :
        React.createElement('div', {
          style: {
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            width: '384px',
            height: '600px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }
        }, [
          React.createElement('div', {
            key: 'header',
            style: {
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }
          }, [
            React.createElement('h3', { key: 'title', style: { margin: 0, fontWeight: '600' }}, '${bot?.name || 'Чат'}'),
            React.createElement('button', {
              key: 'close',
              onClick: () => setIsOpen(false),
              style: {
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '20px'
              }
            }, '×')
          ]),
          React.createElement('div', {
            key: 'messages',
            style: {
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              backgroundColor: '#f8fafc'
            }
          }, messages.map((msg, i) =>
            React.createElement('div', {
              key: i,
              style: {
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '16px'
              }
            },
              React.createElement('div', {
                style: {
                  maxWidth: '80%',
                  padding: '8px 16px',
                  borderRadius: '16px',
                  backgroundColor: msg.role === 'user' ? '#2563eb' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1e293b',
                  fontSize: '14px',
                  boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }
              }, msg.content)
            )
          )),
          React.createElement('div', {
            key: 'input',
            style: {
              padding: '16px',
              backgroundColor: 'white',
              borderTop: '1px solid #e2e8f0'
            }
          },
            React.createElement('div', {
              style: { display: 'flex', gap: '8px' }
            }, [
              React.createElement('input', {
                key: 'text',
                type: 'text',
                value: input,
                onChange: (e) => setInput(e.target.value),
                onKeyPress: (e) => e.key === 'Enter' && sendMessage(),
                placeholder: 'Введите сообщение...',
                disabled: loading,
                style: {
                  flex: 1,
                  padding: '8px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9999px',
                  outline: 'none',
                  fontSize: '14px'
                }
              }),
              React.createElement('button', {
                key: 'send',
                onClick: sendMessage,
                disabled: loading || !input.trim(),
                style: {
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !input.trim() ? 0.5 : 1
                }
              }, '➤')
            ])
          )
        ])
    );
  };

  const root = ReactDOM.createRoot(document.getElementById('ai-chat-widget'));
  root.render(React.createElement(ChatWidget));
</script>`;

  const copyToClipboard = () => {
    const codeWithApiKey = embedCode.replace('YOUR_GEMINI_API_KEY', apiKey);
    navigator.clipboard.writeText(codeWithApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Бот не найден</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Вернуться
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к дашборду
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Виджет для {bot.name}
          </h1>
          <p className="text-slate-600">
            Внедрите чат-бота на ваш сайт
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Инструкция по установке
              </h2>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1">
                      Получите API ключ Google Gemini
                    </h3>
                    <p className="text-sm text-slate-600">
                      Перейдите на{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Google AI Studio
                      </a>{' '}
                      и создайте API ключ
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-2">
                      Введите ваш API ключ
                    </h3>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1">
                      Скопируйте код виджета
                    </h3>
                    <p className="text-sm text-slate-600">
                      Нажмите кнопку "Копировать код" ниже
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1">
                      Вставьте код на ваш сайт
                    </h3>
                    <p className="text-sm text-slate-600">
                      Разместите код перед закрывающим тегом &lt;/body&gt; на вашем сайте
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Важно!</p>
                  <p>
                    API ключ встраивается в код на стороне клиента. Для production использования
                    рекомендуется настроить прокси-сервер для защиты ключа.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Код виджета
                </h2>
                <button
                  onClick={copyToClipboard}
                  disabled={!apiKey}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Скопировано!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Копировать код
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{apiKey ? embedCode.replace('YOUR_GEMINI_API_KEY', apiKey) : embedCode}</code>
              </pre>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Предпросмотр
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Так виджет будет выглядеть на вашем сайте
              </p>
              <div className="border-2 border-slate-200 rounded-lg p-4 min-h-[400px] bg-slate-50 relative">
                {apiKey ? (
                  <ChatWidget botId={botId} apiKey={apiKey} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-slate-400 text-center">
                      Введите API ключ для предпросмотра
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
