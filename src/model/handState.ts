import {
  Deck,
  Card,
  Color,
  createInitialDeck,
  shuffleDeck,
  dealCard,
  addToBottom,
  getDeckSize,
  toDeck
} from "./deck";
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
  lastPlayedCard?: Card; // Make this optional to match the actual usage
}

export const createHand = (props: HandProps): HandState => {
  if (props.players.length < 2 || props.players.length > 10) {
    throw new Error("Invalid number of players");
  }

  const initialState: HandState = {
    players: props.players,
    dealer: props.dealer,
    discardPile: toDeck([]),  // Use toDeck here
    drawPile: shuffleDeck(createInitialDeck(), props.shuffler || standardShuffler),
    playerHands: props.players.map(() => []),
    currentPlayerIndex: (props.dealer + 1) % props.players.length,
    direction: 1,
    hasEnded: false,
    winner: undefined,
    onEndCallbacks: props.onEnd ? [props.onEnd] : [],
    unoSaid: new Set(),
    lastPlayedCard: undefined,
  };

  return startGame(dealInitialCards(initialState, props.cardsPerPlayer || 7));
};

export const dealInitialCards = (
  state: HandState,
  cardsPerPlayer: number
): HandState => {
  const dealCards = (state: HandState, playerIndex: number): HandState => {
    const [card, newDrawPile] = dealCard(state.drawPile);
    if (!card) return state;

    const newPlayerHands = [...state.playerHands];
    newPlayerHands[playerIndex] = [...newPlayerHands[playerIndex], card];

    return {
      ...state,
      drawPile: newDrawPile,
      playerHands: newPlayerHands,
    };
  };

  return Array(cardsPerPlayer)
    .fill(0)
    .reduce(
      (currentState, _) =>
        state.players.reduce(
          (accState, _, playerIndex) => dealCards(accState, playerIndex),
          currentState
        ),
      state
    );
};

export const startGame = (state: HandState): HandState => {
  const drawFirstCard = (state: HandState): [Card | undefined, HandState] => {
    const [card, newDrawPile] = dealCard(state.drawPile);
    return [card, { ...state, drawPile: newDrawPile }];
  };

  const handleWildCard = (state: HandState, card: Card): HandState => ({
    ...state,
    drawPile: shuffleDeck(addToBottom(state.drawPile, card)),
  });

  const handleNormalCard = (state: HandState, card: Card): HandState => {
    let newState: HandState = {
      ...state,
      discardPile: toDeck([card]),
      lastPlayedCard: card
    };

    if (card.type === "REVERSE") {
      newState = {
        ...newState,
        direction: -1 as const,
        currentPlayerIndex:
          (state.dealer - 1 + state.players.length) % state.players.length,
      };
    } else if (card.type === "SKIP") {
      newState = nextTurn(newState);
    } else if (card.type === "DRAW") {
      const targetPlayer = newState.currentPlayerIndex;
      newState = drawCards(newState, 2);
      newState = { ...newState, currentPlayerIndex: targetPlayer };
      newState = nextTurn(newState);
    }

    return newState;
  };

  let currentState: HandState = state;
  let needsReshuffle = true;

  while (needsReshuffle) {
    const [card, stateAfterDraw] = drawFirstCard(currentState);
    currentState = stateAfterDraw;

    if (!card) break;

    if (card.type === "WILD" || card.type === "WILD DRAW") {
      currentState = handleWildCard(currentState, card);
    } else {
      needsReshuffle = false;
      currentState = handleNormalCard(currentState, card);
    }
  }

  return currentState;
};

export const isValidPlay = (state: HandState, card: Card): boolean => {
  if (!state.lastPlayedCard) return true;

  if (card.type === "WILD") return true;

  if (card.type === "WILD DRAW") {
    return !state.playerHands[state.currentPlayerIndex].some(
      (c) => c !== card && c.color === state.lastPlayedCard?.color
    );
  }

  return (
    card.color === state.lastPlayedCard.color ||
    card.type === state.lastPlayedCard.type ||
    (card.type === "NUMBERED" &&
      state.lastPlayedCard.type === "NUMBERED" &&
      card.number === state.lastPlayedCard.number)
  );
};

