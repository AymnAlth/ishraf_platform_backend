import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const docsDir = path.join(root, "src", "docs");
const openapiDir = path.join(docsDir, "openapi");
const postmanDir = path.join(docsDir, "postman");
const auditPath = path.join(docsDir, "OPENAPI_POSTMAN_AUDIT.md");

const API_SERVER_URL = "https://ishraf-platform-backend-staging.onrender.com/api/v1";
const ROOT_SERVER_URL = "https://ishraf-platform-backend-staging.onrender.com";
const LOCAL_API_SERVER_URL = "http://localhost:4000/api/v1";
const LOCAL_ROOT_SERVER_URL = "http://localhost:4000";
const runtimeNow = new Date();
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Aden",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(runtimeNow);
const NOW = runtimeNow.toISOString();

const ROOT_SERVERS = [
  { url: ROOT_SERVER_URL, description: "Hosted staging on Render" },
  { url: LOCAL_ROOT_SERVER_URL, description: "Local development" }
];

const API_SERVERS = [
  { url: API_SERVER_URL, description: "Hosted staging on Render" },
  { url: LOCAL_API_SERVER_URL, description: "Local development" }
];

const TAG_ORDER = [
  "Health",
  "Auth",
  "Users",
  "Academic Structure",
  "Students",
  "System Settings",
  "Attendance",
  "Assessments",
  "Behavior",
  "Transport",
  "Communication",
  "Admin Imports",
  "Homework",
  "Reporting"
];

const tagDescriptions = {
  Health: "Service health and readiness endpoints mounted outside /api/v1.",
  Auth: "Authentication, session lifecycle, password recovery, and current-user endpoints.",
  Users: "Admin-only user management endpoints for all roles.",
  "Academic Structure":
    "Admin-only academic years, semesters, grade levels, classes, subjects, and staff assignment endpoints.",
  Students: "Admin-only student lifecycle, parent linking, and promotion endpoints.",
  "System Settings":
    "Admin-only global feature flags, settings audit, and integration outbox summary endpoints.",
  Attendance:
    "Session-based attendance endpoints used by admin, teachers, and supervisors.",
  Assessments: "Assessment types, assessments, and student score roster endpoints.",
  Behavior: "Behavior categories, behavior records, and student behavior timelines.",
  Transport:
    "Transport static data, assignments, trips, live locations, and trip student events.",
  Communication:
    "Direct messages, announcements, and notification center endpoints.",
  "Admin Imports":
    "Admin-only school onboarding import endpoints for dry-run, apply, and import audit history.",
  Homework: "Homework management, submission rosters, and student homework surfaces.",
  Reporting:
    "Role dashboards, student-scoped reports, transport summaries, and parent live-status endpoints."
};

const moduleSources = [
  { key: "auth", tag: "Auth", basePath: "/auth", routeFile: "src/modules/auth/routes/auth.routes.ts" },
  { key: "users", tag: "Users", basePath: "/users", routeFile: "src/modules/users/routes/users.routes.ts" },
  {
    key: "academic-structure",
    tag: "Academic Structure",
    basePath: "/academic-structure",
    routeFile: "src/modules/academic-structure/routes/academic-structure.routes.ts"
  },
  {
    key: "students",
    tag: "Students",
    basePath: "/students",
    routeFile: "src/modules/students/routes/students.routes.ts"
  },
  {
    key: "system-settings",
    tag: "System Settings",
    basePath: "/system-settings",
    routeFile: "src/modules/system-settings/routes/system-settings.routes.ts"
  },
  {
    key: "behavior",
    tag: "Behavior",
    basePath: "/behavior",
    routeFile: "src/modules/behavior/routes/behavior.routes.ts"
  },
  {
    key: "assessments",
    tag: "Assessments",
    basePath: "/assessments",
    routeFile: "src/modules/assessments/routes/assessments.routes.ts"
  },
  {
    key: "attendance",
    tag: "Attendance",
    basePath: "/attendance",
    routeFile: "src/modules/attendance/routes/attendance.routes.ts"
  },
  {
    key: "transport",
    tag: "Transport",
    basePath: "/transport",
    routeFile: "src/modules/transport/routes/transport.routes.ts"
  },
  {
    key: "communication",
    tag: "Communication",
    basePath: "/communication",
    routeFile: "src/modules/communication/routes/communication.routes.ts"
  },
  {
    key: "admin-imports",
    tag: "Admin Imports",
    basePath: "/admin-imports",
    routeFile: "src/modules/admin-imports/routes/admin-imports.routes.ts"
  },
  {
    key: "homework",
    tag: "Homework",
    basePath: "/homework",
    routeFile: "src/modules/homework/routes/homework.routes.ts"
  },
  {
    key: "reporting",
    tag: "Reporting",
    basePath: "/reporting",
    routeFile: "src/modules/reporting/routes/reporting.routes.ts"
  }
];

const idPattern = "^[0-9]+$";
const numericIdSchema = { type: "string", pattern: idPattern, example: "1" };
const dateSchema = {
  type: "string",
  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
  example: TODAY
};
const dateTimeSchema = { type: "string", format: "date-time", example: NOW };
const ATTENDANCE_STATUS_VALUES = ["present", "absent", "late", "excused"];
const HOMEWORK_SUBMISSION_STATUS_VALUES = ["submitted", "not_submitted", "late"];
const SYSTEM_SETTING_GROUP_VALUES = [
  "pushNotifications",
  "transportMaps",
  "analytics",
  "imports"
];
const SYSTEM_SETTING_AUDIT_ACTION_VALUES = ["created", "updated", "cleared"];
const SYSTEM_INTEGRATION_PROVIDER_KEYS = [
  "pushNotifications",
  "transportMaps",
  "analytics"
];
const BUS_STATUS_VALUES = ["active", "inactive", "maintenance"];
const TRIP_TYPE_VALUES = ["pickup", "dropoff"];
const TRIP_STATUS_VALUES = ["scheduled", "started", "ended", "cancelled"];
const TRIP_STUDENT_EVENT_TYPE_VALUES = ["boarded", "dropped_off", "absent"];
const HOME_LOCATION_STATUS_VALUES = ["pending", "approved", "rejected"];
const paginationExample = { page: 1, limit: 20, totalItems: 1, totalPages: 1 };
const schoolOnboardingWorkbookExample = {
  sheets: {
    README: { sheetId: "README", present: true, headers: ["section", "instruction"], rows: [] },
    CONFIG: {
      sheetId: "CONFIG",
      present: true,
      headers: ["setting_key", "setting_value", "edit_policy", "note"],
      rows: [{ rowNumber: 2, values: { setting_key: "activate_after_import", setting_value: "false", edit_policy: "frontend-driven", note: "يضبط من الواجهة" } }]
    },
    LOOKUPS_ENUMS: { sheetId: "LOOKUPS_ENUMS", present: true, headers: ["lookup_name", "allowed_value", "display_label"], rows: [] },
    REF_EXISTING_ACADEMIC: { sheetId: "REF_EXISTING_ACADEMIC", present: true, headers: ["entity_type", "parent_name", "code", "name", "secondary_name", "status"], rows: [] },
    REF_EXISTING_USERS: { sheetId: "REF_EXISTING_USERS", present: true, headers: ["role", "full_name", "phone", "email", "status"], rows: [] },
    AcademicYears: {
      sheetId: "AcademicYears",
      present: true,
      headers: ["year_name", "start_date", "end_date"],
      rows: [{ rowNumber: 2, values: { year_name: "2026-2027", start_date: "2026-09-01", end_date: "2027-06-30" } }]
    },
    Semesters: {
      sheetId: "Semesters",
      present: true,
      headers: ["academic_year_name", "semester_name", "start_date", "end_date"],
      rows: [{ rowNumber: 2, values: { academic_year_name: "2026-2027", semester_name: "الفصل الأول", start_date: "2026-09-01", end_date: "2027-01-31" } }]
    },
    GradeLevels: {
      sheetId: "GradeLevels",
      present: true,
      headers: ["grade_level_name", "level_order"],
      rows: [{ rowNumber: 2, values: { grade_level_name: "الصف الرابع", level_order: 4 } }]
    },
    Classes: {
      sheetId: "Classes",
      present: true,
      headers: ["academic_year_name", "grade_level_name", "class_name", "section", "capacity", "is_active"],
      rows: [{ rowNumber: 2, values: { academic_year_name: "2026-2027", grade_level_name: "الصف الرابع", class_name: "أ", section: "علوم", capacity: 35, is_active: "true" } }]
    },
    Subjects: {
      sheetId: "Subjects",
      present: true,
      headers: ["grade_level_name", "subject_code", "subject_name", "is_active"],
      rows: [{ rowNumber: 2, values: { grade_level_name: "الصف الرابع", subject_code: "AR4", subject_name: "اللغة العربية", is_active: "true" } }]
    },
    Users_Teachers: {
      sheetId: "Users_Teachers",
      present: true,
      headers: ["full_name", "phone", "email", "specialization", "qualification", "hire_date"],
      rows: [{ rowNumber: 2, values: { full_name: "المعلم سامي", phone: "0900000101", email: "teacher-import@example.com", specialization: "لغة عربية", qualification: "بكالوريوس", hire_date: "2026-09-01" } }]
    },
    Users_Supervisors: { sheetId: "Users_Supervisors", present: true, headers: ["full_name", "phone", "email", "department"], rows: [] },
    Users_Parents: { sheetId: "Users_Parents", present: true, headers: ["full_name", "phone", "email", "address"], rows: [] },
    Users_Drivers: { sheetId: "Users_Drivers", present: true, headers: ["full_name", "phone", "email", "license_number", "driver_status"], rows: [] },
    Students: {
      sheetId: "Students",
      present: true,
      headers: ["academic_number", "full_name", "gender", "date_of_birth", "status", "enrollment_date", "address"],
      rows: [{ rowNumber: 2, values: { academic_number: "STU-IMPORT-01", full_name: "الطالب يحيى", gender: "male", date_of_birth: "2017-02-01", status: "active", enrollment_date: "2026-09-01", address: "صنعاء" } }]
    },
    StudentParentLinks: { sheetId: "StudentParentLinks", present: true, headers: ["student_academic_number", "parent_phone_or_email", "relation_type", "is_primary"], rows: [] },
    StudentEnrollments: {
      sheetId: "StudentEnrollments",
      present: true,
      headers: ["student_academic_number", "academic_year_name", "grade_level_name", "class_name", "section"],
      rows: [{ rowNumber: 2, values: { student_academic_number: "STU-IMPORT-01", academic_year_name: "2026-2027", grade_level_name: "الصف الرابع", class_name: "أ", section: "علوم" } }]
    },
    SubjectOfferings: { sheetId: "SubjectOfferings", present: true, headers: ["academic_year_name", "semester_name", "grade_level_name", "subject_code", "is_active"], rows: [] },
    TeacherAssignments: { sheetId: "TeacherAssignments", present: true, headers: ["academic_year_name", "grade_level_name", "class_name", "section", "subject_code", "teacher_phone_or_email"], rows: [] },
    SupervisorAssignments: { sheetId: "SupervisorAssignments", present: true, headers: ["academic_year_name", "grade_level_name", "class_name", "section", "supervisor_phone_or_email"], rows: [] },
    Buses: { sheetId: "Buses", present: true, headers: ["plate_number", "capacity", "driver_phone_or_email", "status"], rows: [] },
    Routes: { sheetId: "Routes", present: true, headers: ["route_name", "start_point", "end_point", "estimated_duration_minutes", "is_active"], rows: [] },
    RouteStops: { sheetId: "RouteStops", present: true, headers: ["route_name", "stop_order", "stop_name", "latitude", "longitude"], rows: [] },
    RouteAssignments: { sheetId: "RouteAssignments", present: true, headers: ["bus_plate_number", "route_name", "start_date", "end_date"], rows: [] },
    StudentTransportAssignments: { sheetId: "StudentTransportAssignments", present: true, headers: ["student_academic_number", "route_name", "stop_order", "start_date", "end_date"], rows: [] },
    StudentHomeLocations: { sheetId: "StudentHomeLocations", present: true, headers: ["student_academic_number", "address_label", "address_text", "latitude", "longitude", "status", "notes"], rows: [] }
  }
};

