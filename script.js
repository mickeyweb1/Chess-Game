// ==========================================
// THEME TOGGLE
// ==========================================
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');
themeToggle.addEventListener('click', () => {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  themeLabel.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
});

// ==========================================
// GAME STATE
// ==========================================
const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Piece-square tables for positional evaluation
const PST = {
  P: [
    [0,0,0,0,0,0,0,0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [5,5,10,25,25,10,5,5],
    [0,0,0,20,20,0,0,0],
    [5,-5,-10,0,0,-10,-5,5],
    [5,10,10,-20,-20,10,10,5],
    [0,0,0,0,0,0,0,0]
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,0,0,0,-20,-40],
    [-30,0,10,15,15,10,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,10,15,15,10,5,-30],
    [-40,-20,0,5,5,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,5,0,0,0,0,5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  R: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,10,10,10,10,5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [0,0,0,5,5,0,0,0]
  ],
  Q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,0,0,0,0,0,-10],
    [-10,0,5,5,5,5,0,-10],
    [-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],
    [-10,5,5,5,5,5,0,-10],
    [-10,0,5,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20]
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],
    [20,30,10,0,0,10,30,20]
  ]
};

let board = [];
let currentTurn = 'w';
let selectedSquare = null;
let validMoves = [];
let capturedWhite = [];
let capturedBlack = [];
let moveHistory = [];
let isFlipped = false;
let lastMove = null;
let gameMode = 'ai'; // 'ai' or 'pvp'
let difficulty = 'medium';
let aiColor = 'b';
let isAiThinking = false;
let gameOver = false;

// ==========================================
// BOARD INITIALIZATION
// ==========================================
function initBoard() {
  board = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
  ];
  currentTurn = 'w';
  selectedSquare = null;
  validMoves = [];
  capturedWhite = [];
  capturedBlack = [];
  moveHistory = [];
  lastMove = null;
  isAiThinking = false;
  gameOver = false;
  hideStatus();
  renderBoard();
  updateUI();
}

// ==========================================
// RENDERING
// ==========================================
function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const humanIsWhite = (gameMode === 'pvp') || (aiColor === 'b');
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const dispR = isFlipped ? 7 - r : r;
      const dispC = isFlipped ? 7 - c : c;
      
      const sq = document.createElement('div');
      sq.className = `square ${(dispR + dispC) % 2 === 0 ? 'light' : 'dark'}`;
      sq.dataset.r = dispR;
      sq.dataset.c = dispC;

      // Disable clicks during AI turn or game over
      const isHumanTurn = (gameMode === 'pvp') || (currentTurn !== aiColor);
      if (isAiThinking || gameOver || !isHumanTurn) {
        sq.classList.add('disabled');
      }

      if (c === 0) {
        const rank = document.createElement('span');
        rank.className = 'coord coord-rank';
        rank.textContent = 8 - dispR;
        sq.appendChild(rank);
      }
      if (r === 7) {
        const file = document.createElement('span');
        file.className = 'coord coord-file';
        file.textContent = files[dispC];
        sq.appendChild(file);
      }

      if (selectedSquare && selectedSquare.r === dispR && selectedSquare.c === dispC) {
        sq.classList.add('selected');
      }
      if (lastMove && ((lastMove.fromR === dispR && lastMove.fromC === dispC) || (lastMove.toR === dispR && lastMove.toC === dispC))) {
        sq.classList.add('last-move');
      }

      const move = validMoves.find(m => m.r === dispR && m.c === dispC);
      if (move) {
        sq.classList.add(board[dispR][dispC] ? 'capture-move' : 'valid-move');
      }

      const piece = board[dispR][dispC];
      if (piece) {
        const pieceEl = document.createElement('span');
        pieceEl.textContent = PIECES[piece];
        pieceEl.className = piece[0] === 'w' ? 'piece-white' : 'piece-black';
        sq.appendChild(pieceEl);
      }

      sq.addEventListener('click', () => handleSquareClick(dispR, dispC));
      boardEl.appendChild(sq);
    }
  }
}

// ==========================================
// USER INTERACTION
// ==========================================
function handleSquareClick(r, c) {
  if (gameOver || isAiThinking) return;
  if (gameMode === 'ai' && currentTurn === aiColor) return;

  const piece = board[r][c];

  if (selectedSquare) {
    const move = validMoves.find(m => m.r === r && m.c === c);
    if (move) {
      makeMove(selectedSquare.r, selectedSquare.c, r, c);
      selectedSquare = null;
      validMoves = [];
      renderBoard();
      afterMove();
      return;
    }
    if (piece && piece[0] === currentTurn) {
      selectedSquare = { r, c };
      validMoves = getValidMoves(r, c);
      renderBoard();
      return;
    }
    selectedSquare = null;
    validMoves = [];
    renderBoard();
    return;
  }

  if (piece && piece[0] === currentTurn) {
    selectedSquare = { r, c };
    validMoves = getValidMoves(r, c);
    renderBoard();
  }
}

