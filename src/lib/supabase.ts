import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Bot = {
  id: string;
  user_id: string;
  name: string;
  company_name: string;
  industry: string;
  description: string;
  website: string;
  style: string;
  custom_prompt: string;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type KnowledgeBase = {
  id: string;
  bot_id: string;
  content: string;
  source_type: string;
  source_name: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  bot_id: string;
  session_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};
