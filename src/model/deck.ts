import { Shuffler, standardShuffler } from '../utils/random_utils';

export type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export const colors: Color[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
export type CardType = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD DRAW';

export interface Card {
  type: CardType;
  color?: Color;
  number?: number;
}

export type Deck = Card[];

export function createInitialDeck(): Deck {
  const deck: Deck = [];

  // Add numbered cards
  for (const color of colors) {
    deck.push({ type: 'NUMBERED', color, number: 0 });
    for (let i = 1; i <= 9; i++) {
      deck.push({ type: 'NUMBERED', color, number: i });
      deck.push({ type: 'NUMBERED', color, number: i });
    }
  }

  // Add special cards
  for (const color of colors) {
    for (let i = 0; i < 2; i++) {
      deck.push({ type: 'SKIP', color });
      deck.push({ type: 'REVERSE', color });
      deck.push({ type: 'DRAW', color });
    }
  }

  // Add wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ type: 'WILD' });
    deck.push({ type: 'WILD DRAW' });
  }

  return deck;
}

export function shuffleDeck(deck: Deck, shuffler: Shuffler<Card> = standardShuffler): Deck {
  const shuffledDeck = [...deck];
  shuffler(shuffledDeck);
  return shuffledDeck;
}

export function dealCard(deck: Deck): [Card | undefined, Deck] {
  const [firstCard, ...restOfDeck] = deck;
  return [firstCard, restOfDeck];
}

export function addToBottom(deck: Deck, card: Card): Deck {
  return [...deck, card];
}

export function getDeckSize(deck: Deck): number {
  return deck.length;
}

export function filterDeck(deck: Deck, predicate: (card: Card) => boolean): Deck {
  return deck.filter(predicate);
}

export function topCard(deck: Deck): Card | undefined {
  return deck[deck.length - 1];
}