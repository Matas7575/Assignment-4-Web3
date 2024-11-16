import { Deck, Card, deal, createDeck } from "./deck";
import { Shuffler, standardShuffler } from "../utils/random_utils";

export interface HandState {
  players: string[];
  hands: Card[][];
  drawPile: Deck;
  discardPile: Deck;
  currentColor?: string;
  playerInTurn: number;
}

export const dealCards = (
  deck: Deck,
  playerCount: number
): [Card[][], Deck] => {
  const hands: Card[][] = [];
  let remainingDeck = [...deck];
  for (let i = 0; i < playerCount; i++) {
    const [hand, newDeck] = deal(remainingDeck, 7);
    hands.push(hand);
    remainingDeck = newDeck;
  }
  return [hands, remainingDeck];
};

export const createHand = ({
  players,
  dealer,
  shuffler,
}: {
  players: string[];
  dealer: number;
  shuffler: (deck: Deck) => Deck;
}): HandState => {
  if (players.length < 2 || players.length > 10) {
    throw new Error("Invalid number of players");
  }

  let deck = shuffler([...createDeck()]);

  const [hands, remainingDeck] = dealCards(deck, players.length);
  const [discard, drawPile] = deal(remainingDeck, 1);

  return {
    players,
    hands,
    drawPile,
    discardPile: discard,
    playerInTurn: (dealer + 1) % players.length,
    currentColor: discard[0]?.color,
  };
};
