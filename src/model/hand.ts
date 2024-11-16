import { Deck, Card, Color, createInitialDeck, shuffleDeck, dealCard, addToBottom, getDeckSize, filterDeck, topCard } from "./deck";
import { Shuffler, standardShuffler } from "../utils/random_utils";

export interface HandProps {
  players: string[];
  dealer: number;
  shuffler?: Shuffler<Card>;
  cardsPerPlayer?: number;
  onEnd?: (event: { winner: number }) => void;
}

export interface HandState {
  players: string[];
  dealer: number;
  discardPile: Deck;
  drawPile: Deck;
  playerHands: Card[][];
  currentPlayerIndex: number;
  direction: 1 | -1;
  hasEnded: boolean;
  winner?: number;
  onEndCallbacks: ((event: { winner: number }) => void)[];
  unoSaid: Set<number>;
  lastPlayedCard?: Card;
}

export const createHand = (props: HandProps): HandState => {
  if (props.players.length < 2 || props.players.length > 10) {
    throw new Error("Invalid number of players");
  }

  const deck = shuffleDeck(createInitialDeck(), props.shuffler || standardShuffler);

  const initialState: HandState = {
    players: props.players,
    dealer: props.dealer,
    discardPile: [],
    drawPile: deck,
    playerHands: props.players.map(() => []),
    currentPlayerIndex: (props.dealer + 1) % props.players.length,
    direction: 1,
    hasEnded: false,
    winner: undefined,
    onEndCallbacks: props.onEnd ? [props.onEnd] : [],
    unoSaid: new Set(),
    lastPlayedCard: undefined,
  };

  const stateWithDealtCards = dealInitialCards(initialState, props.cardsPerPlayer || 7);
  return startGame(stateWithDealtCards);
};

export const dealInitialCards = (state: HandState, cardsPerPlayer: number): HandState => {
  let drawPile = state.drawPile;
  const playerHands: Card[][] = state.players.map(() => []);

  for (let i = 0; i < state.players.length; i++) {
    for (let j = 0; j < cardsPerPlayer; j++) {
      const [card, newDrawPile] = dealCard(drawPile);
      drawPile = newDrawPile;
      if (card) playerHands[i].push(card);
    }
  }

  return { ...state, playerHands, drawPile };
};

export const startGame = (state: HandState): HandState => {
  let { drawPile, discardPile, lastPlayedCard, direction, currentPlayerIndex } = state;
  let firstCard: Card | undefined;
  let needsReshuffle = true;

  while (needsReshuffle) {
    const [card, newDrawPile] = dealCard(drawPile);
    drawPile = newDrawPile;
    firstCard = card;
    if (!firstCard) break;

    if (firstCard.type === "WILD" || firstCard.type === "WILD DRAW") {
      drawPile = addToBottom(drawPile, firstCard);
      drawPile = shuffleDeck(drawPile);
    } else {
      needsReshuffle = false;
      discardPile = [firstCard];
      lastPlayedCard = firstCard;
    }
  }

  if (firstCard) {
    if (firstCard.type === "REVERSE") {
      direction = -1;
      currentPlayerIndex = (state.dealer - 1 + state.players.length) % state.players.length;
    } else if (firstCard.type === "SKIP") {
      currentPlayerIndex = nextTurn(state).currentPlayerIndex;
    } else if (firstCard.type === "DRAW") {
      const targetPlayer = currentPlayerIndex;
      state = drawCards(state, 2);
      currentPlayerIndex = targetPlayer;
      currentPlayerIndex = nextTurn(state).currentPlayerIndex;
    }
  }

  return { ...state, drawPile, discardPile, lastPlayedCard, direction, currentPlayerIndex };
};

export const draw = (state: HandState): HandState => {
  if (state.hasEnded) throw new Error("The hand has ended");

  let { drawPile, playerHands, currentPlayerIndex } = state;
  let [card, newDrawPile] = dealCard(drawPile);

  if (!card) {
    state = reshuffleDeck(state);
    drawPile = state.drawPile;
    [card, newDrawPile] = dealCard(drawPile);
  }

  if (card) {
    playerHands[currentPlayerIndex].push(card);
    if (!isValidPlay(state, card)) {
      state = nextTurn(state);
    }
  }

  return { ...state, drawPile: newDrawPile, playerHands };
};

