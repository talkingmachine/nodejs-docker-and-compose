import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @SerializeOptions({ groups: ['profile'] })
  getMe(@Req() req) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @SerializeOptions({ groups: ['profile'] })
  updateMe(@Req() req, @Body() dto: UpdateUserDto) {
    return this.usersService.updateOne(req.user.id, dto);
  }

  @Get('me/wishes')
  getMyWishes(@Req() req) {
    return this.usersService.findUserWishes(req.user.id);
  }

  @Post('find')
  findMany(@Body() dto: FindUsersDto) {
    return this.usersService.findMany(dto.query);
  }

  @Get(':username')
  getByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Get(':username/wishes')
  async getUserWishes(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    return this.usersService.findUserWishes(user.id);
  }
}
