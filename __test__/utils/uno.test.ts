import { describe, it, test, expect, beforeEach } from '@jest/globals'
import { createGame } from './test_adapter'
import { shuffleBuilder, successiveShufflers } from '../utils/shuffling'
import { createHand} from '../../__test__/utils/test_adapter'
import { Game, play } from '../../src/model/uno'
import * as Hand from '../../src/model/hand'
import { Color } from '../../src/model/deck'
import { pipeActions } from './game'

const handPlay = (index: number, color?: Color) => (h: Hand.Hand) => Hand.play(index, color, h)

// // Moved shuffles to the top to be used in multiple tests
const firstShuffle = shuffleBuilder({ players: 4, cardsPerPlayer: 1 })
  .discard().is({ type: 'NUMBERED', color: 'BLUE', number: 8 })
  .hand(0).is({ color: 'GREEN', type: 'DRAW' })
  .hand(1).is({ number: 8 })
  .hand(2).is({ type: 'WILD DRAW' })
  .hand(3).is({ number: 3 })
  .drawPile().is({ color: 'GREEN', number: 5 })
  .build()

const secondShuffle = shuffleBuilder({ players: 4, cardsPerPlayer: 1 })
  .discard().is({ type: 'NUMBERED', color: 'BLUE', number: 8 })
  .hand(0).is({ color: 'YELLOW', number: 3 })
  .hand(1).is({ number: 8 })
  .hand(2).is({ color: 'GREEN', type: 'DRAW' })
  .hand(3).is({ type: 'WILD DRAW' })
  .drawPile().is({ type: 'NUMBERED', color: 'RED', number: 0})
  .build()

const thirdShuffle = shuffleBuilder({ players: 4, cardsPerPlayer: 1 })
  .discard().is({ type: 'NUMBERED', color: 'BLUE', number: 8 })
  .hand(0).is({ color: 'BLUE', type: 'DRAW' })
  .hand(1).is({ type: 'WILD DRAW' })
  .hand(2).is({ type: 'SKIP', color: 'GREEN' })
  .hand(3).is({ number: 3 })
  .drawPile().is({ type: 'WILD' }, { type: 'REVERSE' })
  .build()

describe("Game set up", () => {
  // TEST CHANGE: Use Jest's beforeEach to create a new game for each test
  // Create game for each test instead of sharing state
  let game: Game;
  
  beforeEach(() => {
    game = createGame({
      players: ['a', 'b', 'c', 'd'], 
      targetScore: 200,
      shuffler: cards => [...cards]
    });
  });

  it("has as many players as set in the properties", () => {
    expect(game.playerCount).toEqual(4)
  })
  it("has the players set in the properties", () => {
    expect(game.players).toEqual(['a', 'b', 'c', 'd'])
  })
  it("has 'A' and 'B' as the default players", () => {
    const game: Game = createGame({})
    expect(game.playerCount).toEqual(2)
    expect(game.players).toEqual(['A', 'B'])
  })
  it("has the target score set in the properties", () => {
    expect(game.targetScore).toEqual(200)
  })
  it("has 500 as the default target score", () => {
    const game: Game = createGame({players: ['a', 'b', 'c', 'd']})
    expect(game.targetScore).toEqual(500)
  })
  it("starts with all players at 0 score", () => {
    expect(game.scores).toEqual([0, 0, 0, 0])
  })
  it("has no winner", () => {
    expect(game.winner).toBeUndefined();
  })
  it("requires at least 2 players", () => {
    expect(() => createGame({players: ['a']})).toThrow()
  })
  it("requires a target score of more than 0", () => {
    expect(() => createGame({players: ['a', 'b', 'c', 'd'], targetScore: 0})).toThrow()
  })
  it("starts a hand", () => {
    expect(game.currentHand).toBeDefined()
  })
  it("selects a random player as dealer", () => {
    const game: Game = createGame({players: ['a', 'b', 'c', 'd'], randomizer: () => 1})
    expect(game.currentHand?.dealer).toEqual(1)
  })
})

