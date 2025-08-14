# 🚀 The Ownership Layer - Development Setup Guide

## 📋 Prerequisites

Before running the project, you need to install the following dependencies:

### 1. Node.js and npm
```bash
# Install Node.js (version 18 or higher)
# Option 1: Using Homebrew (recommended for macOS)
brew install node

# Option 2: Download from official website
# Visit: https://nodejs.org/en/download/

# Verify installation
node --version
npm --version
```

### 2. Python (version 3.8 or higher)
```bash
# Check if Python is installed
python3 --version

# If not installed, use Homebrew
brew install python3

# Create virtual environment for the project
python3 -m venv venv
source venv/bin/activate
```

### 3. Additional System Dependencies
```bash
# For audio processing (librosa)
brew install portaudio

# For image processing
brew install jpeg libpng

# Redis (for caching)
brew install redis
```

## 🛠️ Project Setup

### Step 1: Install Root Dependencies
```bash
cd /Users/vinayanand/Documents/ownership-layer
npm install
```

### Step 2: Install Web App Dependencies
```bash
cd apps/web
npm install
```

### Step 3: Install Python Dependencies
```bash
# Activate virtual environment
source venv/bin/activate

# Install API dependencies
cd apps/api
pip install -r requirements.txt

# Install Engine dependencies
cd ../engine
pip install -r requirements.txt
```

### Step 4: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your API keys:
# - OPENAI_API_KEY (get from OpenAI)
# - SUPABASE_URL and SUPABASE_ANON_KEY (get from Supabase)
```

## 🚀 Running the Development Servers

### Option 1: Run All Services with Turbo
```bash
# From project root
npm run dev
```

### Option 2: Run Services Individually

#### Frontend (Next.js)
```bash
cd apps/web
npm run dev
# Runs on http://localhost:3000
```

#### Backend API (FastAPI)
```bash
cd apps/api
source ../../venv/bin/activate
python main.py
# Runs on http://localhost:8000
```

#### AI Engine (FastAPI)
```bash
cd apps/engine
source ../../venv/bin/activate
python -m uvicorn main:app --reload --port 8001
# Runs on http://localhost:8001
```

#### Redis (if needed)
```bash
redis-server
# Runs on localhost:6379
```

## 🔧 Development Tools

### Useful Commands
```bash
# Build all apps
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Clean build files
npm run clean
```

### API Documentation
- Main API: http://localhost:8000/docs
- AI Engine: http://localhost:8001/docs

## 🎯 Quick Start Checklist

- [ ] Install Node.js and npm
- [ ] Install Python 3.8+
- [ ] Install system dependencies (portaudio, redis, etc.)
- [ ] Clone/navigate to project directory
- [ ] Run `npm install` in root
- [ ] Run `npm install` in apps/web
- [ ] Create and activate Python virtual environment
- [ ] Install Python requirements for API and Engine
- [ ] Copy .env.example to .env and configure
- [ ] Start development servers
- [ ] Visit http://localhost:3000 to see the app

## 🆘 Troubleshooting

### Common Issues

1. **Node.js not found**: Install Node.js using Homebrew or from nodejs.org
2. **Python dependencies fail**: Make sure you're in the virtual environment
3. **Audio processing errors**: Install portaudio with `brew install portaudio`
4. **OpenAI API errors**: Set your OPENAI_API_KEY in .env file
5. **Port conflicts**: Change ports in package.json scripts if needed

### Getting Help
- Check the logs in each terminal window
- Ensure all environment variables are set
- Verify all dependencies are installed

---

**Ready to build the future of content ownership! 🔐**
