import type { Card, Color } from "./deck";
import type { Hand } from "./hand";
import { createHand, score as handScore } from "./hand";
import type { Randomizer, Shuffler } from "../utils/random_utils";
import { standardRandomizer, standardShuffler } from "../utils/random_utils";

/**
 * Properties for creating a new game.
 * 
 * @interface Props
 * @property {string[]} [players] - The names of the players.
 * @property {number} [targetScore] - The target score to win the game.
 * @property {Randomizer} [randomizer] - The randomizer function to select the dealer.
 * @property {Shuffler<Card>} [shuffler] - The shuffler function to shuffle the cards.
 * @property {number} [cardsPerPlayer] - The number of cards dealt to each player.
 * @category Types
 */
export interface Props {
  players?: string[];
  targetScore?: number;
  randomizer?: Randomizer;
  shuffler?: Shuffler<Card>;
  cardsPerPlayer?: number;
}

/**
 * Represents the state of the game.
 * 
 * @interface Game
 * @property {number} playerCount - The number of players in the game.
 * @property {string[]} players - The names of the players.
 * @property {number[]} scores - The scores of the players.
 * @property {number} targetScore - The target score to win the game.
 * @property {Hand} [currentHand] - The current hand being played.
 * @property {number} [winner] - The index of the winning player, if any.
 * @category Types
 */
export interface Game {
  playerCount: number;
  players: string[];
  scores: number[];
  targetScore: number;
  currentHand?: Hand;
  winner?: number;
}

/**
 * Creates a new game.
 * 
 * @param {Props} [props={}] - The properties for creating the game.
 * @returns {Game} The initial state of the game.
 * @throws {Error} If the number of players is less than 2 or the target score is not positive.
 * @category Functions
 * @example
 * const game = createGame({ players: ['Alice', 'Bob'], targetScore: 200 });
 */
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

/**
 * Plays an action in the game.
 * 
 * @param {(h: Hand) => Hand} action - The action to perform on the current hand.
 * @param {Game} game - The current state of the game.
 * @returns {Game} The new state of the game after the action is performed.
 * @throws {Error} If the game is over.
 * @category Functions
 * @example
 * const newGame = play(hand => draw(hand), game);
 */
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