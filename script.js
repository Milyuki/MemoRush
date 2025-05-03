const difficulties = {
  easy: {
    pairs: 4,
    gridCols: 4,
    gridRows: 2,
  },
  medium: {
    pairs: 6,
    gridCols: 4,
    gridRows: 3,
  },
  hard: {
    pairs: 8,
    gridCols: 4,
    gridRows: 4,
  }
};

const themes = {
  numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
  letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'],
  emoji: ['💀', '🚀', '🧸', '⚽', '🍎', '🌟', '🎵', '🐱'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼']
};

const gameGrid = document.getElementById('gameGrid');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const messageEl = document.getElementById('message');
const closeBtn = document.getElementById('closeBtn');
const resetBtn = document.getElementById('resetBtn');
const tallyToggleBtn = document.getElementById('tallyToggleBtn');
const tallyBoard = document.getElementById('tallyBoard');
const tallyCloseBtn = document.getElementById('tallyCloseBtn');
const difficultyButtons = document.querySelectorAll('.difficulty-select button');
const themeButtons = document.querySelectorAll('.theme-selector button');
const hintBtn = document.getElementById('hintBtn');
const winMessage = document.getElementById('winMessage');
const finalMoves = document.getElementById('finalMoves');
const finalTime = document.getElementById('finalTime');
const playAgainBtn = document.getElementById('playAgainBtn');

const tallyLists = {
  easy: document.getElementById('listEasy'),
  medium: document.getElementById('listMedium'),
  hard: document.getElementById('listHard'),
};

let timerInterval = null;
let elapsedTime = 0;
let moves = 0;
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;
let totalPairs = 0;
let gameStarted = false;
let currentDifficulty = 'easy';
let currentTheme = 'numbers';
let hintCount = 3;

// Load tally from localStorage or initialize
let tallyData = {
  easy: [],
  medium: [],
  hard: []
};
const storageKey = 'memoryGameTally';

function loadTally() {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.easy && parsed.medium && parsed.hard) {
        tallyData = parsed;
      }
    } catch (error) {
      console.error('Error parsing tally data', error);
    }
  }
}

function saveTally() {
  localStorage.setItem(storageKey, JSON.stringify(tallyData));
}

function updateTallyUI() {
  Object.keys(tallyLists).forEach(level => {
    const listEl = tallyLists[level];
    listEl.innerHTML = '';
    const times = tallyData[level];
    if (times.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No records yet';
      li.style.textAlign = 'center';
      listEl.appendChild(li);
      return;
    }
    times.forEach((time, i) => {
      const li = document.createElement('li');
      const rankSpan = document.createElement('span');
      rankSpan.className = 'tally-rank';
      rankSpan.textContent = `${i + 1}. `;
      const timeSpan = document.createElement('span');
      timeSpan.className = 'tally-time';
      timeSpan.textContent = `${time.toFixed(1)}s`;
      li.appendChild(rankSpan);
      li.appendChild(timeSpan);
      listEl.appendChild(li);
    });
  });
}

