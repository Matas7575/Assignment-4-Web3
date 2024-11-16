import {
  Randomizer,
  Shuffler,
  standardShuffler,
} from "../../src/utils/random_utils";
import { Deck, shuffle as shuffleDeck, createDeck } from "../../src/model/deck";
import { dealCards } from "../../src/model/hand";
import { initializeGame, GameState } from "../../src/model/uno";

export function createInitialDeck() {
  return createDeck();
}

export type HandProps = {
  players: string[];
  dealer: number;
  shuffler?: (deck: Deck) => Deck;
  cardsPerPlayer?: number;
};

export function createHand({
  players,
  dealer,
  shuffler = shuffleDeck,
  cardsPerPlayer = 7,
}: HandProps): GameState {
  const deck = shuffler(createDeck());
  const [hands, remainingDeck] = dealCards(deck, players.length);
  const discardPile = [remainingDeck.pop()!];

  return {
    deck: remainingDeck,
    hands,
    discardPile,
    currentPlayer: (dealer + 1) % players.length,
    direction: 1,
  };
}

export function createGame(props: { playerCount?: number }): GameState {
  const playerCount = props.playerCount ?? 2; // Default to 2 players
  return initializeGame(playerCount);
}
