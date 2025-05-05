import { HttpException, HttpStatus } from '@nestjs/common';

export class ChatException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, statusCode);
  }
}
