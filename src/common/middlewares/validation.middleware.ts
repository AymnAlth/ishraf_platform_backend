import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";

import { ValidationError } from "../errors/validation-error";
import type { ErrorDetail } from "../types/http.types";

interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

const mapZodIssues = (error: ZodError): ErrorDetail[] =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    code: issue.code,
    message: issue.message
  }));

export const validateRequest =
  (schemas: RequestSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined
      };

      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError("Validation failed", mapZodIssues(error)));
        return;
      }

      next(error);
    }
  };
