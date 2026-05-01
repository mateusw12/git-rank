import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'mateus@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Senha@1234', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
