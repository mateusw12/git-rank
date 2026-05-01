import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeApiKeyDto {
  @ApiProperty({ example: 'api_key_id' })
  @IsString()
  @IsNotEmpty()
  apiKeyId!: string;
}
