import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRequest } from '../common/decorators/user-request.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ApiKeyService } from './api-key.service';
import { AuthService } from './auth.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from './enums/user-role.enum';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Cadastra usuario e gera access/refresh token' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Autentica usuario e gera access/refresh token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Revalida sessao usando refresh token e rotaciona os tokens' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Retorna o usuario autenticado da requisicao.' })
  @ApiOperation({ summary: 'Retorna dados do usuario autenticado' })
  me(@UserRequest() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @Get('admin/ping')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rota privada para usuarios com role admin' })
  adminPing() {
    return {
      message: 'Acesso de admin autorizado',
    };
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Encerra a sessao do usuario autenticado' })
  logout(@UserRequest() user: AuthenticatedUser) {
    return this.authService.logout(user.id);
  }

  @Post('api-keys')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gera uma nova API key para integracoes externas' })
  createApiKey(
    @UserRequest() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.createApiKey(user.id, dto);
  }

  @Get('api-keys')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lista as API keys do usuario autenticado' })
  listApiKeys(@UserRequest() user: AuthenticatedUser) {
    return this.apiKeyService.listApiKeys(user.id);
  }

  @Delete('api-keys/:apiKeyId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoga uma API key do usuario autenticado' })
  revokeApiKey(
    @UserRequest() user: AuthenticatedUser,
    @Param('apiKeyId') apiKeyId: string,
  ) {
    return this.apiKeyService.revokeApiKey(user.id, apiKeyId);
  }
}
