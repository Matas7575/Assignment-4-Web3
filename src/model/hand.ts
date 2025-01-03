import { Deck, Card, deal, createInitialDeck, Color } from "./deck";
import { Shuffler, standardShuffler } from "../utils/random_utils";

/**
 * Represents the state of a hand in the game.
 * 
 * @interface Hand
 * @property {number} playerCount - The number of players in the game.
 * @property {string[]} players - The names of the players.
 * @property {Card[][]} hands - The cards held by each player.
 * @property {Card[]} drawPile - The draw pile of cards.
 * @property {Card[]} discardPile - The discard pile of cards.
 * @property {number} dealer - The index of the dealer.
 * @property {number} [playerInTurn] - The index of the player whose turn it is.
 * @property {Color} currentColor - The current color in play.
 * @property {1 | -1} direction - The direction of play (1 for clockwise, -1 for counterclockwise).
 * @property {Set<number>} saidUno - The set of players who have said "UNO".
 * @property {Shuffler<Card>} _shuffler - The shuffler function used to shuffle the cards.
 * @category Types
 */
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
  _shuffler: Shuffler<Card>;
}

/**
 * Represents an action in the game.
 * 
 * @interface UnoAction
 * @property {number} accuser - The index of the player accusing another player.
 * @property {number} accused - The index of the player being accused.
 * @category Types
 */
export interface UnoAction {
  accuser: number;
  accused: number;
}

/**
 * Type alias for a function that performs an action on a hand.
 * 
 * @typedef {function} Action
 * @param {Hand} hand - The current state of the hand.
 * @returns {Hand} The new state of the hand after the action.
 * @category Types
 */
export type Action = (hand: Hand) => Hand;

/**
 * Creates a new hand for the game.
 * 
 * @param {string[]} players - The names of the players.
 * @param {number} dealer - The index of the dealer.
 * @param {Shuffler<Card>} [shuffler=standardShuffler] - The shuffler function used to shuffle the cards.
 * @param {number} [cardsPerPlayer=7] - The number of cards dealt to each player.
 * @returns {Hand} The initial state of the hand.
 * @throws {Error} If the number of players is less than 2 or more than 10.
 * @category Functions
 * @example
 * const hand = createHand(['Alice', 'Bob'], 0);
 */
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
  let direction: -1 | 1 = 1;

  if (discard[0].type === "REVERSE") {
    direction = -1;
    initialPlayer = (dealer - 1 + players.length) % players.length;
  } else if (discard[0].type === "SKIP") {
    initialPlayer = (dealer + 2) % players.length;
  } else if (discard[0].type === "DRAW") {
    const nextPlayer = (dealer + 1) % players.length;
    hands[nextPlayer].push(...drawPile.slice(0, 2));
    drawPile = drawPile.slice(2);
    initialPlayer = (dealer + 2) % players.length;
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
    saidUno: new Set(),
    _shuffler: shuffler
  };
}

/**
 * Checks if a card can be played.
 * 
 * @param {number} cardIdx - The index of the card in the player's hand.
 * @param {Hand} hand - The current state of the hand.
 * @returns {boolean} True if the card can be played, false otherwise.
 * @category Functions
 * @example
 * const canPlayCard = canPlay(0, hand);
 */
export function canPlay(cardIdx: number, hand: Hand): boolean {
  if (
    cardIdx < 0 ||
    cardIdx >= hand.hands[hand.playerInTurn!]?.length ||
    hand.playerInTurn === undefined
  ) {
    return false;
  }

  const playerHand = hand.hands[hand.playerInTurn];
  const card = playerHand[cardIdx];
  const topCard = topOfDiscard(hand);

  // Handle wild cards
  if (card.type === "WILD") {
    return true;
  }

  if (card.type === "WILD DRAW") {
    return !playerHand.some((c) => c.color === hand.currentColor);
  }

  // Handle reverse cards - can play if either same color or it's another reverse
  if (card.type === "REVERSE") {
    return card.color === hand.currentColor || topCard.type === "REVERSE";
  }

  // Handle other action cards (SKIP, DRAW)
  if (card.type === "SKIP" || card.type === "DRAW") {
    return card.color === hand.currentColor || card.type === topCard.type;
  }

  // Handle numbered cards
  if (card.type === "NUMBERED") {
    return (
      card.color === hand.currentColor ||
      (topCard.type === "NUMBERED" && card.number === topCard.number)
    );
  }

  return false;
}

