# Animal Run Planner

Coordinate a shared running "game" with animal personas that sync across devices.
Each participant joins the same game code, chooses an animal avatar, and shares
their pace or other planning notes. The game data is stored server-side so any
device connected to the session will see updates within a few seconds.

## Features

- Animal personas to choose from when joining the run.
- Shared game codes so multiple devices can collaborate in real time.
- Automatic refresh every five seconds plus a manual refresh control.
- Simple REST API that persists data to `data/games.json` for lightweight hosting.

## Getting started

1. Create and activate a Python 3.10+ virtual environment.
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Start the development server:

   ```bash
   flask --app app.server run --debug
   ```

4. Visit <http://127.0.0.1:5000> and share the game code (for example
   `community-run`) with friends. Everyone sees the same roster when they join
   the shared code.

## API overview

- `GET /api/animals` — list available animal personas.
- `GET /api/games/<game_id>` — fetch all runners for a specific shared code.
- `POST /api/games/<game_id>/players` — create or update a runner. Body:
  `{ "name": "Avery", "animal": "wolf", "pace": "6:00 min/km" }`
- `DELETE /api/games/<game_id>/players/<name>` — remove a runner from the plan.

All responses are JSON. Game data lives in `data/games.json`; delete the file to
reset everything.
