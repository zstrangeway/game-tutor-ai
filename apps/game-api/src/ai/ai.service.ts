import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFeedback(data: any) {
    return { message: 'Get AI feedback on a position endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAnalysis(data: any) {
    return { message: 'Request post-game analysis endpoint' };
  }
}
