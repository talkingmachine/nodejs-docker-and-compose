import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Wish } from './entities/wish.entity';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WishesService {
  constructor(
    @InjectRepository(Wish)
    private readonly wishesRepository: Repository<Wish>,
  ) {}

  create(owner: User, dto: CreateWishDto): Promise<Wish> {
    const wish = this.wishesRepository.create({ ...dto, owner });
    return this.wishesRepository.save(wish);
  }

  async findOne(where: FindOptionsWhere<Wish>): Promise<Wish> {
    const wish = await this.wishesRepository.findOne({
      where,
      relations: ['owner', 'offers', 'offers.user'],
    });
    if (!wish) {
      throw new NotFoundException('Подарок не найден');
    }
    return wish;
  }

  findMany(where: FindOptionsWhere<Wish>): Promise<Wish[]> {
    return this.wishesRepository.find({ where, relations: ['owner'] });
  }

  findManyByIds(ids: number[]): Promise<Wish[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.wishesRepository.find({ where: { id: In(ids) } });
  }

  findLast(): Promise<Wish[]> {
    return this.wishesRepository.find({
      order: { createdAt: 'DESC' },
      take: 40,
      relations: ['owner'],
    });
  }

  findTop(): Promise<Wish[]> {
    return this.wishesRepository.find({
      order: { copied: 'DESC' },
      take: 10,
      relations: ['owner'],
    });
  }

  async updateOne(
    id: number,
    userId: number,
    dto: UpdateWishDto,
  ): Promise<Wish> {
    const wish = await this.findOne({ id });
    if (wish.owner.id !== userId) {
      throw new ForbiddenException('Нельзя редактировать чужой подарок');
    }
    if (dto.price !== undefined && Number(wish.raised) > 0) {
      throw new ForbiddenException(
        'Нельзя менять стоимость, если уже есть желающие скинуться',
      );
    }
    await this.wishesRepository.update(id, dto);
    return this.findOne({ id });
  }

  async removeOne(id: number, userId: number): Promise<Wish> {
    const wish = await this.findOne({ id });
    if (wish.owner.id !== userId) {
      throw new ForbiddenException('Нельзя удалить чужой подарок');
    }
    await this.wishesRepository.delete(id);
    return wish;
  }

  async copy(id: number, user: User): Promise<Wish> {
    const original = await this.findOne({ id });
    if (original.owner.id === user.id) {
      throw new ForbiddenException('Нельзя скопировать собственный подарок');
    }
    await this.wishesRepository.increment({ id }, 'copied', 1);
    const copy = this.wishesRepository.create({
      name: original.name,
      link: original.link,
      image: original.image,
      price: original.price,
      description: original.description,
      owner: user,
    });
    await this.wishesRepository.save(copy);
    return copy;
  }

  async updateRaised(id: number, raised: number): Promise<void> {
    await this.wishesRepository.update(id, { raised });
  }
}
