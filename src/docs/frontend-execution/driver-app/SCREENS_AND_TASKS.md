# Driver App Screens And Tasks

## 1. Core flow

1. login
2. hydrate driver session
3. load assigned routes with `GET /transport/route-assignments/me`

## 2. Daily trip flow

1. choose route assignment
2. call `POST /transport/trips/ensure-daily`
3. inspect trip detail and student roster
4. start the trip
5. stream locations through repeated `POST /transport/trips/:id/locations`
6. record student events
7. end the trip

## 3. State machine

```text
scheduled
  -> start
started
  -> locations
  -> student events
  -> end
ended
  -> student events still allowed
cancelled
  enum value only in this round; no dedicated route transition is documented
```

قواعد:

- لا تسجل locations قبل `start`.
- لا تنفذ `end` قبل `start`.
- student events تعمل فقط أثناء `started` أو `ended`.

## 4. Student event flow

1. load roster for one trip
2. choose student
3. choose `eventType`
4. apply stop rules:
   - `boarded` يحتاج `stopId`
   - `dropped_off` يحتاج `stopId`
   - `absent` يمنع `stopId`
5. submit event

## 5. Driver monitoring

1. load `GET /reporting/transport/summary`
2. use communication surfaces for operational coordination
