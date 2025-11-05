from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from flask import Flask, jsonify, render_template, request

app = Flask(__name__, template_folder="templates", static_folder="static")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_FILE = DATA_DIR / "games.json"
DATA_DIR.mkdir(parents=True, exist_ok=True)

_data_lock = threading.Lock()

ANIMAL_CHOICES: List[Dict[str, str]] = [
    {"id": "cheetah", "label": "Cheetah (fast & agile)"},
    {"id": "falcon", "label": "Falcon (swift & focused)"},
    {"id": "dolphin", "label": "Dolphin (smooth pacing)"},
    {"id": "kangaroo", "label": "Kangaroo (powerful jumps)"},
    {"id": "wolf", "label": "Wolf (pack mindset)"},
    {"id": "panther", "label": "Panther (stealth runner)"},
    {"id": "gazelle", "label": "Gazelle (endurance expert)"},
]


def _load_data() -> Dict[str, Dict[str, dict]]:
    if not DATA_FILE.exists():
        return {"games": {}}
    with DATA_FILE.open("r", encoding="utf-8") as handle:
        try:
            raw = json.load(handle)
        except json.JSONDecodeError:
            return {"games": {}}
    if "games" not in raw or not isinstance(raw["games"], dict):
        return {"games": {}}
    return raw


def _save_data(data: Dict[str, Dict[str, dict]]) -> None:
    DATA_FILE.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


@app.route("/")
def index() -> str:
    return render_template("index.html", animals=ANIMAL_CHOICES)


@app.get("/api/animals")
def get_animals():
    return jsonify({"animals": ANIMAL_CHOICES})


@app.get("/api/games/<game_id>")
def get_game(game_id: str):
    animal_lookup = {choice["id"]: choice["label"] for choice in ANIMAL_CHOICES}
    with _data_lock:
        data = _load_data()
        game = data["games"].get(game_id, {"players": {}, "updated_at": None})
    players = []
    for name, player in sorted(game.get("players", {}).items(), key=lambda item: item[0].casefold()):
        players.append(
            {
                "name": name,
                "animal": player.get("animal"),
                "animal_label": animal_lookup.get(player.get("animal"), player.get("animal", "")),
                "pace": player.get("pace", ""),
                "updated_at": player.get("updated_at"),
            }
        )
    return jsonify({
        "game_id": game_id,
        "players": players,
        "updated_at": game.get("updated_at"),
    })


@app.post("/api/games/<game_id>/players")
def upsert_player(game_id: str):
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    animal = (payload.get("animal") or "").strip()
    pace = (payload.get("pace") or "").strip()

    if not name:
        return jsonify({"error": "Player name is required."}), 400
    if animal not in {choice["id"] for choice in ANIMAL_CHOICES}:
        return jsonify({"error": "Please choose a valid animal."}), 400

    with _data_lock:
        data = _load_data()
        game = data["games"].setdefault(game_id, {"players": {}, "updated_at": None})
        game.setdefault("players", {})
        game["players"][name] = {
            "animal": animal,
            "pace": pace,
            "updated_at": _now_iso(),
        }
        game["updated_at"] = _now_iso()
        _save_data(data)

    return jsonify({"status": "ok"})


@app.delete("/api/games/<game_id>/players/<player_name>")
def remove_player(game_id: str, player_name: str):
    with _data_lock:
        data = _load_data()
        game = data["games"].get(game_id)
        if not game or player_name not in game.get("players", {}):
            return jsonify({"error": "Player not found."}), 404
        del game["players"][player_name]
        game["updated_at"] = _now_iso()
        _save_data(data)

    return jsonify({"status": "removed"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
