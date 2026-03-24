import type { AppModule } from "../../common/interfaces/app-module.interface";
import { UsersController } from "./controller/users.controller";
import { UsersRepository } from "./repository/users.repository";
import { createUsersRouter } from "./routes/users.routes";
import { UsersService } from "./service/users.service";

const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

export const usersModule: AppModule = {
  name: "users",
  basePath: "/users",
  router: createUsersRouter(usersController)
};
