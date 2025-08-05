# New York Times News Explorer

<div style="float: right;">
  <a href="https://github.com/betexcr/nyt-news-explorer/actions/workflows/test.yml">
    <img src="https://github.com/betexcr/nyt-news-explorer/actions/workflows/test.yml/badge.svg" alt="Tests" /> 
  </a>
  <a href="https://github.com/betexcr/nyt-news-explorer/actions/workflows/deploy.yml">
    <img src="https://github.com/betexcr/nyt-news-explorer/actions/workflows/deploy.yml/badge.svg" alt="Build and Deploy" />
  </a>
</div>

A modern React + TypeScript web application that allows users to explore and search articles from the New York Times API. Built for performance, clean architecture, and excellent user experience with comprehensive test coverage.

## 🚀 **Live Demo**

Visit the live application: [https://nyt.brainvaultdev.com](https://nyt.brainvaultdev.com)

---

## ✨ **Features**

### 🔍 **Advanced Search & Discovery**
- **Real-time search** with debounced input for optimal performance
- **Advanced search filters** with section-based filtering (U.S., World, Politics, etc.)
- **Sort options** (Newest First, Oldest First)
- **Infinite scrolling** for seamless article browsing
- **Virtualized lists** for optimal performance with large datasets

### 💾 **Favorites System**
- **Save articles** to your personal favorites collection
- **Favorites page** with dedicated view and management
- **Persistent storage** - favorites survive page reloads
- **Quick add/remove** with heart icons on all article cards
- **Favorites count** display and management

### 🎨 **Modern UI/UX**
- **Responsive design** that works on desktop, tablet, and mobile
- **Dark/Light theme** toggle with system preference detection
- **Glassmorphism design** with modern visual effects
- **Fixed header** with navigation and quick actions
- **Smooth animations** and transitions throughout

### 📱 **Navigation & Layout**
- **Fixed header** with logo and navigation
- **Mobile-responsive** hamburger menu
- **Breadcrumb navigation** and intuitive routing
- **Professional search interface** with advanced options
- **Grid and table view** modes for different preferences

### 🔧 **Data Management**
- **Clear cache functionality** to reset search state and storage
- **Session persistence** - maintain search state across page reloads
- **Scroll position memory** for seamless navigation
- **Advanced state management** with Zustand

### 📊 **Performance Optimizations**
- **Virtualized article lists** for handling large datasets
- **Lazy loading** and infinite scroll for optimal performance
- **Debounced search** to reduce API calls
- **Optimized re-renders** with React.memo and useCallback
- **Efficient state management** with selective subscriptions

### 🧪 **Quality Assurance**
- **Comprehensive test coverage** (73%+ overall, 100% on core components)
- **194 passing tests** across 26 test suites
- **TypeScript** for type safety and better developer experience
- **ESLint** configuration for code quality
- **Continuous Integration** with GitHub Actions

---

## 🛠 **Technology Stack**

- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Styling**: CSS with CSS Variables for theming
- **Testing**: Jest + React Testing Library
- **Build Tool**: Vite (via Create React App)
- **Package Manager**: Bun
- **Deployment**: GitHub Actions + Hostinger

---

## 📦 **Installation**

```bash
git clone https://github.com/betexcr/nyt-news-explorer.git
cd nyt-news-explorer
bun install
```

---

## ⚙️ **Environment Setup**

Create a `.env` file in the project root:

```env
REACT_APP_NYT_API_KEY=your_api_key_here
```

You can obtain your API key from [NYT Developer Portal](https://developer.nytimes.com/).

---

## 🚀 **Development**

```bash
# Start development server
bun start

# Run tests with coverage
bun test:cov

# Build for production
bun run build

# Serve production build locally
npx serve -s build -l 3001
```

---

## 🧪 **Testing**

The application includes comprehensive test coverage:

```bash
# Run all tests
bun test

# Run tests with coverage
bun test:cov

# Run tests in watch mode
bun test --watch
```

**Test Coverage Highlights:**
- ✅ **100% coverage** on core components (ArticleCard, FavoritesPage, etc.)
- ✅ **100% coverage** on API layer and utilities
- ✅ **Comprehensive integration tests** for user workflows
- ✅ **Edge case testing** for error states and null handling

---

## 🔄 **CI/CD Pipeline**

This project includes automated workflows:

- **Automated Testing**: Runs on every push/PR
- **Automated Deployment**: Deploys to production on master branch
- **Quality Gates**: Enforces test coverage and code quality
- **Deployment Validation**: Verifies successful deployment

---

## 📁 **Project Structure**

```
src/
├── components/          # Reusable UI components
├── pages/              # Page-level components
├── store/              # Zustand state management
├── api/                # API integration layer
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── styles/             # Global styles and themes
└── __tests__/          # Test files
```

---

## 🎯 **Key Features in Detail**

### **Search & Discovery**
- Real-time search with NYT API integration
- Advanced filtering by news sections
- Sort by publication date
- Infinite scrolling for seamless browsing
- Virtualized lists for performance

### **Favorites Management**
- Add/remove articles with heart icons
- Dedicated favorites page
- Persistent storage across sessions
- Favorites count and management

### **User Experience**
- Responsive design for all devices
- Dark/light theme toggle
- Fixed header with navigation
- Smooth animations and transitions
- Professional search interface

### **Performance**
- Optimized re-renders
- Debounced search input
- Virtualized lists for large datasets
- Efficient state management
- Lazy loading and infinite scroll

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

---

## 📄 **License**

This project is open source and available under the [MIT License](LICENSE).

---

## 🔗 **Links**

- **Live Application**: [https://nyt.brainvaultdev.com](https://nyt.brainvaultdev.com)
- **GitHub Repository**: [https://github.com/betexcr/nyt-news-explorer](https://github.com/betexcr/nyt-news-explorer)
- **NYT API Documentation**: [https://developer.nytimes.com/](https://developer.nytimes.com/)
