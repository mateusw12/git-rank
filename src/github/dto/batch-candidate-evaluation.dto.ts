import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';

export class BatchCandidateEvaluationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(39, { each: true })
  @ApiProperty({
    example: ['mateusw12', 'octocat', 'torvalds'],
    description: 'An array of GitHub usernames to evaluate.',
  })
  usernames!: string[];
}
