import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ example: 'rank-user' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: { username: 'mateusw12', language: 'ts' }, required: false })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
