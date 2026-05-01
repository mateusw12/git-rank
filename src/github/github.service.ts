import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GithubService {
  constructor(private readonly http: HttpService) {}

  async getUserRepository(username: string) {
    try {
      const response = await firstValueFrom(
        this.http.get(`/users/${username}/repos`)
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Erro ao buscar dados do GitHub',
        error.response?.status || 500
      );
    }
  }
}