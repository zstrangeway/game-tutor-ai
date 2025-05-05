import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for submitting a move
 */
export class MoveDto {
  @ApiProperty({
    description: 'The move in algebraic notation (e.g., "e4", "Nf3")',
    example: 'e4'
  })
  @IsString()
  @IsNotEmpty()
  move: string;
}
