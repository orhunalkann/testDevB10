const gameIdInput = document.getElementById('gameId');
const loadGameButton = document.getElementById('loadGame');
const playerForm = document.getElementById('playerForm');
const messageBox = document.getElementById('formMessage');
const playersTable = document.getElementById('playersTable');
const updatedAtLabel = document.getElementById('updatedAt');
const refreshButton = document.getElementById('refresh');

let currentGameId = gameIdInput.value.trim();
let pollIntervalId = null;

function showMessage(text, type = 'info') {
  messageBox.textContent = text;
  messageBox.className = type;
  if (text) {
    setTimeout(() => {
      if (messageBox.textContent === text) {
        messageBox.textContent = '';
        messageBox.className = '';
      }
    }, 4000);
  }
}

async function fetchGame(gameId) {
  const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`);
  if (!response.ok) {
    throw new Error('Unable to load game');
  }
  return response.json();
}

function renderPlayers(data) {
  playersTable.innerHTML = '';
  data.players.forEach((player) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = player.name;
    row.appendChild(nameCell);

    const animalCell = document.createElement('td');
    animalCell.textContent = player.animal_label || player.animal || '—';
    row.appendChild(animalCell);

    const paceCell = document.createElement('td');
    paceCell.textContent = player.pace || '—';
    row.appendChild(paceCell);

    const updatedCell = document.createElement('td');
    updatedCell.textContent = player.updated_at
      ? new Date(player.updated_at).toLocaleString()
      : '—';
    row.appendChild(updatedCell);

    const deleteCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Remove';
    deleteButton.className = 'secondary';
    deleteButton.addEventListener('click', async () => {
      if (!confirm(`Remove ${player.name}?`)) {
        return;
      }
      const response = await fetch(
        `/api/games/${encodeURIComponent(currentGameId)}/players/${encodeURIComponent(
          player.name
        )}`,
        {
          method: 'DELETE',
        }
      );
      if (response.ok) {
        loadCurrentGame();
      } else {
        showMessage('Could not remove runner.', 'error');
      }
    });
    deleteCell.appendChild(deleteButton);
    row.appendChild(deleteCell);

    playersTable.appendChild(row);
  });

  if (data.players.length === 0) {
    const row = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.textContent = 'No runners yet. Share the code and invite friends!';
    emptyCell.colSpan = 5;
    row.appendChild(emptyCell);
    playersTable.appendChild(row);
  }

  updatedAtLabel.textContent = data.updated_at
    ? `Updated ${new Date(data.updated_at).toLocaleString()}`
    : 'Waiting for updates…';
}

async function loadCurrentGame() {
  if (!currentGameId) {
    return;
  }
  try {
    const data = await fetchGame(currentGameId);
    renderPlayers(data);
  } catch (error) {
    showMessage('Unable to refresh the game. Try again later.', 'error');
  }
}

loadGameButton.addEventListener('click', () => {
  const value = gameIdInput.value.trim();
  if (!value) {
    showMessage('Please enter a game code.', 'error');
    return;
  }
  currentGameId = value;
  showMessage(`Joined game "${currentGameId}"`, 'success');
  loadCurrentGame();
  restartPolling();
});

refreshButton.addEventListener('click', () => {
  loadCurrentGame();
});

playerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('playerName').value.trim();
  const animal = document.getElementById('animalChoice').value;
  const pace = document.getElementById('pace').value.trim();

  if (!currentGameId) {
    showMessage('Please join a game first.', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/games/${encodeURIComponent(currentGameId)}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, animal, pace }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      showMessage(payload?.error || 'Unable to save runner.', 'error');
      return;
    }

    showMessage('Runner saved!', 'success');
    loadCurrentGame();
    playerForm.reset();
  } catch (error) {
    showMessage('Unable to save runner right now.', 'error');
  }
});

function restartPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
  }
  pollIntervalId = setInterval(() => {
    loadCurrentGame();
  }, 5000);
}

restartPolling();
loadCurrentGame();
