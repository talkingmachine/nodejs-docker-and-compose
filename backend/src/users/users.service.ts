import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashService } from '../hash/hash.service';
import { Wish } from '../wishes/entities/wish.entity';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly hashService: HashService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const password = await this.hashService.hash(dto.password);
    const user = this.usersRepository.create({ ...dto, password });
    try {
      return await this.usersRepository.save(user);
    } catch (err) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'Пользователь с таким email или username уже зарегистрирован',
        );
      }
      throw err;
    }
  }

  async findOne(where: FindOptionsWhere<User>): Promise<User> {
    const user = await this.usersRepository.findOne({ where });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  findByUsername(username: string): Promise<User> {
    return this.findOne({ username });
  }

  findById(id: number): Promise<User> {
    return this.findOne({ id });
  }

  findWithPassword(username: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { username },
      select: ['id', 'username', 'email', 'password'],
    });
  }

  findMany(query: string): Promise<User[]> {
    return this.usersRepository.find({
      where: [
        { username: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
      ],
    });
  }

  async updateOne(id: number, dto: UpdateUserDto): Promise<User> {
    if (dto.password) {
      dto.password = await this.hashService.hash(dto.password);
    }
    try {
      await this.usersRepository.update(id, dto);
    } catch (err) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'Пользователь с таким email или username уже существует',
        );
      }
      throw err;
    }
    return this.findById(id);
  }

  async removeOne(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async findUserWishes(id: number): Promise<Wish[]> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: [
        'wishes',
        'wishes.owner',
        'wishes.offers',
        'wishes.offers.user',
      ],
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user.wishes;
  }
}