/**
 * Checks if any card in the player's hand can be played.
 * 
 * @param {Hand} hand - The current state of the hand.
 * @returns {boolean} True if any card can be played, false otherwise.
 * @category Functions
 * @example
 * const canPlayAnyCard = canPlayAny(hand);
 */
export function canPlayAny(hand: Hand): boolean {
  if (hand.playerInTurn === undefined) return false;

  const playerHand = hand.hands[hand.playerInTurn];
  const topCard = topOfDiscard(hand);

  return playerHand.some((card) =>
    canPlayCard(card, topCard, playerHand, hand.currentColor)
  );
}

/**
 * Gets the top card of the discard pile.
 * 
 * @param {Hand} hand - The current state of the hand.
 * @returns {Card} The top card of the discard pile.
 * @category Functions
 * @example
 * const topCard = topOfDiscard(hand);
 */
export function topOfDiscard(hand: Hand): Card {
  return hand.discardPile[hand.discardPile.length - 1];
}

/**
 * Checks if a specific card can be played.
 * 
 * @function canPlayCard
 * @param {Card} card - The card to check.
 * @param {Card} topCard - The top card of the discard pile.
 * @param {Card[]} playerHand - The player's hand.
 * @param {Color} currentColor - The current color in play.
 * @returns {boolean} True if the card can be played, false otherwise.
 * @category Functions
 * @example
 * const canPlay = canPlayCard(card, topCard, playerHand, currentColor);
 */
function canPlayCard(
  card: Card,
  topCard: Card,
  playerHand: Card[],
  currentColor: Color
): boolean {
  if (card.type === "WILD") return true;

  if (card.type === "WILD DRAW") {
    return !playerHand.some((c) => c.color === currentColor);
  }

  if (["SKIP", "REVERSE", "DRAW"].includes(card.type)) {
    return card.color === currentColor || card.type === topCard.type;
  }

  return (
    card.color === currentColor ||
    (card.type === "NUMBERED" && topCard.type === "NUMBERED" && card.number === topCard.number)
  );
}

/**
 * Plays a card from the player's hand.
 * 
 * @param {number} cardIdx - The index of the card in the player's hand.
 * @param {Color} [chosenColor] - The chosen color for wild cards.
 * @param {Hand} hand - The current state of the hand.
 * @returns {Hand} The new state of the hand after the card is played.
 * @throws {Error} If the card cannot be played.
 * @category Functions
 * @example
 * const newHand = play(0, 'RED', hand);
 */
