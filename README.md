
## 1) Unzip the project

Unzip `DSA_Project.zip` anywhere. You should end up with a folder like:

* `DSA_Project/backend/`
* `DSA_Project/frontend/`

---

## 2) Run the Backend (FastAPI)


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

## 3) Run the Frontend (React + Vite)

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

## 4) Confirm it’s connected

The frontend is hardcoded to call:

* `http://localhost:8000`

So make sure:

* Backend is running on **port 8000**
* Frontend is running on **port 5173**

---

## 5) Common issues (quick fixes)

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

If you tell me what OS you’re on (Windows/macOS/Linux) **and paste the exact error text** (if any), I’ll point to the exact fix.
