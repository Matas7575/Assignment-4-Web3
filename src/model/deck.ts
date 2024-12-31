/**
 * Represents the color of a card.
 * 
 * @typedef {("RED" | "YELLOW" | "GREEN" | "BLUE")} Color
 * @category Types
 */
export type Color = "RED" | "YELLOW" | "GREEN" | "BLUE";

/**
 * Represents the type of a card.
 * 
 * @typedef {("NUMBERED" | "SKIP" | "REVERSE" | "DRAW" | "WILD" | "WILD DRAW")} Type
 * @category Types
 */
export type Type = "NUMBERED" | "SKIP" | "REVERSE" | "DRAW" | "WILD" | "WILD DRAW";

/**
 * Represents a card in the deck.
 * 
 * @interface Card
 * @property {Color} [color] - The color of the card (optional for wild cards).
 * @property {Type} type - The type of the card.
 * @property {number} [number] - The number on the card (optional for non-numbered cards).
 * @category Types
 */
export interface Card {
  color?: Color;
  type: Type;
  number?: number;
}

/**
 * Represents a deck of cards.
 * 
 * @typedef {Card[]} Deck
 * @category Types
 */
export type Deck = Card[];

/**
 * Array of possible card colors.
 * 
 * @category Constants
 */
export const colors: Color[] = ["RED", "YELLOW", "GREEN", "BLUE"];

/**
 * Creates the initial deck of UNO cards.
 * 
 * @returns {Deck} The initial deck of UNO cards.
 * @category Functions
 * @example
 * const deck = createInitialDeck();
 */
export function createInitialDeck(): Deck {
  const deck: Deck = [];
  
  // Add numbered cards (19 of each color: one 0, two 1-9)
  for (const color of colors) {
    // Add one 0
    deck.push({ type: "NUMBERED", color, number: 0 });
    // Add two of each 1-9
    for (let number = 1; number <= 9; number++) {
      deck.push({ type: "NUMBERED", color, number });
      deck.push({ type: "NUMBERED", color, number });
    }
  }

  // Add action cards (2 of each color)
  for (const color of colors) {
    for (const type of ["SKIP", "REVERSE", "DRAW"] as Type[]) {
      deck.push({ type, color });
      deck.push({ type, color });
    }
  }

  // Add wild cards (4 each)
  for (let i = 0; i < 4; i++) {
    deck.push({ type: "WILD" });
    deck.push({ type: "WILD DRAW" });
  }

  return deck;
}

/**
 * Deals a specified number of cards from the deck.
 * 
 * @param {Deck} deck - The deck of cards to deal from.
 * @param {number} count - The number of cards to deal.
 * @returns {[Card[], Deck]} A tuple containing the dealt cards and the remaining deck.
 * @category Functions
 * @example
 * const [hand, remainingDeck] = deal(deck, 7);
 */
export function deal(deck: Deck, count: number): [Card[], Deck] {
  return [deck.slice(0, count), deck.slice(count)];
}

/**
 * Shuffles the deck of cards.
 * 
 * @param {Deck} deck - The deck of cards to shuffle.
 * @returns {Deck} The shuffled deck of cards.
 * @category Functions
 * @example
 * const shuffledDeck = shuffle(deck);
 */
export const shuffle = (deck: Deck): Deck => [...deck].sort(() => Math.random() - 0.5);