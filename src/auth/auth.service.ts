import { ForbiddenException, Injectable } from "@nestjs/common";
import { DbService } from "src/db/db.service";
import { AuthDto } from "./dto";
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

@Injectable()
export class AuthService{
  constructor(private db: DbService) {}

  async signUp(dto: AuthDto) {
    try {
      const hash = await argon.hash(dto.password);
  
      const user = await this.db.user.create({
        data: {
          email: dto.email,
          password: hash
        }
      })
  
      return user;
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
    
    return user;
  }
}
