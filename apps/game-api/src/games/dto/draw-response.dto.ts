import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for responding to a draw offer
 */
export class DrawResponseDto {
  @ApiProperty({
    description: 'Whether to accept the draw offer',
    example: true,
  })
  @IsBoolean()
  accept: boolean;
}
