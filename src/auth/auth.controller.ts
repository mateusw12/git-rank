import { Body, Controller, Get, Post } from '@nestjs/common';
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
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from './enums/user-role.enum';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
