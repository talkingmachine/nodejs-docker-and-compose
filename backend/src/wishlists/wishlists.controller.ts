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
import { WishlistsService } from './wishlists.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('wishlistlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  findAll() {
    return this.wishlistsService.findMany();
  }

  @Post()
  create(@Req() req, @Body() dto: CreateWishlistDto) {
    return this.wishlistsService.create(req.user, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.wishlistsService.findOne({ id });
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWishlistDto,
  ) {
    return this.wishlistsService.updateOne(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.wishlistsService.removeOne(id, req.user.id);
  }
}
