import {
  Randomizer,
  Shuffler,
  standardShuffler,
} from "../../src/utils/random_utils";
import * as deck from "../../src/model/deck";
import * as hand from "../../src/model/hand";
import * as uno from "../../src/model/uno";

export function createInitialDeck(): deck.Deck {
  return deck.createInitialDeck();
}

export type HandProps = {
  players: string[];
  dealer: number;
  shuffler?: Shuffler<deck.Card>;
  cardsPerPlayer?: number;
};

export function createHand({
  players,
  dealer,
  shuffler = standardShuffler,
  cardsPerPlayer = 7,
}: HandProps): hand.HandState {
  return hand.createHand({
    players,
    dealer,
    shuffler,
    cardsPerPlayer,
    onEnd: () => {},
  });
}

export function createGame(props: Partial<uno.Game>): uno.Game {
  const gameState = uno.createGame(props);
  return {
    ...gameState,
    playerCount: gameState.playerCount || 0,
    player: gameState.player || [],
    score: gameState.score || 0,
    winner: gameState.winner || null,
  };
}