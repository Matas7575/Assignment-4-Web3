import type { Card, Color } from "./deck";
import type { Hand } from "./hand";
import { createHand, score as handScore } from "./hand";
import type { Randomizer, Shuffler } from "../utils/random_utils";
import { standardRandomizer, standardShuffler } from "../utils/random_utils";

export interface Props {
  players?: string[];
  targetScore?: number;
  randomizer?: Randomizer;
  shuffler?: Shuffler<Card>;
  cardsPerPlayer?: number;
}

export interface Game {
  playerCount: number;
  players: string[];
  scores: number[];
  targetScore: number;
  currentHand?: Hand;
  winner?: number;
}

export function createGame({
  players = ["A", "B"],
  targetScore = 500,
  randomizer = standardRandomizer,
  shuffler = standardShuffler,
  cardsPerPlayer = 7
}: Props = {}): Game {
  if (players.length < 2) {
    throw new Error("At least 2 players required");
  }
  if (targetScore <= 0) {
    throw new Error("Target score must be positive");
  }

  const dealer = randomizer(players.length);
  
  return {
    playerCount: players.length,
    players,
    scores: new Array(players.length).fill(0),
    targetScore,
    currentHand: createHand(players, dealer, shuffler, cardsPerPlayer)
  };
}

export function play(action: (h: Hand) => Hand, game: Game): Game {
  if (!game.currentHand) {
    throw new Error("Game is over");
  }

  const hand = action(game.currentHand);
  const score = handScore(hand);

  if (score === undefined) {
    return {
      ...game,
      currentHand: hand
    };
  }

  const newScores = [...game.scores];
  const winner = hand.hands.findIndex((h: Card[]) => h.length === 0);
  if (winner !== -1) {
    newScores[winner] += score;
  }

  const gameWinner = newScores.findIndex(s => s >= game.targetScore);
  const nextDealer = (hand.dealer + 1) % game.playerCount;

  return {
    ...game,
    scores: newScores,
    currentHand: gameWinner === -1 ? createHand(game.players, nextDealer) : undefined,
    winner: gameWinner === -1 ? undefined : gameWinner
  };
}