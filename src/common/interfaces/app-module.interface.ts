import type { Router } from "express";

export interface AppModule {
  name: string;
  basePath: string;
  router: Router;
}