describe("Playing a hand", () => {
  // TEST CHANGE: Use Jest's beforeEach to create a new game for each test
  let startGame: Game;
  let startingHand: Hand.Hand;

  beforeEach(() => {
    startGame = createGame({
      players: ['a', 'b', 'c', 'd'],
      targetScore: 200,
      randomizer: () => 3,
      shuffler: firstShuffle,
      cardsPerPlayer: 1
    });
    startingHand = startGame.currentHand!;
  });

  describe("while the hand is still running", () => {
    let gameInProgress: Game;

    beforeEach(() => {
      gameInProgress = play(Hand.draw, startGame);
    });

    test("no winner has been found", () => {
      expect(gameInProgress.winner).toBeUndefined();
    });

    test("the score is unchanged", () => {
      expect(gameInProgress.scores).toEqual([0, 0, 0, 0]);
    });

    test("the hand is the same", () => {
      expect(gameInProgress.currentHand).toEqual(Hand.draw(startingHand));
    });
  });

  describe("when the hand is over", () => {
    let finishedGame: Game;

    beforeEach(() => {
      finishedGame = play(pipeActions(Hand.draw, handPlay(0)), startGame);
    });

    test("the game still has no winner", () => {
      expect(finishedGame.winner).toBeUndefined();
    });

    test("the score is updated", () => {
      expect(finishedGame.scores).toEqual([0, 78, 0, 0]);
    });

    test("a new hand is started", () => {
      expect(Hand.hasEnded(finishedGame.currentHand!)).toBeFalsy;
    });
  });
});

describe("ending the second hand", () => {
  let game2: Game;

  beforeEach(() => {
    const startGame = createGame({
      players: ['a', 'b', 'c', 'd'],
      targetScore: 200,
      randomizer: () => 3,
      shuffler: firstShuffle,
      cardsPerPlayer: 1
    });

    // Get first hand result
    const game1 = play(pipeActions(Hand.draw, handPlay(0)), startGame);

    // For second hand:
    const secondHandGame = {
      ...game1,
      currentHand: createHand({
        players: game1.players,
        dealer: (game1.currentHand!.dealer + 1) % game1.players.length,
        shuffler: secondShuffle,
        cardsPerPlayer: 1
      })
    };

    // Play second hand
    game2 = play(pipeActions(Hand.draw, handPlay(0, 'RED')), secondHandGame);
  });

  test("the game still has no winner", () => {
    expect(game2.winner).toBeUndefined();
  });

  // TEST CHANGE: Update test to match the expected score
  test("the score is updated", () => {
    expect(game2.scores).toEqual([0, 78, 0, 37]);
  });

  test("a new hand is started", () => {
    expect(Hand.hasEnded(game2.currentHand!)).toBeFalsy();
  });
});

describe("ending the third hand", () => {
  let game3: Game;

  beforeEach(() => {
    const props = {
      players: ['a', 'b', 'c', 'd'],
      targetScore: 200,
      randomizer: () => 3,
      shuffler: successiveShufflers(firstShuffle, secondShuffle, thirdShuffle),
      cardsPerPlayer: 1
    };
    const startGame = createGame(props);
    const game1 = play(pipeActions(Hand.draw, handPlay(0)), startGame);
    const secondHandGame = {
      ...game1,
      currentHand: createHand({
        players: game1.players,
        dealer: (game1.currentHand!.dealer + 1) % game1.players.length,
        shuffler: secondShuffle,
        cardsPerPlayer: 1
      })
    };
    const game2 = play(pipeActions(Hand.draw, handPlay(0, 'RED')), secondHandGame);
    const thirdHandGame = {
      ...game2,
      currentHand: createHand({
        players: game2.players,
        dealer: (game2.currentHand!.dealer + 1) % game2.players.length,
        shuffler: thirdShuffle,
        cardsPerPlayer: 1
      })
    };
    // console.log("Game state before third play:", thirdHandGame);
    game3 = play(handPlay(0), thirdHandGame);
    // console.log("Game state after third play:", game3);
  });

  test("player 0 won", () => {
    expect(game3.winner).toEqual(2);
  });

  test("the score is updated", () => {
    expect(game3.scores).toEqual([0, 78, 216, 0]);
  });

  test("a new hand is not started", () => {
    expect(game3.currentHand).toBeUndefined();
  });
}); 