const examples = {
  serviceStatus: { name: "Ishraf Platform Backend", environment: "staging" },
  user: {
    id: "1",
    fullName: "أيمن أحمد محسن الذاهبي",
    email: "mod87521@gmail.com",
    phone: null,
    role: "admin",
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW
  },
  academicYear: {
    id: "1",
    name: "2025-2026",
    startDate: "2025-09-01",
    endDate: "2026-06-30",
    isActive: true
  },
  classEntity: {
    id: "1",
    className: "الصف الأول",
    section: "A",
    gradeLevelId: "1",
    academicYearId: "1"
  },
  subject: { id: "1", name: "الرياضيات", code: "MATH-1", gradeLevelId: "1" },
  subjectOffering: {
    id: "1",
    isActive: true,
    subject: {
      id: "1",
      name: "الرياضيات",
      code: "MATH-1",
      isActive: true,
      gradeLevel: {
        id: "1",
        name: "الصف الأول",
        levelOrder: 1
      }
    },
    semester: {
      id: "1",
      name: "الفصل الأول",
      startDate: "2025-09-01",
      endDate: "2026-01-31",
      isActive: false,
      academicYear: {
        id: "1",
        name: "2025-2026"
      }
    },
    createdAt: NOW,
    updatedAt: NOW
  },
  teacherAssignment: {
    id: "1",
    academicYear: {
      id: "1",
      name: "2025-2026"
    },
    class: {
      id: "1",
      className: "A",
      section: "A",
      isActive: true,
      gradeLevel: {
        id: "1",
        name: "الصف الأول",
        levelOrder: 1
      }
    },
    subject: {
      id: "1",
      name: "الرياضيات",
      code: "MATH-1",
      isActive: true,
      gradeLevel: {
        id: "1",
        name: "الصف الأول",
        levelOrder: 1
      }
    },
    teacher: {
      id: "1",
      userId: "47",
      fullName: "مروان أمين شعبان",
      email: "marwan-amin-shaban@ishraf.local",
      phone: null
    },
    createdAt: NOW
  },
  supervisorAssignment: {
    id: "1",
    academicYear: {
      id: "1",
      name: "2025-2026"
    },
    class: {
      id: "1",
      className: "A",
      section: "A",
      isActive: true,
      gradeLevel: {
        id: "1",
        name: "الصف الأول",
        levelOrder: 1
      }
    },
    supervisor: {
      id: "1",
      userId: "50",
      fullName: "إدريس مشوير",
      email: "idris-mashwir@ishraf.local",
      phone: null
    },
    createdAt: NOW
  },
  activeAcademicContext: {
    academicYear: {
      id: "1",
      name: "2025-2026",
      startDate: "2025-09-01",
      endDate: "2026-06-30",
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW
    },
    semester: {
      id: "2",
      academicYear: {
        id: "1",
        name: "2025-2026"
      },
      name: "الفصل الثاني",
      startDate: "2026-02-01",
      endDate: "2026-06-30",
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW
    }
  },
  studentAcademicEnrollment: {
    id: "1",
    student: {
      id: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1"
    },
    academicYear: {
      id: "1",
      name: "2025-2026"
    },
    class: {
      id: "1",
      className: "A",
      section: "A",
      isActive: true,
      gradeLevel: {
        id: "1",
        name: "الصف الأول",
        levelOrder: 1
      }
    },
    createdAt: NOW,
    updatedAt: NOW
  },  student: {
    id: "1",
    academicNo: "SEED-STU-001",
    fullName: "طالب تجريبي 1",
    gender: "male",
    status: "active",
    classId: "1",
    className: "الصف الأول",
    section: "A",
    academicYearId: "1"
  },
  assessment: {
    id: "1",
    title: "اختبار قصير 1",
    assessmentTypeId: "1",
    classId: "1",
    subjectId: "1",
    academicYearId: "1",
    semesterId: "1",
    maxScore: 20,
    weight: 10,
    assessmentDate: TODAY,
    isPublished: true
  },
  assessmentScore: {
    studentAssessmentId: "1",
    assessmentId: "1",
    studentId: "1",
    fullName: "طالب تجريبي 1",
    score: 18,
    percentage: 90
  },
  attendanceSession: {
    id: "1",
    classId: "1",
    className: "الصف الأول",
    subjectId: "1",
    subjectName: "الرياضيات",
    sessionDate: TODAY,
    periodNo: 1,
    presentCount: 2,
    absentCount: 1,
    expectedCount: 3,
    recordedCount: 3
  },
  attendanceRecord: {
    attendanceId: "1",
    attendanceSessionId: "1",
    studentId: "1",
    fullName: "طالب تجريبي 1",
    status: "present",
    recordedAt: NOW
  },
  behaviorCategory: {
    id: "1",
    code: "NEG-001",
    name: "تأخر متكرر",
    behaviorType: "negative",
    defaultSeverity: 3,
    isActive: true
  },
  behaviorRecord: {
    id: "1",
    studentId: "1",
    studentFullName: "طالب تجريبي 1",
    behaviorCategoryId: "1",
    behaviorName: "تأخر متكرر",
    behaviorType: "negative",
    severity: 3,
    behaviorDate: TODAY,
    createdAt: NOW
  },
  bus: {
    id: "1",
    plateNumber: "SEED-1001",
    capacity: 40,
    status: "active",
    driver: {
      driverId: "1",
      userId: "49",
      fullName: "هلال عبد الله الملصي",
      email: "hilal-abdullah-almolsi@ishraf.local",
      phone: null
    }
  },
  route: {
    id: "1",
    routeName: "SEED Route 1",
    startPoint: "School",
    endPoint: "District A",
    estimatedDurationMinutes: 35,
    isActive: true
  },
  routeStop: {
    stopId: "1",
    stopName: "Stop 1",
    latitude: 15.3694,
    longitude: 44.191,
    stopOrder: 1
  },
  assignment: {
    assignmentId: "1",
    student: {
      studentId: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1"
    },
    route: {
      id: "1",
      routeName: "SEED Route 1"
    },
    stop: {
      id: "1",
      stopName: "Stop 1"
    },
    startDate: TODAY,
    endDate: null,
    isActive: true
  },
  routeAssignment: {
    routeAssignmentId: "1",
    bus: {
      id: "1",
      plateNumber: "SEED-1001",
      capacity: 40,
      status: "active"
    },
    driver: {
      driverId: "1",
      userId: "49",
      fullName: "هلال عبد الله الملصي",
      email: "hilal-abdullah-almolsi@ishraf.local",
      phone: null
    },
    route: {
      id: "1",
      routeName: "SEED Route 1",
      startPoint: "School",
      endPoint: "District A",
      estimatedDurationMinutes: 35,
      isActive: true
    },
    startDate: TODAY,
    endDate: null,
    isActive: true
  },
  trip: {
    id: "1",
    tripDate: TODAY,
    tripType: "pickup",
    tripStatus: "started",
    startedAt: NOW,
    endedAt: null,
    bus: {
      id: "1",
      plateNumber: "SEED-1001"
    },
    driver: {
      driverId: "1",
      fullName: "هلال عبد الله الملصي"
    },
    route: {
      id: "1",
      routeName: "SEED Route 1"
    },
    latestLocation: {
      latitude: 15.3694,
      longitude: 44.191,
      recordedAt: NOW
    },
    eventSummary: {
      boardedCount: 1,
      droppedOffCount: 0,
      absentCount: 0,
      totalEvents: 1
    }
  },
  tripDetail: {
    trip: {
      id: "1",
      tripDate: TODAY,
      tripType: "pickup",
      tripStatus: "started",
      startedAt: NOW,
      endedAt: null,
      bus: {
        id: "1",
        plateNumber: "SEED-1001"
      },
      driver: {
        driverId: "1",
        fullName: "هلال عبد الله الملصي"
      },
      route: {
        id: "1",
        routeName: "SEED Route 1"
      }
    },
    latestLocation: {
      latitude: 15.3694,
      longitude: 44.191,
      recordedAt: NOW
    },
    routeStops: [
      {
        stopId: "1",
        stopName: "Stop 1",
        latitude: 15.3694,
        longitude: 44.191,
        stopOrder: 1
      }
    ],
    eventSummary: {
      boardedCount: 1,
      droppedOffCount: 0,
      absentCount: 0,
      totalEvents: 1
    }
  },
  tripEta: {
    tripId: "1",
    tripStatus: "started",
    routePolyline: {
      encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
    },
    etaSummary: {
      status: "fresh",
      calculationMode: "provider_snapshot",
      nextStop: {
        stopId: "2",
        stopName: "Stop 2",
        stopOrder: 2
      },
      nextStopEtaAt: NOW,
      finalEtaAt: NOW,
      remainingDistanceMeters: 850,
      remainingDurationSeconds: 180,
      computedAt: NOW,
      isStale: false
    },
    remainingStops: [
      {
        stopId: "2",
        stopName: "Stop 2",
        stopOrder: 2,
        etaAt: NOW,
        remainingDistanceMeters: 850,
        remainingDurationSeconds: 180,
        isNextStop: true,
        isCompleted: false
      }
    ],
    computedAt: NOW
  },
  ensureDailyTrip: {
    created: true,
    trip: {
      id: "1",
      tripDate: TODAY,
      tripType: "pickup",
      tripStatus: "scheduled",
      startedAt: null,
      endedAt: null,
      bus: {
        id: "1",
        plateNumber: "SEED-1001"
      },
      driver: {
        driverId: "1",
        fullName: "هلال عبد الله الملصي"
      },
      route: {
        id: "1",
        routeName: "SEED Route 1"
      },
      latestLocation: null,
      eventSummary: {
        boardedCount: 0,
        droppedOffCount: 0,
        absentCount: 0,
        totalEvents: 0
      }
    }
  },
  tripEvent: {
    tripStudentEventId: "1",
    student: {
      studentId: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1"
    },
    eventType: "boarded",
    eventTime: NOW,
    stop: {
      stopId: "1",
      stopName: "Stop 1"
    },
    notes: null
  },
  tripRoster: {
    tripId: "1",
    tripStatus: "started",
    students: [
      {
        studentId: "1",
        academicNo: "SEED-STU-001",
        fullName: "طالب تجريبي 1",
        assignedStop: {
          stopId: "1",
          stopName: "Stop 1",
          latitude: 15.3694,
          longitude: 44.191,
          stopOrder: 1
        },
        homeLocation: {
          latitude: 15.3701,
          longitude: 44.1921,
          addressLabel: "Student Home 1",
          addressText: "Nearby the local market"
        },
        currentTripEventType: "boarded",
        lastEvent: {
          eventType: "boarded",
          eventTime: NOW,
          stopId: "1"
        }
      }
    ]
  },
  studentHomeLocation: {
    student: {
      studentId: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1"
    },
    homeLocation: {
      locationId: "1",
      addressLabel: "Student Home 1",
      addressText: "Nearby the local market",
      latitude: 15.3701,
      longitude: 44.1921,
      source: "admin",
      status: "approved",
      submittedByUserId: "1",
      approvedByUserId: "1",
      approvedAt: NOW,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW
    }
  },
  message: {
    id: "1",
    senderUserId: "1",
    receiverUserId: "20",
    messageBody: "رسالة تجريبية",
    sentAt: NOW,
    readAt: null
  },
  recipient: {
    userId: "7",
    fullName: "مشرف النقل",
    role: "supervisor",
    phone: "770000000",
    email: "ops@ishraf.local"
  },
  announcement: {
    id: "1",
    title: "[Seed] School Notice",
    content: "إعلان تجريبي للواجهات",
    targetRole: null,
    targetRoles: [],
    publishedAt: NOW,
    expiresAt: "2026-04-01T00:00:00.000Z"
  },
  bulkDelivery: {
    resolvedRecipients: 3,
    duplicatesRemoved: 1,
    successCount: 3,
    failedCount: 0,
    failedTargets: []
  },
  communicationDevice: {
    deviceId: "1",
    providerKey: "fcm",
    platform: "android",
    appId: "ishraf-parent-app",
    deviceName: "Parent Pixel 8",
    isActive: true,
    subscriptions: ["transportRealtime"],
    lastSeenAt: NOW,
    updatedAt: NOW
  },
  unregisteredCommunicationDevice: {
    deviceId: "1",
    isActive: false,
    unregisteredAt: NOW
  },
  transportRealtimeToken: {
    customToken: "firebase-custom-token-sample",
    databaseUrl: "https://ishraf-platform.firebaseio.com",
    path: "/transport/live-trips/1/latestLocation",
    tripId: "1",
    access: "read",
    refreshAfterSeconds: 840
  },
  schoolOnboardingImport: {
    importId: "1",
    mode: "dry-run",
    status: "validated",
    canApply: true,
    summary: {
      totalSheets: 26,
      presentSheets: 26,
      totalRows: 8,
      errorCount: 0,
      warningCount: 1
    },
    sheetSummaries: [
      {
        sheetId: "AcademicYears",
        rowCount: 1,
        errorCount: 0,
        warningCount: 0,
        present: true
      },
      {
        sheetId: "Students",
        rowCount: 1,
        errorCount: 0,
        warningCount: 0,
        present: true
      }
    ],
    issues: [
      {
        level: "warning",
        code: "phone_password_policy_applied",
        sheetId: "Users_Teachers",
        rowNumber: 2,
        columnKey: "phone",
        message: "سيتم اشتقاق كلمة المرور من رقم الهاتف لهذا الحساب عند التطبيق",
        suggestedFix: "مرر fallbackPassword فقط إذا أردت استخدام كلمة مرور موحدة بدل الاشتقاق من الهاتف"
      }
    ],
    resolvedReferenceCounts: {
      academicYears: 1,
      semesters: 1,
      gradeLevels: 1,
      classes: 1,
      subjects: 1,
      teachers: 1,
      students: 1
    },
    entityPlanCounts: {
      academicYears: 1,
      semesters: 1,
      gradeLevels: 1,
      classes: 1,
      subjects: 1,
      users: 1,
      students: 1,
      studentEnrollments: 1
    },
    alreadyApplied: false
  },
  schoolOnboardingImportHistoryItem: {
    importId: "1",
    mode: "dry-run",
    status: "validated",
    templateVersion: "2026.04.phase-b",
    fileName: "school-onboarding-valid.json",
    fileHash: "sha256-valid-import-v1",
    submittedAt: NOW,
    appliedAt: null,
    submittedBy: {
      userId: "1",
      fullName: "أيمن أحمد محسن الذاهبي"
    },
    canApply: true,
    summary: {
      totalSheets: 26,
      presentSheets: 26,
      totalRows: 8,
      errorCount: 0,
      warningCount: 1
    }
  },
  schoolOnboardingImportHistoryDetail: {
    importId: "2",
    mode: "apply",
    status: "applied",
    templateVersion: "2026.04.phase-b",
    fileName: "school-onboarding-valid.json",
    fileHash: "sha256-valid-import-v1",
    submittedAt: NOW,
    appliedAt: NOW,
    submittedBy: {
      userId: "1",
      fullName: "أيمن أحمد محسن الذاهبي"
    },
    canApply: false,
    summary: {
      totalSheets: 26,
      presentSheets: 26,
      totalRows: 8,
      errorCount: 0,
      warningCount: 1
    },
    dryRunSourceId: "1",
    result: {
      importId: "2",
      mode: "apply",
      status: "applied",
      canApply: false,
      summary: {
        totalSheets: 26,
        presentSheets: 26,
        totalRows: 8,
        errorCount: 0,
        warningCount: 1
      },
      sheetSummaries: [],
      issues: [],
      resolvedReferenceCounts: {
        academicYears: 1,
        semesters: 1
      },
      entityPlanCounts: {
        academicYears: 1,
        semesters: 1,
        gradeLevels: 1,
        classes: 1,
        subjects: 1,
        users: 1,
        students: 1,
        studentEnrollments: 1
      },
      alreadyApplied: false
    }
  },
  notification: {
    id: "1",
    userId: "20",
    title: "[Seed] Attendance alert",
    message: "تم تسجيل غياب الطالب",
    notificationType: "attendance_absent",
    referenceType: "attendance",
    referenceId: "1",
    isRead: false,
    createdAt: NOW
  },
  homework: {
    id: "1",
    title: "واجب الرياضيات 1",
    assignedDate: TODAY,
    dueDate: "2026-03-28",
    classId: "1",
    subjectId: "1",
    submittedCount: 1,
    expectedCount: 3
  },
  studentHomework: {
    student: { id: "1", academicNo: "SEED-STU-001", fullName: "طالب تجريبي 1" },
    items: [{ homeworkId: "1", title: "واجب الرياضيات 1", status: "submitted" }]
  },
  behaviorTimeline: {
    student: { id: "1", academicNo: "SEED-STU-001", fullName: "طالب تجريبي 1" },
    summary: {
      totalBehaviorRecords: 1,
      positiveCount: 0,
      negativeCount: 1,
      negativeSeverityTotal: 3
    },
    records: []
  },
  studentProfileReport: {
    student: {
      id: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1",
      dateOfBirth: "2016-09-01",
      gender: "male",
      status: "active",
      enrollmentDate: "2025-09-01",
      currentClass: {
        id: "1",
        className: "A",
        section: "A",
        gradeLevel: {
          id: "1",
          name: "الصف الأول"
        },
        academicYear: {
          id: "1",
          name: "2025-2026"
        }
      }
    },
    parents: [
      {
        linkId: "1",
        parentId: "10",
        userId: "48",
        fullName: "خالد العرامي",
        email: "khaled-alarami@ishraf.local",
        phone: null,
        relationType: null,
        isPrimary: true,
        address: null
      }
    ],
    attendanceSummary: {
      totalSessions: 10,
      presentCount: 8,
      absentCount: 1,
      lateCount: 1,
      excusedCount: 0,
      attendancePercentage: 80
    },
    assessmentSummary: {
      totalAssessments: 3,
      totalScore: 51,
      totalMaxScore: 60,
      overallPercentage: 85,
      subjects: [
        {
          subject: {
            id: "1",
            name: "الرياضيات"
          },
          totalAssessments: 3,
          totalScore: 51,
          totalMaxScore: 60,
          overallPercentage: 85
        }
      ]
    },
    behaviorSummary: {
      totalBehaviorRecords: 1,
      positiveCount: 0,
      negativeCount: 1,
      negativeSeverityTotal: 3
    }
  },
  attendanceSummaryReport: {
    student: {
      id: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1"
    },
    attendanceSummary: {
      totalSessions: 10,
      presentCount: 8,
      absentCount: 1,
      lateCount: 1,
      excusedCount: 0,
      attendancePercentage: 80
    }
  },
  assessmentSummaryReport: {
    student: {
      id: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1"
    },
    assessmentSummary: {
      totalAssessments: 3,
      totalScore: 51,
      totalMaxScore: 60,
      overallPercentage: 85,
      subjects: [
        {
          subject: {
            id: "1",
            name: "الرياضيات"
          },
          totalAssessments: 3,
          totalScore: 51,
          totalMaxScore: 60,
          overallPercentage: 85
        }
      ]
    }
  },
  behaviorSummaryReport: {
    student: {
      id: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1"
    },
    behaviorSummary: {
      totalBehaviorRecords: 1,
      positiveCount: 0,
      negativeCount: 1,
      negativeSeverityTotal: 3
    }
  },
  parentDashboard: {
    parent: {
      parentId: "10",
      userId: "48",
      fullName: "خالد العرامي",
      email: "khaled-alarami@ishraf.local",
      phone: null,
      address: null,
      relationType: null
    },
    children: [
      {
        student: {
          id: "1",
          academicNo: "SEED-STU-001",
          fullName: "طالب تجريبي 1"
        },
        attendanceSummary: {
          totalSessions: 10,
          presentCount: 8,
          absentCount: 1,
          lateCount: 1,
          excusedCount: 0,
          attendancePercentage: 80
        },
        behaviorSummary: {
          totalBehaviorRecords: 1,
          positiveCount: 0,
          negativeCount: 1,
          negativeSeverityTotal: 3
        },
        assessmentSummary: {
          totalAssessments: 3,
          totalScore: 51,
          totalMaxScore: 60,
          overallPercentage: 85,
          subjects: []
        }
      }
    ],
    latestNotifications: [
      {
        id: "1",
        title: "[Seed] Attendance alert",
        message: "تم تسجيل غياب الطالب",
        notificationType: "attendance_absent",
        referenceType: "attendance",
        referenceId: "1",
        isRead: false,
        createdAt: NOW,
        readAt: null
      }
    ],
    unreadNotifications: 1
  },
  teacherDashboard: {
    teacher: {
      teacherId: "1",
      userId: "47",
      fullName: "مروان أمين شعبان",
      email: "marwan-amin-shaban@ishraf.local",
      phone: null,
      specialization: null,
      qualification: null,
      hireDate: null
    },
    assignments: [
      {
        teacherClassId: "1",
        class: {
          id: "1",
          className: "A",
          section: "A",
          gradeLevel: {
            id: "1",
            name: "الصف الأول"
          },
          academicYear: {
            id: "1",
            name: "2025-2026"
          }
        },
        subject: {
          id: "1",
          name: "الرياضيات",
          code: "MATH-1"
        },
        academicYear: {
          id: "1",
          name: "2025-2026"
        },
        createdAt: NOW
      }
    ],
    recentAttendanceSessions: [
      {
        id: "1",
        sessionDate: TODAY,
        periodNo: 1,
        title: "Morning Attendance",
        class: {
          id: "1",
          className: "A",
          section: "A"
        },
        subject: {
          id: "1",
          name: "الرياضيات"
        },
        counts: {
          presentCount: 8,
          absentCount: 1,
          lateCount: 1,
          excusedCount: 0,
          recordedCount: 10,
          expectedCount: 10
        }
      }
    ],
    recentAssessments: [
      {
        id: "1",
        title: "اختبار قصير 1",
        assessmentDate: TODAY,
        assessmentType: {
          id: "1",
          code: "quiz",
          name: "Quiz"
        },
        class: {
          id: "1",
          className: "A",
          section: "A",
          gradeLevel: {
            id: "1",
            name: "الصف الأول"
          }
        },
        subject: {
          id: "1",
          name: "الرياضيات",
          code: "MATH-1"
        },
        summary: {
          gradedCount: 10,
          expectedCount: 10,
          averageScore: 17,
          averagePercentage: 85
        }
      }
    ],
    recentBehaviorRecords: [
      {
        id: "1",
        student: {
          id: "1",
          academicNo: "SEED-STU-001",
          fullName: "طالب تجريبي 1"
        },
        category: {
          id: "1",
          code: "RESPECT",
          name: "Respect",
          behaviorType: "positive"
        },
        description: "Strong participation",
        severity: 1,
        behaviorDate: TODAY,
        createdAt: NOW
      }
    ]
  },
  supervisorDashboard: {
    supervisor: {
      supervisorId: "1",
      userId: "50",
      fullName: "إدريس مشوير",
      email: "idris-mashwir@ishraf.local",
      phone: null,
      department: null
    },
    assignments: [
      {
        supervisorClassId: "1",
        class: {
          id: "1",
          className: "A",
          section: "A",
          gradeLevel: {
            id: "1",
            name: "الصف الأول"
          },
          academicYear: {
            id: "1",
            name: "2025-2026"
          }
        },
        academicYear: {
          id: "1",
          name: "2025-2026"
        },
        createdAt: NOW
      }
    ],
    studentSummaries: [
      {
        student: {
          id: "1",
          academicNo: "SEED-STU-001",
          fullName: "طالب تجريبي 1"
        },
        attendanceSummary: {
          totalSessions: 10,
          presentCount: 8,
          absentCount: 1,
          lateCount: 1,
          excusedCount: 0,
          attendancePercentage: 80
        },
        behaviorSummary: {
          totalBehaviorRecords: 1,
          positiveCount: 0,
          negativeCount: 1,
          negativeSeverityTotal: 3
        },
        assessmentSummary: {
          totalAssessments: 3,
          totalScore: 51,
          totalMaxScore: 60,
          overallPercentage: 85,
          subjects: []
        }
      }
    ],
    recentBehaviorRecords: [
      {
        id: "1",
        student: {
          id: "1",
          academicNo: "SEED-STU-001",
          fullName: "طالب تجريبي 1"
        },
        category: {
          id: "5",
          code: "LATENESS",
          name: "Lateness",
          behaviorType: "negative"
        },
        description: "Late arrival",
        severity: 2,
        behaviorDate: TODAY,
        createdAt: NOW
      }
    ]
  },
  adminDashboard: {
    summary: { totalUsers: 15, totalStudents: 9, activeTrips: 1, unreadNotifications: 2 },
    recentStudents: [{ id: "1", academicNo: "SEED-STU-001", fullName: "طالب تجريبي 1" }],
    activeTrips: [{ id: "1", routeName: "SEED Route 1", tripStatus: "started" }]
  },
  transportSummary: {
    summary: { activeTripsCount: 1, routesCount: 3, busesCount: 3 },
    activeTrips: [{ id: "1", routeName: "SEED Route 1", tripStatus: "started" }]
  },
  parentTransportLiveStatus: {
    student: {
      id: "1",
      academicNo: "SEED-STU-001",
      fullName: "طالب تجريبي 1"
    },
    assignment: {
      assignmentId: "1",
      route: {
        routeId: "1",
        routeName: "SEED Route 1"
      },
      stop: {
        stopId: "1",
        stopName: "Stop 1"
      },
      startDate: TODAY,
      endDate: null,
      isActive: true
    },
    activeTrip: {
      tripId: "1",
      tripDate: TODAY,
      tripType: "pickup",
      tripStatus: "started",
      bus: {
        busId: "1",
        plateNumber: "SEED-1001"
      },
      driver: {
        driverId: "1",
        fullName: "هلال عبد الله الملصي"
      },
      latestLocation: {
        latitude: 15.3694,
        longitude: 44.191,
        recordedAt: NOW
      },
      latestEvents: [
        {
          tripStudentEventId: "1",
          student: {
            studentId: "1",
            academicNo: "SEED-STU-001",
            fullName: "طالب تجريبي 1"
          },
          eventType: "boarded",
          eventTime: NOW,
          stop: {
            stopId: "1",
            stopName: "Stop 1"
          },
          notes: null
        }
      ]
    }
  }
};

examples.systemSettingsGroup = {
  group: "transportMaps",
  description:
    "Feature flags and provider selection for external map and ETA integrations used by transport surfaces.",
  entries: [
    {
      key: "etaProvider",
      value: "mapbox",
      defaultValue: "mapbox",
      source: "default",
      description:
        "Selects the preferred ETA provider. Batch 2 activates runtime provider resolution with mapbox as the default selected provider.",
      updatedAt: null,
      updatedBy: null
    },
    {
      key: "etaDerivedEstimateEnabled",
      value: true,
      defaultValue: true,
      source: "default",
      description:
        "Allows the backend worker to derive ETA snapshots locally between provider refreshes using the cached polyline and recent trip locations.",
      updatedAt: null,
      updatedBy: null
    },
    {
      key: "googleMapsEtaEnabled",
      value: false,
      defaultValue: false,
      source: "default",
      description:
        "Keeps Google Maps ETA execution available when the admin explicitly selects Google as the active provider.",
      updatedAt: null,
      updatedBy: null
    },
    {
      key: "etaProviderRefreshIntervalSeconds",
      value: 300,
      defaultValue: 300,
      source: "default",
      description:
        "Minimum seconds between provider refreshes for one active trip ETA snapshot.",
      updatedAt: null,
      updatedBy: null
    },
    {
      key: "etaProviderDeviationThresholdMeters",
      value: 300,
      defaultValue: 300,
      source: "default",
      description:
        "Route deviation threshold in meters that forces a fresh provider ETA snapshot.",
      updatedAt: null,
      updatedBy: null
    }
  ]
};

examples.systemSettingsList = {
  groups: [
    {
      group: "pushNotifications",
      description:
        "Feature flags that gate future FCM and realtime push delivery behavior.",
      entries: [
        {
          key: "fcmEnabled",
          value: false,
          defaultValue: false,
          source: "default",
          description:
            "Enables Firebase Cloud Messaging provider usage when the provider phase is implemented.",
          updatedAt: null,
          updatedBy: null
        },
        {
          key: "transportRealtimeEnabled",
          value: false,
          defaultValue: false,
          source: "default",
          description:
            "Allows transport realtime notification workflows to publish through the push pipeline.",
          updatedAt: null,
          updatedBy: null
        }
      ]
    },
    clone(examples.systemSettingsGroup),
    {
      group: "analytics",
      description:
        "Feature flags for external analytics and AI-assisted insight generation.",
      entries: [
        {
          key: "aiAnalyticsEnabled",
          value: false,
          defaultValue: false,
          source: "default",
          description:
            "Enables AI analytics capabilities when the analytics provider phase is implemented.",
          updatedAt: null,
          updatedBy: null
        }
      ]
    },
    {
      group: "imports",
      description: "Operational switches for admin-managed import capabilities.",
      entries: [
        {
          key: "schoolOnboardingEnabled",
          value: true,
          defaultValue: true,
          source: "default",
          description:
            "Enables the structured school onboarding dry-run/apply workflow.",
          updatedAt: null,
          updatedBy: null
        },
        {
          key: "csvImportEnabled",
          value: true,
          defaultValue: false,
          source: "override",
          description:
            "Enables future CSV import surfaces when that operational flow is introduced.",
          updatedAt: NOW,
          updatedBy: {
            userId: "1",
            fullName: "أيمن أحمد محسن الذاهبي"
          }
        }
      ]
    }
  ]
};

examples.systemSettingAuditLog = {
  auditId: "1",
  group: "imports",
  key: "csvImportEnabled",
  action: "created",
  previousValue: null,
  newValue: true,
  reason: "Enable pilot CSV workflow",
  requestId: "6b55c8c8-63ce-4c45-bf77-4c7b9a7547d5",
  changedAt: NOW,
  changedBy: {
    userId: "1",
    fullName: "أيمن أحمد محسن الذاهبي"
  }
};

examples.systemIntegrationsStatus = {
  integrations: [
    {
      providerKey: "pushNotifications",
      featureEnabled: false,
      pendingOutboxCount: 0,
      failedOutboxCount: 0
    },
    {
      providerKey: "transportMaps",
      featureEnabled: true,
      pendingOutboxCount: 0,
      failedOutboxCount: 0
    },
    {
      providerKey: "analytics",
      featureEnabled: false,
      pendingOutboxCount: 0,
      failedOutboxCount: 0
    }
  ]
};

