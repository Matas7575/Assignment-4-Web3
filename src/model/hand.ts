import { Deck, Card, deal, createInitialDeck, Color } from "./deck";
import { Shuffler, standardShuffler } from "../utils/random_utils";

export interface Hand {
  playerCount: number;
  players: string[];
  hands: Card[][];
  drawPile: Card[];
  discardPile: Card[];
  dealer: number;
  playerInTurn?: number;
  currentColor: Color;
  direction: 1 | -1;
  saidUno: Set<number>;
}

export function createHand(
  players: string[],
  dealer: number,
  shuffler: Shuffler<Card> = standardShuffler,
  cardsPerPlayer: number = 7
): Hand {
  if (players.length < 2 || players.length > 10) {
    throw new Error("Invalid number of players");
  }

  let deck = shuffler(createInitialDeck());
  const hands: Card[][] = [];
  let remainingDeck = [...deck];

  // Deal cards to players
  for (let i = 0; i < players.length; i++) {
    const [hand, newDeck] = deal(remainingDeck, cardsPerPlayer);
    hands.push(hand);
    remainingDeck = newDeck;
  }

  // Get initial discard card
  let [discard, drawPile] = deal(remainingDeck, 1);
  
  // Reshuffle if wild card on top
  while (discard[0].type === "WILD" || discard[0].type === "WILD DRAW") {
    deck = shuffler(deck);
    const [newHands, newDeck] = dealHands(deck, players.length, cardsPerPlayer);
    hands.splice(0, hands.length, ...newHands);
    [discard, drawPile] = deal(newDeck, 1);
  }

  // Determine initial player and direction
  let initialPlayer = (dealer + 1) % players.length;
  let direction = 1;
  
  if (discard[0].type === "REVERSE") {
    direction = -1;
    initialPlayer = dealer > 0 ? dealer - 1 : players.length - 1;
  } else if (discard[0].type === "SKIP") {
    initialPlayer = (dealer + 2) % players.length;
  } else if (discard[0].type === "DRAW") {
    const nextPlayer = (dealer + 1) % players.length;
    hands[nextPlayer].push(...drawPile.slice(0, 2));
    drawPile = drawPile.slice(2);
  }

  return {
    playerCount: players.length,
    players,
    hands,
    drawPile,
    discardPile: discard,
    dealer,
    playerInTurn: initialPlayer,
    currentColor: discard[0].color!,
    direction,
    saidUno: new Set()
  };
}

export function canPlay(playerIdx: number, hand: Hand): boolean {
  if (playerIdx < 0 || playerIdx >= hand.playerCount || hand.playerInTurn !== playerIdx) {
    return false;
  }

  return canPlayAny(hand);
}

export function canPlayAny(hand: Hand): boolean {
  if (!hand.playerInTurn) return false;
  
  const playerHand = hand.hands[hand.playerInTurn];
  const topCard = topOfDiscard(hand);

  return playerHand.some(card => canPlayCard(card, topCard, playerHand, hand.currentColor));
}

export function topOfDiscard(hand: Hand): Card {
  return hand.discardPile[hand.discardPile.length - 1];
}

function canPlayCard(card: Card, topCard: Card, playerHand: Card[], currentColor: Color): boolean {
  if (card.type === "WILD") return true;
  
  if (card.type === "WILD DRAW") {
    return !playerHand.some(c => c.color === currentColor);
  }

  return card.color === currentColor || 
         (card.type === topCard.type && ["SKIP", "REVERSE", "DRAW"].includes(card.type)) ||
         (card.type === "NUMBERED" && topCard.type === "NUMBERED" && card.number === topCard.number);
}