export function play(
  cardIdx: number,
  chosenColor: Color | undefined,
  hand: Hand
): Hand {
  if (!canPlay(cardIdx, hand)) {
    throw new Error("Illegal play");
  }

  const currentPlayer = hand.playerInTurn!;
  const playerHand = hand.hands[currentPlayer];
  const card = playerHand[cardIdx];

  // Validate color choice
  if ((card.type === "WILD" || card.type === "WILD DRAW") && !chosenColor) {
    throw new Error("Must specify color for wild card");
  }
  if (card.color && chosenColor) {
    throw new Error("Cannot specify color for colored card");
  }

  // Remove played card
  const newHands = hand.hands.map((h, idx) =>
    idx === currentPlayer ? h.filter((_, i) => i !== cardIdx) : h
  );

  // Handle draw pile exhaustion for DRAW effects
  let newDrawPile = hand.drawPile;
  let newDiscardPile = [...hand.discardPile, card];

  if ((card.type === "DRAW" && newDrawPile.length < 2) ||
    (card.type === "WILD DRAW" && newDrawPile.length < 4)) {
    // Keep the new top card
    const topCard = card;
    // Shuffle all the old discard pile
    const cardsToShuffle = hand.discardPile;
    newDrawPile = [...newDrawPile, ...hand._shuffler(cardsToShuffle)];
    newDiscardPile = [topCard];
  }

  // Handle DRAW and WILD DRAW effects before game end
  if ((card.type === "DRAW" || card.type === "WILD DRAW") && newHands[currentPlayer].length === 0) {
    const targetPlayer = (currentPlayer + hand.direction + hand.playerCount) % hand.playerCount;
    const cardCount = card.type === "DRAW" ? 2 : 4;
    const drawnCards = newDrawPile.slice(0, cardCount);
    newHands[targetPlayer] = [...newHands[targetPlayer], ...drawnCards];
    newDrawPile = newDrawPile.slice(cardCount);

    return {
      ...hand,
      hands: newHands,
      drawPile: newDrawPile,
      discardPile: newDiscardPile,
      playerInTurn: undefined,
      currentColor: chosenColor || card.color || hand.currentColor,
      _shuffler: hand._shuffler
    };
  }

  // Check if game is over
  if (newHands[currentPlayer].length === 0) {
    return {
      ...hand,
      hands: newHands,
      drawPile: newDrawPile,
      discardPile: newDiscardPile,
      playerInTurn: undefined,
      currentColor: chosenColor || card.color || hand.currentColor,
      _shuffler: hand._shuffler
    };
  }

  // Handle special cards
  let direction = hand.direction;
  let nextPlayer = currentPlayer;

  if (card.type === "REVERSE") {
    direction = (direction * -1) as 1 | -1;
    if (hand.playerCount === 2) {
      nextPlayer = currentPlayer;
    } else {
      nextPlayer = (currentPlayer + direction + hand.playerCount) % hand.playerCount;
    }
  } else if (card.type === "SKIP") {
    nextPlayer = (currentPlayer + 2 * direction + hand.playerCount) % hand.playerCount;
  } else if (card.type === "DRAW") {
    const targetPlayer = (currentPlayer + direction + hand.playerCount) % hand.playerCount;
    const drawnCards = newDrawPile.slice(0, 2);
    newHands[targetPlayer] = [...newHands[targetPlayer], ...drawnCards];
    newDrawPile = newDrawPile.slice(2);
    nextPlayer = (currentPlayer + 2 * direction + hand.playerCount) % hand.playerCount;
  } else if (card.type === "WILD DRAW") {
    const targetPlayer = (currentPlayer + direction + hand.playerCount) % hand.playerCount;
    const drawnCards = newDrawPile.slice(0, 4);
    newHands[targetPlayer] = [...newHands[targetPlayer], ...drawnCards];
    newDrawPile = newDrawPile.slice(4);
    nextPlayer = (currentPlayer + 2 * direction + hand.playerCount) % hand.playerCount;
  } else {
    nextPlayer = (currentPlayer + direction + hand.playerCount) % hand.playerCount;
  }

  return {
    ...hand,
    hands: newHands,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
    playerInTurn: nextPlayer,
    direction,
    currentColor: chosenColor || card.color || hand.currentColor,
    _shuffler: hand._shuffler
  };
}

/**
 * Draws a card from the draw pile.
 * 
 * @param {Hand} hand - The current state of the hand.
 * @returns {Hand} The new state of the hand after drawing a card.
 * @throws {Error} If the game is over.
 * @category Functions
 * @example
 * const newHand = draw(hand);
 */
