export type ServiceErrorStatus = 400 | 404 | 500;

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status: ServiceErrorStatus
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