export function play(cardIdx: number, chosenColor: Color | undefined, hand: Hand): Hand {
  if (!canPlay(cardIdx, hand)) {
    throw new Error("Illegal play");
  }

  const playerHand = hand.hands[hand.playerInTurn!];
  const card = playerHand[cardIdx];

  if ((card.type === "WILD" || card.type === "WILD DRAW") && !chosenColor) {
    throw new Error("Must specify color for wild card");
  }

  // Remove card from player's hand
  const newHands = hand.hands.map((h, idx) => 
    idx === hand.playerInTurn ? h.filter((_, i) => i !== cardIdx) : h
  );

  // Add card to discard pile
  const newDiscardPile = [...hand.discardPile, card];

  // Check if game is over
  if (newHands[hand.playerInTurn!].length === 0) {
    return {
      ...hand,
      hands: newHands,
      discardPile: newDiscardPile,
      playerInTurn: undefined,
      currentColor: chosenColor || card.color || hand.currentColor
    };
  }

  // Handle special cards
  let direction = hand.direction;
  let nextPlayer = (hand.playerInTurn! + direction + hand.playerCount) % hand.playerCount;
  
  if (card.type === "REVERSE") {
    direction *= -1;
    if (hand.playerCount === 2) {
      nextPlayer = hand.playerInTurn!;
    }
  } else if (card.type === "SKIP") {
    nextPlayer = (hand.playerInTurn! + 2 * direction + hand.playerCount) % hand.playerCount;
  } else if (card.type === "DRAW") {
    const targetPlayer = (hand.playerInTurn! + direction + hand.playerCount) % hand.playerCount;
    newHands[targetPlayer].push(...hand.drawPile.slice(0, 2));
    nextPlayer = (hand.playerInTurn! + 2 * direction + hand.playerCount) % hand.playerCount;
  } else if (card.type === "WILD DRAW") {
    const targetPlayer = (hand.playerInTurn! + direction + hand.playerCount) % hand.playerCount;
    newHands[targetPlayer].push(...hand.drawPile.slice(0, 4));
    nextPlayer = (hand.playerInTurn! + 2 * direction + hand.playerCount) % hand.playerCount;
  }

  return {
    ...hand,
    hands: newHands,
    drawPile: hand.drawPile.slice(card.type === "DRAW" ? 2 : card.type === "WILD DRAW" ? 4 : 0),
    discardPile: newDiscardPile,
    playerInTurn: nextPlayer,
    direction,
    currentColor: chosenColor || card.color || hand.currentColor
  };
}

export function draw(hand: Hand): Hand {
  if (!hand.playerInTurn) throw new Error("Game is over");
  
  const drawnCard = hand.drawPile[0];
  const newHands = hand.hands.map((h, idx) =>
    idx === hand.playerInTurn ? [...h, drawnCard] : h
  );
  
  // If drawn card can be played, keep turn with same player
  if (canPlayCard(drawnCard, topOfDiscard(hand), newHands[hand.playerInTurn], hand.currentColor)) {
    return {
      ...hand,
      hands: newHands,
      drawPile: hand.drawPile.slice(1)
    };
  }
  
  // Otherwise, move to next player
  return {
    ...hand,
    hands: newHands,
    drawPile: hand.drawPile.slice(1),
    playerInTurn: (hand.playerInTurn + hand.direction + hand.playerCount) % hand.playerCount
  };
}

export function hasEnded(hand: Hand): boolean {
  return hand.playerInTurn === undefined || hand.hands.some(h => h.length === 0);
}

export function winner(hand: Hand): number | undefined {
  const winningIdx = hand.hands.findIndex(h => h.length === 0);
  return winningIdx === -1 ? undefined : winningIdx;
}

export function score(hand: Hand): number | undefined {
  if (!hasEnded(hand)) return undefined;
  
  const winningPlayer = winner(hand);
  if (winningPlayer === undefined) return undefined;
  
  return hand.hands.reduce((total, playerHand, idx) => {
    if (idx === winningPlayer) return total;
    return total + playerHand.reduce((sum, card) => {
      if (card.type === "WILD" || card.type === "WILD DRAW") return sum + 50;
      if (card.type === "SKIP" || card.type === "REVERSE" || card.type === "DRAW") return sum + 20;
      return sum + (card.number || 0);
    }, 0);
  }, 0);
}

function dealHands(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number
): [Card[][], Card[]] {
  const hands: Card[][] = [];
  let remainingDeck = [...deck];
  
  for (let i = 0; i < playerCount; i++) {
    const [hand, newDeck] = deal(remainingDeck, cardsPerPlayer);
    hands.push(hand);
    remainingDeck = newDeck;
  }
  
  return [hands, remainingDeck];
}