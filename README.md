# AWS Security Fundamentals — Slides

This repository contains a collection of static HTML slides and assets for the "AWS Security Fundamentals" training.

Prerequisites
- Python 3 installed (python3)

Run locally
Start a simple static file server from the repository root and serve the slides on port 8000:

```bash
python3 -m http.server 8000
```

Open a browser and navigate to:
- http://localhost:8000
- or http://127.0.0.1:8000

Stop the server with Ctrl+C in the terminal.

Alternative (Node.js)
If you prefer using Node.js, install http-server and run:

```bash
npm install -g http-server
http-server -p 8000
```

Notes
- The server serves files from the current working directory. Run the command from the repository root to serve the slides/index.html.
- This README only documents a local development server for static files. The repo also contains a `vercel.json` for Vercel deployment.

License
- See repository for license information (none included here).