examples.behaviorTimeline.records.push(clone(examples.behaviorRecord));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePath(value) {
  if (!value) return "/";
  const normalized = value.replace(/\\/g, "/").replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeDynamicSegments(routePath) {
  return normalizePath(routePath)
    .replace(/\/\{[^/]+\}/g, "/:*")
    .replace(/\/\{\{[^/]+\}\}/g, "/:*")
    .replace(/\/:[^/]+/g, "/:*");
}

function routeKey(method, routePath) {
  return `${method.toUpperCase()} ${normalizeDynamicSegments(routePath)}`;
}

function toOpenApiPath(routePath) {
  return normalizePath(routePath).replace(/:([^/]+)/g, "{$1}");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function extractRoutesFromRouteFiles() {
  const routes = [
    { method: "GET", path: "/health", moduleKey: "health", tag: "Health" },
    { method: "GET", path: "/health/ready", moduleKey: "health", tag: "Health" }
  ];
  const regex = /router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g;
  for (const source of moduleSources) {
    const filePath = path.join(root, source.routeFile);
    const content = fs.readFileSync(filePath, "utf8");
    let match;
    while ((match = regex.exec(content)) !== null) {
      const localPath = match[2] === "/" ? "" : match[2];
      routes.push({
        method: match[1].toUpperCase(),
        path: normalizePath(`${source.basePath}${localPath}`),
        moduleKey: source.key,
        tag: source.tag
      });
    }
  }
  return routes.sort((a, b) => `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`));
}

function collectOpenApiRoutes(spec) {
  if (!spec?.paths) return [];
  const routes = [];
  for (const [routePath, pathItem] of Object.entries(spec.paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (pathItem[method]) routes.push({ method: method.toUpperCase(), path: normalizePath(routePath) });
    }
  }
  return routes;
}

function extractRawUrlFromPostmanRequest(request) {
  if (!request?.url) return "";
  if (typeof request.url === "string") return request.url;
  if (request.url.raw) return request.url.raw;
  return "";
}

function toRelativePostmanPath(raw) {
  return normalizePath(
    raw
      .replace("{{baseUrl}}", "")
      .replace("{{rootUrl}}", "")
      .replace(API_SERVER_URL, "")
      .replace(ROOT_SERVER_URL, "")
      .replace(LOCAL_API_SERVER_URL, "")
      .replace(LOCAL_ROOT_SERVER_URL, "")
      .replace(/\?.*$/, "")
  );
}

function collectPostmanRoutes(collection) {
  const routes = [];
  function walk(items) {
    for (const item of items ?? []) {
      if (item.request) {
        routes.push({
          method: item.request.method.toUpperCase(),
          path: toRelativePostmanPath(extractRawUrlFromPostmanRequest(item.request))
        });
      }
      if (item.item) walk(item.item);
    }
  }
  walk(collection?.item ?? []);
  return routes;
}

function summarizeCoverage(actualRoutes, documentedRoutes) {
  const actualByKey = new Map(actualRoutes.map((route) => [routeKey(route.method, route.path), route]));
  const documentedKeys = new Set(documentedRoutes.map((route) => routeKey(route.method, route.path)));
  const covered = [];
  const missing = [];
  for (const [key, route] of actualByKey.entries()) {
    if (documentedKeys.has(key)) covered.push(route);
    else missing.push(route);
  }
  return { covered, missing };
}

function coverageByModule(actualRoutes, documentedRoutes) {
  const documentedKeys = new Set(documentedRoutes.map((route) => routeKey(route.method, route.path)));
  const output = new Map();
  for (const route of actualRoutes) {
    const bucket = output.get(route.moduleKey) ?? { total: 0, covered: 0, tag: route.tag };
    bucket.total += 1;
    if (documentedKeys.has(routeKey(route.method, route.path))) bucket.covered += 1;
    output.set(route.moduleKey, bucket);
  }
  return output;
}

const componentSchemas = {
  NumericStringId: numericIdSchema,
  DateString: dateSchema,
  DateTimeString: dateTimeSchema,
  GenericObject: { type: "object", additionalProperties: true },
  Pagination: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, example: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
      totalItems: { type: "integer", minimum: 0, example: 1 },
      totalPages: { type: "integer", minimum: 0, example: 1 }
    },
    required: ["page", "limit", "totalItems", "totalPages"]
  },
  ErrorDetail: {
    type: "object",
    properties: {
      field: { type: ["string", "null"] },
      code: { type: ["string", "null"] },
      message: { type: "string" }
    },
    required: ["message"]
  },
  ErrorResponse: {
    type: "object",
    properties: {
      success: { const: false },
      message: { type: "string" },
      errors: {
        type: "array",
        items: { $ref: "#/components/schemas/ErrorDetail" }
      }
    },
    required: ["success", "message", "errors"]
  },
  LoginRequest: {
    type: "object",
    properties: {
      identifier: { type: "string", minLength: 1 },
      password: { type: "string", minLength: 1 }
    },
    required: ["identifier", "password"],
    additionalProperties: false,
    example: {
      identifier: "{{loginIdentifier}}",
      password: "{{loginPassword}}"
    }
  },
  ForgotPasswordRequest: {
    type: "object",
    properties: { identifier: { type: "string", minLength: 1 } },
    required: ["identifier"],
    additionalProperties: false,
    example: { identifier: "{{loginIdentifier}}" }
  },
  ResetPasswordRequest: {
    type: "object",
    properties: {
      token: { type: "string", minLength: 1 },
      newPassword: { type: "string", minLength: 8, maxLength: 72 }
    },
    required: ["token", "newPassword"],
    additionalProperties: false,
    example: { token: "{{resetToken}}", newPassword: "{{newPassword}}" }
  },
  RefreshTokenRequest: {
    type: "object",
    properties: { refreshToken: { type: "string", minLength: 1 } },
    required: ["refreshToken"],
    additionalProperties: false,
    example: { refreshToken: "{{refreshToken}}" }
  },
  LogoutRequest: {
    type: "object",
    properties: { refreshToken: { type: "string", minLength: 1 } },
    required: ["refreshToken"],
    additionalProperties: false,
    example: { refreshToken: "{{refreshToken}}" }
  },
  ChangePasswordRequest: {
    type: "object",
    properties: {
      currentPassword: { type: "string", minLength: 1 },
      newPassword: { type: "string", minLength: 8, maxLength: 72 }
    },
    required: ["currentPassword", "newPassword"],
    additionalProperties: false,
    example: {
      currentPassword: "{{loginPassword}}",
      newPassword: "{{newPassword}}"
    }
  },
  CreateUserRequest: {
    type: "object",
    properties: {
      role: { type: "string", enum: ["admin", "parent", "teacher", "supervisor", "driver"] },
      fullName: { type: "string", minLength: 1, maxLength: 150 },
      email: { type: "string", format: "email" },
      phone: { type: "string", minLength: 1, maxLength: 50 },
      password: { type: "string", minLength: 8, maxLength: 72 },
      profile: { type: "object", additionalProperties: true }
    },
    required: ["role", "fullName", "password"],
    additionalProperties: false,
    description:
      "Discriminated by role. profile is role-specific: parent(address, relationType), teacher(specialization, qualification, hireDate), supervisor(department), driver(licenseNumber, driverStatus), admin(null or omitted).",
    example: {
      role: "parent",
      fullName: "ولي أمر جديد",
      email: "new-parent@example.com",
      phone: "777111111",
      password: "StrongPassword123!",
      profile: { address: "صنعاء", relationType: "father" }
    }
  },
  UpdateUserRequest: {
    type: "object",
    properties: {
      fullName: { type: "string", minLength: 1, maxLength: 150 },
      email: { type: "string", format: "email" },
      phone: { type: "string", minLength: 1, maxLength: 50 },
      profile: { type: "object", additionalProperties: true }
    },
    additionalProperties: false,
    example: { fullName: "اسم محدث", phone: "777111112" }
  },
  UpdateUserStatusRequest: {
    type: "object",
    properties: { isActive: { type: "boolean" } },
    required: ["isActive"],
    additionalProperties: false,
    example: { isActive: false }
  },
  CreateAcademicYearRequest: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 50 },
      startDate: clone(dateSchema),
      endDate: clone(dateSchema),
      isActive: { type: "boolean" }
    },
    required: ["name", "startDate", "endDate"],
    additionalProperties: false,
    example: {
      name: "2026-2027",
      startDate: "2026-09-01",
      endDate: "2027-06-30",
      isActive: false
    }
  },
  UpdateAcademicYearRequest: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 50 },
      startDate: clone(dateSchema),
      endDate: clone(dateSchema),
      isActive: { type: "boolean" }
    },
    additionalProperties: false,
    example: { isActive: true }
  },
  CreateSemesterRequest: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 50 },
      startDate: clone(dateSchema),
      endDate: clone(dateSchema),
      isActive: { type: "boolean" }
    },
    required: ["name", "startDate", "endDate"],
    additionalProperties: false,
    example: {
      name: "الفصل الثاني",
      startDate: "2026-01-20",
      endDate: "2026-06-20",
      isActive: false
    }
  },
  UpdateSemesterRequest: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 50 },
      startDate: clone(dateSchema),
      endDate: clone(dateSchema),
      isActive: { type: "boolean" }
    },
    additionalProperties: false,
    example: { isActive: true }
  },
  CreateGradeLevelRequest: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      levelOrder: { type: "integer", minimum: 1 }
    },
    required: ["name", "levelOrder"],
    additionalProperties: false,
    example: { name: "الصف الرابع", levelOrder: 4 }
  },
  CreateClassRequest: {
    type: "object",
    properties: {
      gradeLevelId: clone(numericIdSchema),
      academicYearId: clone(numericIdSchema),
      className: { type: "string", minLength: 1, maxLength: 50 },
      section: { type: "string", minLength: 1, maxLength: 50 },
      capacity: { type: "integer", minimum: 1 },
      isActive: { type: "boolean" }
    },
    required: ["gradeLevelId", "academicYearId", "className", "section"],
    additionalProperties: false,
    example: {
      gradeLevelId: "1",
      academicYearId: "1",
      className: "الصف الأول",
      section: "B",
      capacity: 30,
      isActive: true
    }
  },
  UpdateClassRequest: {
    type: "object",
    properties: {
      className: { type: "string", minLength: 1, maxLength: 50 },
      section: { type: "string", minLength: 1, maxLength: 50 },
      capacity: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
      isActive: { type: "boolean" }
    },
    additionalProperties: false,
    example: {
      section: "C",
      capacity: 30,
      isActive: false
    }
  },
  CreateSubjectRequest: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      gradeLevelId: clone(numericIdSchema),
      code: { type: "string", maxLength: 50 },
      isActive: { type: "boolean" }
    },
    required: ["name", "gradeLevelId"],
    additionalProperties: false,
    example: { name: "العلوم", gradeLevelId: "1", code: "SCI-1", isActive: true }
  },
  UpdateSubjectRequest: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      code: { anyOf: [{ type: "string", maxLength: 50 }, { type: "null" }] },
      isActive: { type: "boolean" }
    },
    additionalProperties: false,
    example: { name: "العلوم المتقدمة", code: null, isActive: false }
  },
  CreateSubjectOfferingRequest: {
    type: "object",
    properties: {
      subjectId: clone(numericIdSchema),
      semesterId: clone(numericIdSchema),
      isActive: { type: "boolean" }
    },
    required: ["subjectId", "semesterId"],
    additionalProperties: false,
    example: { subjectId: "1", semesterId: "1", isActive: true }
  },
  UpdateSubjectOfferingRequest: {
    type: "object",
    properties: {
      isActive: { type: "boolean" }
    },
    required: ["isActive"],
    additionalProperties: false,
    example: { isActive: false }
  },
  CreateTeacherAssignmentRequest: {
    type: "object",
    properties: {
      teacherId: clone(numericIdSchema),
      classId: clone(numericIdSchema),
      subjectId: clone(numericIdSchema),
      academicYearId: clone(numericIdSchema)
    },
    required: ["teacherId", "classId", "subjectId", "academicYearId"],
    additionalProperties: false,
    example: { teacherId: "47", classId: "1", subjectId: "1", academicYearId: "1" }
  },
  UpdateTeacherAssignmentRequest: {
    type: "object",
    properties: {
      teacherId: clone(numericIdSchema),
      classId: clone(numericIdSchema),
      subjectId: clone(numericIdSchema),
      academicYearId: clone(numericIdSchema)
    },
    additionalProperties: false,
    example: { classId: "2", subjectId: "4", academicYearId: "1" }
  },
  CreateSupervisorAssignmentRequest: {
    type: "object",
    properties: {
      supervisorId: clone(numericIdSchema),
      classId: clone(numericIdSchema),
      academicYearId: clone(numericIdSchema)
    },
    required: ["supervisorId", "classId", "academicYearId"],
    additionalProperties: false,
    example: { supervisorId: "50", classId: "1", academicYearId: "1" }
  },
  UpdateSupervisorAssignmentRequest: {
    type: "object",
    properties: {
      supervisorId: clone(numericIdSchema),
      classId: clone(numericIdSchema),
      academicYearId: clone(numericIdSchema)
    },
    additionalProperties: false,
    example: { classId: "2", academicYearId: "1" }
  }
};

function addSchema(name, schema) {
  componentSchemas[name] = schema;
}

[
  [
    "ActiveAcademicContextRequest",
    { academicYearId: "1", semesterId: "2" }
  ],  [
    "CreateStudentRequest",
    {
      academicNo: "SEED-STU-010",
      fullName: "طالب جديد",
      dateOfBirth: "2018-09-10",
      gender: "male",
      classId: "1",
      status: "active",
      enrollmentDate: "2025-09-01"
    }
  ],
  ["UpdateStudentRequest", { fullName: "طالب محدث", status: "suspended" }],
  ["LinkStudentParentRequest", { parentId: "48", relationType: "mother", isPrimary: false }],
  ["PromoteStudentRequest", { toClassId: "2", academicYearId: "2", notes: "ترقية إلى الصف التالي" }],
  ["CreateStudentAcademicEnrollmentRequest", { academicYearId: "2", classId: "2" }],
  ["UpdateStudentAcademicEnrollmentRequest", { classId: "3" }],
  [
    "BulkStudentAcademicEnrollmentsRequest",
    {
      items: [
        { studentId: "1", academicYearId: "2", classId: "2" },
        { studentId: "2", academicYearId: "2", classId: "2" }
      ]
    }
  ],
  ["CreateAssessmentTypeRequest", { code: "QUIZ", name: "Quiz", description: "Short quiz", isActive: true }],
  [
    "CreateAssessmentRequest",
    {
      assessmentTypeId: "1",
      classId: "1",
      subjectId: "1",
      teacherId: "47",
      academicYearId: "1",
      semesterId: "1",
      title: "اختبار قصير 2",
      description: "الوحدة الثانية",
      maxScore: 20,
      weight: 10,
      assessmentDate: TODAY,
      isPublished: true
    }
  ],
  [
    "SaveAssessmentScoresRequest",
    { records: [{ studentId: "1", score: 18, remarks: "ممتاز" }, { studentId: "2", score: 14, remarks: "جيد" }] }
  ],
  ["UpdateStudentAssessmentScoreRequest", { score: 19, remarks: "تحسن واضح" }],
  [
    "CreateAttendanceSessionRequest",
    {
      classId: "1",
      subjectId: "1",
      academicYearId: "1",
      semesterId: "1",
      sessionDate: TODAY,
      periodNo: 1,
      title: "حصة الرياضيات",
      notes: "اختبار سريع",
      teacherId: "47"
    }
  ],
  ["SaveAttendanceRecordsRequest", { records: [{ studentId: "1", status: "present" }, { studentId: "2", status: "absent", notes: "غياب بدون عذر" }] }],
  ["UpdateAttendanceRecordRequest", { status: "late", notes: "وصل متأخرًا" }],
  ["CreateBehaviorCategoryRequest", { code: "NEG-001", name: "تأخر متكرر", behaviorType: "negative", defaultSeverity: 3, isActive: true }],
  ["CreateBehaviorRecordRequest", { studentId: "1", behaviorCategoryId: "1", academicYearId: "1", semesterId: "1", description: "تأخر عن الطابور", severity: 3, behaviorDate: TODAY, teacherId: "47" }],
  ["UpdateBehaviorRecordRequest", { severity: 2, description: "تم تعديل الملاحظة" }],
  ["CreateBusRequest", { plateNumber: "SEED-1004", driverId: "1004", capacity: 45, status: "active" }],
  ["CreateRouteRequest", { routeName: "SEED Route 4", startPoint: "School", endPoint: "District D", estimatedDurationMinutes: 40, isActive: true }],
  ["CreateRouteStopRequest", { stopName: "Stop 4", latitude: 15.37, longitude: 44.19, stopOrder: 4 }],
  ["CreateTransportAssignmentRequest", { studentId: "1", routeId: "1", stopId: "1", startDate: TODAY, endDate: null }],
  ["DeactivateTransportAssignmentRequest", { endDate: TODAY }],
  ["CreateTransportRouteAssignmentRequest", { busId: "1", routeId: "1", startDate: TODAY, endDate: null }],
  ["DeactivateTransportRouteAssignmentRequest", { endDate: TODAY }],
  ["CreateTripRequest", { busId: "1", routeId: "1", tripDate: TODAY, tripType: "pickup" }],
  ["EnsureDailyTripRequest", { routeAssignmentId: "1", tripDate: TODAY, tripType: "pickup" }],
  ["RecordTripLocationRequest", { latitude: 15.3694, longitude: 44.191 }],
  ["CreateTripStudentEventRequest", { studentId: "1", eventType: "dropped_off", stopId: "1", notes: "تم النزول بنجاح" }],
  ["SaveStudentHomeLocationRequest", { addressLabel: "Student Home 1", addressText: "Nearby the local market", latitude: 15.3701, longitude: 44.1921, status: "approved", notes: null }],
  ["SendMessageRequest", { receiverUserId: "20", messageBody: "رسالة مباشرة تجريبية" }],
  ["SendBulkMessageRequest", { receiverUserIds: ["20"], targetRoles: ["teacher", "supervisor"], messageBody: "رسالة جماعية منسوخة كرسائل فردية" }],
  ["CreateAnnouncementRequest", { title: "[Seed] New notice", content: "إعلان موجّه للمعلمين والمشرفين", targetRoles: ["teacher", "supervisor"], expiresAt: "2026-04-01T00:00:00.000Z" }],
  ["CreateNotificationRequest", { userId: "20", title: "إشعار يدوي", message: "رسالة إشعار يدوية", notificationType: "manual", referenceType: null, referenceId: null }],
  ["CreateBulkNotificationRequest", { userIds: ["20"], targetRoles: ["parent"], title: "إشعار جماعي", message: "هذا الإشعار يصل كملاحظات فردية", notificationType: "manual", referenceType: null, referenceId: null }],
  ["CreateHomeworkRequest", { teacherId: "47", classId: "1", subjectId: "1", academicYearId: "1", semesterId: "1", title: "واجب الرياضيات 2", description: "حل الصفحات 12-14", assignedDate: TODAY, dueDate: "2026-03-28" }],
  ["SaveHomeworkSubmissionsRequest", { records: [{ studentId: "1", status: "submitted", submittedAt: TODAY, notes: "تم التسليم" }, { studentId: "2", status: "late", submittedAt: TODAY, notes: "تسليم متأخر" }] }],
  [
    "SchoolOnboardingDryRunRequest",
    {
      templateVersion: "2026.04.phase-b",
      fileName: "school-onboarding-valid.json",
      fileHash: "sha256-valid-import-v1",
      fileSize: 1024,
      config: {
        activateAfterImport: false,
        targetAcademicYearName: "2026-2027",
        targetSemesterName: "الفصل الأول"
      },
      workbook: schoolOnboardingWorkbookExample
    }
  ],
  [
    "SchoolOnboardingApplyRequest",
    {
      dryRunId: "1",
      fallbackPassword: "ImportSeed123!",
      confirmActivateContext: false
    }
  ]
].forEach(([name, example]) => {
  addSchema(name, {
    type: "object",
    additionalProperties: true,
    example
  });
});

addSchema("UpdatePushNotificationsSettingsRequest", {
  type: "object",
  properties: {
    reason: { type: "string", minLength: 1, maxLength: 500 },
    values: {
      type: "object",
      properties: {
        fcmEnabled: { type: "boolean" },
        transportRealtimeEnabled: { type: "boolean" }
      },
      additionalProperties: false,
      minProperties: 1
    }
  },
  required: ["reason", "values"],
  additionalProperties: false,
  example: {
    reason: "Enable staging push pilot",
    values: { fcmEnabled: true }
  }
});

addSchema("UpdateTransportMapsSettingsRequest", {
  type: "object",
  properties: {
    reason: { type: "string", minLength: 1, maxLength: 500 },
    values: {
      type: "object",
      properties: {
        etaProvider: {
          type: "string",
          enum: ["mapbox", "google"]
        },
        etaDerivedEstimateEnabled: { type: "boolean" },
        googleMapsEtaEnabled: { type: "boolean" },
        etaProviderRefreshIntervalSeconds: {
          type: "integer",
          minimum: 1
        },
        etaProviderDeviationThresholdMeters: {
          type: "integer",
          minimum: 1
        }
      },
      additionalProperties: false,
      minProperties: 1
    }
  },
  required: ["reason", "values"],
  additionalProperties: false,
  example: {
    reason: "Enable derived ETA between provider refreshes",
    values: {
      etaProvider: "mapbox",
      etaDerivedEstimateEnabled: true
    }
  }
});

addSchema("UpdateAnalyticsSettingsRequest", {
  type: "object",
  properties: {
    reason: { type: "string", minLength: 1, maxLength: 500 },
    values: {
      type: "object",
      properties: {
        aiAnalyticsEnabled: { type: "boolean" }
      },
      additionalProperties: false,
      minProperties: 1
    }
  },
  required: ["reason", "values"],
  additionalProperties: false,
  example: {
    reason: "Enable analytics dry pilot",
    values: { aiAnalyticsEnabled: true }
  }
});

addSchema("UpdateImportsSettingsRequest", {
  type: "object",
  properties: {
    reason: { type: "string", minLength: 1, maxLength: 500 },
    values: {
      type: "object",
      properties: {
        schoolOnboardingEnabled: { type: "boolean" },
        csvImportEnabled: { type: "boolean" }
      },
      additionalProperties: false,
      minProperties: 1
    }
  },
  required: ["reason", "values"],
  additionalProperties: false,
  example: {
    reason: "Freeze onboarding during rollout",
    values: { schoolOnboardingEnabled: false }
  }
});

addSchema("UpdateSystemSettingsGroupRequest", {
  oneOf: [
    { $ref: "#/components/schemas/UpdatePushNotificationsSettingsRequest" },
    { $ref: "#/components/schemas/UpdateTransportMapsSettingsRequest" },
    { $ref: "#/components/schemas/UpdateAnalyticsSettingsRequest" },
    { $ref: "#/components/schemas/UpdateImportsSettingsRequest" }
  ],
  example: componentSchemas.UpdateImportsSettingsRequest.example
});

