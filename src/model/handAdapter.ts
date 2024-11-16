import * as HandFunctions from './handState';
import { Card, Color, Deck } from './deck';
import { Shuffler } from '../utils/random_utils';

// This adapter makes the functional API compatible with the class-based tests
export class Hand {
  private state: HandFunctions.HandState;

  constructor(props: HandFunctions.HandProps) {
    this.state = HandFunctions.createHand(props);
  }

  draw(): void {
    this.state = HandFunctions.draw(this.state);
  }

  play(cardIndex: number, chosenColor?: Color): Card {
    const [newState, card] = HandFunctions.play(this.state, cardIndex, chosenColor);
    this.state = newState;
    return card;
  }

  sayUno(playerIndex: number): void {
    this.state = HandFunctions.sayUno(this.state, playerIndex);
  }

  catchUnoFailure(params: { accuser: number, accused: number }): boolean {
    const [newState, result] = HandFunctions.catchUnoFailure(this.state, params);
    this.state = newState;
    return result;
  }

  hasEnded(): boolean {
    return HandFunctions.hasEnded(this.state);
  }

  winner(): number | undefined {
    return HandFunctions.winner(this.state);
  }

  score(): number | undefined {
    return HandFunctions.score(this.state);
  }

  playerHand(playerIndex: number): Card[] {
    return HandFunctions.playerHand(this.state, playerIndex);
  }

  canPlay(cardIndex: number): boolean {
    return HandFunctions.canPlay(this.state, cardIndex);
  }

  canPlayAny(): boolean {
    return HandFunctions.canPlayAny(this.state);
  }

  get playerCount(): number {
    return HandFunctions.playerCount(this.state);
  }

  player(index: number): string {
    return HandFunctions.player(this.state, index);
  }

  get dealer(): number {
    return HandFunctions.dealer(this.state);
  }

  playerInTurn(): number | undefined {
    return HandFunctions.playerInTurn(this.state);
  }

  discardPile(): Deck {
    return HandFunctions.discardPile(this.state);
  }

  drawPile(): Deck {
    return HandFunctions.drawPile(this.state);
  }

  onEnd(callback: (event: { winner: number }) => void): void {
    this.state = HandFunctions.onEnd(this.state, callback);
  }
}