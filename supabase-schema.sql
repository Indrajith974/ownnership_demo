-- Supabase Database Schema for The Ownership Layer
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  twitter_handle TEXT,
  github_handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fingerprints table
CREATE TABLE public.fingerprints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  hash TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL, -- 'text', 'image', 'video', 'audio', 'code'
  title TEXT,
  description TEXT,
  file_size BIGINT,
  file_name TEXT,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  preview_url TEXT,
  ipfs_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NFT Minting records
CREATE TABLE public.nft_mints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fingerprint_id UUID REFERENCES public.fingerprints(id),
  user_id UUID REFERENCES public.profiles(id),
  token_id TEXT,
  contract_address TEXT,
  chain_id INTEGER,
  transaction_hash TEXT,
  block_number BIGINT,
  mint_timestamp TIMESTAMP WITH TIME ZONE,
  metadata_uri TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-matching results
CREATE TABLE public.cross_matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_hash TEXT NOT NULL,
  target_fingerprint_id UUID REFERENCES public.fingerprints(id),
  match_type TEXT NOT NULL, -- 'exact', 'near', 'metadata'
  confidence_score INTEGER NOT NULL, -- 0-100
  hamming_distance INTEGER,
  metadata_similarity DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Duplicate alerts
CREATE TABLE public.duplicate_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  original_fingerprint_id UUID REFERENCES public.fingerprints(id),
  duplicate_hash TEXT NOT NULL,
  submitter_id UUID REFERENCES public.profiles(id),
  match_confidence INTEGER NOT NULL,
  alert_type TEXT NOT NULL, -- 'exact_duplicate', 'similar_content', 'potential_plagiarism'
  acknowledged BOOLEAN DEFAULT FALSE,
  owner_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User vault (for storing user's fingerprints and assets)
CREATE TABLE public.user_vaults (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  fingerprint_id UUID REFERENCES public.fingerprints(id),
  is_verified BOOLEAN DEFAULT FALSE,
  is_minted BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, fingerprint_id)
);

-- Indexes for performance
CREATE INDEX idx_fingerprints_hash ON public.fingerprints(hash);
CREATE INDEX idx_fingerprints_user_id ON public.fingerprints(user_id);
CREATE INDEX idx_fingerprints_content_type ON public.fingerprints(content_type);
CREATE INDEX idx_fingerprints_created_at ON public.fingerprints(created_at);
CREATE INDEX idx_nft_mints_user_id ON public.nft_mints(user_id);
CREATE INDEX idx_nft_mints_fingerprint_id ON public.nft_mints(fingerprint_id);
CREATE INDEX idx_cross_matches_source_hash ON public.cross_matches(source_hash);
CREATE INDEX idx_duplicate_alerts_original_fingerprint_id ON public.duplicate_alerts(original_fingerprint_id);
CREATE INDEX idx_user_vaults_user_id ON public.user_vaults(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nft_mints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vaults ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Fingerprints policies
CREATE POLICY "Users can view all fingerprints" ON public.fingerprints FOR SELECT USING (true);
CREATE POLICY "Users can insert own fingerprints" ON public.fingerprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fingerprints" ON public.fingerprints FOR UPDATE USING (auth.uid() = user_id);

-- NFT mints policies
CREATE POLICY "Users can view all NFT mints" ON public.nft_mints FOR SELECT USING (true);
CREATE POLICY "Users can insert own NFT mints" ON public.nft_mints FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cross matches policies (read-only for users)
CREATE POLICY "Users can view cross matches" ON public.cross_matches FOR SELECT USING (true);

-- Duplicate alerts policies
CREATE POLICY "Users can view relevant alerts" ON public.duplicate_alerts FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM public.fingerprints WHERE id = original_fingerprint_id
    UNION
    SELECT submitter_id
  )
);

-- User vaults policies
CREATE POLICY "Users can view own vault" ON public.user_vaults FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into own vault" ON public.user_vaults FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vault" ON public.user_vaults FOR UPDATE USING (auth.uid() = user_id);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fingerprints_updated_at BEFORE UPDATE ON public.fingerprints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert trigger for profiles (auto-create profile on user signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