export const play = (
  state: HandState,
  cardIndex: number,
  chosenColor?: Color
): [HandState, Card] => {
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

  const playedCard = chosenColor ? { ...card, color: chosenColor } : card;
  const newPlayerHands = [...state.playerHands];
  newPlayerHands[state.currentPlayerIndex] = [
    ...hand.slice(0, cardIndex),
    ...hand.slice(cardIndex + 1)
  ];

  let newState: HandState = {
    ...state,
    playerHands: newPlayerHands,
    discardPile: addToBottom(state.discardPile, playedCard),
    lastPlayedCard: playedCard
  };

  if (newPlayerHands[state.currentPlayerIndex].length === 0) {
    newState = {
      ...newState,
      hasEnded: true,
      winner: state.currentPlayerIndex,
    };
    newState.onEndCallbacks.forEach((callback) =>
      callback({ winner: state.currentPlayerIndex })
    );
  } else {
    newState = applyCardEffect(newState, playedCard);
  }

  return [newState, playedCard];
};

export const draw = (state: HandState): HandState => {
  if (state.hasEnded) throw new Error("The hand has ended");

  let [card, newDrawPile] = dealCard(state.drawPile);
  let currentState = { ...state, drawPile: newDrawPile };

  if (!card) {
    currentState = reshuffleDeck(currentState);
    [card, newDrawPile] = dealCard(currentState.drawPile);
    currentState = { ...currentState, drawPile: newDrawPile };
  }

  if (card) {
    const newPlayerHands = [...currentState.playerHands];
    newPlayerHands[currentState.currentPlayerIndex] = [
      ...newPlayerHands[currentState.currentPlayerIndex],
      card,
    ];

    currentState = {
      ...currentState,
      playerHands: newPlayerHands,
    };

    if (!isValidPlay(currentState, card)) {
      currentState = nextTurn(currentState);
    }
  }

  return currentState;
};

export const applyCardEffect = (state: HandState, card: Card): HandState => {
  let currentState: HandState = { ...state, lastPlayedCard: card };
  let targetPlayer;

  switch (card.type) {
    case "SKIP":
      currentState = nextTurn(currentState);
      break;
    case "REVERSE":
      currentState = {
        ...currentState,
        direction: (currentState.direction * -1) as 1 | -1,
      };
      if (currentState.players.length === 2) {
        currentState = nextTurn(currentState);
      }
      break;
    case "DRAW":
    case "WILD DRAW":
      targetPlayer = nextTurn(currentState).currentPlayerIndex;
      currentState = drawCards(currentState, card.type === "DRAW" ? 2 : 4);
      currentState = { ...currentState, currentPlayerIndex: targetPlayer };
      currentState = nextTurn(currentState);
      break;
  }

  if (!["DRAW", "WILD DRAW"].includes(card.type)) {
    currentState = nextTurn(currentState);
  }

  return currentState;
};

export const drawCards = (state: HandState, count: number): HandState => {
  return Array(count)
    .fill(0)
    .reduce((currentState) => {
      let [card, newDrawPile] = dealCard(currentState.drawPile);
      let newState = { ...currentState, drawPile: newDrawPile };

      if (!card) {
        newState = reshuffleDeck(newState);
        [card, newDrawPile] = dealCard(newState.drawPile);
        newState = { ...newState, drawPile: newDrawPile };
      }

      if (card) {
        const newPlayerHands = [...newState.playerHands];
        newPlayerHands[newState.currentPlayerIndex] = [
          ...newPlayerHands[newState.currentPlayerIndex],
          card,
        ];
        newState = { ...newState, playerHands: newPlayerHands };
      }

      return newState;
    }, state);
};

export const nextTurn = (state: HandState): HandState => ({
  ...state,
  currentPlayerIndex:
    (state.currentPlayerIndex + state.direction + state.players.length) %
    state.players.length,
});

