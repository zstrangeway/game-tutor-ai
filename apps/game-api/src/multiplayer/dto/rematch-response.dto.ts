import { ApiProperty } from '@nestjs/swagger';

export class RematchResponseDto {
  @ApiProperty({
    description: 'Whether the rematch request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'The ID of the new game if rematch was successful',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  gameId?: string;

  @ApiProperty({
    description: 'Message providing additional information',
    example: 'Rematch request sent to opponent',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Status of the rematch request',
    example: 'pending',
    enum: ['pending', 'accepted', 'declined', 'expired'],
    required: false,
  })
  status?: string;
}