export const play = (state: HandState, cardIndex: number, chosenColor?: Color): [HandState, Card] => {
  if (state.hasEnded) throw new Error("The hand has ended");

  const hand = state.playerHands[state.currentPlayerIndex];
  if (cardIndex < 0 || cardIndex >= hand.length) {
    throw new Error("Invalid card index");
  }

  const card = hand[cardIndex];
  if (!isValidPlay(state, card)) {
    throw new Error("Invalid play");
  }

  if ((card.type === "WILD" || card.type === "WILD DRAW") && !chosenColor) {
    throw new Error("Must choose a color for wild cards");
  }

  if (card.color && chosenColor) {
    throw new Error("Cannot choose color for non-wild cards");
  }

  hand.splice(cardIndex, 1);

  const playedCard = { ...card };
  if (chosenColor) {
    playedCard.color = chosenColor;
  }

  const discardPile = addToBottom(state.discardPile, playedCard);
  let hasEnded: boolean = state.hasEnded;
  let winner: number = state.winner || 0;
  let onEndCallbacks = state.onEndCallbacks;

  if (hand.length === 0) {
    hasEnded = true;
    winner = state.currentPlayerIndex;
    onEndCallbacks.forEach((callback) => callback({ winner }));
  } else {
    state = applyCardEffect(state, playedCard);
  }

  return [{ ...state, discardPile, lastPlayedCard: playedCard, hasEnded, winner }, playedCard];
};

export const isValidPlay = (state: HandState, card: Card): boolean => {
  if (!state.lastPlayedCard) return true;

  if (card.type === "WILD") return true;
  if (card.type === "WILD DRAW") {
    return !state.playerHands[state.currentPlayerIndex].some(
      (c) => c !== card && c.color === state.lastPlayedCard?.color
    );
  }

  if (card.color === state.lastPlayedCard.color || card.type === state.lastPlayedCard.type) {
    return true;
  }

  return card.type === "NUMBERED" && state.lastPlayedCard.type === "NUMBERED" && card.number === state.lastPlayedCard.number;
};

export const applyCardEffect = (state: HandState, card: Card): HandState => {
  let targetPlayer;

  switch (card.type) {
    case "SKIP":
      state = nextTurn(state);
      break;
    case "REVERSE":
      state.direction *= -1;
      if (state.players.length === 2) {
        state = nextTurn(state);
      }
      break;
    case "DRAW":
      targetPlayer = nextTurn(state).currentPlayerIndex;
      state = drawCards(state, 2);
      state.currentPlayerIndex = targetPlayer;
      state = nextTurn(state);
      break;
    case "WILD":
      break;
    case "WILD DRAW":
      targetPlayer = nextTurn(state).currentPlayerIndex;
      state = drawCards(state, 4);
      state.currentPlayerIndex = targetPlayer;
      state = nextTurn(state);
      break;
  }

  if (card.type !== "DRAW" && card.type !== "WILD DRAW") {
    state = nextTurn(state);
  }

  return state;
};

export const drawCards = (state: HandState, count: number): HandState => {
  let { drawPile, playerHands, currentPlayerIndex } = state;

  for (let i = 0; i < count; i++) {
    let [card, newDrawPile] = dealCard(drawPile);

    if (!card) {
      state = reshuffleDeck(state);
      drawPile = state.drawPile;
      [card, newDrawPile] = dealCard(drawPile);
    }

    if (card) {
      playerHands[currentPlayerIndex].push(card);
    }

    drawPile = newDrawPile;
  }

  return { ...state, drawPile, playerHands };
};

export const nextTurn = (state: HandState): HandState => {
  const currentPlayerIndex = (state.currentPlayerIndex + state.direction + state.players.length) % state.players.length;
  return { ...state, currentPlayerIndex };
};

