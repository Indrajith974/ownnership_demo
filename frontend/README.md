# The Ownership Layer - Frontend

## Overview
Next.js frontend application for The Ownership Layer content fingerprinting and attribution platform.

## Features
- **Modern UI**: Built with Next.js 14, TypeScript, and Tailwind CSS
- **Web3 Integration**: Wallet connection with RainbowKit and Wagmi
- **Content Upload**: Multi-modal content fingerprinting interface
- **NFT Minting**: Transform fingerprints into ownership certificates
- **Dashboard**: Creator analytics and content management

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Build for Production
```bash
npm run build
npm start
```

## Project Structure
```
frontend/
├── app/           # Next.js app directory (pages and layouts)
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── services/      # API and external service integrations
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── config/        # Configuration files
```

## Tech Stack
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + Radix UI
- **Web3**: RainbowKit, Wagmi, Viem
- **State**: TanStack Query
- **Auth**: Supabase + SIWE (Sign-In with Ethereum)
