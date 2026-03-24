import request from "supertest";

import { createApp } from "../../src/app/app";

const app = createApp();

export const getTestApp = () => app;

export const api = () => request(app);
