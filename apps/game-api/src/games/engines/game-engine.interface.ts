/**
 * Generic interface for game engines
 * @template T - The type representing the game state
 */
export interface GameEngine<T> {
  /**
   * Validates whether a move is legal in the current game state
   * @param gameState - Current state of the game
   * @param move - Move to validate (format depends on game)
   * @returns True if the move is valid, false otherwise
   */
  validateMove(gameState: T, move: string): boolean;

  /**
   * Applies a move to the current game state
   * @param gameState - Current state of the game or serialized state
   * @param move - Move to apply (format depends on game)
   * @returns New game state after the move
   */
  applyMove(gameState: T | string, move: string): T;

  /**
   * Creates and returns the initial state for a new game
   * @returns Fresh game state
   */
  getInitialState(): T;

  /**
   * Checks if the game has ended and determines the result
   * @param gameState - Current game state or serialized state
   * @returns Object indicating if game ended and the result
   */
  checkGameEnd(gameState: T | string): { isEnded: boolean; result?: string };

  /**
   * Converts the game state to a string representation
   * @param gameState - Game state to serialize
   * @returns String representation of the game state
   */
  serializeState(gameState: T): string;

  /**
   * Converts a serialized game state back to a game state object
   * @param serializedState - String representation of the game state
   * @returns Game state object
   */
  deserializeState(serializedState: string): T;
}
