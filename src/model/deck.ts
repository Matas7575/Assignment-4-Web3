export type Color = "RED" | "YELLOW" | "GREEN" | "BLUE";
export type Type =
  | "NUMBERED"
  | "SKIP"
  | "REVERSE"
  | "DRAW"
  | "WILD"
  | "WILD DRAW";

export interface Card {
  color?: Color;
  type: Type;
  number?: number; // Only for NUMBERED cards
}

export type Deck = Card[];

const colors: Color[] = ["RED", "YELLOW", "GREEN", "BLUE"];

const createDeck = (): Deck => {
  const deck: Deck = [];
  const types: Type[] = ["SKIP", "REVERSE", "DRAW"];

  colors.forEach((color) => {
    for (let i = 0; i <= 9; i++) {
      deck.push({ color, type: "NUMBERED", number: i });
      if (i > 0) deck.push({ color, type: "NUMBERED", number: i }); // Duplicate for 2-9
    }
    types.forEach((type) => {
      deck.push({ color, type });
      deck.push({ color, type }); // Each action card has 2 copies
    });
  });

  for (let i = 0; i < 4; i++) {
    deck.push({ type: "WILD" });
    deck.push({ type: "WILD DRAW" });
  }

  return deck;
};

const shuffleDeck = (deck: Deck): Deck => deck.sort(() => Math.random() - 0.5);

const deal = (deck: Deck, count: number): [Card[], Deck] => {
  return [deck.slice(0, count), deck.slice(count)];
};

// Consolidated Export
export { colors, createDeck, shuffleDeck as shuffle, deal };
