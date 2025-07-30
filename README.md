 
Key Tech Highlights
	•	React 18 + TypeScript: Strong typing and modern React patterns.
	•	Zustand state management: Persistent search state and scroll restoration across pages.
	•	Debounced, cancellable API requests: Efficient network usage with real-time search.
	•	Responsive, theme-aware UI: Light/Dark mode toggle, mobile-friendly layout, no heavy UI kits.
 
How to Use
    1. 
        npm install
        npm start
    2.	On the Home page, click the entry panel to access Search.
	3.	Enter a query; results load with debounce to avoid redundant calls.
	4.	Click an article card for full details.
	5.	Use “Back to search” or browser back button to return; state and scroll are preserved. Going back to home page resets state.
	6.	Toggle light/dark mode anytime from the header.