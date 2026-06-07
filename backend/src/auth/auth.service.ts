import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { HashService } from '../hash/hash.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User> {
    const user = await this.usersService.findWithPassword(username);
    if (!user) {
      throw new UnauthorizedException('Неверные имя пользователя или пароль');
    }
    const isMatch = await this.hashService.verify(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Неверные имя пользователя или пароль');
    }
    return user;
  }

  auth(user: User) {
    return {
      access_token: this.jwtService.sign({ sub: user.id }),
    };
  }
}
