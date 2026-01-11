
# Network-Based Disease Spread Simulation Using Graph Algorithms

## Overview
This project is a **Data Structures and Algorithms (DSA) based simulation system** that models the spread of an infectious disease (such as COVID-19) across a social network. The social network is represented as a **graph**, where individuals are nodes and social interactions are edges.

The simulation demonstrates how diseases propagate through communities using classical graph traversal techniques and probabilistic models like **SIR (Susceptible–Infected–Recovered)**. Results are visualized interactively on a map and through epidemic curves.

---

## Objectives
- Apply **graph data structures** to a real-world problem
- Simulate disease spread using **network-based algorithms**
- Visualize infection dynamics over time
- Analyze efficiency, scalability, and algorithmic complexity

---

## Core Concepts Used
- Graphs (Adjacency Lists)
- BFS-style propagation
- Sets, Queues, and Dictionaries
- Probabilistic simulation
- Time & space complexity analysis

---

## Tech Stack

### Backend
- **Python**
- **FastAPI**
- **NetworkX** (graph creation & traversal)
- SIR / SEIR disease models

### Frontend
- **React + TypeScript**
- **Vite**
- **Google Maps JavaScript API**
- **Recharts** (SIR curves & statistics)
- Optional: **Deck.gl** for advanced visual layers

---

## Project Structure
DSA_Project/
│
├── covid/
│ ├── backend/
│ │ ├── app.py / main.py
│ │ ├── simulation/
│ │ └── graph_utils/
│ │
│ ├── frontend/
│ │ ├── src/
│ │ ├── public/
│ │ └── .env
│ │
│ ├── requirements.txt
│ └── README.md

---

## How the Simulation Works

### Social Network as a Graph
- Each person is a **node**
- Each social interaction is an **edge**
- The graph is stored using **adjacency lists** (via NetworkX)

### Disease Model (SIR)
Each node is always in one of three states:
- **S (Susceptible)** – Healthy but can be infected
- **I (Infected)** – Currently infected
- **R (Recovered)** – Immune / no longer infectious

### Spread Logic
- The simulation runs in **discrete time steps** (days)
- At each step:
  - Infected nodes attempt to infect susceptible neighbors
  - Infection happens with probability `p`
  - Nodes recover after a fixed time or probability

### Algorithms Used
- **BFS-style propagation** using a queue
- Neighbor traversal: `O(degree(node))`
- Efficient updates by tracking only infected nodes
- Optional DFS/BFS for analysis (components, paths)


## Metrics & Analysis
During simulation, we record:
- New infections per day
- Total infected population
- Recovered individuals
- Epidemic peak timing
- Approximate basic reproduction number (R₀)

These metrics are plotted as **SIR curves** in real time.

## Visualization
- Nodes displayed on **Google Maps**
- Color-coded states:
  - 🟢 Susceptible
  - 🔴 Infected
  - 🔵 Recovered
- Charts show infection trends over time

### How to Run the Project

## Run the Backend (FastAPI)

Open a terminal **in the folder that contains `DSA_Project/`**, then:

```bash
cd covid

# create + activate venv
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate    # Windows PowerShell

# install deps
pip install -r requirements.txt

# run the API (IMPORTANT: run from the covid/ folder)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Now test it in your browser:

* `http://localhost:8000/health`  → should return `{"ok": true}`

---

## Run the Frontend (React + Vite)

Open a **second terminal**:

```bash
cd covid/frontend

# install packages (even if node_modules exists, this avoids weird issues)
npm install

# start dev server
npm run dev
```

Vite will print a URL like:

* `http://localhost:5173/`

Open that in your browser.

---

## Confirm it’s connected

The frontend is hardcoded to call:

* `http://localhost:8000`

So make sure:

* Backend is running on **port 8000**
* Frontend is running on **port 5173**

---
## Common issues (quick fixes)

### Backend import/module errors

Run uvicorn **from the `covid/` folder** like this:

```bash
cd covid
uvicorn backend.app:app --reload --port 8000
```

(Not from `covid/backend/`.)

### Map shows blank / “For development purposes only”

Make sure the Google Maps key is valid and billing is enabled on your Google Cloud project.

Your key is read from:

* `covid/frontend/.env` as `VITE_GOOGLE_MAPS_KEY=...`

After changing `.env`, restart `npm run dev`.

### Ports already in use

Pick another port:

```bash
uvicorn main:app --reload --port 8001
```

…but if you do that, you must also update the frontend constant in `src/App.jsx`:

```js
const API_BASE_DEFAULT = "http://localhost:8001";
```

---
