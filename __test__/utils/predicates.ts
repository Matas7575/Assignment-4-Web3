import { Card, Color, Type } from "../../src/model/deck";

export type CardPredicate = (card: Card | undefined) => boolean;

export type CardSpec = {
  type?: Type | Type[];
  color?: Color | Color[];
  number?: number | number[];
};

export function is(spec: CardSpec): CardPredicate {
  function conforms<T>(spec: undefined | T | T[], value: T): boolean {
    if (Array.isArray(spec)) return spec.includes(value);
    if (spec === undefined) return true;
    return spec === value;
  }

  return (card: Card | undefined): boolean => {
    if (!card) return false;
    if (card.type === "NUMBERED") {
      return (
        conforms(spec.type, "NUMBERED") &&
        conforms(spec.color, card.color) &&
        conforms(spec.number, card.number)
      );
    }
    if (["SKIP", "REVERSE", "DRAW"].includes(card.type)) {
      return conforms(spec.type, card.type) && conforms(spec.color, card.color);
    }
    return conforms(spec.type, card.type);
  };
}

export function not(predicate: CardPredicate): CardPredicate {
  return (card) => !predicate(card);
}
