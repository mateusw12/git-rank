import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Mateus' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'mateus@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Senha@1234', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
