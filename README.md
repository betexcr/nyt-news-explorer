## Install

Set your NYT API Key to REACT_APP_NYT_API_KEY in the env file

npm install

npm start

## How to Use 

-On the Home page, click the entry panel to access Search.

-Enter a query; results load with debounce to avoid redundant calls.

-Click an article card for full details.

-Use “Back to search” or browser back button to return; state and scroll are preserved. Going back to home page resets state.

-Toggle light/dark mode anytime from the header.


## Tests

npm run test:cov

npm run test:ci