function afterMove() {
  if (checkGameOver()) return;
  if (gameMode === 'ai' && currentTurn === aiColor) {
    triggerAiMove();
  }
}

// ==========================================
// MOVE LOGIC
// ==========================================
function makeMove(fromR, fromC, toR, toC, boardState = board) {
  const piece = boardState[fromR][fromC];
  const captured = boardState[toR][toC];
  
  if (captured) {
    if (boardState === board) {
      if (captured[0] === 'w') capturedBlack.push(PIECES[captured]);
      else capturedWhite.push(PIECES[captured]);
    }
  }

  boardState[toR][toC] = piece;
  boardState[fromR][fromC] = null;

  if (piece === 'wP' && toR === 0) boardState[toR][toC] = 'wQ';
  if (piece === 'bP' && toR === 7) boardState[toR][toC] = 'bQ';

  if (boardState === board) {
    lastMove = { fromR, fromC, toR, toC };
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    moveHistory.push(`${PIECES[piece]} ${files[fromC]}${8-fromR} → ${files[toC]}${8-toR}${captured ? ' (x)' : ''}`);
    currentTurn = currentTurn === 'w' ? 'b' : 'w';
    updateUI();
  }
}

function getValidMoves(r, c, boardState = board) {
  const piece = boardState[r][c];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  const moves = [];

  const addMove = (tr, tc) => {
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
    const target = boardState[tr][tc];
    if (!target) { moves.push({ r: tr, c: tc }); return true; }
    if (target[0] !== color) { moves.push({ r: tr, c: tc }); return false; }
    return false;
  };

  const addSlide = (dr, dc) => {
    for (let i = 1; i < 8; i++) {
      if (!addMove(r + dr * i, c + dc * i)) break;
      if (boardState[r + dr * i][c + dc * i]) break;
    }
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (r + dir >= 0 && r + dir <= 7 && !boardState[r + dir][c]) {
      moves.push({ r: r + dir, c });
      if (r === startRow && !boardState[r + 2 * dir][c]) moves.push({ r: r + 2 * dir, c });
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir, tc = c + dc;
      if (tc >= 0 && tc <= 7 && tr >= 0 && tr <= 7 && boardState[tr][tc] && boardState[tr][tc][0] !== color) {
        moves.push({ r: tr, c: tc });
      }
    }
  } 
  else if (type === 'R') { [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => addSlide(dr,dc)); }
  else if (type === 'B') { [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => addSlide(dr,dc)); }
  else if (type === 'Q') { [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => addSlide(dr,dc)); }
  else if (type === 'N') { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => addMove(r+dr, c+dc)); }
  else if (type === 'K') { [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => addMove(r+dr, c+dc)); }

  return moves;
}

function getAllMoves(color, boardState = board) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = boardState[r][c];
      if (piece && piece[0] === color) {
        const pieceMoves = getValidMoves(r, c, boardState);
        pieceMoves.forEach(m => moves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c }));
      }
    }
  }
  return moves;
}

// ==========================================
// GAME OVER DETECTION
// ==========================================
function checkGameOver() {
  const moves = getAllMoves(currentTurn);
  if (moves.length === 0) {
    gameOver = true;
    const winner = currentTurn === 'w' ? 'Black' : 'White';
    showStatus(`Checkmate! ${winner} wins!`, currentTurn === aiColor ? 'win' : 'lose');
    renderBoard();
    return true;
  }
  return false;
}

function showStatus(text, type = '') {
  const banner = document.getElementById('statusBanner');
  banner.textContent = text;
  banner.className = 'status-banner show ' + type;
}
function hideStatus() {
  document.getElementById('statusBanner').className = 'status-banner';
}

// ==========================================
// AI ENGINE
// ==========================================
function evaluateBoard(boardState) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = boardState[r][c];
      if (!piece) continue;
      const color = piece[0];
      const type = piece[1];
      const value = PIECE_VALUES[type];
      // PST is from white's perspective; flip for black
      const pstRow = color === 'w' ? r : 7 - r;
      const positional = PST[type] ? PST[type][pstRow][c] : 0;
      const total = value + positional;
      score += color === 'w' ? total : -total;
    }
  }
  return score;
}

