import { Shuffler, standardShuffler } from '../utils/random_utils';

export type Color = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export const colors: Color[] = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
export type CardType = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD DRAW';

export interface Card {
  type: CardType;
  color?: Color;
  number?: number;
}

export interface Deck extends Array<Card> {
  size: number;
}

export function createInitialDeck(): Deck {
  const deck: Card[] = [];

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

  return toDeck(deck);
}

export function shuffleDeck(deck: Deck | Card[], shuffler: Shuffler<Card> = standardShuffler): Deck {
  const shuffledDeck = [...deck];
  shuffler(shuffledDeck);
  return toDeck(shuffledDeck);
}

export function dealCard(deck: Deck): [Card | undefined, Deck] {
  if (deck.length === 0) return [undefined, deck];
  const [firstCard, ...restOfDeck] = deck;
  return [firstCard, toDeck(restOfDeck)];
}

export function addToBottom(deck: Deck, card: Card): Deck {
  return toDeck([...deck, card]);
}

export function getDeckSize(deck: Deck): number {
  return deck.size;
}

export function topCard(deck: Deck): Card | undefined {
  return deck[deck.length - 1];
}

export function filterDeck(deck: Deck, predicate: (card: Card) => boolean): Deck {
  return toDeck(deck.filter(predicate));
}

export function toDeck(cards: Card[]): Deck {
  return Object.defineProperty([...cards], 'size', {
    get: function() { return this.length; },
    enumerable: true,
    configurable: true
  }) as Deck;
}