import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowRight, ArrowLeft, Bot, Upload, MessageSquare, Check } from 'lucide-react';

type BotData = {
  name: string;
  company_name: string;
  industry: string;
  description: string;
  website: string;
  style: string;
  custom_prompt: string;
  language: string;
  knowledgeItems: Array<{ content: string; source_name: string; source_type: string }>;
};

const STYLES = [
  { value: 'formal', label: 'Официальный' },
  { value: 'friendly', label: 'Дружелюбный' },
  { value: 'humorous', label: 'Юмористический' },
  { value: 'expert', label: 'Экспертный' },
];

const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

export default function BotWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const [botData, setBotData] = useState<BotData>({
    name: '',
    company_name: '',
    industry: '',
    description: '',
    website: '',
    style: 'friendly',
    custom_prompt: '',
    language: 'ru',
    knowledgeItems: [],
  });

  const [textInput, setTextInput] = useState('');
  const [testMessage, setTestMessage] = useState('');

  const updateBotData = (field: keyof BotData, value: any) => {
    setBotData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setBotData(prev => ({
          ...prev,
          knowledgeItems: [
            ...prev.knowledgeItems,
            {
              content,
              source_name: file.name,
              source_type: 'file',
            },
          ],
        }));
      };
      reader.readAsText(file);
    });
  };

  const addTextKnowledge = () => {
    if (!textInput.trim()) return;

    setBotData(prev => ({
      ...prev,
      knowledgeItems: [
        ...prev.knowledgeItems,
        {
          content: textInput,
          source_name: 'Текстовый ввод',
          source_type: 'text',
        },
      ],
    }));
    setTextInput('');
  };

  const createBot = async () => {
    setLoading(true);
    try {
      const { data: bot, error: botError } = await supabase
        .from('bots')
        .insert({
          user_id: user!.id,
          name: botData.name,
          company_name: botData.company_name,
          industry: botData.industry,
          description: botData.description,
          website: botData.website,
          style: botData.style,
          custom_prompt: botData.custom_prompt,
          language: botData.language,
          is_active: true,
        })
        .select()
        .single();

      if (botError) throw botError;

      if (botData.knowledgeItems.length > 0) {
        const knowledgeEntries = botData.knowledgeItems.map(item => ({
          bot_id: bot.id,
          content: item.content,
          source_name: item.source_name,
          source_type: item.source_type,
        }));

        const { error: kbError } = await supabase
          .from('knowledge_base')
          .insert(knowledgeEntries);

        if (kbError) throw kbError;
      }

      onComplete();
    } catch (error: any) {
      alert('Ошибка создания бота: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Информация о бизнесе</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Название компании *
              </label>
              <input
                type="text"
                value={botData.company_name}
                onChange={(e) => updateBotData('company_name', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ООО 'Ваша Компания'"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Сфера деятельности
              </label>
              <input
                type="text"
                value={botData.industry}
                onChange={(e) => updateBotData('industry', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="E-commerce, Недвижимость, IT-услуги..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Описание бизнеса
              </label>
              <textarea
                value={botData.description}
                onChange={(e) => updateBotData('description', e.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Краткое описание вашего бизнеса, продуктов или услуг..."
              />
              <div className="text-xs text-slate-500 mt-1">
                {botData.description.length}/1000
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Веб-сайт
              </label>
              <input
                type="url"
                value={botData.website}
                onChange={(e) => updateBotData('website', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://your-website.com"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">База знаний</h2>
            <p className="text-slate-600">
              Загрузите информацию, которую бот будет использовать для ответов
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
              <label className="flex flex-col items-center cursor-pointer">
                <Upload className="w-12 h-12 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-700">
                  Загрузить файлы
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  .txt, .pdf, .docx, .csv
                </span>
                <input
                  type="file"
                  multiple
                  accept=".txt,.pdf,.docx,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Или введите текст напрямую
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите информацию о продуктах, услугах, часто задаваемые вопросы..."
              />
              <button
                onClick={addTextKnowledge}
                className="mt-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Добавить текст
              </button>
            </div>

            {botData.knowledgeItems.length > 0 && (
              <div>
                <h3 className="font-medium text-slate-900 mb-2">
                  Загруженные материалы ({botData.knowledgeItems.length})
                </h3>
                <div className="space-y-2">
                  {botData.knowledgeItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-slate-700">{item.source_name}</span>
                      </div>
                      <button
                        onClick={() => {
                          setBotData(prev => ({
                            ...prev,
                            knowledgeItems: prev.knowledgeItems.filter((_, i) => i !== index),
                          }));
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Настройка личности бота</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Имя бота *
              </label>
              <input
                type="text"
                value={botData.name}
                onChange={(e) => updateBotData('name', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ассистент"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Стиль общения
              </label>
              <div className="grid grid-cols-2 gap-3">
                {STYLES.map(style => (
                  <button
                    key={style.value}
                    onClick={() => updateBotData('style', style.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      botData.style === style.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Язык бота
              </label>
              <select
                value={botData.language}
                onChange={(e) => updateBotData('language', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Пользовательские инструкции (необязательно)
              </label>
              <textarea
                value={botData.custom_prompt}
                onChange={(e) => updateBotData('custom_prompt', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: 'Ты — вежливый менеджер по продажам. Всегда предлагай клиентам помощь в выборе продукта...'"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Готово к созданию!</h2>

            <div className="bg-slate-50 p-6 rounded-lg space-y-4">
              <div>
                <h3 className="font-medium text-slate-900">Компания</h3>
                <p className="text-slate-600">{botData.company_name}</p>
              </div>

              <div>
                <h3 className="font-medium text-slate-900">Имя бота</h3>
                <p className="text-slate-600">{botData.name || 'Не указано'}</p>
              </div>

              <div>
                <h3 className="font-medium text-slate-900">Стиль</h3>
                <p className="text-slate-600">
                  {STYLES.find(s => s.value === botData.style)?.label}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-slate-900">База знаний</h3>
                <p className="text-slate-600">
                  {botData.knowledgeItems.length} материалов
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                После создания бота вы получите виджет для установки на ваш сайт
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (step === 1) return botData.company_name.trim() !== '';
    if (step === 3) return botData.name.trim() !== '';
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1">
              <div
                className={`h-2 rounded-full ${
                  s <= step ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-slate-600">
          Шаг {step} из 4
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        {renderStep()}

        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              Далее
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={createBot}
              disabled={loading || !canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              <Bot className="w-4 h-4" />
              {loading ? 'Создание...' : 'Создать бота'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