function cloneBoard(b) {
  return b.map(row => row.slice());
}

function simulateMove(boardState, move) {
  const newBoard = cloneBoard(boardState);
  const piece = newBoard[move.fromR][move.fromC];
  newBoard[move.toR][move.toC] = piece;
  newBoard[move.fromR][move.fromC] = null;
  if (piece === 'wP' && move.toR === 0) newBoard[move.toR][move.toC] = 'wQ';
  if (piece === 'bP' && move.toR === 7) newBoard[move.toR][move.toC] = 'bQ';
  return newBoard;
}

function minimax(boardState, depth, alpha, beta, maximizing) {
  if (depth === 0) return evaluateBoard(boardState);
  
  const color = maximizing ? 'w' : 'b';
  const moves = getAllMovesForColor(color, boardState);
  
  if (moves.length === 0) {
    // Crude checkmate/stalemate detection
    return maximizing ? -99999 : 99999;
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(boardState, move);
      const eval_ = minimax(newBoard, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(boardState, move);
      const eval_ = minimax(newBoard, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getAllMovesForColor(color, boardState) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = boardState[r][c];
      if (piece && piece[0] === color) {
        const pieceMoves = getValidMoves(r, c, boardState);
        pieceMoves.forEach(m => moves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c }));
      }
    }
  }
  return moves;
}

function getBestMove() {
  const moves = getAllMoves(aiColor);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    // Random move with slight preference for captures
    const captures = moves.filter(m => board[m.toR][m.toC]);
    if (captures.length > 0 && Math.random() < 0.6) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === 'medium' ? 2 : 3;
  const isMaximizing = aiColor === 'w';
  let bestMove = null;
  let bestEval = isMaximizing ? -Infinity : Infinity;

  // Shuffle moves for variety
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffled) {
    const newBoard = simulateMove(board, move);
    const eval_ = minimax(newBoard, depth - 1, -Infinity, Infinity, !isMaximizing);
    
    if (isMaximizing) {
      if (eval_ > bestEval) { bestEval = eval_; bestMove = move; }
    } else {
      if (eval_ < bestEval) { bestEval = eval_; bestMove = move; }
    }
  }

  return bestMove || moves[0];
}

function triggerAiMove() {
  isAiThinking = true;
  document.getElementById('thinking').classList.add('show');
  renderBoard();

  const delay = difficulty === 'easy' ? 500 : difficulty === 'medium' ? 700 : 900;
  
  setTimeout(() => {
    const move = getBestMove();
    if (move) {
      makeMove(move.fromR, move.fromC, move.toR, move.toC);
    }
    isAiThinking = false;
    document.getElementById('thinking').classList.remove('show');
    renderBoard();
    checkGameOver();
  }, delay);
}

// ==========================================
// UI UPDATES
// ==========================================
function updateUI() {
  const turnText = document.getElementById('turnText');
  if (gameMode === 'ai') {
    turnText.textContent = currentTurn === aiColor ? 'AI is thinking...' : (aiColor === 'b' ? 'Your turn (White)' : 'Your turn (Black)');
  } else {
    turnText.textContent = currentTurn === 'w' ? 'White to move' : 'Black to move';
  }
  document.getElementById('dotWhite').classList.toggle('active', currentTurn === 'w');
  document.getElementById('dotBlack').classList.toggle('active', currentTurn === 'b');
  
  document.getElementById('capturedWhite').innerHTML = capturedWhite.map(p => `<span>${p}</span>`).join('');
  document.getElementById('capturedBlack').innerHTML = capturedBlack.map(p => `<span>${p}</span>`).join('');
  
  const histEl = document.getElementById('moveHistory');
  histEl.innerHTML = moveHistory.length ? moveHistory.map((m, i) => `${Math.floor(i/2) + 1}${i%2===0?'.':'..'} ${m}`).join('<br>') : 'Game started. White moves first.';
  histEl.scrollTop = histEl.scrollHeight;
}

// ==========================================
// EVENT LISTENERS
// ==========================================
document.getElementById('resetBtn').addEventListener('click', initBoard);
document.getElementById('flipBtn').addEventListener('click', () => {
  isFlipped = !isFlipped;
  renderBoard();
});

document.getElementById('modeSelect').addEventListener('change', (e) => {
  gameMode = e.target.value;
  document.getElementById('diffSelect').disabled = gameMode === 'pvp';
  initBoard();
});

document.getElementById('diffSelect').addEventListener('change', (e) => {
  difficulty = e.target.value;
  initBoard();
});

// Start Game
initBoard();