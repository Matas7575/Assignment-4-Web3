import { HandState, createHand, score as handScore } from './handState';
import { Card, Color } from './deck';
import { Randomizer, standardRandomizer, Shuffler, standardShuffler } from '../utils/random_utils';

export interface Game {
  players: string[];
  playerCount: number;
  player(index: number): string;
  targetScore: number;
  score(playerIndex: number): number;
  winner(): number | undefined;
  currentHand(): HandState | undefined;
  randomizer: Randomizer;
}

export interface GameState {
  players: string[];
  scores: number[];
  targetScore: number;
  currentHand?: HandState;
  randomizer: Randomizer;
  shuffler: Shuffler<Card>;
  cardsPerPlayer: number;
}

export function createGame(props: {
  players?: string[],
  targetScore?: number,
  randomizer?: Randomizer,
  shuffler?: Shuffler<Card>,
  cardsPerPlayer?: number
}): GameState {
  const players = props.players || ['A', 'B'];
  if (players.length < 2) {
    throw new Error("At least 2 players are required");
  }
  const targetScore = props.targetScore || 500;
  if (targetScore <= 0) {
    throw new Error("Target score must be greater than 0");
  }
  const scores = new Array(players.length).fill(0);
  const randomizer = props.randomizer || standardRandomizer;
  const shuffler = props.shuffler || standardShuffler;
  const cardsPerPlayer = props.cardsPerPlayer || 7;

  const initialState: GameState = {
    players,
    scores,
    targetScore,
    randomizer,
    shuffler,
    cardsPerPlayer,
  };

  return startNewHand(initialState);
}

export function startNewHand(state: GameState): GameState {
  if (winner(state) === undefined) {
    const dealer = state.randomizer(state.players.length);
    const currentHand = createHand({
      players: state.players,
      dealer,
      shuffler: state.shuffler,
      cardsPerPlayer: state.cardsPerPlayer,
      onEnd: (event: { winner: number }) => handleHandEnd(state, event)
    });
    return { ...state, currentHand };
  } else {
    return { ...state, currentHand: undefined };
  }
}

export function handleHandEnd(state: GameState, event: { winner: number }): GameState {
  const handScoreValue = handScore(state.currentHand!)!;
  const scores = [...state.scores];
  scores[event.winner] += handScoreValue;
  return startNewHand({ ...state, scores });
}

export function playerCount(state: GameState): number {
  return state.players.length;
}

export function player(state: GameState, index: number): string {
  if (index < 0 || index >= state.players.length) {
    throw new Error("Player index out of bounds");
  }
  return state.players[index];
}

export function targetScore(state: GameState): number {
  return state.targetScore;
}

export function score(state: GameState, playerIndex: number): number {
  return state.scores[playerIndex];
}

export function winner(state: GameState): number | undefined {
  const winnerIndex = state.scores.findIndex(score => score >= state.targetScore);
  return winnerIndex >= 0 ? winnerIndex : undefined;
}

export function currentHand(state: GameState): HandState | undefined {
  return state.currentHand;
}