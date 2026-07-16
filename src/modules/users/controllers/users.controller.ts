import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  updateProfileSchema,
  searchUsersSchema,
  publicNumberSchema,
  UpdateProfileDto,
  SearchUsersDto,
  PublicNumberDto,
} from '../dto/users.dto';
import { TokenPayload } from '../../auth/dto/token-payload.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil complet' })
  async me(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Mettre à jour son profil' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  @ApiResponse({ status: 409, description: 'Pseudo déjà pris' })
  async updateMe(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Rechercher des utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste d\'utilisateurs paginée' })
  async search(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(searchUsersSchema)) dto: SearchUsersDto,
  ) {
    return this.usersService.searchUsers(userId, dto);
  }

  @Get('public/:publicNumber')
  @ApiOperation({ summary: 'Obtenir un utilisateur par son numéro public' })
  @ApiResponse({ status: 200, description: 'Profil public de l\'utilisateur' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getByPublicNumber(
    @Param(new ZodValidationPipe(publicNumberSchema)) dto: PublicNumberDto,
  ) {
    return this.usersService.getUserByPublicNumber(dto);
  }
}