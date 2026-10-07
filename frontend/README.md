# Frontend preview without a backend

From this folder run:

```sh
npm install
npm run dev:demo
```

Open the localhost address printed in the terminal (normally http://localhost:5173).
Demo mode opens a sample administrator workspace automatically. Browse every page,
search and filter records, open forms, and try creating, editing, or deleting sample
records. Changes are kept in memory and reset when you refresh the browser.
After signing out, any nonempty username and password reopen the demo; use made-up
credentials. Sample API keys are nonfunctional placeholders.

No Docker, Python, database, or backend is needed. Map backgrounds use online
OpenStreetMap tiles. Spreadsheet imports, template downloads, and API documentation
require the real backend and are disabled or hidden in this preview. The demo is
for checking the interface; it does not reproduce backend validation or security.

`npm run dev` and `npm run build` retain the normal backend-connected behavior.
