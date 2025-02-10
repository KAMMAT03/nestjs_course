import { ForbiddenException, Injectable } from "@nestjs/common";
import { DbService } from "src/db/db.service";
import { AuthDto } from "./dto";
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService{
  constructor(private db: DbService, private jwt: JwtService, private config: ConfigService) {}

  async signUp(dto: AuthDto) {
    try {
      const hash = await argon.hash(dto.password);
  
      const user = await this.db.user.create({
        data: {
          email: dto.email,
          password: hash
        }
      })
  
      return this.signToken(user.id, user.email);
    }
    catch(error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials already taken');
        }
      }

      throw error;
    }
  }

  async signIn(dto: AuthDto) {
    const user = await this.db.user.findUnique({
      where: {
        email: dto.email
      }
    });

    if (!user) throw new ForbiddenException('Incorrect credentials');

    const passwordMatches = await argon.verify(
      user.password,
      dto.password
    );

    if (!passwordMatches) {
      throw new ForbiddenException('Incorrect credentials');
    }
    
    return this.signToken(user.id, user.email);
  }

  async signToken(userId: number, email: string): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email: email,
    }

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: this.config.get('JWT_SECRET')
    })
    
    return {
      access_token: token
    }
  }
}
