import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom HTTP Error class
 */
export class HttpError extends HttpException {
  constructor(
    public readonly message: string,
    public readonly statusCode: HttpStatus,
    public readonly errorName?: string,
  ) {
    super(message, statusCode);
    this.name = errorName || this.constructor.name;
  }

  static isHttpError(error: HttpError | HttpException): error is HttpError {
    return error instanceof HttpError || error instanceof HttpException;
  }

  static badRequest(message: string = 'Bad request') {
    return new HttpError(message, HttpStatus.BAD_REQUEST, 'BadRequestError');
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new HttpError(message, HttpStatus.UNAUTHORIZED, 'UnauthorizedError');
  }

  static forbidden(message: string = 'Forbidden') {
    return new HttpError(message, HttpStatus.FORBIDDEN, 'ForbiddenError');
  }

  static notFound(message: string = 'Not found') {
    return new HttpError(message, HttpStatus.NOT_FOUND, 'NotFoundError');
  }

  static conflict(message: string = 'Conflict') {
    return new HttpError(message, HttpStatus.CONFLICT, 'ConflictError');
  }

  static internalServerError(message: string = 'Internal server error') {
    return new HttpError(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'InternalServerError',
    );
  }
}