export function draw(hand: Hand): Hand {
  if (hand.playerInTurn === undefined) {
    throw new Error("Game is over");
  }

  const currentPlayer = hand.playerInTurn;
  const drawnCard = hand.drawPile[0];

  // Add drawn card to player's hand
  const newHands = [...hand.hands];
  newHands[currentPlayer] = [...newHands[currentPlayer], drawnCard];

  // Check if this was the last card in draw pile
  if (hand.drawPile.length === 1) {
    // Keep top card of discard
    const topCard = hand.discardPile[hand.discardPile.length - 1];

    // Shuffle rest of discard pile to make new draw pile
    const cardsToShuffle = hand.discardPile.slice(0, -1);
    const newDrawPile = hand._shuffler(cardsToShuffle);

    // Check if drawn card can be played
    const canPlayDrawn = canPlayCard(drawnCard, topOfDiscard(hand), newHands[currentPlayer], hand.currentColor);
    const nextPlayer = canPlayDrawn
      ? currentPlayer
      : (currentPlayer + hand.direction + hand.playerCount) % hand.playerCount;

    return {
      ...hand,
      hands: newHands,
      drawPile: newDrawPile,
      discardPile: [topCard],
      playerInTurn: nextPlayer,
      _shuffler: hand._shuffler
    };
  }

  // Normal case - still cards in draw pile
  const canPlayDrawn = canPlayCard(drawnCard, topOfDiscard(hand), newHands[currentPlayer], hand.currentColor);
  const nextPlayer = canPlayDrawn
    ? currentPlayer
    : (currentPlayer + hand.direction + hand.playerCount) % hand.playerCount;

  return {
    ...hand,
    hands: newHands,
    drawPile: hand.drawPile.slice(1),
    playerInTurn: nextPlayer,
    _shuffler: hand._shuffler
  };
}

/**
 * Checks if the game has ended.
 * 
 * @param {Hand} hand - The current state of the hand.
 * @returns {boolean} True if the game has ended, false otherwise.
 * @category Functions
 * @example
 * const gameEnded = hasEnded(hand);
 */
export function hasEnded(hand: Hand): boolean {
  return (
    hand.playerInTurn === undefined || hand.hands.some((h) => h.length === 0)
  );
}

/**
 * Gets the index of the winning player.
 * 
 * @param {Hand} hand - The current state of the hand.
 * @returns {number | undefined} The index of the winning player, or undefined if there is no winner.
 * @category Functions
 * @example
 * const winningPlayer = winner(hand);
 */
export function winner(hand: Hand): number | undefined {
  const winningIdx = hand.hands.findIndex((h) => h.length === 0);
  return winningIdx === -1 ? undefined : winningIdx;
}

/**
 * Calculates the score for the current hand.
 * 
 * @param {Hand} hand - The current state of the hand.
 * @returns {number | undefined} The score for the current hand, or undefined if the game has not ended.
 * @category Functions
 * @example
 * const handScore = score(hand);
 */
export function score(hand: Hand): number | undefined {
  if (!hasEnded(hand)) return undefined;

  const winningPlayer = winner(hand);
  if (winningPlayer === undefined) return undefined;

  // Sum all opponent cards
  return hand.hands.reduce((total, playerHand, idx) => {
    // Skip winner's hand
    if (idx === winningPlayer) return total;

    // Add up cards in this opponent's hand
    return total + playerHand.reduce((sum, card) => {
      switch (card.type) {
        case "WILD":
        case "WILD DRAW":
          return sum + 50;
        case "SKIP":
        case "REVERSE":
        case "DRAW":
          return sum + 20;
        case "NUMBERED":
          return sum + card.number!;
        default:
          return sum;
      }
    }, 0);
  }, 0);
}

/**
 * Deals hands to players from the deck.
 * 
 * @function dealHands
 * @param {Card[]} deck - The deck of cards to deal from.
 * @param {number} playerCount - The number of players.
 * @param {number} cardsPerPlayer - The number of cards per player.
 * @returns {[Card[][], Card[]]} A tuple containing the hands dealt to players and the remaining deck.
 * @category Functions
 * @example
 * const [hands, remainingDeck] = dealHands(deck, 4, 7);
 */
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

