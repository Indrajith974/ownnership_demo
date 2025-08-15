export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          wallet_address: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          twitter_handle: string | null
          github_handle: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          wallet_address?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          twitter_handle?: string | null
          github_handle?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          twitter_handle?: string | null
          github_handle?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fingerprints: {
        Row: {
          id: string
          user_id: string | null
          hash: string
          content_type: string
          title: string | null
          description: string | null
          file_size: number | null
          file_name: string | null
          mime_type: string | null
          metadata: Json
          thumbnail_url: string | null
          preview_url: string | null
          ipfs_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          hash: string
          content_type: string
          title?: string | null
          description?: string | null
          file_size?: number | null
          file_name?: string | null
          mime_type?: string | null
          metadata?: Json
          thumbnail_url?: string | null
          preview_url?: string | null
          ipfs_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          hash?: string
          content_type?: string
          title?: string | null
          description?: string | null
          file_size?: number | null
          file_name?: string | null
          mime_type?: string | null
          metadata?: Json
          thumbnail_url?: string | null
          preview_url?: string | null
          ipfs_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fingerprints_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      nft_mints: {
        Row: {
          id: string
          fingerprint_id: string | null
          user_id: string | null
          token_id: string | null
          contract_address: string | null
          chain_id: number | null
          transaction_hash: string | null
          block_number: number | null
          mint_status: string
          metadata_uri: string | null
          opensea_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fingerprint_id?: string | null
          user_id?: string | null
          token_id?: string | null
          contract_address?: string | null
          chain_id?: number | null
          transaction_hash?: string | null
          block_number?: number | null
          mint_status?: string
          metadata_uri?: string | null
          opensea_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fingerprint_id?: string | null
          user_id?: string | null
          token_id?: string | null
          contract_address?: string | null
          chain_id?: number | null
          transaction_hash?: string | null
          block_number?: number | null
          mint_status?: string
          metadata_uri?: string | null
          opensea_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_mints_fingerprint_id_fkey"
            columns: ["fingerprint_id"]
            referencedRelation: "fingerprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nft_mints_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          event_data: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          event_data?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          event_data?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      cross_matches: {
        Row: {
          id: string
          fingerprint_id: string | null
          matched_fingerprint_id: string | null
          similarity_score: number
          match_type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          fingerprint_id?: string | null
          matched_fingerprint_id?: string | null
          similarity_score: number
          match_type: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          fingerprint_id?: string | null
          matched_fingerprint_id?: string | null
          similarity_score?: number
          match_type?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_matches_fingerprint_id_fkey"
            columns: ["fingerprint_id"]
            referencedRelation: "fingerprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_matches_matched_fingerprint_id_fkey"
            columns: ["matched_fingerprint_id"]
            referencedRelation: "fingerprints"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
