import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
  ) {}

  create(userId: string, dto: CreateNotificationDto) {
    return this.repo.save(this.repo.create({ ...dto, userId }));
  }

  findAll(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAllPaginated(userId: string, query: PaginationQueryDto) {
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const registros = Math.min(100, Math.max(1, Number(query.registros) || 10));

    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .skip((pagina - 1) * registros)
      .take(registros);

    const buscar = query.buscar?.trim();
    if (buscar) {
      qb.andWhere('(n.title ILIKE :s OR n.body ILIKE :s)', { s: `%${buscar}%` });
    }
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(userId: string, id: string) {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada.`);
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta notificación.');
    }
    return notification;
  }

  async update(userId: string, id: string, dto: UpdateNotificationDto) {
    const notification = await this.findOne(userId, id);
    Object.assign(notification, dto);
    return this.repo.save(notification);
  }

  async remove(userId: string, id: string) {
    const notification = await this.findOne(userId, id);
    await this.repo.remove(notification);
    return { id };
  }
}