addSchema("SystemSettingEntryResponse", {
  type: "object",
  properties: {
    key: { type: "string" },
    value: {},
    defaultValue: {},
    source: { type: "string", enum: ["default", "override"] },
    description: { type: "string" },
    updatedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }]
    },
    updatedBy: {
      anyOf: [
        {
          type: "object",
          properties: {
            userId: clone(numericIdSchema),
            fullName: { type: "string" }
          },
          required: ["userId", "fullName"],
          additionalProperties: false
        },
        { type: "null" }
      ]
    }
  },
  required: ["key", "value", "defaultValue", "source", "description", "updatedAt", "updatedBy"],
  additionalProperties: false,
  example: examples.systemSettingsGroup.entries[0]
});

addSchema("SystemSettingsGroupResponse", {
  type: "object",
  properties: {
    group: { type: "string", enum: SYSTEM_SETTING_GROUP_VALUES },
    description: { type: "string" },
    entries: {
      type: "array",
      items: { $ref: "#/components/schemas/SystemSettingEntryResponse" }
    }
  },
  required: ["group", "description", "entries"],
  additionalProperties: false,
  example: examples.systemSettingsGroup
});

addSchema("SystemSettingsListResponse", {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: { $ref: "#/components/schemas/SystemSettingsGroupResponse" }
    }
  },
  required: ["groups"],
  additionalProperties: false,
  example: examples.systemSettingsList
});

addSchema("SystemSettingAuditLogItemResponse", {
  type: "object",
  properties: {
    auditId: clone(numericIdSchema),
    group: { type: "string", enum: SYSTEM_SETTING_GROUP_VALUES },
    key: { type: "string" },
    action: { type: "string", enum: SYSTEM_SETTING_AUDIT_ACTION_VALUES },
    previousValue: {
      anyOf: [
        { type: "object", additionalProperties: true },
        { type: "boolean" },
        { type: "string" },
        { type: "number" },
        { type: "null" }
      ]
    },
    newValue: {
      anyOf: [
        { type: "object", additionalProperties: true },
        { type: "boolean" },
        { type: "string" },
        { type: "number" },
        { type: "null" }
      ]
    },
    reason: { type: "string" },
    requestId: { type: "string", format: "uuid" },
    changedAt: { type: "string", format: "date-time" },
    changedBy: {
      type: "object",
      properties: {
        userId: clone(numericIdSchema),
        fullName: { type: "string" }
      },
      required: ["userId", "fullName"],
      additionalProperties: false
    }
  },
  required: ["auditId", "group", "key", "action", "previousValue", "newValue", "reason", "requestId", "changedAt", "changedBy"],
  additionalProperties: false,
  example: examples.systemSettingAuditLog
});

addSchema("SystemIntegrationsStatusResponse", {
  type: "object",
  properties: {
    integrations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          providerKey: { type: "string", enum: SYSTEM_INTEGRATION_PROVIDER_KEYS },
          featureEnabled: { type: "boolean" },
          pendingOutboxCount: { type: "integer", minimum: 0 },
          failedOutboxCount: { type: "integer", minimum: 0 }
        },
        required: ["providerKey", "featureEnabled", "pendingOutboxCount", "failedOutboxCount"],
        additionalProperties: false
      }
    }
  },
  required: ["integrations"],
  additionalProperties: false,
  example: examples.systemIntegrationsStatus
});

addSchema("CreateAssessmentRequest", {
  type: "object",
  properties: {
    assessmentTypeId: clone(numericIdSchema),
    classId: clone(numericIdSchema),
    subjectId: clone(numericIdSchema),
    teacherId: {
      ...clone(numericIdSchema),
      description:
        "Admin flows must send teacherId. Teacher flows must omit this field and let the backend derive it from the authenticated teacher."
    },
    academicYearId: {
      ...clone(numericIdSchema),
      description:
        "Optional operational field. If omitted, the backend resolves the active academic year. If sent, it must match the active academic year."
    },
    semesterId: {
      ...clone(numericIdSchema),
      description:
        "Optional operational field. If omitted, the backend resolves the active semester. If sent, it must match the active semester."
    },
    title: { type: "string", minLength: 1, maxLength: 200 },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    maxScore: { type: "number", minimum: 0 },
    weight: { type: "number", minimum: 0 },
    assessmentDate: clone(dateSchema),
    isPublished: { type: "boolean" }
  },
  required: ["assessmentTypeId", "classId", "subjectId", "title", "maxScore", "assessmentDate"],
  additionalProperties: false,
  example: componentSchemas.CreateAssessmentRequest.example
});

addSchema("SaveAssessmentScoresRequest", {
  type: "object",
  properties: {
    records: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          studentId: clone(numericIdSchema),
          score: { type: "number", minimum: 0 },
          remarks: { anyOf: [{ type: "string" }, { type: "null" }] }
        },
        required: ["studentId", "score"],
        additionalProperties: false
      }
    }
  },
  required: ["records"],
  additionalProperties: false,
  example: componentSchemas.SaveAssessmentScoresRequest.example
});

addSchema("CreateAttendanceSessionRequest", {
  type: "object",
  properties: {
    classId: clone(numericIdSchema),
    subjectId: clone(numericIdSchema),
    academicYearId: {
      ...clone(numericIdSchema),
      description:
        "Optional operational field. If omitted, the backend resolves the active academic year. If sent, it must match the active academic year."
    },
    semesterId: {
      ...clone(numericIdSchema),
      description:
        "Optional operational field. If omitted, the backend resolves the active semester. If sent, it must match the active semester."
    },
    sessionDate: clone(dateSchema),
    periodNo: { type: "integer", minimum: 1 },
    title: { anyOf: [{ type: "string" }, { type: "null" }] },
    notes: { anyOf: [{ type: "string" }, { type: "null" }] },
    teacherId: {
      ...clone(numericIdSchema),
      description:
        "Admin flows must send teacherId. Teacher flows must omit this field and let the backend derive it from the authenticated teacher."
    }
  },
  required: ["classId", "subjectId", "sessionDate", "periodNo"],
  additionalProperties: false,
  example: componentSchemas.CreateAttendanceSessionRequest.example
});

addSchema("SaveAttendanceRecordsRequest", {
  type: "object",
  properties: {
    records: {
      type: "array",
      minItems: 1,
      description:
        "Full roster snapshot. Every active student in the session roster must appear exactly once.",
      items: {
        type: "object",
        properties: {
          studentId: clone(numericIdSchema),
          status: { type: "string", enum: ATTENDANCE_STATUS_VALUES, example: "present" },
          notes: { anyOf: [{ type: "string" }, { type: "null" }] }
        },
        required: ["studentId", "status"],
        additionalProperties: false
      }
    }
  },
  required: ["records"],
  additionalProperties: false,
  example: componentSchemas.SaveAttendanceRecordsRequest.example
});

addSchema("CreateHomeworkRequest", {
  type: "object",
  properties: {
    teacherId: {
      ...clone(numericIdSchema),
      description:
        "Admin flows must send teacherId. Teacher flows must omit this field and let the backend derive it from the authenticated teacher."
    },
    classId: clone(numericIdSchema),
    subjectId: clone(numericIdSchema),
    academicYearId: {
      ...clone(numericIdSchema),
      description:
        "Optional operational field. If omitted, the backend resolves the active academic year. If sent, it must match the active academic year."
    },
    semesterId: {
      ...clone(numericIdSchema),
      description:
        "Optional operational field. If omitted, the backend resolves the active semester. If sent, it must match the active semester."
    },
    title: { type: "string", minLength: 1, maxLength: 200 },
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    assignedDate: clone(dateSchema),
    dueDate: clone(dateSchema)
  },
  required: ["classId", "subjectId", "title", "assignedDate", "dueDate"],
  additionalProperties: false,
  example: componentSchemas.CreateHomeworkRequest.example
});

addSchema("SaveHomeworkSubmissionsRequest", {
  type: "object",
  properties: {
    records: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          studentId: clone(numericIdSchema),
          status: {
            type: "string",
            enum: HOMEWORK_SUBMISSION_STATUS_VALUES,
            example: "submitted"
          },
          submittedAt: { anyOf: [clone(dateSchema), { type: "null" }] },
          notes: { anyOf: [{ type: "string" }, { type: "null" }] }
        },
        required: ["studentId", "status"],
        additionalProperties: false
      }
    }
  },
  required: ["records"],
  additionalProperties: false,
  example: componentSchemas.SaveHomeworkSubmissionsRequest.example
});

addSchema("CreateBusRequest", {
  type: "object",
  properties: {
    plateNumber: { type: "string", minLength: 1, maxLength: 50 },
    driverId: clone(numericIdSchema),
    capacity: { type: "integer", minimum: 1 },
    status: { type: "string", enum: BUS_STATUS_VALUES, example: "active" }
  },
  required: ["plateNumber", "capacity"],
  additionalProperties: false,
  example: componentSchemas.CreateBusRequest.example
});

addSchema("CreateTripRequest", {
  type: "object",
  properties: {
    busId: clone(numericIdSchema),
    routeId: clone(numericIdSchema),
    tripDate: clone(dateSchema),
    tripType: { type: "string", enum: TRIP_TYPE_VALUES, example: "pickup" }
  },
  required: ["busId", "routeId", "tripDate", "tripType"],
  additionalProperties: false,
  example: componentSchemas.CreateTripRequest.example
});

addSchema("EnsureDailyTripRequest", {
  type: "object",
  properties: {
    routeAssignmentId: clone(numericIdSchema),
    tripDate: clone(dateSchema),
    tripType: { type: "string", enum: TRIP_TYPE_VALUES, example: "pickup" }
  },
  required: ["routeAssignmentId", "tripDate", "tripType"],
  additionalProperties: false,
  example: componentSchemas.EnsureDailyTripRequest.example
});

addSchema("RecordTripLocationRequest", {
  type: "object",
  properties: {
    latitude: { type: "number" },
    longitude: { type: "number" }
  },
  required: ["latitude", "longitude"],
  additionalProperties: false,
  example: componentSchemas.RecordTripLocationRequest.example
});

addSchema("CreateTripStudentEventRequest", {
  type: "object",
  properties: {
    studentId: clone(numericIdSchema),
    eventType: {
      type: "string",
      enum: TRIP_STUDENT_EVENT_TYPE_VALUES,
      example: "dropped_off"
    },
    stopId: clone(numericIdSchema),
    notes: { anyOf: [{ type: "string" }, { type: "null" }] }
  },
  required: ["studentId", "eventType"],
  additionalProperties: false,
  example: componentSchemas.CreateTripStudentEventRequest.example
});

addSchema("SaveStudentHomeLocationRequest", {
  type: "object",
  properties: {
    addressLabel: { anyOf: [{ type: "string" }, { type: "null" }] },
    addressText: { anyOf: [{ type: "string" }, { type: "null" }] },
    latitude: { type: "number" },
    longitude: { type: "number" },
    status: {
      type: "string",
      enum: HOME_LOCATION_STATUS_VALUES,
      example: "approved"
    },
    notes: { anyOf: [{ type: "string" }, { type: "null" }] }
  },
  required: ["latitude", "longitude"],
  additionalProperties: false,
  example: componentSchemas.SaveStudentHomeLocationRequest.example
});

addSchema("RegisterCommunicationDeviceRequest", {
  type: "object",
  properties: {
    providerKey: { type: "string", enum: ["fcm"], example: "fcm" },
    platform: { type: "string", enum: ["android", "ios", "web"], example: "android" },
    appId: { type: "string", minLength: 1, maxLength: 50 },
    deviceToken: { type: "string", minLength: 1, maxLength: 4096 },
    deviceName: { type: "string", minLength: 1, maxLength: 100 },
    subscriptions: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: {
        type: "string",
        enum: ["transportRealtime"],
        example: "transportRealtime"
      }
    }
  },
  required: ["providerKey", "platform", "appId", "deviceToken", "subscriptions"],
  additionalProperties: false,
  example: {
    providerKey: "fcm",
    platform: "android",
    appId: "ishraf-parent-app",
    deviceToken: "fcm-device-token-sample",
    deviceName: "Parent Pixel 8",
    subscriptions: ["transportRealtime"]
  }
});

addSchema("UpdateCommunicationDeviceRequest", {
  type: "object",
  properties: {
    deviceToken: { type: "string", minLength: 1, maxLength: 4096 },
    deviceName: { anyOf: [{ type: "string", minLength: 1, maxLength: 100 }, { type: "null" }] },
    subscriptions: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: {
        type: "string",
        enum: ["transportRealtime"],
        example: "transportRealtime"
      }
    }
  },
  additionalProperties: false,
  minProperties: 1,
  example: {
    deviceName: "Updated Parent Pixel 8",
    subscriptions: ["transportRealtime"]
  }
});

addSchema("SchoolOnboardingDryRunRequest", {
  type: "object",
  properties: {
    templateVersion: { type: "string", minLength: 1 },
    fileName: { type: "string", minLength: 1 },
    fileHash: { type: "string", minLength: 1 },
    fileSize: { type: "integer", minimum: 0 },
    config: {
      type: "object",
      properties: {
        activateAfterImport: { type: "boolean" },
        targetAcademicYearName: { type: "string" },
        targetSemesterName: { type: "string" }
      },
      required: ["activateAfterImport"],
      additionalProperties: false
    },
    workbook: {
      type: "object",
      description: "Structured workbook JSON. The backend does not accept raw Excel binary upload in v1.",
      additionalProperties: true
    }
  },
  required: ["templateVersion", "fileName", "fileHash", "config", "workbook"],
  additionalProperties: false,
  example: componentSchemas.SchoolOnboardingDryRunRequest.example
});

addSchema("SchoolOnboardingApplyRequest", {
  type: "object",
  properties: {
    dryRunId: {
      ...clone(numericIdSchema),
      description: "Must reference a validated dry-run result."
    },
    fallbackPassword: { type: "string", minLength: 1 },
    confirmActivateContext: { type: "boolean" }
  },
  required: ["dryRunId"],
  additionalProperties: false,
  example: componentSchemas.SchoolOnboardingApplyRequest.example
});

function qp(name, schema, description) {
  return { name, in: "query", required: false, schema, description };
}

const commonQuery = {
  page: () => qp("page", { type: "integer", minimum: 1, example: 1 }, "Pagination page number."),
  limit: () => qp("limit", { type: "integer", minimum: 1, maximum: 100, example: 20 }, "Pagination page size."),
  sortBy: (values, example = values[0]) => qp("sortBy", { type: "string", enum: values, example }, "Sort field whitelist."),
  sortOrder: (example = "desc") => qp("sortOrder", { type: "string", enum: ["asc", "desc"], example }, "Sort direction."),
  id: (name, description) => qp(name, clone(numericIdSchema), description),
  date: (name, description) => qp(name, clone(dateSchema), description),
  dateTime: (name, description, example = NOW) =>
    qp(name, clone({ ...dateTimeSchema, example }), description),
  boolean: (name, description) => qp(name, { type: "boolean", example: true }, description),
  text: (name, description, example) => qp(name, { type: "string", example }, description)
};

function paginatedQuery(sortValues, extras = [], defaultSort = sortValues[0], defaultOrder = "desc") {
  return [
    commonQuery.page(),
    commonQuery.limit(),
    commonQuery.sortBy(sortValues, defaultSort),
    commonQuery.sortOrder(defaultOrder),
    ...extras
  ];
}

function pathParamDescription(routePath, paramName) {
  if (paramName === "group")
    return "System settings group key. Allowed values: pushNotifications, transportMaps, analytics, imports.";
  if (paramName === "studentId") return "Student numeric string identifier. This is the same id used by /students/:id.";
  if (paramName === "parentUserId") return "Parent user numeric string identifier from /users?role=parent.";
  if (paramName === "teacherUserId") return "Teacher user numeric string identifier from /users?role=teacher.";
  if (paramName === "supervisorUserId") return "Supervisor user numeric string identifier from /users?role=supervisor.";
  if (paramName === "studentAssessmentId") return "Student assessment score numeric string identifier.";
  if (paramName === "attendanceId") return "Attendance record numeric string identifier.";
  if (paramName === "enrollmentId") return "Student academic enrollment numeric string identifier.";
  if (paramName === "academicYearId") return "Academic year numeric string identifier.";
  if (paramName === "routeId") return "Route numeric string identifier.";
  if (paramName === "otherUserId") return "The other conversation participant user id.";
  if (paramName === "messageId") return "Message numeric string identifier.";
  if (paramName === "notificationId") return "Notification numeric string identifier.";
  if (paramName === "deviceId") return "Communication device numeric string identifier.";
  if (paramName === "importId") return "School onboarding import run numeric string identifier.";
  if (paramName === "parentId")
    return "Parent identifier. These student-parent endpoints accept either the parent user id from /users?role=parent or the underlying parent profile id.";
  if (routePath.startsWith("/users/:id")) return "User numeric string identifier.";
  if (routePath.startsWith("/students/:id")) return "Student numeric string identifier.";
  if (routePath.startsWith("/academic-structure/academic-years/:id")) return "Academic year numeric string identifier.";
  if (routePath.startsWith("/academic-structure/semesters/:id")) return "Semester numeric string identifier.";
  if (routePath.startsWith("/academic-structure/classes/:id")) return "Class numeric string identifier.";
  if (routePath.startsWith("/academic-structure/subjects/:id")) return "Subject numeric string identifier.";
  if (routePath.startsWith("/academic-structure/subject-offerings/:id")) return "Subject offering numeric string identifier.";
  if (routePath.startsWith("/academic-structure/teacher-assignments/:id")) return "Teacher assignment numeric string identifier.";
  if (routePath.startsWith("/academic-structure/supervisor-assignments/:id")) return "Supervisor assignment numeric string identifier.";
  if (routePath.startsWith("/assessments/:id")) return "Assessment numeric string identifier.";
  if (routePath.startsWith("/attendance/sessions/:id")) return "Attendance session numeric string identifier.";
  if (routePath.startsWith("/behavior/records/:id")) return "Behavior record numeric string identifier.";
  if (routePath.startsWith("/transport/assignments/:id")) return "Student bus assignment numeric string identifier.";
  if (routePath.startsWith("/transport/route-assignments/:id")) return "Transport route assignment numeric string identifier.";
  if (routePath.startsWith("/transport/trips/:id")) return "Trip numeric string identifier.";
  if (routePath.startsWith("/homework/:id")) return "Homework numeric string identifier.";
  return "Numeric string identifier.";
}

function buildPathParameters(routePath) {
  const matches = routePath.match(/:([^/]+)/g) ?? [];
  return matches.map((match) => {
    const name = match.slice(1);
    const schema =
      name === "group"
        ? {
            type: "string",
            enum: SYSTEM_SETTING_GROUP_VALUES,
            example: "imports"
          }
        : clone(numericIdSchema);
    return {
      name,
      in: "path",
      required: true,
      description: pathParamDescription(routePath, name),
      schema
    };
  });
}

function postmanVariableForParam(routePath, paramName) {
  if (paramName !== "id") return paramName;
  if (routePath.startsWith("/users/:id")) return "userId";
  if (routePath.startsWith("/students/:id")) return "studentId";
  if (routePath.startsWith("/academic-structure/academic-years/:id")) return "academicYearId";
  if (routePath.startsWith("/academic-structure/semesters/:id")) return "semesterId";
  if (routePath.startsWith("/academic-structure/classes/:id")) return "classId";
  if (routePath.startsWith("/academic-structure/subjects/:id")) return "subjectId";
  if (routePath.startsWith("/academic-structure/subject-offerings/:id")) return "subjectOfferingId";
  if (routePath.startsWith("/academic-structure/teacher-assignments/:id")) return "teacherAssignmentId";
  if (routePath.startsWith("/academic-structure/supervisor-assignments/:id")) return "supervisorAssignmentId";
  if (routePath.startsWith("/assessments/:id")) return "assessmentId";
  if (routePath.startsWith("/attendance/sessions/:id")) return "attendanceSessionId";
  if (routePath.startsWith("/behavior/records/:id")) return "behaviorRecordId";
  if (routePath.startsWith("/transport/assignments/:id")) return "assignmentId";
  if (routePath.startsWith("/transport/route-assignments/:id")) return "routeAssignmentId";
  if (routePath.startsWith("/transport/trips/:id")) return "tripId";
  if (routePath.startsWith("/homework/:id")) return "homeworkId";
  return "id";
}

