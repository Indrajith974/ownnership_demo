# The Ownership Layer - Backend

## Overview
Backend API server for The Ownership Layer content fingerprinting and attribution platform.

## Features
- **Content Fingerprinting**: Multi-modal content analysis (text, images, audio, code)
- **Attribution Protocol**: Ownership claims and verification system
- **Blockchain Integration**: NFT minting and on-chain ownership records
- **IPFS Storage**: Decentralized metadata storage

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run the Server
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Documentation
Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## Project Structure
```
backend/
├── api/           # FastAPI application and endpoints
├── engine/        # AI fingerprinting engine (GNAN)
├── contracts/     # Smart contracts and deployment scripts
├── main.py        # Application entry point
├── requirements.txt
└── .env.example
```

## Environment Variables
See `.env.example` for required configuration variables.