export const reshuffleDeck = (state: HandState): HandState => {
  if (getDeckSize(state.discardPile) <= 1) return state;

  const [topCard, ...restCards] = [...state.discardPile].reverse();
  const newDrawPile = shuffleDeck(restCards);

  return {
    ...state,
    drawPile: topCard ? addToBottom(newDrawPile, topCard) : newDrawPile,
    discardPile: topCard ? toDeck([topCard]) : toDeck([])
  };
};

export const sayUno = (state: HandState, playerIndex: number): HandState => {
  if (state.hasEnded) throw new Error("The hand has ended");
  if (playerIndex < 0 || playerIndex >= state.players.length) {
    throw new Error("Invalid player index");
  }

  return {
    ...state,
    unoSaid: new Set([...state.unoSaid, playerIndex]),
  };
};

export const catchUnoFailure = (
  state: HandState,
  { accuser, accused }: { accuser: number; accused: number }
): [HandState, boolean] => {
  if (state.hasEnded) throw new Error("The hand has ended");
  if (accused < 0 || accused >= state.players.length) {
    throw new Error("Invalid accused player index");
  }

  if (state.unoSaid.has(accused) || state.playerHands[accused].length !== 1) {
    return [state, false];
  }

  const nextPlayer =
    (accused + state.direction + state.players.length) % state.players.length;
  if (state.currentPlayerIndex === nextPlayer) {
    const currentPlayer = state.currentPlayerIndex;
    let newState = drawCards(state, 4);
    newState = {
      ...newState,
      currentPlayerIndex: currentPlayer,
      unoSaid: new Set([...newState.unoSaid, accused]),
    };
    return [newState, true];
  }

  return [state, false];
};

// Utility functions
export const hasEnded = (state: HandState): boolean => state.hasEnded;
export const winner = (state: HandState): number | undefined => state.winner;
export const score = (state: HandState): number | undefined =>
  state.hasEnded ? calculateScore(state) : undefined;
export const playerCount = (state: HandState): number => state.players.length;
export const player = (state: HandState, index: number): string => {
  if (index < 0 || index >= state.players.length) {
    throw new Error("Player index out of bounds");
  }
  return state.players[index];
};
export const dealer = (state: HandState): number => state.dealer;
export const playerInTurn = (state: HandState): number | undefined =>
  state.hasEnded ? undefined : state.currentPlayerIndex;
export const discardPile = (state: HandState): Deck => state.discardPile;
export const drawPile = (state: HandState): Deck => state.drawPile;
export const playerHand = (state: HandState, playerIndex: number): Card[] => {
  if (playerIndex < 0 || playerIndex >= state.players.length) {
    throw new Error("Invalid player index");
  }
  return state.playerHands[playerIndex];
};
export const canPlay = (state: HandState, cardIndex: number): boolean => {
  if (state.hasEnded) return false;
  const hand = state.playerHands[state.currentPlayerIndex];
  if (cardIndex < 0 || cardIndex >= hand.length) return false;
  return isValidPlay(state, hand[cardIndex]);
};
export const canPlayAny = (state: HandState): boolean =>
  state.playerHands[state.currentPlayerIndex].some((card) =>
    isValidPlay(state, card)
  );

export const onEnd = (
  state: HandState,
  callback: (event: { winner: number }) => void
): HandState => ({
  ...state,
  onEndCallbacks: [...state.onEndCallbacks, callback],
});

const calculateScore = (state: HandState): number => {
  if (!state.hasEnded || state.winner === undefined) return 0;

  return state.playerHands.reduce((total, hand, playerIndex) => {
    if (playerIndex === state.winner) return total;

    return (
      total +
      hand.reduce((cardTotal, card) => {
        switch (card.type) {
          case "NUMBERED":
            return cardTotal + (card.number || 0);
          case "SKIP":
          case "REVERSE":
          case "DRAW":
            return cardTotal + 20;
          case "WILD":
          case "WILD DRAW":
            return cardTotal + 50;
          default:
            return cardTotal;
        }
      }, 0)
    );
  }, 0);
};
