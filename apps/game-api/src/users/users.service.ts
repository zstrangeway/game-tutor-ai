import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getProfile() {
    return { message: 'Get current user profile endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateProfile(data: any) {
    return { message: 'Update user profile endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePreferences(data: any) {
    return { message: 'Update user preferences endpoint' };
  }

  getStats() {
    return { message: 'Get user statistics endpoint' };
  }
}