function makeEndpoint({ m, p, t, s, u, r = ["admin"], auth = true, b, q = [], kind = "object", e, status, notes = [], side, derived, root = false, tooMany = false }) {
  const successStatus = status ?? (m === "POST" && !p.endsWith("/start") && !p.endsWith("/end") && !p.endsWith("/locations") && !p.endsWith("/events") ? 201 : 200);
  return {
    method: m,
    path: p,
    tag: t,
    summary: s,
    purpose: u,
    roles: r,
    auth,
    requestBody: b,
    query: q,
    responseKind: kind,
    exampleKey: e,
    successStatus,
    successMessage: ({ Login: "Login successful", "Forgot Password": "Password reset requested successfully", "Reset Password": "Password reset successfully", "Refresh Token": "Token refreshed successfully", Logout: "Logout successful", "Change Password": "Password changed successfully", "Current User": "Current user fetched successfully" })[s] ?? `${s} completed successfully`,
    notes,
    sideEffects: side,
    derivedFrom: derived,
    rootServer: root,
    tooManyRequests: tooMany
  };
}
const userListQuery = paginatedQuery(["createdAt"], [commonQuery.text("role", "Filter by role.", "admin"), commonQuery.boolean("isActive", "Filter by active status.")], "createdAt");
const studentListQuery = paginatedQuery(["createdAt", "academicNo", "fullName", "enrollmentDate"], [commonQuery.id("classId", "Filter by class id."), commonQuery.id("academicYearId", "Filter by academic year id."), commonQuery.text("status", "Filter by student status.", "active"), commonQuery.text("gender", "Filter by gender.", "male")], "createdAt");
const studentAcademicEnrollmentsQuery = [
  commonQuery.id("studentId", "Filter by student id."),
  commonQuery.id("academicYearId", "Filter by academic year id."),
  commonQuery.id("classId", "Filter by class id.")
];
const attendanceListQuery = paginatedQuery(["sessionDate", "periodNo", "createdAt"], [commonQuery.id("classId", "Filter by class id."), commonQuery.id("subjectId", "Filter by subject id."), commonQuery.id("teacherId", "Filter by teacher identifier. Accepts the teacher user id from /users?role=teacher or the legacy teacher profile id."), commonQuery.id("academicYearId", "Filter by academic year id."), commonQuery.id("semesterId", "Filter by semester id."), commonQuery.date("sessionDate", "Filter by exact session date."), commonQuery.date("dateFrom", "Filter from session date."), commonQuery.date("dateTo", "Filter to session date.")], "sessionDate");
const assessmentListQuery = paginatedQuery(["assessmentDate", "createdAt", "title"], [commonQuery.id("assessmentTypeId", "Filter by assessment type id."), commonQuery.id("classId", "Filter by class id."), commonQuery.id("subjectId", "Filter by subject id."), commonQuery.id("teacherId", "Filter by teacher identifier. Accepts the teacher user id from /users?role=teacher or the legacy teacher profile id."), commonQuery.id("academicYearId", "Filter by academic year id."), commonQuery.id("semesterId", "Filter by semester id."), commonQuery.date("assessmentDate", "Filter by exact assessment date."), commonQuery.date("dateFrom", "Filter from assessment date."), commonQuery.date("dateTo", "Filter to assessment date."), commonQuery.boolean("isPublished", "Filter by publication state.")], "assessmentDate");
const behaviorListQuery = paginatedQuery(["behaviorDate", "createdAt", "severity"], [commonQuery.id("studentId", "Filter by student id."), commonQuery.id("behaviorCategoryId", "Filter by behavior category id."), commonQuery.text("behaviorType", "Filter by behavior type.", "negative"), commonQuery.id("academicYearId", "Filter by academic year id."), commonQuery.id("semesterId", "Filter by semester id."), commonQuery.id("teacherId", "Filter by teacher identifier. Accepts the teacher user id from /users?role=teacher or the legacy teacher profile id."), commonQuery.id("supervisorId", "Filter by supervisor identifier. Accepts the supervisor user id from /users?role=supervisor or the legacy supervisor profile id."), commonQuery.date("behaviorDate", "Filter by exact behavior date."), commonQuery.date("dateFrom", "Filter from behavior date."), commonQuery.date("dateTo", "Filter to behavior date.")], "behaviorDate");
const homeworkListQuery = paginatedQuery(["dueDate", "assignedDate", "createdAt", "title"], [commonQuery.id("classId", "Filter by class id."), commonQuery.id("subjectId", "Filter by subject id."), commonQuery.id("teacherId", "Filter by teacher identifier. Accepts the teacher user id from /users?role=teacher or the legacy teacher profile id."), commonQuery.id("academicYearId", "Filter by academic year id."), commonQuery.id("semesterId", "Filter by semester id."), commonQuery.date("assignedDate", "Filter by exact assigned date."), commonQuery.date("dueDate", "Filter by exact due date."), commonQuery.date("dateFrom", "Filter from date range."), commonQuery.date("dateTo", "Filter to date range.")], "dueDate");
const subjectOfferingsQuery = [
  commonQuery.id("academicYearId", "Filter by academic year id."),
  commonQuery.id("semesterId", "Filter by semester id."),
  commonQuery.id("gradeLevelId", "Filter by grade level id."),
  commonQuery.id("subjectId", "Filter by subject id."),
  commonQuery.boolean("isActive", "Filter by activation state.")
];
const classesQuery = [
  commonQuery.id("academicYearId", "Filter by academic year id."),
  commonQuery.id("gradeLevelId", "Filter by grade level id."),
  commonQuery.boolean("isActive", "Filter by activation state.")
];
const subjectsQuery = [
  commonQuery.id("gradeLevelId", "Filter by grade level id."),
  commonQuery.boolean("isActive", "Filter by activation state.")
];
const teacherAssignmentsQuery = [
  commonQuery.id("academicYearId", "Filter by academic year id."),
  commonQuery.id("classId", "Filter by class id."),
  commonQuery.id("subjectId", "Filter by subject id."),
  commonQuery.id("teacherId", "Filter by teacher identifier. Accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.")
];
const supervisorAssignmentsQuery = [
  commonQuery.id("academicYearId", "Filter by academic year id."),
  commonQuery.id("classId", "Filter by class id."),
  commonQuery.id("supervisorId", "Filter by supervisor identifier. Accepts the supervisor user id from /users?role=supervisor or the legacy supervisor profile id.")
];
const tripListQuery = paginatedQuery(["tripDate", "tripStatus", "startedAt", "createdAt"], [commonQuery.id("busId", "Filter by bus id."), commonQuery.id("routeId", "Filter by route id."), commonQuery.text("tripType", "Filter by trip type.", "pickup"), commonQuery.text("tripStatus", "Filter by trip status.", "started"), commonQuery.date("tripDate", "Filter by exact trip date."), commonQuery.date("dateFrom", "Filter from trip date."), commonQuery.date("dateTo", "Filter to trip date.")], "tripDate");
const tripRosterQuery = [commonQuery.text("search", "Filter roster rows by student full name or academic number.", "Student One"), commonQuery.id("stopId", "Filter roster rows by assigned stop id.")];
const transportRealtimeTokenQuery = [commonQuery.id("tripId", "Trip numeric string identifier used to scope the Firebase realtime token.")];
const inboxQuery = paginatedQuery(["sentAt"], [commonQuery.boolean("isRead", "Filter by read state.")], "sentAt");
const sentQuery = paginatedQuery(["sentAt"], [commonQuery.id("receiverUserId", "Filter by receiver user id.")], "sentAt");
const conversationQuery = paginatedQuery(["sentAt"], [], "sentAt", "asc");
const notificationsQuery = paginatedQuery(["createdAt", "readAt"], [commonQuery.boolean("isRead", "Filter by read state."), commonQuery.text("notificationType", "Filter by notification type.", "attendance_absent")], "createdAt");
const recipientsQuery = [
  commonQuery.page(),
  commonQuery.limit(),
  commonQuery.text("search", "Filter recipients by full name, email, or phone.", "Supervisor"),
  commonQuery.text("role", "Filter recipients by role.", "supervisor")
];
const systemSettingsAuditQuery = paginatedQuery(
  ["createdAt"],
  [
    commonQuery.text(
      "group",
      "Filter audit rows by settings group.",
      "imports"
    ),
    commonQuery.text("key", "Filter audit rows by setting key.", "schoolOnboardingEnabled"),
    commonQuery.id("changedByUserId", "Filter audit rows by actor user id."),
    commonQuery.dateTime(
      "since",
      "Filter audit rows created on or after this ISO datetime.",
      NOW
    ),
    commonQuery.dateTime(
      "until",
      "Filter audit rows created on or before this ISO datetime.",
      NOW
    )
  ],
  "createdAt"
);
const schoolOnboardingImportHistoryQuery = [commonQuery.page(), commonQuery.limit()];

