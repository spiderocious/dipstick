import type { NextFunction, Request, Response } from 'express';

// Wraps an async route handler so thrown errors flow to the central error
// middleware. Without this every handler needs its own try/catch.
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
