import { dealCards } from "./hand";
import { Card, Deck, shuffle as shuffleDeck, createDeck, deal } from "./deck";
import {
  Randomizer,
  standardRandomizer,
  Shuffler,
  standardShuffler,
} from "../utils/random_utils";

interface GameState {
  hands: Card[][];
  deck: Deck;
  discardPile: Card[];
  currentPlayer: number;
  direction: 1 | -1; // 1 for clockwise, -1 for counterclockwise
  currentColor?: string; // Optional property for wild card color
}

const initializeGame = (playerCount: number): GameState => {
  if (playerCount < 2 || playerCount > 10) {
    throw new Error("Player count must be between 2 and 10");
  }

  const deck = shuffleDeck(createDeck());
  const [hands, remainingDeck] = dealCards(deck, playerCount);
  const [discardPile, newDeck] = deal(remainingDeck, 1);

  return {
    hands,
    deck: newDeck,
    discardPile,
    currentPlayer: 0,
    direction: 1,
  };
};

const play = (
  cardIndex: number,
  chosenColor: string | undefined,
  state: GameState
): GameState => {
  const currentHand = state.hands[state.currentPlayer];
  const card = currentHand[cardIndex];

  if (!card) throw new Error("Illegal play: card does not exist");

  if ((card.type === "WILD" || card.type === "WILD DRAW") && !chosenColor) {
    throw new Error("Illegal play: wild cards require a color choice");
  }

  // Remove the played card and update the player's hand
  const updatedHands = state.hands.map((hand, index) =>
    index === state.currentPlayer
      ? hand.filter((_, idx) => idx !== cardIndex)
      : hand
  );

  // Add the card to the discard pile
  const updatedDiscardPile = [...state.discardPile, card];

  // Determine the next player
  const nextPlayer =
    (state.currentPlayer + state.direction + state.hands.length) %
    state.hands.length;

  return {
    ...state,
    hands: updatedHands,
    discardPile: updatedDiscardPile,
    currentPlayer: nextPlayer,
    direction: state.direction,
    currentColor: chosenColor || card.color,
  };
};

// Consolidated Export
export { initializeGame, play, GameState };
