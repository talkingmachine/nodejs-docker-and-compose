import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { User } from '../users/entities/user.entity';
import { WishesService } from '../wishes/wishes.service';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistsRepository: Repository<Wishlist>,
    private readonly wishesService: WishesService,
  ) {}

  async create(owner: User, dto: CreateWishlistDto): Promise<Wishlist> {
    const items = await this.wishesService.findManyByIds(dto.itemsId || []);
    const wishlist = this.wishlistsRepository.create({
      name: dto.name,
      description: dto.description,
      image: dto.image,
      owner,
      items,
    });
    return this.wishlistsRepository.save(wishlist);
  }

  findMany(): Promise<Wishlist[]> {
    return this.wishlistsRepository.find({
      relations: ['owner', 'items'],
    });
  }

  async findOne(where: FindOptionsWhere<Wishlist>): Promise<Wishlist> {
    const wishlist = await this.wishlistsRepository.findOne({
      where,
      relations: ['owner', 'items'],
    });
    if (!wishlist) {
      throw new NotFoundException('Подборка не найдена');
    }
    return wishlist;
  }

  async updateOne(
    id: number,
    userId: number,
    dto: UpdateWishlistDto,
  ): Promise<Wishlist> {
    const wishlist = await this.findOne({ id });
    if (wishlist.owner.id !== userId) {
      throw new ForbiddenException('Нельзя редактировать чужую подборку');
    }
    if (dto.itemsId) {
      wishlist.items = await this.wishesService.findManyByIds(dto.itemsId);
    }
    if (dto.name !== undefined) wishlist.name = dto.name;
    if (dto.description !== undefined) wishlist.description = dto.description;
    if (dto.image !== undefined) wishlist.image = dto.image;
    return this.wishlistsRepository.save(wishlist);
  }

  async removeOne(id: number, userId: number): Promise<Wishlist> {
    const wishlist = await this.findOne({ id });
    if (wishlist.owner.id !== userId) {
      throw new ForbiddenException('Нельзя удалить чужую подборку');
    }
    await this.wishlistsRepository.delete(id);
    return wishlist;
  }
}
