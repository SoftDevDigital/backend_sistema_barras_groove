import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { EventService } from '../services/event.service';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from '../dto/event.dto';
import { IEvent } from '../../shared/interfaces/event.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('events')
@UseGuards(JwtAuthGuard, RoleGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  async create(@Body() createEventDto: CreateEventDto): Promise<IEvent> {
    return this.eventService.create(createEventDto);
  }

  @Get()
  @Roles('admin', 'bartender')
  async findAll(@Query() query: EventQueryDto): Promise<IEvent[]> {
    return this.eventService.findAll(query);
  }

  @Get('active')
  @Roles('admin', 'bartender')
  async getActiveEvents(): Promise<IEvent[]> {
    return this.eventService.getActiveEvents();
  }

  @Get('closed')
  @Roles('admin', 'bartender')
  async getClosedEvents(): Promise<IEvent[]> {
    return this.eventService.getClosedEvents();
  }

  @Get('status/:status')
  @Roles('admin', 'bartender')
  async findByStatus(@Param('status') status: 'active' | 'closed'): Promise<IEvent[]> {
    return this.eventService.findByStatus(status);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  async findOne(@Param('id') id: string): Promise<IEvent> {
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto): Promise<IEvent> {
    return this.eventService.update(id, updateEventDto);
  }

  @Patch(':id/status/:status')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async changeStatus(
    @Param('id') id: string, 
    @Param('status') status: 'active' | 'closed'
  ): Promise<IEvent> {
    return this.eventService.changeStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ message: string; deletedEvent: IEvent }> {
    return this.eventService.remove(id);
  }
}