function addTimeToTally(level, time) {
  const arr = tallyData[level];
  arr.push(time);
  arr.sort((a, b) => a - b);
  if (arr.length > 5) arr.length = 5; // keep top 5 only
  saveTally();
  updateTallyUI();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createCards(pairs) {
  const selectedThemeArray = themes[currentTheme] || themes.numbers;
  const selectedEmojis = selectedThemeArray.slice(0, pairs);
  const cardsArray = [];
  selectedEmojis.forEach(e => {
    cardsArray.push(e, e);
  });
  return shuffle(cardsArray);
}

function setupGrid(cols, rows) {
  gameGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gameGrid.style.gridTemplateRows = `repeat(${rows}, auto)`;
}

function startTimer() {
  elapsedTime = 0;
  timerEl.textContent = elapsedTime.toFixed(1) + 's';
  timerInterval = setInterval(() => {
    elapsedTime += 0.1;
    timerEl.textContent = elapsedTime.toFixed(1) + 's';
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function startGame(level) {
  stopTimer();
  messageEl.textContent = '';
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;
  moves = 0;
  movesEl.textContent = 'Moves: 0';
  gameStarted = false;
  currentDifficulty = level;
  
  const { pairs, gridCols, gridRows } = difficulties[level];
  totalPairs = pairs;
  
  setupGrid(gridCols, gridRows);
  
  // Clear previous cards
  gameGrid.innerHTML = '';
  
  // Create and add cards
  const cards = createCards(pairs);
  cards.forEach((emoji, index) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.setAttribute('aria-label', 'Hidden card');
    card.dataset.emoji = emoji;
    card.dataset.index = index;
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.textContent = '';
    card.addEventListener('click', () => revealCard(card));
    gameGrid.appendChild(card);
  });
  
  timerEl.textContent = '0.0s';
  
  // Focus first card for accessibility
  setTimeout(() => {
    const first = gameGrid.querySelector('.card');
    if (first) first.focus();
  }, 100);
}

function disableAllCards() {
  document.querySelectorAll('.card').forEach(card => card.disabled = true);
}

function revealCard(card) {
  if (lockBoard) return;
  if (card === firstCard) return;
  if (card.classList.contains('revealed') || card.classList.contains('matched')) return;
  
  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }
  
  card.classList.add('revealed');
  card.textContent = card.dataset.emoji;
  card.setAttribute('aria-label', `Card showing ${card.dataset.emoji}`);
  card.setAttribute('aria-pressed', 'true');
  
  if (!firstCard) {
    firstCard = card;
    return;
  }
  
  secondCard = card;
  lockBoard = true;
  
  if (firstCard.dataset.emoji === secondCard.dataset.emoji) {
    // Match found
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    firstCard.setAttribute('aria-label', `Card matched ${firstCard.dataset.emoji}`);
    secondCard.setAttribute('aria-label', `Card matched ${secondCard.dataset.emoji}`);
    firstCard.disabled = true;
    secondCard.disabled = true;
    matchedPairs++;
    moves++;
    movesEl.textContent = `Moves: ${moves}`;
    resetTurn();
    
    if (matchedPairs === totalPairs) {
      stopTimer();
      messageEl.textContent = `🎉 You won in ${elapsedTime.toFixed(1)} seconds! 🎉`;
      disableAllCards();
      addTimeToTally(currentDifficulty, elapsedTime);
      showWinMessage();
    }
  } else {
    // No match, hide after short delay
    moves++;
    movesEl.textContent = `Moves: ${moves}`;
    setTimeout(() => {
      firstCard.classList.remove('revealed');
      secondCard.classList.remove('revealed');
      firstCard.textContent = '';
      secondCard.textContent = '';
      firstCard.setAttribute('aria-label', 'Hidden card');
      secondCard.setAttribute('aria-label', 'Hidden card');
      firstCard.setAttribute('aria-pressed', 'false');
      secondCard.setAttribute('aria-pressed', 'false');
      resetTurn();
    }, 1000);
  }
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function showWinMessage() {
  finalMoves.textContent = moves;
  finalTime.textContent = elapsedTime.toFixed(1);
  winMessage.style.display = 'block';
}

function hideWinMessage() {
  winMessage.style.display = 'none';
}

function resetGame() {
  hideWinMessage();
  startGame(currentDifficulty);
  hintCount = 3;
  hintBtn.textContent = `Hint (${hintCount})`;
  hintBtn.disabled = false;
}

function showHint() {
  if (hintCount <= 0) return;
  
  hintCount--;
  hintBtn.textContent = `Hint (${hintCount})`;
  
  if (hintCount === 0) {
    hintBtn.disabled = true;
  }
  
  // Find all unflipped, unmatched cards
  const unflippedCards = Array.from(document.querySelectorAll('.card')).filter(card =>
    !card.classList.contains('revealed') &&
    !card.classList.contains('matched')
  );
  
  if (unflippedCards.length === 0) return;
  
  // Randomly select one card to show
  const randomIndex = Math.floor(Math.random() * unflippedCards.length);
  const hintCard = unflippedCards[randomIndex];
  
  // Temporarily show the card
  hintCard.classList.add('revealed');
  hintCard.textContent = hintCard.dataset.emoji;
  
  // Hide it after 1 second if it's not matched
  setTimeout(() => {
    if (!hintCard.classList.contains('matched')) {
      hintCard.classList.remove('revealed');
      hintCard.textContent = '';
    }
  }, 1000);
}

// Event listeners

resetBtn.addEventListener('click', resetGame);
resetBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    resetGame();
  }
});

function logout() {
  // Clear localStorage or any session data here
  localStorage.clear();
  // Add any other logout cleanup if needed
}

const closeBtnElement = document.getElementById('closeBtn');

function logout() {
  // Clear localStorage or any session data here
  localStorage.clear();
  // Add any other logout cleanup if needed
}

closeBtnElement.addEventListener('click', function() {
  if (confirm("Are you sure you want to log out?")) {
    logout();
    window.location.href = "login.html";
  }
});

// Remove existing closeBtn event listeners that reload the page
// (No event listeners attached here now, handled in index.html inline script)

difficultyButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (button.classList.contains('active')) return;
    difficultyButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
      btn.tabIndex = -1;
    });
    button.classList.add('active');
    button.setAttribute('aria-checked', 'true');
    button.tabIndex = 0;
    currentDifficulty = button.dataset.level;
    resetGame();
  });
  button.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const currentIndex = Array.from(difficultyButtons).indexOf(e.target);
      let nextIndex;
      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % difficultyButtons.length;
      } else {
        nextIndex = (currentIndex - 1 + difficultyButtons.length) % difficultyButtons.length;
      }
      difficultyButtons[nextIndex].focus();
    }
  });
});

themeButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (button.classList.contains('active')) return;
    themeButtons.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
      btn.tabIndex = -1;
    });
    button.classList.add('active');
    button.setAttribute('aria-checked', 'true');
    button.tabIndex = 0;
    currentTheme = button.dataset.theme;
    resetGame();
  });
  button.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const currentIndex = Array.from(themeButtons).indexOf(e.target);
      let nextIndex;
      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % themeButtons.length;
      } else {
        nextIndex = (currentIndex - 1 + themeButtons.length) % themeButtons.length;
      }
      themeButtons[nextIndex].focus();
    }
  });
});

tallyToggleBtn.addEventListener('click', () => {
  const isVisible = tallyBoard.classList.toggle('visible');
  tallyBoard.setAttribute('aria-hidden', !isVisible);
  tallyToggleBtn.setAttribute('aria-pressed', isVisible);
  if (isVisible) {
    tallyBoard.focus();
  }
});
tallyToggleBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    tallyToggleBtn.click();
  }
});

tallyCloseBtn.addEventListener('click', () => {
  tallyBoard.classList.remove('visible');
  tallyBoard.setAttribute('aria-hidden', 'true');
  tallyToggleBtn.setAttribute('aria-pressed', 'false');
  tallyToggleBtn.focus();
});
tallyCloseBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    tallyCloseBtn.click();
  }
});

hintBtn.addEventListener('click', showHint);
hintBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    showHint();
  }
});

playAgainBtn.addEventListener('click', () => {
  hideWinMessage();
  resetGame();
});
playAgainBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    hideWinMessage();
    resetGame();
  }
});

// Initialize tally and UI
loadTally();
updateTallyUI();

// Start with easy difficulty and numbers theme by default
startGame('easy');
