import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WishesService } from './wishes.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wishes')
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Get('last')
  getLast() {
    return this.wishesService.findLast();
  }

  @Get('top')
  getTop() {
    return this.wishesService.findTop();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreateWishDto) {
    return this.wishesService.create(req.user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.wishesService.findOne({ id });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWishDto,
  ) {
    return this.wishesService.updateOne(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.wishesService.removeOne(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/copy')
  copy(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.wishesService.copy(id, req.user);
  }
}