export const reshuffleDeck = (state: HandState): HandState => {
  if (getDeckSize(state.discardPile) <= 1) return state;

  const [topCard, newDiscardPile] = dealCard(state.discardPile);
  let drawPile = state.drawPile;

  while (getDeckSize(newDiscardPile) > 0) {
    const [card, updatedDiscardPile] = dealCard(newDiscardPile);
    if (card) drawPile = addToBottom(drawPile, card);
  }

  drawPile = shuffleDeck(drawPile);

  if (topCard) {
    drawPile = addToBottom(drawPile, topCard);
  }

  return { ...state, drawPile };
};

export const sayUno = (state: HandState, playerIndex: number): HandState => {
  if (state.hasEnded) throw new Error("The hand has ended");
  if (playerIndex < 0 || playerIndex >= state.players.length) {
    throw new Error("Invalid player index");
  }
  const unoSaid = new Set(state.unoSaid).add(playerIndex);
  return { ...state, unoSaid };
};

export const catchUnoFailure = (state: HandState, { accuser, accused }: { accuser: number, accused: number }): [HandState, boolean] => {
  if (state.hasEnded) throw new Error("The hand has ended");
  if (accused < 0 || accused >= state.players.length) {
    throw new Error("Invalid accused player index");
  }

  if (state.unoSaid.has(accused)) return [state, false];

  if (state.playerHands[accused].length !== 1) return [state, false];

  const nextPlayer = (accused + state.direction + state.players.length) % state.players.length;
  if (state.currentPlayerIndex === nextPlayer) {
    const currentPlayer = state.currentPlayerIndex;
    state = drawCards(state, 4);
    state.currentPlayerIndex = currentPlayer;
    const unoSaid = new Set(state.unoSaid).add(accused);
    return [{ ...state, unoSaid }, true];
  }

  return [state, false];
};

export const hasEnded = (state: HandState): boolean => state.hasEnded;

export const winner = (state: HandState): number | undefined => state.winner;

export const score = (state: HandState): number | undefined => {
  if (!state.hasEnded) return undefined;
  return calculateScore(state);
};

export const calculateScore = (state: HandState): number => {
  let score = 0;
  for (let i = 0; i < state.players.length; i++) {
    if (i !== state.winner) {
      for (const card of state.playerHands[i]) {
        switch (card.type) {
          case "NUMBERED":
            score += card.number || 0;
            break;
          case "SKIP":
          case "REVERSE":
          case "DRAW":
            score += 20;
            break;
          case "WILD":
          case "WILD DRAW":
            score += 50;
            break;
        }
      }
    }
  }
  return score;
};

export const playerHand = (state: HandState, playerIndex: number): Card[] => {
  if (playerIndex < 0 || playerIndex >= state.players.length) {
    throw new Error("Invalid player index");
  }
  return state.playerHands[playerIndex];
};

export const canPlay = (state: HandState, cardIndex: number): boolean => {
  if (state.hasEnded) return false;
  if (cardIndex < 0 || cardIndex >= state.playerHands[state.currentPlayerIndex].length) {
    return false;
  }
  const card = state.playerHands[state.currentPlayerIndex][cardIndex];
  return isValidPlay(state, card);
};

export const canPlayAny = (state: HandState): boolean => {
  return state.playerHands[state.currentPlayerIndex].some((card) => isValidPlay(state, card));
};

export const playerCount = (state: HandState): number => state.players.length;

export const player = (state: HandState, index: number): string => {
  if (index < 0 || index >= state.players.length) {
    throw new Error("Player index out of bounds");
  }
  return state.players[index];
};

export const dealer = (state: HandState): number => state.dealer;

export const playerInTurn = (state: HandState): number | undefined => state.hasEnded ? undefined : state.currentPlayerIndex;

export const discardPile = (state: HandState): Deck => state.discardPile;

export const drawPile = (state: HandState): Deck => state.drawPile;

export const onEnd = (state: HandState, callback: (event: { winner: number }) => void): HandState => {
  const onEndCallbacks = [...state.onEndCallbacks, callback];
  return { ...state, onEndCallbacks };
};