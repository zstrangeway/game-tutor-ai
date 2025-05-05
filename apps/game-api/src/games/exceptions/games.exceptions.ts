import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a game cannot be found
 */
export class GameNotFoundException extends HttpException {
  constructor(message = 'Game not found', id?: string) {
    super(id ? `Game with ID ${id} not found` : message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Exception thrown when a player is not part of the requested game
 */
export class PlayerNotInGameException extends HttpException {
  constructor(message = 'You are not a player in this game') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

/**
 * Exception thrown when a move is attempted on a game that has ended
 */
export class GameEndedException extends HttpException {
  constructor(message = 'Game has already ended') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Exception thrown when a player attempts to move when it's not their turn
 */
export class NotPlayerTurnException extends HttpException {
  constructor(message = "It's not your turn") {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Exception thrown when an invalid move is submitted
 */
export class InvalidMoveException extends HttpException {
  constructor(move?: string) {
    const message = move ? `Invalid move: ${move}` : 'Invalid move';
    super(message, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Exception thrown when a player responds to a draw offer that doesn't exist
 */
export class NoDrawOfferedException extends HttpException {
  constructor(message = 'No draw has been offered') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Exception thrown when a player attempts to use premium features without a subscription
 */
export class PremiumFeatureException extends HttpException {
  constructor(message = 'This feature requires a paid subscription') {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
} 