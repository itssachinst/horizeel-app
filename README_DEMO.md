# How to Update App.js for Demo Route
To make your React app properly handle all paths under /demo/, you need to update your App.js file with the following changes:

1. Update the isHomePage check in the AppLayout component:
`javascript
// FROM THIS:
const isHomePage = location.pathname === '/';

// TO THIS:
const isHomePage = location.pathname === '/' || location.pathname === '/demo/' || location.pathname.startsWith('/demo/');
