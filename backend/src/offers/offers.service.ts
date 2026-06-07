import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { User } from '../users/entities/user.entity';
import { WishesService } from '../wishes/wishes.service';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offersRepository: Repository<Offer>,
    private readonly wishesService: WishesService,
  ) {}

  async create(user: User, dto: CreateOfferDto): Promise<Offer> {
    const wish = await this.wishesService.findOne({ id: dto.itemId });
    if (wish.owner.id === user.id) {
      throw new ForbiddenException('Нельзя скидываться на собственный подарок');
    }
    const newRaised = Number(wish.raised) + Number(dto.amount);
    if (newRaised > Number(wish.price)) {
      throw new BadRequestException('Сумма заявок превышает стоимость подарка');
    }
    const offer = this.offersRepository.create({
      amount: dto.amount,
      hidden: dto.hidden ?? false,
      user,
      item: wish,
    });
    const saved = await this.offersRepository.save(offer);
    await this.wishesService.updateRaised(wish.id, newRaised);
    return saved;
  }

  findMany(): Promise<Offer[]> {
    return this.offersRepository.find({
      relations: ['user', 'item', 'item.owner'],
    });
  }

  async findOne(where: FindOptionsWhere<Offer>): Promise<Offer> {
    const offer = await this.offersRepository.findOne({
      where,
      relations: ['user', 'item', 'item.owner'],
    });
    if (!offer) {
      throw new NotFoundException('Заявка не найдена');
    }
    return offer;
  }
}
