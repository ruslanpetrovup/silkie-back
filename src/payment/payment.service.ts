import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import mongoose from 'mongoose';
import { Users } from 'src/auth/schemas/users.schema';
import { Basket } from 'src/basket/schemas/basket.schema';
import getBearerToken from 'src/methods/getBearerToken';
import getJwt from 'src/methods/getJwt';
import { Payment } from './schemas/payment.schema';
import generateOrderId from 'src/methods/generateOrderId';
import getCurrentDate from 'src/methods/getCurrentDate';
import { PrePayment } from 'src/profile/schemas/prepayment.schema';
import moment from 'moment';
import isDatePassed from 'src/methods/isDatePassed';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Users.name) private usersModelData: mongoose.Model<Users>,
    @InjectModel(Basket.name) private basketModel: mongoose.Model<Basket>,
    @InjectModel(Payment.name) private paymentModel: mongoose.Model<Payment>,
    @InjectModel(PrePayment.name)
    private prePaymentModel: mongoose.Model<PrePayment>,
  ) {}

  async createOrder(userId: string, req: Request) {
    const token = getBearerToken(req);

    if (!userId || !token) {
      return {
        code: 400,
        message: 'Not all arguments',
      };
    }

    try {
      const login = getJwt(token);

      if (!login) {
        return {
          code: 404,
          message: 'user not found',
        };
      }

      const currentUser = await this.usersModelData.findOne({
        userId: login.id,
      });

      if (!currentUser) {
        return {
          code: 404,
          message: 'user not found',
        };
      }

      if (currentUser.userId !== userId) {
        return {
          code: 403,
          message: 'You do not have permission',
        };
      }

      const basketUser = await this.basketModel.findOne({ userId: userId });

      if (!basketUser || !basketUser.basket || basketUser.basket.length !== 0) {
        return {
          code: 404,
          message: 'basket is empty',
        };
      }

      const totalPrice = basketUser.basket.reduce(
        (prev, item) => (prev += Number(item.price)),
        0,
      );

      const basketNames = await Promise.all(
        basketUser.basket.map(async (item) => {
          const name = await this.usersModelData.findOne({
            userId: item.userId,
          });

          return {
            ...item,
            firstName: name.firstName,
            lastName: name.lastName,
          };
        }),
      );

      const result = await this.paymentModel.create({
        orderId: generateOrderId(),
        userId: userId,
        date: getCurrentDate(),
        basket: basketNames,
        totalPrice: totalPrice,
      });

      await this.basketModel.findOneAndUpdate(
        { userId: userId },
        { basket: [] },
      );

      return {
        code: 200,
        data: result,
      };
    } catch (err) {
      console.log(err);
      return {
        code: 500,
        message: err,
      };
    }
  }

  async acceptOrder(orderId: string) {
    if (!orderId) {
      return {
        code: 400,
        message: 'Not all arguments',
      };
    }

    try {
      const checkOrder = await this.paymentModel.findOne({
        orderId: orderId,
        statusPayment: 'wait',
      });
      if (!checkOrder) {
        return {
          code: 404,
          message: 'order not found',
        };
      }

      await Promise.all(
        checkOrder.basket.map(async (item) => {
          const checkPrePayment = await this.prePaymentModel.findOne({
            userId: item.userId,
          });

          if (checkPrePayment) {
            const chickenNuggetsFilter =
              checkPrePayment.chickenNuggets.date.filter(
                (date) => !isDatePassed(date.endDate),
              );

            const canjaDeGalinhaFilter =
              checkPrePayment.canjaDeGalinha.date.filter(
                (date) => !isDatePassed(date.endDate),
              );

            const chickenNuggetsNew = item.chickenNuggetsDates.map((date) => {
              return {
                startDate: date,
                endDate: moment(date).add(30, 'days').format('DD.MM.YYYY'),
              };
            });
            const canjaDeGalinhaNew = item.canjaDeGalinhaDates.map((date) => {
              return {
                startDate: date,
                endDate: moment(date).add(30, 'days').format('DD.MM.YYYY'),
              };
            });

            await this.prePaymentModel.findOneAndUpdate(
              { userId: item.userId },
              {
                chickenNuggets: {
                  active:
                    [...chickenNuggetsFilter, ...chickenNuggetsNew].length !==
                    0,
                  date: [...chickenNuggetsFilter, ...chickenNuggetsNew],
                },
                canjaDeGalinha: {
                  active:
                    [...canjaDeGalinhaFilter, ...canjaDeGalinhaNew].length !==
                    0,
                  date: [...canjaDeGalinhaFilter, ...canjaDeGalinhaNew],
                },
              },
            );
          } else {
            const chickenNuggetsNew = item.chickenNuggetsDates.map((date) => {
              return {
                startDate: date,
                endDate: moment(date).add(30, 'days').format('DD.MM.YYYY'),
              };
            });
            const canjaDeGalinhaNew = item.canjaDeGalinhaDates.map((date) => {
              return {
                startDate: date,
                endDate: moment(date).add(30, 'days').format('DD.MM.YYYY'),
              };
            });

            await this.prePaymentModel.create({
              userId: item.userId,
              chickenNuggets: {
                active: chickenNuggetsNew.length !== 0,
                date: chickenNuggetsNew,
              },
              canjaDeGalinha: {
                active: canjaDeGalinhaNew.length !== 0,
                date: canjaDeGalinhaNew,
              },
            });
          }
        }),
      );

      await this.paymentModel.findOneAndUpdate(
        { orderId: orderId },
        { statusPayment: 'accept' },
      );

      return {
        code: 200,
        message: 'accept',
      };
    } catch (err) {
      return {
        code: 500,
        message: err,
      };
    }
  }

  async cancelOrder(orderId: string) {
    if (!orderId) {
      return {
        code: 400,
        message: 'Not all arguments',
      };
    }

    try {
      const checkOrder = await this.paymentModel.findOne({
        orderId: orderId,
        statusPayment: 'wait',
      });
      if (!checkOrder) {
        return {
          code: 404,
          message: 'order not found',
        };
      }

      await this.paymentModel.findOneAndUpdate(
        { orderId: orderId },
        { statusPayment: 'cancel' },
      );

      return {
        code: 200,
        message: 'ok',
      };
    } catch (err) {
      return {
        code: 500,
        message: err,
      };
    }
  }

  async historyOrder(userId: string, req: Request) {
    const token = getBearerToken(req);

    if (!userId || !token) {
      return {
        code: 400,
        message: 'Not all arguments',
      };
    }

    try {
      const login = getJwt(token);

      if (!login) {
        return {
          code: 404,
          message: 'user not found',
        };
      }

      const currentUser = await this.usersModelData.findOne({
        userId: login.id,
      });

      if (!currentUser) {
        return {
          code: 404,
          message: 'user not found',
        };
      }

      if (currentUser.userId !== userId) {
        return {
          code: 403,
          message: 'You do not have permission',
        };
      }

      const result = await this.paymentModel.find({
        userId: userId,
        statusPayment: 'accept',
      });

      return {
        code: 200,
        data: result,
      };
    } catch (err) {
      console.log(err);
      return {
        code: 500,
        message: err,
      };
    }
  }
}
