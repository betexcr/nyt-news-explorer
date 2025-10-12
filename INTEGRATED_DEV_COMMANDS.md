# ✅ Integrated Development Commands

## 🚀 **New Unified Commands**

I've integrated the API server startup into your main development workflow! Now you can use these commands:

### **🎯 Main Command (Recommended):**
```bash
bun run dev
```
**What it does:**
- Starts React app on port 3000
- Starts API server on port 3001  
- Shows you all the URLs to access
- Handles cleanup when you stop with Ctrl+C

### **🔧 Individual Commands:**
```bash
# Start only React app (port 3000)
bun run dev:react

# Start only API server (port 3001)
bun run dev:api
```

---

## 📋 **What's Integrated:**

### **Environment Variables Automatically Set:**
- ✅ NYT API Key: Your real API key
- ✅ Redis: Your Upstash Redis credentials
- ✅ CORS: Properly configured for both ports
- ✅ Ports: 3000 (React) and 3001 (API)

### **Automatic Startup Sequence:**
1. **Port Check**: Verifies ports 3000 and 3001 are available
2. **React App**: Starts on port 3000
3. **API Server**: Starts on port 3001 (after 3-second delay)
4. **Status Display**: Shows all available URLs

---

## 🎉 **Usage:**

### **Start Everything:**
```bash
bun run dev
```

**You'll see:**
```
🚀 Starting NYT News Explorer - Full Stack Development
📋 Configuration:
   - React App: Port 3000
   - API Server: Port 3001
   - Cache Monitoring: Available at http://localhost:3001/api/v1/cache/status

✅ Both ports are available
🔧 Starting React app...
🔧 Starting API server...

🎉 Both servers are starting!

📱 React App: http://localhost:3000
🔧 API Server: http://localhost:3001
📊 Cache Status: http://localhost:3001/api/v1/cache/status
❤️  Health Check: http://localhost:3001/health

Press Ctrl+C to stop both servers
```

### **Stop Everything:**
- Press `Ctrl+C` to stop both servers gracefully

---

## 📊 **Available Endpoints:**

Once `bun run dev` is running:

| Service | URL | Description |
|---------|-----|-------------|
| **React App** | `http://localhost:3000` | Your main application |
| **API Health** | `http://localhost:3001/health` | API server status |
| **Cache Status** | `http://localhost:3001/api/v1/cache/status` | Redis monitoring |
| **NYT Top Stories** | `http://localhost:3001/api/v1/articles/top-stories/home` | NYT API data |

---

## 🔧 **Troubleshooting:**

### **Port Already in Use:**
```bash
# Kill processes on ports 3000 and 3001
netstat -ano | findstr :3000
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F
```

### **API Server Not Starting:**
- Check that your NYT API key is valid
- Verify Redis credentials in the script
- Make sure port 3001 is available

### **React App Not Starting:**
- Check that port 3000 is available
- Verify all React dependencies are installed

---

## ✨ **Benefits:**

- ✅ **One Command**: `bun run dev` starts everything
- ✅ **Automatic Configuration**: All environment variables set
- ✅ **Port Management**: Automatic port checking and assignment
- ✅ **Graceful Shutdown**: Ctrl+C stops both servers
- ✅ **Status Display**: Shows all URLs when ready
- ✅ **Error Handling**: Clear error messages if ports are busy

---

## 🎯 **Quick Start:**

```bash
# Start everything
bun run dev

# Open in browser
# React App: http://localhost:3000
# API Status: http://localhost:3001/api/v1/cache/status
```

**That's it!** Everything is now integrated into your main development workflow! 🚀
