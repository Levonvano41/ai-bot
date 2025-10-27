/*
  # Create Initial Schema for AI Agent Platform

  1. New Tables
    - `bots`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - Bot name
      - `company_name` (text) - Company name
      - `industry` (text) - Business industry
      - `description` (text) - Business description
      - `website` (text) - Company website
      - `style` (text) - Communication style (formal, friendly, etc.)
      - `custom_prompt` (text) - Custom instructions for AI
      - `language` (text) - Bot language
      - `is_active` (boolean) - Bot status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `knowledge_base`
      - `id` (uuid, primary key)
      - `bot_id` (uuid, references bots)
      - `content` (text) - Text content
      - `source_type` (text) - file, text, url
      - `source_name` (text) - Original filename or URL
      - `embedding` (vector) - Vector embedding for semantic search
      - `created_at` (timestamptz)
    
    - `conversations`
      - `id` (uuid, primary key)
      - `bot_id` (uuid, references bots)
      - `session_id` (text) - Unique session identifier
      - `created_at` (timestamptz)
    
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `role` (text) - user or assistant
      - `content` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own bots
    - Add policies for public access to chat with bots
*/

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  company_name text NOT NULL,
  industry text DEFAULT '',
  description text DEFAULT '',
  website text DEFAULT '',
  style text DEFAULT 'friendly',
  custom_prompt text DEFAULT '',
  language text DEFAULT 'ru',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bots"
  ON bots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bots"
  ON bots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bots"
  ON bots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bots"
  ON bots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active bots for chat"
  ON bots FOR SELECT
  TO anon
  USING (is_active = true);

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES bots ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  source_type text DEFAULT 'text',
  source_name text DEFAULT '',
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view knowledge base for own bots"
  ON knowledge_base FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = knowledge_base.bot_id
      AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert knowledge base for own bots"
  ON knowledge_base FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = knowledge_base.bot_id
      AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete knowledge base for own bots"
  ON knowledge_base FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = knowledge_base.bot_id
      AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Edge functions can read knowledge base"
  ON knowledge_base FOR SELECT
  TO service_role
  USING (true);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES bots ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations for own bots"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bots
      WHERE bots.id = conversations.bot_id
      AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create conversations"
  ON conversations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role can read all conversations"
  ON conversations FOR SELECT
  TO service_role
  USING (true);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for own bot conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN bots ON bots.id = conversations.bot_id
      WHERE conversations.id = messages.conversation_id
      AND bots.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create messages"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role can read all messages"
  ON messages FOR SELECT
  TO service_role
  USING (true);

-- Create index for faster embedding searches
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for bots table
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();