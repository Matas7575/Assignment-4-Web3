import { Card, Deck, shuffle as shuffleDeck, deal } from "../../src/model/deck";
import { dealCards } from "../../src/model/hand";
import { Shuffler, standardShuffler } from "../../src/utils/random_utils";
import { CardPredicate, CardSpec, is, not } from "./predicates";
import { HandProps, createHand, createInitialDeck } from "./test_adapter";

export function constrainedShuffler(
  ...constraints: [number, (card: Card) => boolean][]
): (deck: Deck) => void {
  return (deck: Deck) => {
    constraints.sort(([a], [b]) => a - b);
    shuffleDeck(deck);

    const foundCards: Card[] = [];
    for (const [, predicate] of constraints) {
      const index = deck.findIndex(predicate);
      if (index === -1) throw new Error("Unsatisfiable predicate");
      foundCards.push(deck[index]);
      deck.splice(index, 1);
    }
    for (const [index, card] of foundCards.entries()) {
      deck.splice(index, 0, card);
    }
  };
}

export function memoizingShuffler(shuffler: (deck: Deck) => void) {
  let memo: Deck = [];
  return {
    shuffler: (deck: Deck) => {
      shuffler(deck);
      memo = [...deck];
    },
    memo: () => [...memo],
  };
}

export function successiveShufflers(
  ...shufflers: ((deck: Deck) => void)[]
): (deck: Deck) => void {
  let index = 0;
  return (deck: Deck) => {
    shufflers[index](deck);
    index = (index + 1) % shufflers.length;
  };
}

export function shuffleBuilder(): {
  build(): (deck: Deck) => void;
} {
  return {
    build: () => shuffleDeck,
  };
}
