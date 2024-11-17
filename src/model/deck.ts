export type Color = "RED" | "YELLOW" | "GREEN" | "BLUE";
export type Type = "NUMBERED" | "SKIP" | "REVERSE" | "DRAW" | "WILD" | "WILD DRAW";

export interface Card {
  color?: Color;
  type: Type;
  number?: number;
}

export type Deck = Card[];

export const colors: Color[] = ["RED", "YELLOW", "GREEN", "BLUE"];

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

export function deal(deck: Deck, count: number): [Card[], Deck] {
  return [deck.slice(0, count), deck.slice(count)];
}

export const shuffle = (deck: Deck): Deck => [...deck].sort(() => Math.random() - 0.5);
