import type { AppModule } from "../../common/interfaces/app-module.interface";
import { AuthController } from "./controller/auth.controller";
import { AuthRepository } from "./repository/auth.repository";
import { createAuthRouter } from "./routes/auth.routes";
import { AuthService } from "./service/auth.service";

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

export const authModule: AppModule = {
  name: "auth",
  basePath: "/auth",
  router: createAuthRouter(authController)
};