/**
 * Checks if a player can be caught for failing to say "UNO".
 * 
 * @param {UnoAction} action - The action containing the accuser and accused player indices.
 * @param {Hand} hand - The current state of the hand.
 * @returns {boolean} True if the player can be caught for failing to say "UNO", false otherwise.
 * @throws {Error} If the accused player index is invalid.
 * @category Functions
 * @example
 * const canCatch = checkUnoFailure({ accuser: 1, accused: 0 }, hand);
 */
export function checkUnoFailure(action: UnoAction, hand: Hand): boolean {
  // Validate indices
  if (action.accused < 0 || action.accused >= hand.playerCount) {
    throw new Error("Invalid accused player");
  }

  const accusedHand = hand.hands[action.accused];
  
  // Must have exactly one card
  if (accusedHand.length !== 1) {
    return false;
  }

  // Must be the last player to have played
  const expectedCurrentPlayer = (action.accused + hand.direction + hand.playerCount) % hand.playerCount;
  if (hand.playerInTurn !== expectedCurrentPlayer) {
    return false;
  }

  // UNO declaration is valid if:
  // 1. They said UNO (in saidUno set)
  // 2. They have one card
  // 3. They were the last to play
  // This captures declarations made just before or after playing
  // while invalid declarations during other turns get cleared
  const validUnoDeclaration = hand.saidUno.has(action.accused);

  // Return true if they can be caught (no valid UNO declaration)
  return !validUnoDeclaration;
}

/**
 * Catches a player for failing to say "UNO".
 * 
 * @param {UnoAction} action - The action containing the accuser and accused player indices.
 * @param {Hand} hand - The current state of the hand.
 * @returns {Hand} The new state of the hand after catching the player.
 * @throws {Error} If the UNO catch is invalid.
 * @category Functions
 * @example
 * const newHand = catchUnoFailure({ accuser: 1, accused: 0 }, hand);
 */
export function catchUnoFailure(action: UnoAction, hand: Hand): Hand {
  if (!checkUnoFailure(action, hand)) {
    throw new Error("Invalid UNO catch");
  }

  // Add 4 cards to accused player's hand
  const newHands = [...hand.hands];
  let newDrawPile = [...hand.drawPile];
  let newDiscardPile = [...hand.discardPile];

  // If draw pile is running low, shuffle discard pile
  if (newDrawPile.length < 4) {
    // Keep top card
    const topCard = newDiscardPile[newDiscardPile.length - 1];
    // Shuffle rest of discard
    const shuffledCards = hand._shuffler(newDiscardPile.slice(0, -1));
    // Add to draw pile
    newDrawPile = [...newDrawPile, ...shuffledCards];
    // Reset discard to just top card
    newDiscardPile = [topCard];
  }

  // Draw 4 cards
  const drawnCards = newDrawPile.slice(0, 4);
  newHands[action.accused] = [...newHands[action.accused], ...drawnCards];
  newDrawPile = newDrawPile.slice(4);

  return {
    ...hand,
    hands: newHands,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
  };
}

/**
 * Declares "UNO" for a player.
 * 
 * @param {number} player - The index of the player declaring "UNO".
 * @param {Hand} hand - The current state of the hand.
 * @returns {Hand} The new state of the hand after declaring "UNO".
 * @throws {Error} If the player index is invalid or the game is over.
 * @category Functions
 * @example
 * const newHand = sayUno(0, hand);
 */
export function sayUno(player: number, hand: Hand): Hand {
  if (player < 0 || player >= hand.playerCount) {
    throw new Error("Invalid player");
  }

  // Player can't say uno if the game is over
  if (hand.playerInTurn === undefined) {
    throw new Error("Game is over");
  }

  return {
    ...hand,
    saidUno: new Set([...hand.saidUno, player]),
  };
}
