import { Injectable } from '@nestjs/common';
import { GameEngine } from './game-engine.interface';
import { Chess } from 'chess.js';

type ChessInstance = Chess;

/**
 * Chess engine implementation that wraps the chess.js library
 */
@Injectable()
export class ChessEngine implements GameEngine<ChessInstance> {
  /**
   * Validates if a move is legal in the current chess position
   * @param gameState - Current chess position
   * @param move - Move in algebraic notation (e.g., "e4", "Nf3")
   * @returns Whether the move is valid
   */
  validateMove(gameState: ChessInstance, move: string): boolean {
    try {
      // Create a copy of the current state to test the move
      const chessCopy = new Chess(gameState.fen());
      // Try to make the move
      const result = chessCopy.move(move);
      return result !== null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Ignore any errors and return false for invalid moves
      return false;
    }
  }

  /**
   * Applies a move to the current chess position
   * @param gameState - Current chess position or FEN string
   * @param move - Move in algebraic notation (e.g., "e4", "Nf3")
   * @returns New chess position after the move
   * @throws Error if the move is invalid
   */
  applyMove(gameState: ChessInstance | string, move: string): ChessInstance {
    try {
      const chess =
        typeof gameState === 'string' ? new Chess(gameState) : gameState;

      // Apply the move
      chess.move(move);
      return chess;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new Error(`Invalid move: ${move}`);
    }
  }

  /**
   * Gets the initial state for a new chess game
   * @returns New chess game in the starting position
   */
  getInitialState(): ChessInstance {
    // Create a new chess game in the starting position
    return new Chess();
  }

  /**
   * Checks if the chess game has ended
   * @param gameState - Current chess position or FEN string
   * @returns Object indicating if game ended and the result
   */
  checkGameEnd(gameState: ChessInstance | string): {
    isEnded: boolean;
    result?: string;
  } {
    const chess =
      typeof gameState === 'string' ? new Chess(gameState) : gameState;

    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        // Determine winner based on whose turn it is
        return {
          isEnded: true,
          result: chess.turn() === 'w' ? '0-1' : '1-0',
        };
      } else if (chess.isDraw()) {
        return {
          isEnded: true,
          result: '1/2-1/2',
        };
      }
    }

    return { isEnded: false };
  }

  /**
   * Converts a chess position to PGN notation
   * @param gameState - Chess position
   * @returns PGN string representation
   */
  serializeState(gameState: ChessInstance): string {
    // Use PGN (Portable Game Notation) for chess
    return gameState.pgn();
  }

  /**
   * Converts a PGN notation string back to a chess position
   * @param serializedState - PGN notation string
   * @returns Chess position
   */
  deserializeState(serializedState: string): ChessInstance {
    // Create a new chess instance
    const chess = new Chess();

    try {
      // Check if this is our initial state pattern
      if (
        serializedState.includes('[Event "?"]') &&
        serializedState.includes('[Result "*"]') &&
        serializedState.trim().endsWith('*')
      ) {
        // This is an initial game state, return a fresh chess instance
        return chess;
      }

      // Otherwise try to load the PGN
      try {
        chess.loadPgn(serializedState);
        return chess;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        console.error('Failed to load PGN:', serializedState);
        return new Chess(); // Return a new chess instance if loading fails
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      console.error(
        'Error deserializing chess state:',
        'PGN:',
        serializedState,
      );
      // Return a new chess instance instead of throwing an error
      return new Chess();
    }
  }
}
