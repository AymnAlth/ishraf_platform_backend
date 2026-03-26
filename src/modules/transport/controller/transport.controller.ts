import type { Request, Response } from "express";

import { buildSuccessResponse } from "../../../common/base/http-response";
import type { AuthenticatedUser } from "../../../common/types/auth.types";
import type {
  AssignmentIdParamsDto,
  CreateBusRequestDto,
  CreateRouteRequestDto,
  CreateRouteStopRequestDto,
  CreateStudentBusAssignmentRequestDto,
  CreateTransportRouteAssignmentRequestDto,
  CreateTripRequestDto,
  CreateTripStudentEventRequestDto,
  DeactivateStudentBusAssignmentRequestDto,
  DeactivateTransportRouteAssignmentRequestDto,
  EnsureDailyTripRequestDto,
  ListTripsQueryDto,
  RecordTripLocationRequestDto,
  RouteIdParamsDto,
  StudentIdParamsDto,
  TripIdParamsDto,
  TripStudentRosterQueryDto,
  SaveStudentHomeLocationRequestDto
} from "../dto/transport.dto";
import type { TransportService } from "../service/transport.service";

const assertAuthUser = (req: Request): AuthenticatedUser => req.authUser as AuthenticatedUser;

export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  async createBus(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateBusRequestDto;
    const response = await this.transportService.createBus(assertAuthUser(req), payload);
    res.status(201).json(buildSuccessResponse("Bus created successfully", response));
  }

  async listBuses(req: Request, res: Response): Promise<void> {
    const response = await this.transportService.listBuses(assertAuthUser(req));
    res.status(200).json(buildSuccessResponse("Buses fetched successfully", response));
  }

  async createRoute(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateRouteRequestDto;
    const response = await this.transportService.createRoute(assertAuthUser(req), payload);
    res.status(201).json(buildSuccessResponse("Route created successfully", response));
  }

  async listRoutes(req: Request, res: Response): Promise<void> {
    const response = await this.transportService.listRoutes(assertAuthUser(req));
    res.status(200).json(buildSuccessResponse("Routes fetched successfully", response));
  }

  async createRouteStop(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as RouteIdParamsDto;
    const payload = req.validated?.body as CreateRouteStopRequestDto;
    const response = await this.transportService.createRouteStop(
      assertAuthUser(req),
      params.routeId,
      payload
    );
    res.status(201).json(buildSuccessResponse("Route stop created successfully", response));
  }

  async listRouteStops(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as RouteIdParamsDto;
    const response = await this.transportService.listRouteStops(
      assertAuthUser(req),
      params.routeId
    );
    res.status(200).json(buildSuccessResponse("Route stops fetched successfully", response));
  }

  async createStudentAssignment(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateStudentBusAssignmentRequestDto;
    const response = await this.transportService.createStudentAssignment(
      assertAuthUser(req),
      payload
    );
    res
      .status(201)
      .json(buildSuccessResponse("Student transport assignment created successfully", response));
  }

  async deactivateStudentAssignment(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AssignmentIdParamsDto;
    const payload = req.validated?.body as DeactivateStudentBusAssignmentRequestDto;
    const response = await this.transportService.deactivateStudentAssignment(
      assertAuthUser(req),
      params.id,
      payload
    );
    res
      .status(200)
      .json(buildSuccessResponse("Student transport assignment deactivated successfully", response));
  }

  async listActiveAssignments(req: Request, res: Response): Promise<void> {
    const response = await this.transportService.listActiveAssignments(assertAuthUser(req));
    res
      .status(200)
      .json(buildSuccessResponse("Active student transport assignments fetched successfully", response));
  }

  async createRouteAssignment(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateTransportRouteAssignmentRequestDto;
    const response = await this.transportService.createRouteAssignment(
      assertAuthUser(req),
      payload
    );
    res
      .status(201)
      .json(buildSuccessResponse("Transport route assignment created successfully", response));
  }

  async listRouteAssignments(req: Request, res: Response): Promise<void> {
    const response = await this.transportService.listRouteAssignments(assertAuthUser(req));
    res
      .status(200)
      .json(buildSuccessResponse("Transport route assignments fetched successfully", response));
  }

  async deactivateRouteAssignment(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as AssignmentIdParamsDto;
    const payload = req.validated?.body as DeactivateTransportRouteAssignmentRequestDto;
    const response = await this.transportService.deactivateRouteAssignment(
      assertAuthUser(req),
      params.id,
      payload
    );
    res
      .status(200)
      .json(buildSuccessResponse("Transport route assignment deactivated successfully", response));
  }

  async listMyRouteAssignments(req: Request, res: Response): Promise<void> {
    const response = await this.transportService.listMyRouteAssignments(assertAuthUser(req));
    res
      .status(200)
      .json(buildSuccessResponse("My transport route assignments fetched successfully", response));
  }

  async createTrip(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as CreateTripRequestDto;
    const response = await this.transportService.createTrip(assertAuthUser(req), payload);
    res.status(201).json(buildSuccessResponse("Trip created successfully", response));
  }

  async ensureDailyTrip(req: Request, res: Response): Promise<void> {
    const payload = req.validated?.body as EnsureDailyTripRequestDto;
    const response = await this.transportService.ensureDailyTrip(assertAuthUser(req), payload);
    res.status(200).json(buildSuccessResponse("Daily trip ensured successfully", response));
  }

  async listTrips(req: Request, res: Response): Promise<void> {
    const query = req.validated?.query as ListTripsQueryDto;
    const response = await this.transportService.listTrips(assertAuthUser(req), query);
    res.status(200).json(buildSuccessResponse("Trips fetched successfully", response));
  }

  async getTripById(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as TripIdParamsDto;
    const response = await this.transportService.getTripById(assertAuthUser(req), params.id);
    res.status(200).json(buildSuccessResponse("Trip fetched successfully", response));
  }

  async getTripStudentRoster(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as TripIdParamsDto;
    const query = req.validated?.query as TripStudentRosterQueryDto;
    const response = await this.transportService.getTripStudentRoster(
      assertAuthUser(req),
      params.id,
      query
    );
    res
      .status(200)
      .json(buildSuccessResponse("Trip students roster returned successfully", response));
  }

  async startTrip(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as TripIdParamsDto;
    const response = await this.transportService.startTrip(assertAuthUser(req), params.id);
    res.status(200).json(buildSuccessResponse("Trip started successfully", response));
  }

  async endTrip(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as TripIdParamsDto;
    const response = await this.transportService.endTrip(assertAuthUser(req), params.id);
    res.status(200).json(buildSuccessResponse("Trip ended successfully", response));
  }

  async recordTripLocation(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as TripIdParamsDto;
    const payload = req.validated?.body as RecordTripLocationRequestDto;
    const response = await this.transportService.recordTripLocation(
      assertAuthUser(req),
      params.id,
      payload
    );
    res.status(201).json(buildSuccessResponse("Trip location recorded successfully", response));
  }

  async createTripStudentEvent(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as TripIdParamsDto;
    const payload = req.validated?.body as CreateTripStudentEventRequestDto;
    const response = await this.transportService.createTripStudentEvent(
      assertAuthUser(req),
      params.id,
      payload
    );
    res.status(201).json(buildSuccessResponse("Trip student event created successfully", response));
  }

  async listTripEvents(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as TripIdParamsDto;
    const response = await this.transportService.listTripEvents(assertAuthUser(req), params.id);
    res.status(200).json(buildSuccessResponse("Trip student events fetched successfully", response));
  }

  async getStudentHomeLocation(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const response = await this.transportService.getStudentHomeLocation(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Student home location fetched successfully", response));
  }

  async saveStudentHomeLocation(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const payload = req.validated?.body as SaveStudentHomeLocationRequestDto;
    const response = await this.transportService.saveStudentHomeLocation(
      assertAuthUser(req),
      params.studentId,
      payload
    );
    res
      .status(200)
      .json(buildSuccessResponse("Student home location saved successfully", response));
  }

  async deleteStudentHomeLocation(req: Request, res: Response): Promise<void> {
    const params = req.validated?.params as StudentIdParamsDto;
    const response = await this.transportService.deleteStudentHomeLocation(
      assertAuthUser(req),
      params.studentId
    );
    res
      .status(200)
      .json(buildSuccessResponse("Student home location deleted successfully", response));
  }
}
