import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (typeof payload === 'object' && payload !== null) {
        const maybeMessage = (payload as { message?: string | string[] }).message;
        message = maybeMessage ?? message;
      }
    } else if (exception instanceof Error) {
      // Previous code (before this block):
      // else {
      //   response.status(status).json({
      //     statusCode: status,
      //     path: request.url,
      //     timestamp: new Date().toISOString(),
      //     message, // always "Internal server error"
      //   });
      // }
      // For non-HttpExceptions, return the actual error message to make debugging possible.
      // Also log it so we can find the full stack in server logs.
      // eslint-disable-next-line no-console
      console.error(exception);
      message = exception.message || message;
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
