import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Users, UsersSchema } from 'src/auth/schemas/users.schema';
import { users } from 'src/auth/entities/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrePayment, PrePaymentSchema } from './schemas/prepayment.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([users]),
    MongooseModule.forFeature([
      { name: Users.name, schema: UsersSchema },
      { name: PrePayment.name, schema: PrePaymentSchema },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
