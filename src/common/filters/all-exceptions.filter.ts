import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        // 使用类型断言处理未知的对象结构
        const resp = exceptionResponse as Record<string, unknown>;

        if (Array.isArray(resp.message)) {
          message = resp.message.join(', ');
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        } else if (typeof resp.error === 'string') {
          message = resp.error;
        }
      }
    }

    response.status(status).json({
      status,
      message,
      data: null,
    });
  }
}
