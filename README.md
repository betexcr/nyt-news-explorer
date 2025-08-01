# New York Times News Explorer

A React + TypeScript web application that allows users to explore and search articles from the New York Times API. Built for performance, clean architecture, and easy navigation.

---
![test](https://img.shields.io/github/actions/workflow/status/betexcr/nyt-news-explorer/test.yml?label=Tests&logo=github&style=for-the-badge)

## **Features**
- Search for articles using the New York Times API
- Responsive and accessible UI
- Theming (light/dark modes)
- Jest test coverage
- Continuous Integration with GitHub Actions

---

## **Installation**

```bash
git clone https://github.com/betexcr/nyt-news-explorer.git
cd nyt-news-explorer
bun install
```

---

## **Setup Environment Variables**

Create a `.env` file in the project root:

```env
REACT_APP_NYT_API_KEY=your_api_key_here
```

You can obtain your API key from [NYT Developer Portal](https://developer.nytimes.com/).

---

## **Usage**

```bash
bun start
```
Runs the app in development mode.  
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

---

## **Testing**

Run the test suite with coverage:

```bash
bun test:cov:strict
```

This will run all Jest tests and enforce coverage thresholds.

---

## **CI/CD**

This project includes a GitHub Actions workflow for automated testing on every push or pull request to the `master` branch.
