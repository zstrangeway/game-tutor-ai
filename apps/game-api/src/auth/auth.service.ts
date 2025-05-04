import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register(data: any) {
    return { message: 'User registration endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login(data: any) {
    return { message: 'User login endpoint' };
  }

  logout() {
    return { message: 'User logout endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verify(data: any) {
    return { message: 'Email verification endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  requestResetPassword(data: any) {
    return { message: 'Password reset request endpoint' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resetPassword(data: any) {
    return { message: 'Process password reset endpoint' };
  }
}
