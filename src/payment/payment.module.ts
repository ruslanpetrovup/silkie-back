import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Users, UsersSchema } from 'src/auth/schemas/users.schema';
import { Basket, BasketSchema } from 'src/basket/schemas/basket.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  PrePayment,
  PrePaymentSchema,
} from 'src/profile/schemas/prepayment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Users.name, schema: UsersSchema },
      { name: Basket.name, schema: BasketSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: PrePayment.name, schema: PrePaymentSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
