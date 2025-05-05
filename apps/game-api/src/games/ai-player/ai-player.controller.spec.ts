import { Test, TestingModule } from '@nestjs/testing';
import { AiPlayerController } from './ai-player.controller';
import { AiPlayerService } from './ai-player.service';
import { AiPlayerDto } from './dto';

describe('AiPlayerController', () => {
  let controller: AiPlayerController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: AiPlayerService;

  const mockAiPlayerService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiPlayerController],
      providers: [
        {
          provide: AiPlayerService,
          useValue: mockAiPlayerService,
        },
      ],
    }).compile();

    controller = module.get<AiPlayerController>(AiPlayerController);
    service = module.get<AiPlayerService>(AiPlayerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAiPlayers', () => {
    it('should return an array of AI players', async () => {
      const result: AiPlayerDto[] = [
        {
          id: '1',
          name: 'Beginner Bot',
          difficulty: 'BEGINNER',
          description: 'An easy opponent',
        },
      ];

      mockAiPlayerService.findAll.mockResolvedValue(result);

      expect(await controller.getAiPlayers()).toBe(result);
      expect(mockAiPlayerService.findAll).toHaveBeenCalled();
    });

    it('should pass difficulty parameter to service', async () => {
      const result: AiPlayerDto[] = [
        {
          id: '1',
          name: 'Beginner Bot',
          difficulty: 'BEGINNER',
          description: 'An easy opponent',
        },
      ];

      mockAiPlayerService.findAll.mockResolvedValue(result);

      expect(await controller.getAiPlayers('BEGINNER')).toBe(result);
      expect(mockAiPlayerService.findAll).toHaveBeenCalledWith('BEGINNER');
    });
  });

  describe('getAiPlayer', () => {
    it('should return an AI player by ID', async () => {
      const result: AiPlayerDto = {
        id: '1',
        name: 'Beginner Bot',
        difficulty: 'BEGINNER',
        description: 'An easy opponent',
      };

      mockAiPlayerService.findOne.mockResolvedValue(result);

      expect(await controller.getAiPlayer('1')).toBe(result);
      expect(mockAiPlayerService.findOne).toHaveBeenCalledWith('1');
    });
  });
});
