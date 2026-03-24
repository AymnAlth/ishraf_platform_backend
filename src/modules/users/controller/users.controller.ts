import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { CreateUserRequestDto } from "../dto/create-user.dto";
import type { UpdateUserRequestDto } from "../dto/update-user.dto";
import type { UpdateUserStatusRequestDto } from "../dto/update-user-status.dto";
import type { ListUsersQuery, UserRouteParams } from "../types/users.types";
import type { UsersService } from "../service/users.service";

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  async create(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateUserRequestDto;
    const response = await this.usersService.createUser(payload);

    res.status(201).json(buildSuccessResponse("User created successfully", response));
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListUsersQuery;
    const response = await this.usersService.listUsers(query);

    res.status(200).json(buildSuccessResponse("Users fetched successfully", response));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as UserRouteParams;
    const response = await this.usersService.getUserById(params.id);

    res.status(200).json(buildSuccessResponse("User fetched successfully", response));
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as UserRouteParams;
    const payload = req.validated?.body as UpdateUserRequestDto;
    const response = await this.usersService.updateUser(params.id, payload);

    res.status(200).json(buildSuccessResponse("User updated successfully", response));
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as UserRouteParams;
    const payload = req.validated?.body as UpdateUserStatusRequestDto;
    const response = await this.usersService.updateUserStatus(params.id, payload);

    res
      .status(200)
      .json(buildSuccessResponse("User status updated successfully", response));
  }
}
