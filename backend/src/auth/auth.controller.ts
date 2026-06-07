import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('signup')
  signup(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signin(@Req() req) {
    return this.authService.auth(req.user);
  }
}
