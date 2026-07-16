import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { ContactsService } from '../services/contacts.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import {
  addContactSchema,
  updateContactSchema,
  contactParamsSchema,
  AddContactDto,
  UpdateContactDto,
  ContactParamsDto,
} from '../dto/contacts.dto';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des contacts' })
  @ApiResponse({ status: 200, description: 'Liste des contacts' })
  async getContacts(@CurrentUser('sub') userId: string) {
    return this.contactsService.getContacts(userId);
  }

  @Get('blocked')
  @ApiOperation({ summary: 'Liste des contacts bloques' })
  @ApiResponse({ status: 200, description: 'Liste des contacts bloques' })
  async getBlockedContacts(@CurrentUser('sub') userId: string) {
    return this.contactsService.getBlockedContacts(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Ajouter un contact par numero public' })
  @ApiResponse({ status: 201, description: 'Contact ajoute' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouve' })
  @ApiResponse({ status: 409, description: 'Deja dans les contacts' })
  async addContact(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(addContactSchema)) dto: AddContactDto,
  ) {
    return this.contactsService.addContact(userId, dto);
  }

  @Put(':contactId')
  @ApiOperation({ summary: 'Modifier un contact (alias, blocage)' })
  @ApiResponse({ status: 200, description: 'Contact modifie' })
  async updateContact(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(contactParamsSchema)) params: ContactParamsDto,
    @Body(new ZodValidationPipe(updateContactSchema)) dto: UpdateContactDto,
  ) {
    return this.contactsService.updateContact(userId, params.contactId, dto);
  }

  @Delete(':contactId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer un contact' })
  @ApiResponse({ status: 200, description: 'Contact supprime' })
  async removeContact(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(contactParamsSchema)) params: ContactParamsDto,
  ) {
    return this.contactsService.removeContact(userId, params.contactId);
  }

  @Post(':contactId/block')
  @ApiOperation({ summary: 'Bloquer un contact' })
  @ApiResponse({ status: 200, description: 'Contact bloque' })
  async blockContact(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(contactParamsSchema)) params: ContactParamsDto,
  ) {
    return this.contactsService.blockContact(userId, params.contactId);
  }

  @Post(':contactId/unblock')
  @ApiOperation({ summary: 'Debloquer un contact' })
  @ApiResponse({ status: 200, description: 'Contact debloque' })
  async unblockContact(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(contactParamsSchema)) params: ContactParamsDto,
  ) {
    return this.contactsService.unblockContact(userId, params.contactId);
  }
}
