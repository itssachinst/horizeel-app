off
set
find_text=const isHomePage = location.pathname === '/';
set
replace_text=const isHomePage = location.pathname === '/' || location.pathname === '/demo/' || location.pathname.startsWith('/demo/');
set
find_route=<Route path=\
/\ element={
set
demo_routes=<Route path=\
/demo/\ element={^<AppLayout^>^<HomePage /^>^</AppLayout^>} /^>^<Route path=\/demo/*\ element={^<AppLayout^>^<HomePage /^>^</AppLayout^>} /^>