const endpoints = [
  makeEndpoint({ m: "GET", p: "/health", t: "Health", s: "Health", u: "Return liveness information for the deployed service.", auth: false, root: true, status: 200, e: "serviceStatus" }),
  makeEndpoint({ m: "GET", p: "/health/ready", t: "Health", s: "Health Ready", u: "Return readiness information after checking database connectivity.", auth: false, root: true, status: 200, e: "serviceStatus" }),
  makeEndpoint({ m: "POST", p: "/auth/login", t: "Auth", s: "Login", u: "Authenticate with email or phone and issue access and refresh tokens.", auth: false, b: "LoginRequest", status: 200, e: "user", tooMany: true }),
  makeEndpoint({ m: "POST", p: "/auth/forgot-password", t: "Auth", s: "Forgot Password", u: "Request a password reset token for an active account. Staging usually does not expose resetToken in the response.", auth: false, b: "ForgotPasswordRequest", status: 200, e: "serviceStatus", tooMany: true }),
  makeEndpoint({ m: "POST", p: "/auth/reset-password", t: "Auth", s: "Reset Password", u: "Reset the password using a valid reset token. Successful reset revokes existing refresh tokens.", auth: false, b: "ResetPasswordRequest", kind: "null", status: 200, tooMany: true }),
  makeEndpoint({ m: "POST", p: "/auth/refresh", t: "Auth", s: "Refresh Token", u: "Exchange a valid refresh token for a fresh access/refresh pair.", auth: false, b: "RefreshTokenRequest", status: 200, e: "user" }),
  makeEndpoint({ m: "POST", p: "/auth/logout", t: "Auth", s: "Logout", u: "Revoke the provided refresh token.", auth: false, b: "LogoutRequest", kind: "null", status: 200 }),
  makeEndpoint({ m: "POST", p: "/auth/change-password", t: "Auth", s: "Change Password", u: "Change the current authenticated user password.", r: ["admin", "parent", "teacher", "supervisor", "driver"], b: "ChangePasswordRequest", kind: "null", status: 200 }),
  makeEndpoint({ m: "GET", p: "/auth/me", t: "Auth", s: "Current User", u: "Return the authenticated active user profile used for frontend bootstrap.", r: ["admin", "parent", "teacher", "supervisor", "driver"], status: 200, e: "user" }),
  makeEndpoint({ m: "POST", p: "/users", t: "Users", s: "Create User", u: "Create a new user for any supported role. profile is role-specific.", b: "CreateUserRequest", e: "user" }),
  makeEndpoint({ m: "GET", p: "/users", t: "Users", s: "List Users", u: "List users with pagination and filters.", q: userListQuery, kind: "paginated", e: "user", status: 200 }),
  makeEndpoint({ m: "GET", p: "/users/:id", t: "Users", s: "Get User", u: "Return one user by id.", e: "user", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/users/:id", t: "Users", s: "Update User", u: "Update basic user fields and role-specific profile fields.", b: "UpdateUserRequest", e: "user", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/users/:id/status", t: "Users", s: "Update User Status", u: "Activate or deactivate a user account.", b: "UpdateUserStatusRequest", e: "user", status: 200 }),
  makeEndpoint({ m: "GET", p: "/academic-structure/context/active", t: "Academic Structure", s: "[NEW] Get Active Academic Context", u: "Return the active academic year and active semester used by operational admin surfaces.", e: "activeAcademicContext", status: 200, notes: ["[NEW] This is the canonical global context for daily admin operations.", "If either the active academic year or active semester is missing, operational endpoints may return 409 Academic context not configured."] }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/context/active", t: "Academic Structure", s: "[NEW] Update Active Academic Context", u: "Atomically set the active academic year and active semester for operational surfaces.", b: "ActiveAcademicContextRequest", e: "activeAcademicContext", status: 200, notes: ["[NEW] Use this as the canonical activation flow instead of activating the academic year and semester separately.", "The selected semester must belong to the selected academic year."] }),
  makeEndpoint({ m: "POST", p: "/academic-structure/academic-years", t: "Academic Structure", s: "Create Academic Year", u: "Create an academic year record.", b: "CreateAcademicYearRequest", e: "academicYear" }),
  makeEndpoint({ m: "GET", p: "/academic-structure/academic-years", t: "Academic Structure", s: "List Academic Years", u: "List all academic years.", kind: "array", e: "academicYear", status: 200 }),
  makeEndpoint({ m: "GET", p: "/academic-structure/academic-years/:id", t: "Academic Structure", s: "Get Academic Year", u: "Return one academic year by id.", e: "academicYear", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/academic-years/:id", t: "Academic Structure", s: "Update Academic Year", u: "Update an academic year.", b: "UpdateAcademicYearRequest", e: "academicYear", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/academic-years/:id/activate", t: "Academic Structure", s: "Activate Academic Year", u: "Activate the selected academic year and deactivate any other active year.", e: "academicYear", status: 200 }),
  makeEndpoint({ m: "POST", p: "/academic-structure/academic-years/:academicYearId/semesters", t: "Academic Structure", s: "Create Semester", u: "Create a semester under the selected academic year.", b: "CreateSemesterRequest", e: "academicYear" }),
  makeEndpoint({ m: "GET", p: "/academic-structure/academic-years/:academicYearId/semesters", t: "Academic Structure", s: "List Semesters", u: "List semesters for the selected academic year.", kind: "array", e: "academicYear", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/semesters/:id", t: "Academic Structure", s: "Update Semester", u: "Update semester dates or activation state.", b: "UpdateSemesterRequest", e: "academicYear", status: 200 }),
  makeEndpoint({ m: "POST", p: "/academic-structure/grade-levels", t: "Academic Structure", s: "Create Grade Level", u: "Create a grade level.", b: "CreateGradeLevelRequest", e: "classEntity" }),
  makeEndpoint({ m: "GET", p: "/academic-structure/grade-levels", t: "Academic Structure", s: "List Grade Levels", u: "List grade levels.", kind: "array", e: "classEntity", status: 200 }),
  makeEndpoint({ m: "POST", p: "/academic-structure/classes", t: "Academic Structure", s: "Create Class", u: "Create a class section.", b: "CreateClassRequest", e: "classEntity" }),
  makeEndpoint({ m: "GET", p: "/academic-structure/classes", t: "Academic Structure", s: "List Classes", u: "List classes with optional academic year, grade level, and activation filters.", q: classesQuery, kind: "array", e: "classEntity", status: 200 }),
  makeEndpoint({ m: "GET", p: "/academic-structure/classes/:id", t: "Academic Structure", s: "Get Class", u: "Return one class by id.", e: "classEntity", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/classes/:id", t: "Academic Structure", s: "[NEW] Update Class", u: "Update class operational fields such as section, capacity, and activation state without changing academic linkage.", b: "UpdateClassRequest", e: "classEntity", status: 200, notes: ["[NEW] This is the canonical management surface for class corrections and activation updates."] }),
  makeEndpoint({ m: "POST", p: "/academic-structure/subjects", t: "Academic Structure", s: "Create Subject", u: "Create a subject under a grade level. Subjects remain grade-level master data and do not accept semesterId.", b: "CreateSubjectRequest", e: "subject", notes: ["Use subject-offerings to link a subject into one or more semesters without changing the subject master record."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/subjects", t: "Academic Structure", s: "List Subjects", u: "List subjects with optional grade level and activation filters.", q: subjectsQuery, kind: "array", e: "subject", status: 200 }),
  makeEndpoint({ m: "GET", p: "/academic-structure/subjects/:id", t: "Academic Structure", s: "Get Subject", u: "Return one subject by id.", e: "subject", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/subjects/:id", t: "Academic Structure", s: "[NEW] Update Subject", u: "Update subject master-data fields such as name, code, and activation state while keeping the subject grade-level-scoped.", b: "UpdateSubjectRequest", e: "subject", status: 200, notes: ["[NEW] Subjects remain master data; semester-specific availability still belongs to subject-offerings."] }),
  makeEndpoint({ m: "POST", p: "/academic-structure/subject-offerings", t: "Academic Structure", s: "[NEW] Create Subject Offering", u: "Link an existing subject to a semester without changing the subject master data.", b: "CreateSubjectOfferingRequest", e: "subjectOffering", notes: ["[NEW] Subject offerings are the official semester-aware layer for subject availability."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/subject-offerings", t: "Academic Structure", s: "[NEW] List Subject Offerings", u: "List subject offerings with optional academic year, semester, grade level, subject, and activation filters.", q: subjectOfferingsQuery, kind: "array", e: "subjectOffering", status: 200, notes: ["[NEW] This is the canonical list surface for semester-aware subject availability."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/subject-offerings/:id", t: "Academic Structure", s: "[NEW] Get Subject Offering", u: "Return one subject offering by id.", e: "subjectOffering", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/subject-offerings/:id", t: "Academic Structure", s: "[NEW] Update Subject Offering", u: "Update a subject offering activation state. This round only supports isActive changes.", b: "UpdateSubjectOfferingRequest", e: "subjectOffering", status: 200 }),
  makeEndpoint({ m: "POST", p: "/academic-structure/teacher-assignments", t: "Academic Structure", s: "Create Teacher Assignment", u: "Assign a teacher to a class and subject for an academic year. teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.", b: "CreateTeacherAssignmentRequest", e: "teacherAssignment", notes: ["Frontend should send the teacher user id returned by GET /users?role=teacher. The backend resolves it internally to the stored teacher profile id.", "Legacy integrations may still send the teacher profile id directly.", "If the same value matches a teacher user id and a different teacher profile id, the backend rejects the request with TEACHER_ID_AMBIGUOUS instead of guessing."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/teacher-assignments", t: "Academic Structure", s: "List Teacher Assignments", u: "List teacher assignments with optional academic year, class, subject, and teacher filters.", q: teacherAssignmentsQuery, kind: "array", e: "teacherAssignment", status: 200 }),
  makeEndpoint({ m: "GET", p: "/academic-structure/teacher-assignments/:id", t: "Academic Structure", s: "[NEW] Get Teacher Assignment", u: "Return one teacher assignment by id.", e: "teacherAssignment", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/teacher-assignments/:id", t: "Academic Structure", s: "[NEW] Update Teacher Assignment", u: "Update a teacher assignment for administrative corrections. teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.", b: "UpdateTeacherAssignmentRequest", e: "teacherAssignment", status: 200, notes: ["[NEW] Teacher assignment updates preserve the existing compatibility and teacher-resolution rules."] }),
  makeEndpoint({ m: "POST", p: "/academic-structure/supervisor-assignments", t: "Academic Structure", s: "Create Supervisor Assignment", u: "Assign a supervisor to a class for an academic year. supervisorId accepts the supervisor user id from /users?role=supervisor or the legacy supervisor profile id.", b: "CreateSupervisorAssignmentRequest", e: "supervisorAssignment", notes: ["Frontend should send the supervisor user id returned by GET /users?role=supervisor. The backend resolves it internally to the stored supervisor profile id.", "Legacy integrations may still send the supervisor profile id directly.", "If the same value matches a supervisor user id and a different supervisor profile id, the backend rejects the request with SUPERVISOR_ID_AMBIGUOUS instead of guessing."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/supervisor-assignments", t: "Academic Structure", s: "List Supervisor Assignments", u: "List supervisor assignments with optional academic year, class, and supervisor filters.", q: supervisorAssignmentsQuery, kind: "array", e: "supervisorAssignment", status: 200 }),
  makeEndpoint({ m: "GET", p: "/academic-structure/supervisor-assignments/:id", t: "Academic Structure", s: "[NEW] Get Supervisor Assignment", u: "Return one supervisor assignment by id.", e: "supervisorAssignment", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/supervisor-assignments/:id", t: "Academic Structure", s: "[NEW] Update Supervisor Assignment", u: "Update a supervisor assignment for administrative corrections. supervisorId accepts the supervisor user id from /users?role=supervisor or the legacy supervisor profile id.", b: "UpdateSupervisorAssignmentRequest", e: "supervisorAssignment", status: 200, notes: ["[NEW] Supervisor assignment updates preserve the existing compatibility and supervisor-resolution rules."] })
];
endpoints.push(
  makeEndpoint({ m: "POST", p: "/students", t: "Students", s: "Create Student", u: "Create a student in the selected class and create the matching academic enrollment record inside the same transaction.", b: "CreateStudentRequest", e: "student", notes: ["The selected class determines the academic year for the initial enrollment."] }),
  makeEndpoint({ m: "GET", p: "/students", t: "Students", s: "List Students", u: "List students for the active academic year with pagination and filters.", q: studentListQuery, kind: "paginated", e: "student", status: 200, notes: ["This operational surface is active-year-aware.", "If academicYearId is provided, it must match the active academic year or the request is rejected."] }),
  makeEndpoint({ m: "GET", p: "/students/academic-enrollments", t: "Students", s: "[NEW] List Student Academic Enrollments", u: "List student academic enrollments for academic management and year preparation.", q: studentAcademicEnrollmentsQuery, kind: "array", e: "studentAcademicEnrollment", status: 200, notes: ["[NEW] This is an academic-management surface, not a daily operational roster."] }),
  makeEndpoint({ m: "POST", p: "/students/academic-enrollments/bulk", t: "Students", s: "[NEW] Bulk Upsert Student Academic Enrollments", u: "Create or update many student academic enrollments for structured promotion and year preparation.", b: "BulkStudentAcademicEnrollmentsRequest", kind: "array", e: "studentAcademicEnrollment", status: 200, notes: ["[NEW] Use this for organized year-transition work instead of mutating students one by one."] }),
  makeEndpoint({ m: "PATCH", p: "/students/academic-enrollments/:enrollmentId", t: "Students", s: "[NEW] Update Student Academic Enrollment", u: "Update one student academic enrollment record.", b: "UpdateStudentAcademicEnrollmentRequest", e: "studentAcademicEnrollment", status: 200 }),
  makeEndpoint({ m: "GET", p: "/students/:id", t: "Students", s: "Get Student", u: "Return one student by id using the active academic year as the current academic state.", e: "student", status: 200, notes: ["This operational detail surface requires an active academic context."] }),
  makeEndpoint({ m: "PATCH", p: "/students/:id", t: "Students", s: "Update Student", u: "Update student profile fields and lifecycle status.", b: "UpdateStudentRequest", e: "student", status: 200 }),
  makeEndpoint({ m: "POST", p: "/students/:id/academic-enrollments", t: "Students", s: "[NEW] Create Student Academic Enrollment", u: "Create or upsert one academic enrollment for the selected student.", b: "CreateStudentAcademicEnrollmentRequest", e: "studentAcademicEnrollment", notes: ["[NEW] This is the canonical academic-management surface for assigning a student into a class for a specific year."] }),
  makeEndpoint({ m: "GET", p: "/students/:id/academic-enrollments", t: "Students", s: "[NEW] List Student Academic Enrollments By Student", u: "Return all academic enrollments for one student across years.", kind: "array", e: "studentAcademicEnrollment", status: 200 }),

  makeEndpoint({ m: "POST", p: "/students/:id/parents", t: "Students", s: "Link Parent to Student", u: "Link an existing parent to a student. parentId may be either the parent user id returned by /users?role=parent or the underlying parent profile id.", b: "LinkStudentParentRequest", e: "user", notes: ["The backend resolves parentId to the stored parent profile id automatically. Prefer sending the user id returned by /users?role=parent in admin frontend flows."] }),
  makeEndpoint({ m: "GET", p: "/students/:id/parents", t: "Students", s: "List Student Parents", u: "Return parent links for one student.", kind: "array", e: "user", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/students/:studentId/parents/:parentId/primary", t: "Students", s: "Set Primary Parent", u: "Mark one linked parent as the primary parent for that student. parentId may be either the parent user id returned by /users?role=parent or the underlying parent profile id.", e: "user", status: 200, notes: ["The backend resolves parentId to the stored parent profile id automatically. Prefer sending the user id returned by /users?role=parent in admin frontend flows."] }),
  makeEndpoint({ m: "POST", p: "/students/:id/promotions", t: "Students", s: "Promote Student", u: "Promote a student to another class for a target academic year while writing structured enrollment state and promotion history.", b: "PromoteStudentRequest", e: "student", notes: ["The promotion writes the target academic enrollment even when the target year is not active yet.", "students.class_id is only synchronized immediately when the target year is the active academic year."] }),
  makeEndpoint({ m: "GET", p: "/system-settings", t: "System Settings", s: "[NEW] List System Settings", u: "Return every implemented system settings group with effective values merged from code defaults and stored overrides.", r: ["admin"], e: "systemSettingsList", status: 200, notes: ["[NEW] Step 1 is global-only and currently implements pushNotifications, transportMaps, analytics, and imports.", "[NEW] Each entry returns the effective value, the code default, and whether the source is default or override.", "[NEW] transportMaps.etaProvider defaults to mapbox and is applied by runtime provider resolution.", "[NEW] transportMaps.etaDerivedEstimateEnabled defaults to true and controls local ETA math between provider refreshes."] }),
  makeEndpoint({ m: "GET", p: "/system-settings/audit", t: "System Settings", s: "[NEW] List System Settings Audit", u: "List append-only audit rows for setting changes with pagination and optional filters.", r: ["admin"], q: systemSettingsAuditQuery, kind: "paginated", e: "systemSettingAuditLog", status: 200, notes: ["[NEW] Audit rows capture created, updated, and cleared actions.", "[NEW] requestId lets admin trace one change batch across multiple keys."] }),
  makeEndpoint({ m: "GET", p: "/system-settings/integrations/status", t: "System Settings", s: "[NEW] Get Integration Feature Status", u: "Return feature-enabled status for external integration groups together with pending and failed integration outbox counts.", r: ["admin"], e: "systemIntegrationsStatus", status: 200, notes: ["[NEW] This surface only covers pushNotifications, transportMaps, and analytics.", "[NEW] providerConfigured is intentionally not returned; this surface tracks feature state and integration outbox workload only."] }),
  makeEndpoint({ m: "GET", p: "/system-settings/:group", t: "System Settings", s: "[NEW] Get System Settings Group", u: "Return one system settings group with effective values, defaults, descriptions, and override metadata.", r: ["admin"], e: "systemSettingsGroup", status: 200, notes: ["[NEW] Allowed groups are pushNotifications, transportMaps, analytics, and imports.", "[NEW] transportMaps.etaProvider is part of the admin control plane and defaults to mapbox."] }),
  makeEndpoint({ m: "PATCH", p: "/system-settings/:group", t: "System Settings", s: "[NEW] Update System Settings Group", u: "Update one system settings group by writing overrides only for values that differ from code defaults.", r: ["admin"], b: "UpdateSystemSettingsGroupRequest", e: "systemSettingsGroup", status: 200, notes: ["[NEW] The request body is group-specific. Use UpdatePushNotificationsSettingsRequest, UpdateTransportMapsSettingsRequest, UpdateAnalyticsSettingsRequest, or UpdateImportsSettingsRequest depending on :group.", "[NEW] Sending a value equal to the code default clears any existing override instead of storing redundant data.", "[NEW] transportMaps updates runtime behavior through etaProvider and etaDerivedEstimateEnabled.", "[NEW] The first live consumer is imports.schoolOnboardingEnabled. When it is false, school onboarding import endpoints reject with 409 FEATURE_DISABLED."] }),
  makeEndpoint({ m: "POST", p: "/assessments/types", t: "Assessments", s: "Create Assessment Type", u: "Create a reusable assessment type.", b: "CreateAssessmentTypeRequest", e: "assessment" }),
  makeEndpoint({ m: "GET", p: "/assessments/types", t: "Assessments", s: "List Assessment Types", u: "List assessment types.", r: ["admin", "teacher"], kind: "array", e: "assessment", status: 200 }),
  makeEndpoint({ m: "POST", p: "/assessments", t: "Assessments", s: "Create Assessment", u: "Create an assessment inside the active academic context. Teachers must omit teacherId and rely on the authenticated teacher profile. Admin teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.", r: ["admin", "teacher"], b: "CreateAssessmentRequest", e: "assessment", notes: ["academicYearId and semesterId may be omitted; the backend resolves the active academic context automatically.", "If academicYearId or semesterId is sent, it must match the active context.", "The selected subjectId must have an active subject offering for the resolved semester.", "Admin frontend flows should send teacherId as the teacher user id returned by GET /users?role=teacher.", "Teacher frontend flows must not send teacherId; the backend returns TEACHER_ID_NOT_ALLOWED if it is present.", "Relevant domain errors include CLASS_YEAR_MISMATCH, SEMESTER_YEAR_MISMATCH, SUBJECT_GRADE_LEVEL_MISMATCH, SUBJECT_NOT_OFFERED_IN_SEMESTER, TEACHER_ID_REQUIRED, TEACHER_ID_NOT_ALLOWED, and ACADEMIC_CONTEXT_NOT_CONFIGURED."] }),
  makeEndpoint({ m: "GET", p: "/assessments", t: "Assessments", s: "List Assessments", u: "List assessments for the active academic context with pagination and filters.", r: ["admin", "teacher"], q: assessmentListQuery, kind: "paginated", e: "assessment", status: 200, notes: ["This operational list is scoped to the active academic year and active semester.", "teacherId filter accepts the teacher user id returned by GET /users?role=teacher or the legacy teacher profile id. Prefer the user id in admin frontend flows."] }),
  makeEndpoint({ m: "GET", p: "/assessments/:id", t: "Assessments", s: "Get Assessment", u: "Return one assessment detail record.", r: ["admin", "teacher"], e: "assessment", status: 200 }),
  makeEndpoint({ m: "GET", p: "/assessments/:id/scores", t: "Assessments", s: "Get Assessment Scores", u: "Return the score roster for one assessment.", r: ["admin", "teacher"], kind: "array", e: "assessmentScore", status: 200 }),
  makeEndpoint({ m: "PUT", p: "/assessments/:id/scores", t: "Assessments", s: "Save Assessment Scores", u: "Create or update score rows for one assessment roster.", r: ["admin", "teacher"], b: "SaveAssessmentScoresRequest", kind: "array", e: "assessmentScore", status: 200, notes: ["The payload does not need to include every student in the roster.", "Every submitted studentId must belong to the assessment roster.", "Relevant domain errors include ASSESSMENT_SCORE_EXCEEDS_MAX_SCORE, STUDENT_ASSESSMENT_DUPLICATE_STUDENT, and STUDENT_ASSESSMENT_STUDENT_NOT_ALLOWED."] }),
  makeEndpoint({ m: "PATCH", p: "/assessments/scores/:studentAssessmentId", t: "Assessments", s: "Update Student Assessment Score", u: "Update one student score row.", r: ["admin", "teacher"], b: "UpdateStudentAssessmentScoreRequest", e: "assessmentScore", status: 200 }),
  makeEndpoint({ m: "POST", p: "/attendance/sessions", t: "Attendance", s: "Create Attendance Session", u: "Create an attendance session inside the active academic context. Admin teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id. Teacher flows must omit teacherId.", r: ["admin", "teacher"], b: "CreateAttendanceSessionRequest", e: "attendanceSession", notes: ["academicYearId and semesterId may be omitted; the backend resolves the active academic context automatically.", "If academicYearId or semesterId is sent, it must match the active context.", "The selected subjectId must have an active subject offering for the resolved semester.", "Admin frontend flows should send teacherId as the teacher user id returned by GET /users?role=teacher.", "Relevant domain errors include CLASS_YEAR_MISMATCH, SEMESTER_YEAR_MISMATCH, SUBJECT_GRADE_LEVEL_MISMATCH, SUBJECT_NOT_OFFERED_IN_SEMESTER, TEACHER_ID_REQUIRED, and ACADEMIC_CONTEXT_NOT_CONFIGURED."] }),
  makeEndpoint({ m: "GET", p: "/attendance/sessions", t: "Attendance", s: "List Attendance Sessions", u: "List attendance sessions for the active academic context with pagination. There is no root /attendance endpoint.", r: ["admin", "teacher", "supervisor"], q: attendanceListQuery, kind: "paginated", e: "attendanceSession", status: 200, notes: ["Empty collections return 200 with items=[] and pagination metadata.", "This operational list is scoped to the active academic year and active semester.", "teacherId filter accepts the teacher user id returned by GET /users?role=teacher or the legacy teacher profile id. Prefer the user id in admin frontend flows."] }),
  makeEndpoint({ m: "GET", p: "/attendance/sessions/:id", t: "Attendance", s: "Get Attendance Session", u: "Return one attendance session including its student roster.", r: ["admin", "teacher", "supervisor"], e: "attendanceSession", status: 200 }),
  makeEndpoint({ m: "PUT", p: "/attendance/sessions/:id/records", t: "Attendance", s: "Save Attendance Records", u: "Save the full attendance roster snapshot for one session.", r: ["admin", "teacher", "supervisor"], b: "SaveAttendanceRecordsRequest", kind: "array", e: "attendanceRecord", status: 200, notes: ["This payload is a full snapshot: every active student in the session roster must appear exactly once.", "Relevant domain errors include ATTENDANCE_DUPLICATE_STUDENT, ATTENDANCE_ROSTER_STUDENT_MISSING, and ATTENDANCE_ROSTER_STUDENT_NOT_ALLOWED."], side: "Any newly absent record can trigger parent notifications through the internal automation service." }),
  makeEndpoint({ m: "PATCH", p: "/attendance/records/:attendanceId", t: "Attendance", s: "Update Attendance Record", u: "Update one attendance record status or notes.", r: ["admin", "teacher", "supervisor"], b: "UpdateAttendanceRecordRequest", e: "attendanceRecord", status: 200, side: "If the record changes into absent, the internal automation service may create notifications for linked parents." }),
  makeEndpoint({ m: "POST", p: "/behavior/categories", t: "Behavior", s: "Create Behavior Category", u: "Create a behavior category definition.", b: "CreateBehaviorCategoryRequest", e: "behaviorCategory" }),
  makeEndpoint({ m: "GET", p: "/behavior/categories", t: "Behavior", s: "List Behavior Categories", u: "List behavior categories used in behavior forms. There is no behaviorType query filter in v1.", r: ["admin", "teacher", "supervisor"], kind: "array", e: "behaviorCategory", status: 200 }),
  makeEndpoint({ m: "POST", p: "/behavior/records", t: "Behavior", s: "Create Behavior Record", u: "Create a behavior record inside the active academic context. teacherId and supervisorId accept the matching user ids from /users or the legacy profile ids.", r: ["admin", "teacher", "supervisor"], b: "CreateBehaviorRecordRequest", e: "behaviorRecord", notes: ["academicYearId and semesterId may be omitted; the backend resolves the active academic context automatically.", "If academicYearId or semesterId is sent, it must match the active context.", "Admin frontend flows should send teacherId or supervisorId as the selected account user id from GET /users?role=teacher|supervisor.", "Legacy integrations may still send teacher/supervisor profile ids directly."], side: "Negative behavior categories trigger parent notifications through the internal automation service." }),
  makeEndpoint({ m: "GET", p: "/behavior/records", t: "Behavior", s: "List Behavior Records", u: "List behavior records for the active academic context with pagination and filters.", r: ["admin", "teacher", "supervisor"], q: behaviorListQuery, kind: "paginated", e: "behaviorRecord", status: 200, notes: ["This operational list is scoped to the active academic year and active semester.", "teacherId and supervisorId filters accept the corresponding user ids returned by GET /users or the legacy profile ids. Prefer user ids in admin frontend flows."] }),
  makeEndpoint({ m: "GET", p: "/behavior/records/:id", t: "Behavior", s: "Get Behavior Record", u: "Return one behavior record.", r: ["admin", "teacher", "supervisor"], e: "behaviorRecord", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/behavior/records/:id", t: "Behavior", s: "Update Behavior Record", u: "Update a behavior record payload.", r: ["admin", "teacher", "supervisor"], b: "UpdateBehaviorRecordRequest", e: "behaviorRecord", status: 200 }),
  makeEndpoint({ m: "GET", p: "/behavior/students/:studentId/records", t: "Behavior", s: "Get Student Behavior Records", u: "Return the student behavior timeline used beside behavior summaries. This endpoint is not paginated.", r: ["admin", "teacher", "supervisor"], e: "behaviorTimeline", status: 200, notes: ["If the student exists but has no behavior records yet, the response remains 200 with zero-safe summary values and records=[]."], derived: "The response combines behavior detail and summary SQL views such as vw_behavior_details and vw_student_behavior_summary." }),
  makeEndpoint({ m: "POST", p: "/transport/buses", t: "Transport", s: "Create Bus", u: "Create a bus and optionally assign a driver. The request accepts the driver user id from /users?role=driver or the legacy driver profile id.", b: "CreateBusRequest", e: "bus", notes: ["Frontend should send the driver user id returned by GET /users?role=driver. The backend resolves it internally to the stored driver profile id.", "Legacy integrations may still send the driver profile id directly."] }),
  makeEndpoint({ m: "GET", p: "/transport/buses", t: "Transport", s: "List Buses", u: "List buses used in transport setup.", kind: "array", e: "bus", status: 200 }),
  makeEndpoint({ m: "POST", p: "/transport/routes", t: "Transport", s: "Create Route", u: "Create a transport route.", b: "CreateRouteRequest", e: "route" }),
  makeEndpoint({ m: "GET", p: "/transport/routes", t: "Transport", s: "List Routes", u: "List transport routes.", kind: "array", e: "route", status: 200 }),
  makeEndpoint({ m: "POST", p: "/transport/routes/:routeId/stops", t: "Transport", s: "Create Route Stop", u: "Create a stop under the selected route.", b: "CreateRouteStopRequest", e: "routeStop" }),
  makeEndpoint({ m: "GET", p: "/transport/routes/:routeId/stops", t: "Transport", s: "List Route Stops", u: "List route stops in stopOrder order.", kind: "array", e: "routeStop", status: 200 }),
  makeEndpoint({ m: "POST", p: "/transport/assignments", t: "Transport", s: "Create Transport Assignment", u: "Create an active student bus assignment.", b: "CreateTransportAssignmentRequest", e: "assignment" }),
  makeEndpoint({ m: "PATCH", p: "/transport/assignments/:id/deactivate", t: "Transport", s: "Deactivate Transport Assignment", u: "Deactivate an active student bus assignment.", b: "DeactivateTransportAssignmentRequest", e: "assignment", status: 200 }),
  makeEndpoint({ m: "GET", p: "/transport/assignments/active", t: "Transport", s: "List Active Transport Assignments", u: "List active student bus assignments.", kind: "array", e: "assignment", status: 200 }),
  makeEndpoint({ m: "POST", p: "/transport/route-assignments", t: "Transport", s: "Create Route Assignment", u: "Create a recurring bus-to-route assignment used by the driver daily workflow.", b: "CreateTransportRouteAssignmentRequest", e: "routeAssignment" }),
  makeEndpoint({ m: "GET", p: "/transport/route-assignments", t: "Transport", s: "List Route Assignments", u: "List recurring bus-to-route assignments for admin transport management.", kind: "array", e: "routeAssignment", status: 200 }),
  makeEndpoint({ m: "GET", p: "/transport/route-assignments/me", t: "Transport", s: "List My Route Assignments", u: "Return the active recurring route assignments owned by the authenticated driver.", r: ["driver"], kind: "array", e: "routeAssignment", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/transport/route-assignments/:id/deactivate", t: "Transport", s: "Deactivate Route Assignment", u: "Deactivate a recurring bus-to-route assignment. Legacy trips remain intact.", b: "DeactivateTransportRouteAssignmentRequest", e: "routeAssignment", status: 200 }),
  makeEndpoint({ m: "GET", p: "/transport/realtime-token", t: "Transport", s: "Get Transport Realtime Token", u: "Issue a Firebase custom token scoped to one trip live-location path. Admin gets read access, driver owners get write access, and linked parents get read access.", r: ["admin", "parent", "driver"], q: transportRealtimeTokenQuery, e: "transportRealtimeToken", status: 200, notes: ["The token is scoped to /transport/live-trips/{tripId}/latestLocation in Firebase Realtime Database.", "The endpoint returns 409 FEATURE_DISABLED when pushNotifications.transportRealtimeEnabled is false.", "The endpoint returns 409 INTEGRATION_NOT_CONFIGURED when Firebase env secrets are missing.", "This endpoint is low-frequency bootstrap auth; live GPS points bypass the backend after token issuance."] }),
  makeEndpoint({ m: "POST", p: "/transport/trips", t: "Transport", s: "Create Trip", u: "Create a trip for a bus and route. Drivers and admins can create trips.", r: ["admin", "driver"], b: "CreateTripRequest", e: "trip", notes: ["Driver access is ownership-scoped to buses they are allowed to operate."] }),
  makeEndpoint({ m: "POST", p: "/transport/trips/ensure-daily", t: "Transport", s: "Ensure Daily Trip", u: "Create or reuse the operational trip for one route assignment, trip date, and trip type without creating duplicates.", r: ["admin", "driver"], b: "EnsureDailyTripRequest", e: "ensureDailyTrip", status: 200, notes: ["If a matching trip already exists for the same bus, route, tripDate, and tripType, the response remains 200 with created=false.", "This is the preferred driver-facing daily trip flow. POST /transport/trips remains a legacy fallback.", "routeAssignmentId must be active for the requested tripDate or the request fails with TRANSPORT_ROUTE_ASSIGNMENT_NOT_ACTIVE_FOR_TRIP_DATE."], derived: "The endpoint reuses the natural uniqueness of bus + route + tripDate + tripType." }),
  makeEndpoint({ m: "GET", p: "/transport/trips", t: "Transport", s: "List Trips", u: "List trips with pagination. Drivers only see trips within their scope.", r: ["admin", "driver"], q: tripListQuery, kind: "paginated", e: "trip", status: 200 }),
  makeEndpoint({ m: "GET", p: "/transport/trips/:id", t: "Transport", s: "Get Trip", u: "Return one trip detail including latest location, route stops, and event summary.", r: ["admin", "driver"], e: "tripDetail", status: 200, derived: "Trip detail aggregates transport views such as vw_trip_details, vw_route_stops, and vw_latest_trip_location." }),
  makeEndpoint({ m: "GET", p: "/transport/trips/:id/eta", t: "Transport", s: "Get Trip ETA", u: "Return the stop-based ETA read model for one trip, including the route polyline cache, ETA summary, and remaining stop snapshots.", r: ["admin", "driver"], e: "tripEta", status: 200, notes: ["ETA responses are provider-neutral at the API surface and expose calculationMode as provider_snapshot or derived_estimate.", "Runtime provider selection is active through transportMaps.etaProvider with mapbox as the default selected provider.", "ETA is a backend snapshot surface; live GPS streaming is read directly from Firebase RTDB after realtime token bootstrap."], derived: "The response is built from transport_trip_eta_snapshots, transport_trip_eta_stop_snapshots, and the cached route polyline when available." }),
  makeEndpoint({ m: "GET", p: "/transport/trips/:id/students", t: "Transport", s: "Get Trip Student Roster", u: "Return the full student roster for one trip, including assigned stop coordinates, the latest event state inside the same trip, and approved home location when available.", r: ["admin", "driver"], q: tripRosterQuery, e: "tripRoster", status: 200, notes: ["The roster returns all students assigned to the trip route for the trip date, even when no trip event has been recorded yet.", "If the trip exists but has no eligible students, the response remains 200 with students=[].", "Only approved homeLocation data is exposed to the driver-facing roster."], derived: "Roster rows are derived from trip-date transport assignments, route stop coordinates, approved student_transport_home_locations, and the latest trip_student_events row per student inside the same trip." }),
  makeEndpoint({ m: "POST", p: "/transport/trips/:id/start", t: "Transport", s: "Start Trip", u: "Mark a scheduled trip as started.", r: ["admin", "driver"], e: "trip", status: 200, notes: ["The trip must currently be scheduled. Otherwise the request fails with TRIP_STATUS_START_INVALID.", "When pushNotifications.fcmEnabled and pushNotifications.transportRealtimeEnabled are both true, the backend enqueues FCM wake-up events for subscribed parents and admins."], side: "Trip start writes the transport state to PostgreSQL first, then emits async automation work through integration_outbox." }),
  makeEndpoint({ m: "POST", p: "/transport/trips/:id/end", t: "Transport", s: "End Trip", u: "Mark a trip as ended.", r: ["admin", "driver"], e: "trip", status: 200, notes: ["The trip must currently be started. Otherwise the request fails with TRIP_STATUS_END_INVALID.", "When pushNotifications.fcmEnabled and pushNotifications.transportRealtimeEnabled are both true, the backend enqueues FCM wake-up events for subscribed parents and admins."], side: "Trip end writes the transport state to PostgreSQL first, then emits async automation work through integration_outbox." }),
  makeEndpoint({ m: "POST", p: "/transport/trips/:id/locations", t: "Transport", s: "Record Trip Location", u: "Record one location point for a started trip.", r: ["admin", "driver"], b: "RecordTripLocationRequest", e: "trip", status: 201, notes: ["Locations are only accepted while the trip is started. Invalid state returns TRIP_LOCATION_STATUS_INVALID.", "This endpoint stores operational trip locations in PostgreSQL. High-frequency driver GPS for the live map should go directly to Firebase RTDB after GET /transport/realtime-token." ] }),
  makeEndpoint({ m: "POST", p: "/transport/trips/:id/events", t: "Transport", s: "Create Trip Student Event", u: "Create one trip student event. stopId is required for boarded and dropped_off events, and must be omitted for absent.", r: ["admin", "driver"], b: "CreateTripStudentEventRequest", e: "tripEvent", status: 201, notes: ["Trip student event validation is trip-date aware: the student must have a transport assignment covering the trip date and route.", "Events are only accepted while the trip is started or ended. Invalid state returns TRIP_EVENT_STATUS_INVALID.", "A mismatching route assignment or stop produces STUDENT_TRIP_DATE_ASSIGNMENT_NOT_FOUND, TRIP_STUDENT_ROUTE_MISMATCH, or TRIP_EVENT_STOP_ROUTE_MISMATCH.", "All trip student events can enqueue FCM wake-up events when pushNotifications.fcmEnabled and pushNotifications.transportRealtimeEnabled are both true. dropped_off also writes an in-app parent notification."], side: "Trip student events write PostgreSQL truth first, then emit async automation work through integration_outbox." }),
  makeEndpoint({ m: "GET", p: "/transport/trips/:id/events", t: "Transport", s: "List Trip Events", u: "List student events recorded for a trip.", r: ["admin", "driver"], kind: "array", e: "tripEvent", status: 200 }),
  makeEndpoint({ m: "GET", p: "/transport/students/:studentId/home-location", t: "Transport", s: "Get Student Home Location", u: "Return the current saved home location reference for one student. In this round the endpoint is admin-only.", e: "studentHomeLocation", status: 200, notes: ["If the student exists but no home location has been saved yet, the response remains 200 with homeLocation=null."] }),
  makeEndpoint({ m: "PUT", p: "/transport/students/:studentId/home-location", t: "Transport", s: "Save Student Home Location", u: "Create or update the current student home location reference. v1 uses admin as the submitting source.", b: "SaveStudentHomeLocationRequest", e: "studentHomeLocation", status: 200, notes: ["Admin may save pending, approved, or rejected locations. Only approved locations appear in the driver roster."] }),
  makeEndpoint({ m: "DELETE", p: "/transport/students/:studentId/home-location", t: "Transport", s: "Delete Student Home Location", u: "Delete the current saved home location for one student.", e: "studentHomeLocation", status: 200 })
);
endpoints.push(
  makeEndpoint({ m: "POST", p: "/communication/devices", t: "Communication", s: "Register Communication Device", u: "Register or rebind one authenticated user device token for FCM delivery and wake-up subscriptions.", r: ["admin", "parent", "teacher", "supervisor", "driver"], b: "RegisterCommunicationDeviceRequest", e: "communicationDevice", status: 201, notes: ["Registration is available even when pushNotifications.fcmEnabled is false so the rollout can be pre-provisioned.", "providerKey currently supports only fcm and subscriptions currently support only transportRealtime.", "If the same providerKey + deviceToken already belongs to another user, the backend rebinds it to the current authenticated user inside the same transaction."] }),
  makeEndpoint({ m: "PATCH", p: "/communication/devices/:deviceId", t: "Communication", s: "Update Communication Device", u: "Update one registered device owned by the authenticated user, including token rotation, display name, and subscriptions.", r: ["admin", "parent", "teacher", "supervisor", "driver"], b: "UpdateCommunicationDeviceRequest", e: "communicationDevice", status: 200, notes: ["Ownership is enforced: users can only update their own registered devices.", "Updating deviceToken preserves uniqueness by provider and reactivates the device if it had been unregistered."] }),
  makeEndpoint({ m: "DELETE", p: "/communication/devices/:deviceId", t: "Communication", s: "Unregister Communication Device", u: "Soft-unregister one device owned by the authenticated user. The row remains for audit and token hygiene, but it stops receiving push traffic.", r: ["admin", "parent", "teacher", "supervisor", "driver"], e: "unregisteredCommunicationDevice", status: 200, notes: ["Ownership is enforced: users can only unregister their own devices.", "Subscriptions remain stored historically, but inactive devices are excluded from delivery resolution."] }),
  makeEndpoint({ m: "GET", p: "/communication/recipients", t: "Communication", s: "List Available Recipients", u: "Return the active users that the authenticated caller can currently message. v1 mirrors the current messaging policy: any active user except self.", r: ["admin", "parent", "teacher", "supervisor", "driver"], q: recipientsQuery, kind: "paginated", e: "recipient", status: 200, notes: ["The response is scope-limited to active users and excludes the authenticated user.", "Empty result sets return 200 with items=[]."] }),
  makeEndpoint({ m: "POST", p: "/communication/messages", t: "Communication", s: "Send Message", u: "Send a direct message to another active user.", r: ["admin", "parent", "teacher", "supervisor", "driver"], b: "SendMessageRequest", e: "message" }),
  makeEndpoint({ m: "POST", p: "/communication/messages/bulk", t: "Communication", s: "[NEW] Send Bulk Messages", u: "Create admin-only multi-target direct messages as individual one-to-one copies. The endpoint is all-or-nothing and uses the same audience rules as /communication/recipients.", r: ["admin"], b: "SendBulkMessageRequest", e: "bulkDelivery", status: 201, notes: ["[NEW] Direct multi-target delivery creates individual copies inside messages; it does not create a group thread.", "[NEW] At least one of receiverUserIds[] or targetRoles[] is required.", "[NEW] Explicit self-targeting is rejected.", "[NEW] If resolved audience is empty or explicit user ids are outside the available-recipient surface, the request fails with 400."], derived: "Audience resolution reuses the same active-user and self-exclusion policy exposed by GET /communication/recipients." }),
  makeEndpoint({ m: "GET", p: "/communication/messages/inbox", t: "Communication", s: "List Inbox", u: "List inbox messages for the authenticated user with unreadCount metadata.", r: ["admin", "parent", "teacher", "supervisor", "driver"], q: inboxQuery, kind: "paginated", e: "message", status: 200 }),
  makeEndpoint({ m: "GET", p: "/communication/messages/sent", t: "Communication", s: "List Sent Messages", u: "List sent messages for the authenticated user.", r: ["admin", "parent", "teacher", "supervisor", "driver"], q: sentQuery, kind: "paginated", e: "message", status: 200 }),
  makeEndpoint({ m: "GET", p: "/communication/messages/conversations/:otherUserId", t: "Communication", s: "Get Conversation", u: "List a direct conversation thread with another user. The default sort is ascending by sentAt.", r: ["admin", "parent", "teacher", "supervisor", "driver"], q: conversationQuery, kind: "paginated", e: "message", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/communication/messages/:messageId/read", t: "Communication", s: "Mark Message Read", u: "Mark one received message as read.", r: ["admin", "parent", "teacher", "supervisor", "driver"], e: "message", status: 200 }),
  makeEndpoint({ m: "POST", p: "/communication/announcements", t: "Communication", s: "Create Announcement", u: "Create an admin announcement targeted to all users, one role, or multiple roles. targetRole remains legacy; targetRoles[] is the new multi-role contract.", b: "CreateAnnouncementRequest", e: "announcement", notes: ["Announcements support roles/all only. Person-targeted announcements are not supported.", "Do not send targetRole and targetRoles together.", "If neither targetRole nor targetRoles is provided, the announcement targets all active roles."] }),
  makeEndpoint({ m: "GET", p: "/communication/announcements", t: "Communication", s: "List All Announcements", u: "List all announcements, including expired ones, for admin management.", kind: "array", e: "announcement", status: 200 }),
  makeEndpoint({ m: "GET", p: "/communication/announcements/active", t: "Communication", s: "List Active Announcements", u: "Return the active announcement feed visible to the authenticated role.", r: ["admin", "parent", "teacher", "supervisor", "driver"], kind: "array", e: "announcement", status: 200, derived: "The feed uses SQL views such as vw_active_announcements and filters by targetRoles[] when present; an empty targetRoles array means all roles." }),
  makeEndpoint({ m: "POST", p: "/communication/notifications", t: "Communication", s: "Create Notification", u: "Create a manual notification for one user. notificationType is free-form and can coexist with automation-generated values.", b: "CreateNotificationRequest", e: "notification" }),
  makeEndpoint({ m: "POST", p: "/communication/notifications/bulk", t: "Communication", s: "[NEW] Create Bulk Notifications", u: "Create admin-only multi-target notifications in one all-or-nothing transaction with an authoritative delivery summary.", r: ["admin"], b: "CreateBulkNotificationRequest", e: "bulkDelivery", status: 201, notes: ["[NEW] At least one of userIds[] or targetRoles[] is required.", "[NEW] Audience resolution reuses the same available-recipient rules as GET /communication/recipients.", "[NEW] The response returns delivery summary metadata rather than the full notification list."] }),
  makeEndpoint({ m: "GET", p: "/communication/notifications/me", t: "Communication", s: "List My Notifications", u: "List notifications for the authenticated user with unreadCount metadata.", r: ["admin", "parent", "teacher", "supervisor", "driver"], q: notificationsQuery, kind: "paginated", e: "notification", status: 200, derived: "Notification lists rely on views such as vw_notification_details and vw_user_notification_summary." }),
  makeEndpoint({ m: "PATCH", p: "/communication/notifications/:notificationId/read", t: "Communication", s: "Mark Notification Read", u: "Mark one notification as read.", r: ["admin", "parent", "teacher", "supervisor", "driver"], e: "notification", status: 200 }),
  makeEndpoint({ m: "POST", p: "/admin-imports/school-onboarding/dry-run", t: "Admin Imports", s: "[NEW] Run School Onboarding Dry-Run", u: "Validate a structured school onboarding workbook payload on the server, resolve natural keys, and persist an auditable dry-run result without writing domain data.", r: ["admin"], b: "SchoolOnboardingDryRunRequest", e: "schoolOnboardingImport", status: 200, notes: ["[NEW] This endpoint accepts structured workbook JSON, not raw Excel binary upload.", "[NEW] v1 is create-only and blocks duplicate/conflicting existing records.", "[NEW] The returned importId is the dryRunId required by the apply endpoint.", "[NEW] Frontend should key the result screen off status, canApply, summary, sheetSummaries, and issues.", "[NEW] If imports.schoolOnboardingEnabled is false in system settings, this endpoint rejects with 409 FEATURE_DISABLED."] }),
  makeEndpoint({ m: "POST", p: "/admin-imports/school-onboarding/apply", t: "Admin Imports", s: "[NEW] Apply School Onboarding Import", u: "Apply a previously validated school onboarding dry-run in one all-or-nothing transaction, with idempotent retry semantics.", r: ["admin"], b: "SchoolOnboardingApplyRequest", e: "schoolOnboardingImport", status: 200, notes: ["[NEW] dryRunId must reference a validated dry-run result.", "[NEW] Repeated apply calls for the same successful dryRunId return the previous apply result with alreadyApplied=true.", "[NEW] The import is create-only in v1 and does not sync, update, or delete existing records.", "[NEW] If dryRunId does not reference a validated dry-run, the request fails before writing anything.", "[NEW] If imports.schoolOnboardingEnabled is false in system settings, this endpoint rejects with 409 FEATURE_DISABLED."] }),
  makeEndpoint({ m: "GET", p: "/admin-imports/school-onboarding/history", t: "Admin Imports", s: "[NEW] List School Onboarding Import History", u: "List persisted school onboarding dry-run and apply attempts with summary metadata for admin audit and retry flows.", r: ["admin"], q: schoolOnboardingImportHistoryQuery, kind: "paginated", e: "schoolOnboardingImportHistoryItem", status: 200, notes: ["[NEW] History is paginated and includes both dry-run and apply records.", "[NEW] Each row includes status, canApply, and summary metadata.", "[NEW] If imports.schoolOnboardingEnabled is false in system settings, this endpoint rejects with 409 FEATURE_DISABLED."] }),
  makeEndpoint({ m: "GET", p: "/admin-imports/school-onboarding/history/:importId", t: "Admin Imports", s: "[NEW] Get School Onboarding Import History Detail", u: "Return one persisted school onboarding import run, including its result summary, issues, entity counts, and dry-run linkage when applicable.", r: ["admin"], e: "schoolOnboardingImportHistoryDetail", status: 200, notes: ["[NEW] Use this to reopen dry-run results or applied audit records without recomputing them.", "[NEW] The nested result includes status, canApply, summary, issues, and alreadyApplied when relevant.", "[NEW] If imports.schoolOnboardingEnabled is false in system settings, this endpoint rejects with 409 FEATURE_DISABLED."] }),
  makeEndpoint({ m: "POST", p: "/homework", t: "Homework", s: "Create Homework", u: "Create homework inside the active academic context. Teachers must omit teacherId and rely on the authenticated teacher profile. Admin teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.", r: ["admin", "teacher"], b: "CreateHomeworkRequest", e: "homework", notes: ["academicYearId and semesterId may be omitted; the backend resolves the active academic context automatically.", "If academicYearId or semesterId is sent, it must match the active context.", "The selected subjectId must have an active subject offering for the resolved semester.", "Admin frontend flows should send teacherId as the teacher user id returned by GET /users?role=teacher.", "Teacher frontend flows must not send teacherId; the backend returns TEACHER_ID_NOT_ALLOWED if it is present.", "Relevant domain errors include CLASS_YEAR_MISMATCH, SEMESTER_YEAR_MISMATCH, SUBJECT_GRADE_LEVEL_MISMATCH, SUBJECT_NOT_OFFERED_IN_SEMESTER, TEACHER_ID_REQUIRED, TEACHER_ID_NOT_ALLOWED, and ACADEMIC_CONTEXT_NOT_CONFIGURED."] }),
  makeEndpoint({ m: "GET", p: "/homework", t: "Homework", s: "List Homework", u: "List homework for the active academic context with pagination and academic filters.", r: ["admin", "teacher"], q: homeworkListQuery, kind: "paginated", e: "homework", status: 200, notes: ["This operational list is scoped to the active academic year and active semester.", "teacherId filter accepts the teacher user id returned by GET /users?role=teacher or the legacy teacher profile id. Prefer the user id in admin frontend flows."], derived: "Homework lists are enriched by SQL views such as vw_homework_details." }),
  makeEndpoint({ m: "GET", p: "/homework/students/:studentId", t: "Homework", s: "Get Student Homework", u: "Return homework assigned to one student. Parents are restricted to their linked children.", r: ["admin", "teacher", "parent"], e: "studentHomework", status: 200, notes: ["If the student exists but has no homework yet, the response remains 200 with items=[]."], derived: "Student homework uses view-backed projections such as vw_homework_details and vw_homework_submission_details." }),
  makeEndpoint({ m: "GET", p: "/homework/:id", t: "Homework", s: "Get Homework", u: "Return one homework detail including roster-level submission summary.", r: ["admin", "teacher"], e: "homework", status: 200, derived: "Homework detail is enriched through SQL views such as vw_homework_details and vw_homework_submission_details." }),
  makeEndpoint({ m: "PUT", p: "/homework/:id/submissions", t: "Homework", s: "Save Homework Submissions", u: "Create or update the homework submission roster.", r: ["admin", "teacher"], b: "SaveHomeworkSubmissionsRequest", kind: "array", e: "studentHomework", status: 200, notes: ["Only students in the homework roster are allowed.", "Relevant domain errors include HOMEWORK_SUBMISSION_DUPLICATE_STUDENT and HOMEWORK_SUBMISSION_STUDENT_NOT_ALLOWED."] }),
  makeEndpoint({ m: "GET", p: "/reporting/students/:studentId/profile", t: "Reporting", s: "Get Student Profile Report", u: "Return the full student profile payload used in admin and staff reporting screens.", r: ["admin", "teacher", "supervisor"], e: "studentProfileReport", status: 200, notes: ["If the student exists but has no related attendance, assessment, or behavior rows yet, the response stays 200 with zero-safe summaries."], derived: "This payload combines view-backed projections such as vw_student_profiles, vw_student_attendance_summary, vw_student_assessment_summary, and vw_student_behavior_summary." }),
  makeEndpoint({ m: "GET", p: "/reporting/students/:studentId/reports/attendance-summary", t: "Reporting", s: "Get Student Attendance Summary", u: "Return the student attendance summary used in charts and cards.", r: ["admin", "teacher", "supervisor"], e: "attendanceSummaryReport", status: 200, notes: ["No data yet returns 200 with zero-safe totals, not 404."], derived: "Derived from summary views such as vw_student_attendance_summary." }),
  makeEndpoint({ m: "GET", p: "/reporting/students/:studentId/reports/assessment-summary", t: "Reporting", s: "Get Student Assessment Summary", u: "Return the student assessment summary. Use assessmentSummary.subjects[] rather than items[].", r: ["admin", "teacher", "supervisor"], e: "assessmentSummaryReport", status: 200, notes: ["No data yet returns 200 with zero-safe overall metrics and an empty subjects array."], derived: "Derived from summary views such as vw_student_assessment_summary." }),
  makeEndpoint({ m: "GET", p: "/reporting/students/:studentId/reports/behavior-summary", t: "Reporting", s: "Get Student Behavior Summary", u: "Return the student behavior summary. Use /behavior/students/:studentId/records for the detailed timeline.", r: ["admin", "teacher", "supervisor"], e: "behaviorSummaryReport", status: 200, notes: ["No data yet returns 200 with zero-safe totals, not 404."], derived: "Derived from summary views such as vw_student_behavior_summary." }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/dashboard", t: "Reporting", s: "Get Admin Preview Parent Dashboard", u: "Return the canonical parent dashboard surface for admin monitoring, starting from the selected parent user account.", r: ["admin"], e: "parentDashboard", status: 200, notes: ["Admin-only, read-only preview surface.", "Path identifiers are users.id values, not parent profile ids.", "This is the preferred backend surface for parent-first monitoring and role parity previews."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/profile", t: "Reporting", s: "Get Admin Preview Parent Child Profile", u: "Return the canonical child profile payload under one selected parent user for admin monitoring.", r: ["admin"], e: "studentProfileReport", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires the selected child to be linked to the selected parent or returns 404 Student not linked to parent.", "Path identifiers are users.id for the parent and students.id for the child."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary", t: "Reporting", s: "Get Admin Preview Parent Child Attendance Summary", u: "Return the canonical child attendance summary under one selected parent user for admin monitoring.", r: ["admin"], e: "attendanceSummaryReport", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires parent-child linkage or returns 404 Student not linked to parent.", "No data yet returns 200 with zero-safe totals."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary", t: "Reporting", s: "Get Admin Preview Parent Child Assessment Summary", u: "Return the canonical child assessment summary under one selected parent user for admin monitoring.", r: ["admin"], e: "assessmentSummaryReport", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires parent-child linkage or returns 404 Student not linked to parent.", "Use assessmentSummary.subjects[] rather than items[]."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary", t: "Reporting", s: "Get Admin Preview Parent Child Behavior Summary", u: "Return the canonical child behavior summary under one selected parent user for admin monitoring.", r: ["admin"], e: "behaviorSummaryReport", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires parent-child linkage or returns 404 Student not linked to parent.", "Use /behavior/students/:studentId/records for the detailed timeline outside this summary view."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status", t: "Reporting", s: "Get Admin Preview Parent Child Transport Live Status", u: "Return the canonical parent transport live-status surface for one linked child under a selected parent user.", r: ["admin"], e: "parentTransportLiveStatus", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires parent-child linkage or returns 404 Student not linked to parent.", "ETA fields are backend-managed snapshots; live GPS streaming is consumed directly from Firebase RTDB after realtime token bootstrap."], derived: "This response is view-backed and combines active assignment, active trip live status, latest location, and recent event projections." }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/teachers/:teacherUserId/dashboard", t: "Reporting", s: "Get Admin Preview Teacher Dashboard", u: "Return the canonical teacher dashboard surface for admin monitoring, starting from the selected teacher user account.", r: ["admin"], e: "teacherDashboard", status: 200, notes: ["Admin-only, read-only preview surface.", "Path identifier is the teacher users.id from /users?role=teacher.", "Use this instead of reconstructing teacher dashboard parity from multiple admin endpoints."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/supervisors/:supervisorUserId/dashboard", t: "Reporting", s: "Get Admin Preview Supervisor Dashboard", u: "Return the canonical supervisor dashboard surface for admin monitoring, starting from the selected supervisor user account.", r: ["admin"], e: "supervisorDashboard", status: 200, notes: ["Admin-only, read-only preview surface.", "Path identifier is the supervisor users.id from /users?role=supervisor.", "Use this instead of reconstructing supervisor dashboard parity from multiple admin endpoints."] }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me", t: "Reporting", s: "Get Parent Dashboard", u: "Return the parent dashboard summary surface.", r: ["parent"], e: "parentDashboard", status: 200, notes: ["The dashboard only includes students linked to the authenticated parent profile."] }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me/students/:studentId/profile", t: "Reporting", s: "Get Parent Child Profile", u: "Return the child profile payload for the authenticated parent.", r: ["parent"], e: "studentProfileReport", status: 200, notes: ["The child must be linked to the authenticated parent or the request is denied."] }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary", t: "Reporting", s: "Get Parent Child Attendance Summary", u: "Return the child attendance summary for the authenticated parent.", r: ["parent"], e: "attendanceSummaryReport", status: 200, notes: ["The child must be linked to the authenticated parent or the request is denied."] }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary", t: "Reporting", s: "Get Parent Child Assessment Summary", u: "Return the child assessment summary for the authenticated parent.", r: ["parent"], e: "assessmentSummaryReport", status: 200, notes: ["The child must be linked to the authenticated parent or the request is denied."] }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary", t: "Reporting", s: "Get Parent Child Behavior Summary", u: "Return the child behavior summary for the authenticated parent.", r: ["parent"], e: "behaviorSummaryReport", status: 200, notes: ["The child must be linked to the authenticated parent or the request is denied."] }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/teacher/me", t: "Reporting", s: "Get Teacher Dashboard", u: "Return the teacher dashboard surface.", r: ["teacher"], e: "teacherDashboard", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/supervisor/me", t: "Reporting", s: "Get Supervisor Dashboard", u: "Return the supervisor dashboard surface.", r: ["supervisor"], e: "supervisorDashboard", status: 200, notes: ["Supervisor student access is limited to class-year assignments owned by the authenticated supervisor."] }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/admin/me", t: "Reporting", s: "Get Admin Dashboard", u: "Return the admin dashboard surface.", r: ["admin"], e: "adminDashboard", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/transport/summary", t: "Reporting", s: "Get Transport Summary", u: "Return the transport summary surface shared by admin and driver.", r: ["admin", "driver"], e: "transportSummary", status: 200, derived: "Transport summaries rely on views such as vw_trip_details, vw_latest_trip_location, vw_active_trip_live_status, and vw_trip_student_event_details." }),
  makeEndpoint({ m: "GET", p: "/reporting/transport/parent/me/students/:studentId/live-status", t: "Reporting", s: "Get Parent Child Transport Live Status", u: "Return the transport live status for one linked child with backend ETA snapshots and Firebase-backed live GPS context.", r: ["parent"], e: "parentTransportLiveStatus", status: 200, derived: "This response is view-backed and combines active assignment, active trip live status, latest location, and recent event projections." })
);

const endpointMap = new Map(endpoints.map((entry) => [routeKey(entry.method, entry.path), entry]));
const actualRoutes = extractRoutesFromRouteFiles();
for (const route of actualRoutes) {
  if (!endpointMap.has(routeKey(route.method, route.path))) {
    throw new Error(`Missing documentation manifest entry for runtime route: ${route.method} ${route.path}`);
  }
}
function responseExample(entry) {
  if (entry.responseKind === "null") return null;
  const example = clone(examples[entry.exampleKey] ?? examples.user);
  if (entry.responseKind === "array") return [example];
  if (entry.responseKind === "paginated") {
    const base = { items: [example], pagination: clone(paginationExample) };
    if (entry.path === "/communication/messages/inbox" || entry.path === "/communication/notifications/me") base.unreadCount = 1;
    return base;
  }
  return example;
}

function successEnvelopeSchema(kind) {
  let dataSchema = { $ref: "#/components/schemas/GenericObject" };
  if (kind === "array") dataSchema = { type: "array", items: { $ref: "#/components/schemas/GenericObject" } };
  if (kind === "paginated") dataSchema = { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/GenericObject" } }, pagination: { $ref: "#/components/schemas/Pagination" }, unreadCount: { type: "integer", minimum: 0 } }, required: ["items", "pagination"] };
  if (kind === "null") dataSchema = { type: "null" };
  return {
    type: "object",
    properties: {
      success: { const: true },
      message: { type: "string" },
      data: dataSchema
    },
    required: ["success", "message", "data"]
  };
}

function errorResponses(entry) {
  const responses = {};
  const needsBodyOrQueryValidation = entry.requestBody || entry.query.length > 0 || entry.path.includes(":");
  if (needsBodyOrQueryValidation) {
    responses["400"] = { description: "Validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example: { success: false, message: "Validation failed", errors: [{ field: "fieldName", code: "invalid_type", message: "Validation error example" }] } } } };
  }
  if (entry.auth) {
    responses["401"] = { description: "Authentication is missing or expired", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example: { success: false, message: "Unauthorized", errors: [{ code: "UNAUTHORIZED", message: "Authentication is required" }] } } } };
    responses["403"] = { description: "Authenticated but not allowed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example: { success: false, message: "Forbidden", errors: [{ code: "FORBIDDEN", message: "You do not have permission to access this resource" }] } } } };
  }
  if (entry.path.includes(":")) {
    responses["404"] = { description: "Primary resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example: { success: false, message: "Not Found", errors: [{ code: "NOT_FOUND", message: "Requested resource was not found" }] } } } };
  }
  if (entry.tooManyRequests) {
    responses["429"] = { description: "Rate limit reached", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example: { success: false, message: "Too Many Requests", errors: [{ code: "TOO_MANY_REQUESTS", message: "Please try again later" }] } } } };
  }
  if (entry.path === "/health/ready") {
    responses["503"] = { description: "Database is not ready", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" }, example: { success: false, message: "Service is not ready", errors: [{ code: "SERVICE_UNAVAILABLE", message: "Database connection is not ready" }] } } } };
  }
  return responses;
}

function buildOperation(entry) {
  const operation = {
    tags: [entry.tag],
    summary: entry.summary,
    description: [entry.purpose, entry.auth ? `Allowed roles: ${entry.roles.join(", ")}.` : "Public endpoint.", ...entry.notes.map((note) => `Note: ${note}`), entry.sideEffects ? `Side effects: ${entry.sideEffects}` : null, entry.derivedFrom ? `Derived data: ${entry.derivedFrom}` : null].filter(Boolean).join("\n\n"),
    "x-allowed-roles": entry.auth ? entry.roles : ["public"],
    responses: {
      [String(entry.successStatus)]: {
        description: "Successful response",
        content: {
          "application/json": {
            schema: successEnvelopeSchema(entry.responseKind),
            example: { success: true, message: entry.successMessage, data: responseExample(entry) }
          }
        }
      },
      ...errorResponses(entry)
    }
  };
  if (entry.auth) operation.security = [{ bearerAuth: [] }];
  const params = [...buildPathParameters(entry.path), ...entry.query];
  if (params.length) operation.parameters = params;
  if (entry.requestBody) {
    operation.requestBody = { required: true, content: { "application/json": { schema: { $ref: `#/components/schemas/${entry.requestBody}` }, example: componentSchemas[entry.requestBody].example } } };
  }
  if (entry.rootServer) operation.servers = ROOT_SERVERS;
  return operation;
}

const orderedEndpoints = [...endpoints].sort((a, b) => {
  const tagDiff = TAG_ORDER.indexOf(a.tag) - TAG_ORDER.indexOf(b.tag);
  if (tagDiff !== 0) return tagDiff;
  return `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`);
});

const masterSpec = {
  openapi: "3.1.0",
  info: { title: "Ishraf Platform Backend API", version: "1.0.0", description: "Full OpenAPI coverage for all live backend endpoints. /health and /health/ready are documented against the service root, while the rest use /api/v1." },
  servers: API_SERVERS,
  tags: TAG_ORDER.map((name) => ({ name, description: tagDescriptions[name] })),
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } }, schemas: componentSchemas },
  paths: {}
};
for (const entry of orderedEndpoints) {
  const openApiPath = toOpenApiPath(entry.path);
  masterSpec.paths[openApiPath] ??= {};
  masterSpec.paths[openApiPath][entry.method.toLowerCase()] = buildOperation(entry);
}

function postmanDescription(entry) {
  return [
    `Purpose: ${entry.purpose}`,
    `Roles: ${entry.auth ? entry.roles.join(", ") : "public"}`,
    `Auth: ${entry.auth ? "Bearer access token required" : "No bearer token required"}`,
    entry.query.length ? `Query params: ${entry.query.map((item) => item.name).join(", ")}` : null,
    entry.requestBody ? `Body schema: ${entry.requestBody}` : null,
    ...entry.notes.map((note) => `Note: ${note}`),
    entry.sideEffects ? `Side effects: ${entry.sideEffects}` : null,
    entry.derivedFrom ? `Derived data: ${entry.derivedFrom}` : null
  ].filter(Boolean).join("\n\n");
}

function postmanUrl(entry) {
  const base = entry.rootServer ? "{{rootUrl}}" : "{{baseUrl}}";
  const replaced = normalizePath(entry.path).replace(/:([^/]+)/g, (_match, name) => `{{${postmanVariableForParam(entry.path, name)}}}`);
  return {
    raw: `${base}${replaced}`,
    host: [base],
    path: replaced.split("/").filter(Boolean),
    query: entry.query.map((item) => ({ key: item.name, value: item.schema.example !== undefined ? String(item.schema.example) : "", description: item.description }))
  };
}

function postmanBody(entry) {
  if (!entry.requestBody) return undefined;
  return { mode: "raw", raw: JSON.stringify(componentSchemas[entry.requestBody].example, null, 2) };
}

function postmanEvents(entry) {
  if (entry.path === "/auth/login") {
    return [{ listen: "test", script: { type: "text/javascript", exec: [
      "const json = pm.response.json();",
      "if (pm.response.code === 200 && json?.success && json?.data) {",
      "  if (json.data.accessToken) pm.collectionVariables.set('accessToken', json.data.accessToken);",
      "  if (json.data.refreshToken) pm.collectionVariables.set('refreshToken', json.data.refreshToken);",
      "  if (json.data.user?.id) pm.collectionVariables.set('userId', json.data.user.id);",
      "}"
    ] } }];
  }
  if (entry.path === "/auth/refresh") {
    return [{ listen: "test", script: { type: "text/javascript", exec: [
      "const json = pm.response.json();",
      "if (pm.response.code === 200 && json?.success && json?.data) {",
      "  if (json.data.accessToken) pm.collectionVariables.set('accessToken', json.data.accessToken);",
      "  if (json.data.refreshToken) pm.collectionVariables.set('refreshToken', json.data.refreshToken);",
      "}"
    ] } }];
  }
  if (entry.path === "/admin-imports/school-onboarding/dry-run") {
    return [{ listen: "test", script: { type: "text/javascript", exec: [
      "const json = pm.response.json();",
      "if (pm.response.code === 200 && json?.success && json?.data?.importId) {",
      "  pm.collectionVariables.set('dryRunId', json.data.importId);",
      "  pm.collectionVariables.set('importId', json.data.importId);",
      "}"
    ] } }];
  }
  if (entry.path === "/admin-imports/school-onboarding/apply") {
    return [{ listen: "test", script: { type: "text/javascript", exec: [
      "const json = pm.response.json();",
      "if (pm.response.code === 200 && json?.success && json?.data?.importId) {",
      "  pm.collectionVariables.set('importId', json.data.importId);",
      "}"
    ] } }];
  }
  return undefined;
}

function postmanRequest(entry) {
  const request = { method: entry.method, header: [], description: postmanDescription(entry), url: postmanUrl(entry) };
  if (entry.auth) request.header.push({ key: "Authorization", value: "Bearer {{accessToken}}" });
  if (entry.requestBody) request.header.push({ key: "Content-Type", value: "application/json" });
  const body = postmanBody(entry);
  if (body) request.body = body;
  return { name: entry.summary, request, event: postmanEvents(entry) };
}

function buildCollection(name, description, subset) {
  const folders = new Map(TAG_ORDER.map((tag) => [tag, []]));
  subset.forEach((entry) => folders.get(entry.tag)?.push(postmanRequest(entry)));
  return {
    info: { name, _postman_id: crypto.randomUUID(), description, schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
    variable: [
      { key: "rootUrl", value: ROOT_SERVER_URL },
      { key: "baseUrl", value: API_SERVER_URL },
      { key: "accessToken", value: "" },
      { key: "refreshToken", value: "" },
      { key: "loginIdentifier", value: "mod87521@gmail.com" },
      { key: "loginPassword", value: "" },
      { key: "newPassword", value: "UpdatedPassword123!" },
      { key: "resetToken", value: "" },
      { key: "userId", value: "1" },
      { key: "academicYearId", value: "" },
      { key: "semesterId", value: "" },
      { key: "gradeLevelId", value: "" },
      { key: "classId", value: "" },
      { key: "subjectId", value: "" },
      { key: "subjectOfferingId", value: "" },
      { key: "studentId", value: "" },
      { key: "parentUserId", value: "48" },
      { key: "teacherUserId", value: "47" },
      { key: "supervisorUserId", value: "50" },
      { key: "parentId", value: "48" },
      { key: "assessmentId", value: "" },
      { key: "studentAssessmentId", value: "" },
      { key: "attendanceSessionId", value: "" },
      { key: "attendanceRecordId", value: "" },
      { key: "behaviorRecordId", value: "" },
      { key: "routeId", value: "" },
      { key: "stopId", value: "" },
      { key: "assignmentId", value: "" },
      { key: "routeAssignmentId", value: "" },
      { key: "tripId", value: "" },
      { key: "messageId", value: "" },
      { key: "notificationId", value: "" },
      { key: "importId", value: "" },
      { key: "dryRunId", value: "" },
      { key: "group", value: "imports" },
      { key: "otherUserId", value: "47" },
      { key: "deviceId", value: "" },
      { key: "deviceToken", value: "fcm-device-token-sample" },
      { key: "appId", value: "ishraf-parent-app" },
      { key: "homeworkId", value: "" }
    ],
    item: Array.from(folders.entries()).filter(([, items]) => items.length > 0).map(([nameValue, item]) => ({ name: nameValue, description: tagDescriptions[nameValue], item }))
  };
}

const masterCollection = buildCollection("Ishraf Platform Backend API", "Full Postman collection covering every live backend endpoint.", orderedEndpoints);
const authEndpoints = orderedEndpoints.filter((entry) => entry.tag === "Auth");
const authSpec = { openapi: "3.1.0", info: { title: "Ishraf Platform Auth API", version: "1.0.0", description: "Auth-only subset synchronized with the live runtime." }, servers: API_SERVERS, components: clone(masterSpec.components), paths: {} };
authEndpoints.forEach((entry) => {
  const openApiPath = toOpenApiPath(entry.path);
  authSpec.paths[openApiPath] ??= {};
  authSpec.paths[openApiPath][entry.method.toLowerCase()] = buildOperation(entry);
});
const authCollection = buildCollection("Ishraf Platform Auth API", "Auth-only Postman subset synchronized with the full collection.", authEndpoints);
authCollection.item = authCollection.item.filter((folder) => folder.name === "Auth");
const stagingEnvironment = { id: crypto.randomUUID(), name: "Ishraf Platform Staging", values: masterCollection.variable.map((item) => ({ key: item.key, value: item.value, enabled: true })), _postman_variable_scope: "environment", _postman_exported_at: `${TODAY}T12:00:00.000Z`, _postman_exported_using: "Codex" };

const masterOpenApiPath = path.join(openapiDir, "ishraf-platform.openapi.json");
const authOpenApiPath = path.join(openapiDir, "auth.openapi.json");
const masterPostmanPath = path.join(postmanDir, "ishraf-platform.postman_collection.json");
const authPostmanPath = path.join(postmanDir, "auth.postman_collection.json");
const environmentPath = path.join(postmanDir, "ishraf-platform.staging.postman_environment.json");

const baselineMasterSpec = readJsonIfExists(masterOpenApiPath);
const baselineAuthSpec = readJsonIfExists(authOpenApiPath);
const baselineMasterCollection = readJsonIfExists(masterPostmanPath);
const baselineAuthCollection = readJsonIfExists(authPostmanPath);
const baseline = {
  masterOpenApi: summarizeCoverage(actualRoutes, collectOpenApiRoutes(baselineMasterSpec)),
  authOpenApi: summarizeCoverage(actualRoutes.filter((route) => route.moduleKey === "auth"), collectOpenApiRoutes(baselineAuthSpec)),
  masterPostman: summarizeCoverage(actualRoutes, collectPostmanRoutes(baselineMasterCollection)),
  authPostman: summarizeCoverage(actualRoutes.filter((route) => route.moduleKey === "auth"), collectPostmanRoutes(baselineAuthCollection))
};

fs.writeFileSync(masterOpenApiPath, `${JSON.stringify(masterSpec, null, 2)}\n`);
fs.writeFileSync(authOpenApiPath, `${JSON.stringify(authSpec, null, 2)}\n`);
fs.writeFileSync(masterPostmanPath, `${JSON.stringify(masterCollection, null, 2)}\n`);
fs.writeFileSync(authPostmanPath, `${JSON.stringify(authCollection, null, 2)}\n`);
fs.writeFileSync(environmentPath, `${JSON.stringify(stagingEnvironment, null, 2)}\n`);

const finalMasterSpec = readJsonIfExists(masterOpenApiPath);
const finalAuthSpec = readJsonIfExists(authOpenApiPath);
const finalMasterCollection = readJsonIfExists(masterPostmanPath);
const finalAuthCollection = readJsonIfExists(authPostmanPath);
const final = {
  masterOpenApi: summarizeCoverage(actualRoutes, collectOpenApiRoutes(finalMasterSpec)),
  authOpenApi: summarizeCoverage(actualRoutes.filter((route) => route.moduleKey === "auth"), collectOpenApiRoutes(finalAuthSpec)),
  masterPostman: summarizeCoverage(actualRoutes, collectPostmanRoutes(finalMasterCollection)),
  authPostman: summarizeCoverage(actualRoutes.filter((route) => route.moduleKey === "auth"), collectPostmanRoutes(finalAuthCollection))
};

if (final.masterOpenApi.missing.length || final.masterPostman.missing.length || final.authOpenApi.missing.length || final.authPostman.missing.length) {
  throw new Error(`Coverage incomplete: master openapi ${final.masterOpenApi.missing.length}, master postman ${final.masterPostman.missing.length}, auth openapi ${final.authOpenApi.missing.length}, auth postman ${final.authPostman.missing.length}`);
}

const beforeOpenApiByModule = coverageByModule(actualRoutes, collectOpenApiRoutes(baselineMasterSpec));
const beforePostmanByModule = coverageByModule(actualRoutes, collectPostmanRoutes(baselineMasterCollection));
const afterOpenApiByModule = coverageByModule(actualRoutes, collectOpenApiRoutes(finalMasterSpec));
const afterPostmanByModule = coverageByModule(actualRoutes, collectPostmanRoutes(finalMasterCollection));
const migrationsDir = path.join(root, "src", "database", "migrations");
const migrationContent = fs.readdirSync(migrationsDir)
  .filter((fileName) => fileName.endsWith(".js"))
  .map((fileName) => fs.readFileSync(path.join(migrationsDir, fileName), "utf8"))
  .join("\n");
const viewNames = Array.from(new Set(migrationContent.match(/vw_[a-z_]+/g) ?? [])).sort();
const automationEvents = ["attendance_absent", "behavior_negative", "transport_trip_started", "transport_student_dropped_off"];
const targetFields = ["communication.announcements.targetRole", "communication.announcements.targetRoles", "communication.notifications.notificationType", "behavior.categories.behaviorType", "transport.trip-events.eventType"];

const moduleOrder = ["health", "auth", "users", "academic-structure", "students", "system-settings", "attendance", "assessments", "behavior", "transport", "communication", "admin-imports", "homework", "reporting"];
const moduleTable = moduleOrder.map((key) => {
  const total = afterOpenApiByModule.get(key)?.total ?? 0;
  const tag = afterOpenApiByModule.get(key)?.tag ?? key;
  return `| ${tag} | ${total} | ${beforeOpenApiByModule.get(key)?.covered ?? 0}/${total} | ${beforePostmanByModule.get(key)?.covered ?? 0}/${total} | ${afterOpenApiByModule.get(key)?.covered ?? 0}/${total} | ${afterPostmanByModule.get(key)?.covered ?? 0}/${total} |`;
}).join("\n");

const missingBefore = baseline.masterOpenApi.missing.length > 0
  ? baseline.masterOpenApi.missing.map((route) => `- \`${route.method} ${route.path}\``).join("\n")
  : "- none";
const audit = `# OpenAPI / Postman Audit\n\n- Audit date: ${TODAY}\n- Runtime endpoint count: ${actualRoutes.length}\n- Scope: root health endpoints plus every router registered in \`src/app/module-registry.ts\`\n\n## Coverage Summary\n\n| Artifact | Before | After |\n| --- | --- | --- |\n| Master OpenAPI | ${baseline.masterOpenApi.covered.length}/${actualRoutes.length} | ${final.masterOpenApi.covered.length}/${actualRoutes.length} |\n| Master Postman | ${baseline.masterPostman.covered.length}/${actualRoutes.length} | ${final.masterPostman.covered.length}/${actualRoutes.length} |\n| Auth OpenAPI | ${baseline.authOpenApi.covered.length}/7 | ${final.authOpenApi.covered.length}/7 |\n| Auth Postman | ${baseline.authPostman.covered.length}/7 | ${final.authPostman.covered.length}/7 |\n\n## Per-Module Coverage\n\n| Module | Actual | OpenAPI Before | Postman Before | OpenAPI After | Postman After |\n| --- | --- | --- | --- | --- | --- |\n${moduleTable}\n\n## Runtime Endpoints Missing From Master OpenAPI Before This Update\n\n${missingBefore}\n\n## Route Extraction Rules\n\n- Runtime routes are extracted from the registered route files defined in \`scripts/reconcile-openapi-postman.mjs\`.\n- \`/health\` and \`/health/ready\` are documented as root-level servers outside \`/api/v1\`.\n- The auth subset documents only the live auth router surface.\n- Manual schema examples inside the reconciliation script must stay aligned with validators, DTOs, and mappers in \`src/modules\`.\n\n## Views, Events, Targets Alignment\n\n### SQL Views Referenced\n${viewNames.map((name) => `- \`${name}\``).join("\n")}\n\n### Automation Events Documented\n${automationEvents.map((name) => `- \`${name}\``).join("\n")}\n\n### Target / Event Fields Documented\n${targetFields.map((name) => `- \`${name}\``).join("\n")}\n`;
fs.writeFileSync(auditPath, audit);
console.log(`Master OpenAPI: ${final.masterOpenApi.covered.length}/${actualRoutes.length}`);
console.log(`Master Postman: ${final.masterPostman.covered.length}/${actualRoutes.length}`);
console.log(`Auth OpenAPI: ${final.authOpenApi.covered.length}/7`);
console.log(`Auth Postman: ${final.authPostman.covered.length}/7`);



