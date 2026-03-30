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
const TODAY = "2026-03-30";
const NOW = "2026-03-30T12:00:00.000Z";

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
  "Attendance",
  "Assessments",
  "Behavior",
  "Transport",
  "Communication",
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
  Attendance:
    "Session-based attendance endpoints used by admin, teachers, and supervisors.",
  Assessments: "Assessment types, assessments, and student score roster endpoints.",
  Behavior: "Behavior categories, behavior records, and student behavior timelines.",
  Transport:
    "Transport static data, assignments, trips, live locations, and trip student events.",
  Communication:
    "Direct messages, announcements, and notification center endpoints.",
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
const paginationExample = { page: 1, limit: 20, totalItems: 1, totalPages: 1 };

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
  student: {
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
  }
};

function addSchema(name, schema) {
  componentSchemas[name] = schema;
}

[
  [
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
  ["SaveHomeworkSubmissionsRequest", { records: [{ studentId: "1", status: "submitted", submittedAt: TODAY, notes: "تم التسليم" }, { studentId: "2", status: "late", submittedAt: TODAY, notes: "تسليم متأخر" }] }]
].forEach(([name, example]) => {
  addSchema(name, {
    type: "object",
    additionalProperties: true,
    example
  });
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
  if (paramName === "studentId") return "Student numeric string identifier. This is the same id used by /students/:id.";
  if (paramName === "parentUserId") return "Parent user numeric string identifier from /users?role=parent.";
  if (paramName === "teacherUserId") return "Teacher user numeric string identifier from /users?role=teacher.";
  if (paramName === "supervisorUserId") return "Supervisor user numeric string identifier from /users?role=supervisor.";
  if (paramName === "studentAssessmentId") return "Student assessment score numeric string identifier.";
  if (paramName === "attendanceId") return "Attendance record numeric string identifier.";
  if (paramName === "academicYearId") return "Academic year numeric string identifier.";
  if (paramName === "routeId") return "Route numeric string identifier.";
  if (paramName === "otherUserId") return "The other conversation participant user id.";
  if (paramName === "messageId") return "Message numeric string identifier.";
  if (paramName === "notificationId") return "Notification numeric string identifier.";
  if (paramName === "parentId")
    return "Parent identifier. These student-parent endpoints accept either the parent user id from /users?role=parent or the underlying parent profile id.";
  if (routePath.startsWith("/users/:id")) return "User numeric string identifier.";
  if (routePath.startsWith("/students/:id")) return "Student numeric string identifier.";
  if (routePath.startsWith("/academic-structure/academic-years/:id")) return "Academic year numeric string identifier.";
  if (routePath.startsWith("/academic-structure/semesters/:id")) return "Semester numeric string identifier.";
  if (routePath.startsWith("/academic-structure/classes/:id")) return "Class numeric string identifier.";
  if (routePath.startsWith("/academic-structure/subjects/:id")) return "Subject numeric string identifier.";
  if (routePath.startsWith("/academic-structure/subject-offerings/:id")) return "Subject offering numeric string identifier.";
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
    return {
      name,
      in: "path",
      required: true,
      description: pathParamDescription(routePath, name),
      schema: clone(numericIdSchema)
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
const tripListQuery = paginatedQuery(["tripDate", "tripStatus", "startedAt", "createdAt"], [commonQuery.id("busId", "Filter by bus id."), commonQuery.id("routeId", "Filter by route id."), commonQuery.text("tripType", "Filter by trip type.", "pickup"), commonQuery.text("tripStatus", "Filter by trip status.", "started"), commonQuery.date("tripDate", "Filter by exact trip date."), commonQuery.date("dateFrom", "Filter from trip date."), commonQuery.date("dateTo", "Filter to trip date.")], "tripDate");
const tripRosterQuery = [commonQuery.text("search", "Filter roster rows by student full name or academic number.", "Student One"), commonQuery.id("stopId", "Filter roster rows by assigned stop id.")];
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
  makeEndpoint({ m: "GET", p: "/academic-structure/classes", t: "Academic Structure", s: "List Classes", u: "List classes.", kind: "array", e: "classEntity", status: 200 }),
  makeEndpoint({ m: "GET", p: "/academic-structure/classes/:id", t: "Academic Structure", s: "Get Class", u: "Return one class by id.", e: "classEntity", status: 200 }),
  makeEndpoint({ m: "POST", p: "/academic-structure/subjects", t: "Academic Structure", s: "Create Subject", u: "Create a subject under a grade level. Subjects remain grade-level master data and do not accept semesterId.", b: "CreateSubjectRequest", e: "subject", notes: ["Use subject-offerings to link a subject into one or more semesters without changing the subject master record."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/subjects", t: "Academic Structure", s: "List Subjects", u: "List subjects.", kind: "array", e: "subject", status: 200 }),
  makeEndpoint({ m: "GET", p: "/academic-structure/subjects/:id", t: "Academic Structure", s: "Get Subject", u: "Return one subject by id.", e: "subject", status: 200 }),
  makeEndpoint({ m: "POST", p: "/academic-structure/subject-offerings", t: "Academic Structure", s: "[NEW] Create Subject Offering", u: "Link an existing subject to a semester without changing the subject master data.", b: "CreateSubjectOfferingRequest", e: "subjectOffering", notes: ["[NEW] Subject offerings are the official semester-aware layer for subject availability."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/subject-offerings", t: "Academic Structure", s: "[NEW] List Subject Offerings", u: "List subject offerings with optional academic year, semester, grade level, subject, and activation filters.", q: subjectOfferingsQuery, kind: "array", e: "subjectOffering", status: 200, notes: ["[NEW] This is the canonical list surface for semester-aware subject availability."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/subject-offerings/:id", t: "Academic Structure", s: "[NEW] Get Subject Offering", u: "Return one subject offering by id.", e: "subjectOffering", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/academic-structure/subject-offerings/:id", t: "Academic Structure", s: "[NEW] Update Subject Offering", u: "Update a subject offering activation state. This round only supports isActive changes.", b: "UpdateSubjectOfferingRequest", e: "subjectOffering", status: 200 }),
  makeEndpoint({ m: "POST", p: "/academic-structure/teacher-assignments", t: "Academic Structure", s: "Create Teacher Assignment", u: "Assign a teacher to a class and subject for an academic year. teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.", b: "CreateTeacherAssignmentRequest", e: "classEntity", notes: ["Frontend should send the teacher user id returned by GET /users?role=teacher. The backend resolves it internally to the stored teacher profile id.", "Legacy integrations may still send the teacher profile id directly.", "If the same value matches a teacher user id and a different teacher profile id, the backend rejects the request with TEACHER_ID_AMBIGUOUS instead of guessing."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/teacher-assignments", t: "Academic Structure", s: "List Teacher Assignments", u: "List teacher assignments.", kind: "array", e: "classEntity", status: 200 }),
  makeEndpoint({ m: "POST", p: "/academic-structure/supervisor-assignments", t: "Academic Structure", s: "Create Supervisor Assignment", u: "Assign a supervisor to a class for an academic year. supervisorId accepts the supervisor user id from /users?role=supervisor or the legacy supervisor profile id.", b: "CreateSupervisorAssignmentRequest", e: "classEntity", notes: ["Frontend should send the supervisor user id returned by GET /users?role=supervisor. The backend resolves it internally to the stored supervisor profile id.", "Legacy integrations may still send the supervisor profile id directly.", "If the same value matches a supervisor user id and a different supervisor profile id, the backend rejects the request with SUPERVISOR_ID_AMBIGUOUS instead of guessing."] }),
  makeEndpoint({ m: "GET", p: "/academic-structure/supervisor-assignments", t: "Academic Structure", s: "List Supervisor Assignments", u: "List supervisor assignments.", kind: "array", e: "classEntity", status: 200 })
];
endpoints.push(
  makeEndpoint({ m: "POST", p: "/students", t: "Students", s: "Create Student", u: "Create a student in the selected class.", b: "CreateStudentRequest", e: "student" }),
  makeEndpoint({ m: "GET", p: "/students", t: "Students", s: "List Students", u: "List students with pagination and filters.", q: studentListQuery, kind: "paginated", e: "student", status: 200 }),
  makeEndpoint({ m: "GET", p: "/students/:id", t: "Students", s: "Get Student", u: "Return one student by id.", e: "student", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/students/:id", t: "Students", s: "Update Student", u: "Update student profile fields and lifecycle status.", b: "UpdateStudentRequest", e: "student", status: 200 }),
  makeEndpoint({ m: "POST", p: "/students/:id/parents", t: "Students", s: "Link Parent to Student", u: "Link an existing parent to a student. parentId may be either the parent user id returned by /users?role=parent or the underlying parent profile id.", b: "LinkStudentParentRequest", e: "user", notes: ["The backend resolves parentId to the stored parent profile id automatically. Prefer sending the user id returned by /users?role=parent in admin frontend flows."] }),
  makeEndpoint({ m: "GET", p: "/students/:id/parents", t: "Students", s: "List Student Parents", u: "Return parent links for one student.", kind: "array", e: "user", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/students/:studentId/parents/:parentId/primary", t: "Students", s: "Set Primary Parent", u: "Mark one linked parent as the primary parent for that student. parentId may be either the parent user id returned by /users?role=parent or the underlying parent profile id.", e: "user", status: 200, notes: ["The backend resolves parentId to the stored parent profile id automatically. Prefer sending the user id returned by /users?role=parent in admin frontend flows."] }),
  makeEndpoint({ m: "POST", p: "/students/:id/promotions", t: "Students", s: "Promote Student", u: "Promote a student to another class for a target academic year.", b: "PromoteStudentRequest", e: "student" }),
  makeEndpoint({ m: "POST", p: "/assessments/types", t: "Assessments", s: "Create Assessment Type", u: "Create a reusable assessment type.", b: "CreateAssessmentTypeRequest", e: "assessment" }),
  makeEndpoint({ m: "GET", p: "/assessments/types", t: "Assessments", s: "List Assessment Types", u: "List assessment types.", r: ["admin", "teacher"], kind: "array", e: "assessment", status: 200 }),
  makeEndpoint({ m: "POST", p: "/assessments", t: "Assessments", s: "Create Assessment", u: "Create an assessment. Teachers may omit teacherId and rely on the authenticated teacher profile. Admin teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.", r: ["admin", "teacher"], b: "CreateAssessmentRequest", e: "assessment", notes: ["The selected subjectId must have an active subject offering for the selected semesterId.", "Admin frontend flows should send teacherId as the teacher user id returned by GET /users?role=teacher."] }),
  makeEndpoint({ m: "GET", p: "/assessments", t: "Assessments", s: "List Assessments", u: "List assessments with pagination and filters.", r: ["admin", "teacher"], q: assessmentListQuery, kind: "paginated", e: "assessment", status: 200, notes: ["teacherId filter accepts the teacher user id returned by GET /users?role=teacher or the legacy teacher profile id. Prefer the user id in admin frontend flows."] }),
  makeEndpoint({ m: "GET", p: "/assessments/:id", t: "Assessments", s: "Get Assessment", u: "Return one assessment detail record.", r: ["admin", "teacher"], e: "assessment", status: 200 }),
  makeEndpoint({ m: "GET", p: "/assessments/:id/scores", t: "Assessments", s: "Get Assessment Scores", u: "Return the score roster for one assessment.", r: ["admin", "teacher"], kind: "array", e: "assessmentScore", status: 200 }),
  makeEndpoint({ m: "PUT", p: "/assessments/:id/scores", t: "Assessments", s: "Save Assessment Scores", u: "Create or update the full score roster for an assessment.", r: ["admin", "teacher"], b: "SaveAssessmentScoresRequest", kind: "array", e: "assessmentScore", status: 200 }),
  makeEndpoint({ m: "PATCH", p: "/assessments/scores/:studentAssessmentId", t: "Assessments", s: "Update Student Assessment Score", u: "Update one student score row.", r: ["admin", "teacher"], b: "UpdateStudentAssessmentScoreRequest", e: "assessmentScore", status: 200 }),
  makeEndpoint({ m: "POST", p: "/attendance/sessions", t: "Attendance", s: "Create Attendance Session", u: "Create an attendance session for a class and subject. Admin teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.", r: ["admin", "teacher"], b: "CreateAttendanceSessionRequest", e: "attendanceSession", notes: ["The selected subjectId must have an active subject offering for the selected semesterId.", "Admin frontend flows should send teacherId as the teacher user id returned by GET /users?role=teacher."] }),
  makeEndpoint({ m: "GET", p: "/attendance/sessions", t: "Attendance", s: "List Attendance Sessions", u: "List attendance sessions with pagination. There is no root /attendance endpoint.", r: ["admin", "teacher", "supervisor"], q: attendanceListQuery, kind: "paginated", e: "attendanceSession", status: 200, notes: ["Empty collections return 200 with items=[] and pagination metadata.", "teacherId filter accepts the teacher user id returned by GET /users?role=teacher or the legacy teacher profile id. Prefer the user id in admin frontend flows."] }),
  makeEndpoint({ m: "GET", p: "/attendance/sessions/:id", t: "Attendance", s: "Get Attendance Session", u: "Return one attendance session including its student roster.", r: ["admin", "teacher", "supervisor"], e: "attendanceSession", status: 200 }),
  makeEndpoint({ m: "PUT", p: "/attendance/sessions/:id/records", t: "Attendance", s: "Save Attendance Records", u: "Save the full attendance roster snapshot for one session.", r: ["admin", "teacher", "supervisor"], b: "SaveAttendanceRecordsRequest", kind: "array", e: "attendanceRecord", status: 200, side: "Any newly absent record can trigger parent notifications through the internal automation service." }),
  makeEndpoint({ m: "PATCH", p: "/attendance/records/:attendanceId", t: "Attendance", s: "Update Attendance Record", u: "Update one attendance record status or notes.", r: ["admin", "teacher", "supervisor"], b: "UpdateAttendanceRecordRequest", e: "attendanceRecord", status: 200, side: "If the record changes into absent, the internal automation service may create notifications for linked parents." }),
  makeEndpoint({ m: "POST", p: "/behavior/categories", t: "Behavior", s: "Create Behavior Category", u: "Create a behavior category definition.", b: "CreateBehaviorCategoryRequest", e: "behaviorCategory" }),
  makeEndpoint({ m: "GET", p: "/behavior/categories", t: "Behavior", s: "List Behavior Categories", u: "List behavior categories used in behavior forms. There is no behaviorType query filter in v1.", r: ["admin", "teacher", "supervisor"], kind: "array", e: "behaviorCategory", status: 200 }),
  makeEndpoint({ m: "POST", p: "/behavior/records", t: "Behavior", s: "Create Behavior Record", u: "Create a behavior record for one student. teacherId and supervisorId accept the matching user ids from /users or the legacy profile ids.", r: ["admin", "teacher", "supervisor"], b: "CreateBehaviorRecordRequest", e: "behaviorRecord", notes: ["Admin frontend flows should send teacherId or supervisorId as the selected account user id from GET /users?role=teacher|supervisor.", "Legacy integrations may still send teacher/supervisor profile ids directly."], side: "Negative behavior categories trigger parent notifications through the internal automation service." }),
  makeEndpoint({ m: "GET", p: "/behavior/records", t: "Behavior", s: "List Behavior Records", u: "List behavior records with pagination and filters.", r: ["admin", "teacher", "supervisor"], q: behaviorListQuery, kind: "paginated", e: "behaviorRecord", status: 200, notes: ["teacherId and supervisorId filters accept the corresponding user ids returned by GET /users or the legacy profile ids. Prefer user ids in admin frontend flows."] }),
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
  makeEndpoint({ m: "POST", p: "/transport/trips", t: "Transport", s: "Create Trip", u: "Create a trip for a bus and route. Drivers and admins can create trips.", r: ["admin", "driver"], b: "CreateTripRequest", e: "trip" }),
  makeEndpoint({ m: "POST", p: "/transport/trips/ensure-daily", t: "Transport", s: "Ensure Daily Trip", u: "Create or reuse the operational trip for one route assignment, trip date, and trip type without creating duplicates.", r: ["admin", "driver"], b: "EnsureDailyTripRequest", e: "ensureDailyTrip", status: 200, notes: ["If a matching trip already exists for the same bus, route, tripDate, and tripType, the response remains 200 with created=false.", "This is the preferred driver-facing daily trip flow. POST /transport/trips remains a legacy fallback."], derived: "The endpoint reuses the natural uniqueness of bus + route + tripDate + tripType." }),
  makeEndpoint({ m: "GET", p: "/transport/trips", t: "Transport", s: "List Trips", u: "List trips with pagination. Drivers only see trips within their scope.", r: ["admin", "driver"], q: tripListQuery, kind: "paginated", e: "trip", status: 200 }),
  makeEndpoint({ m: "GET", p: "/transport/trips/:id", t: "Transport", s: "Get Trip", u: "Return one trip detail including latest location, route stops, and event summary.", r: ["admin", "driver"], e: "tripDetail", status: 200, derived: "Trip detail aggregates transport views such as vw_trip_details, vw_route_stops, and vw_latest_trip_location." }),
  makeEndpoint({ m: "GET", p: "/transport/trips/:id/students", t: "Transport", s: "Get Trip Student Roster", u: "Return the full student roster for one trip, including assigned stop coordinates, the latest event state inside the same trip, and approved home location when available.", r: ["admin", "driver"], q: tripRosterQuery, e: "tripRoster", status: 200, notes: ["The roster returns all students assigned to the trip route for the trip date, even when no trip event has been recorded yet.", "If the trip exists but has no eligible students, the response remains 200 with students=[].", "Only approved homeLocation data is exposed to the driver-facing roster."], derived: "Roster rows are derived from trip-date transport assignments, route stop coordinates, approved student_transport_home_locations, and the latest trip_student_events row per student inside the same trip." }),
  makeEndpoint({ m: "POST", p: "/transport/trips/:id/start", t: "Transport", s: "Start Trip", u: "Mark a scheduled trip as started.", r: ["admin", "driver"], e: "trip", status: 200, side: "Trip start triggers parent notifications per assigned student through the internal automation service." }),
  makeEndpoint({ m: "POST", p: "/transport/trips/:id/end", t: "Transport", s: "End Trip", u: "Mark a trip as ended.", r: ["admin", "driver"], e: "trip", status: 200 }),
  makeEndpoint({ m: "POST", p: "/transport/trips/:id/locations", t: "Transport", s: "Record Trip Location", u: "Record one location point for a started trip.", r: ["admin", "driver"], b: "RecordTripLocationRequest", e: "trip", status: 201 }),
  makeEndpoint({ m: "POST", p: "/transport/trips/:id/events", t: "Transport", s: "Create Trip Student Event", u: "Create one trip student event. stopId is required for boarded and dropped_off events, and must be omitted for absent.", r: ["admin", "driver"], b: "CreateTripStudentEventRequest", e: "tripEvent", status: 201, notes: ["Trip student event validation is trip-date aware: the student must have a transport assignment covering the trip date and route."], side: "Dropped-off events trigger parent notifications through the internal automation service." }),
  makeEndpoint({ m: "GET", p: "/transport/trips/:id/events", t: "Transport", s: "List Trip Events", u: "List student events recorded for a trip.", r: ["admin", "driver"], kind: "array", e: "tripEvent", status: 200 }),
  makeEndpoint({ m: "GET", p: "/transport/students/:studentId/home-location", t: "Transport", s: "Get Student Home Location", u: "Return the current saved home location reference for one student. In this round the endpoint is admin-only.", e: "studentHomeLocation", status: 200, notes: ["If the student exists but no home location has been saved yet, the response remains 200 with homeLocation=null."] }),
  makeEndpoint({ m: "PUT", p: "/transport/students/:studentId/home-location", t: "Transport", s: "Save Student Home Location", u: "Create or update the current student home location reference. v1 uses admin as the submitting source.", b: "SaveStudentHomeLocationRequest", e: "studentHomeLocation", status: 200, notes: ["Admin may save pending, approved, or rejected locations. Only approved locations appear in the driver roster."] }),
  makeEndpoint({ m: "DELETE", p: "/transport/students/:studentId/home-location", t: "Transport", s: "Delete Student Home Location", u: "Delete the current saved home location for one student.", e: "studentHomeLocation", status: 200 })
);
endpoints.push(
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
  makeEndpoint({ m: "POST", p: "/homework", t: "Homework", s: "Create Homework", u: "Create homework for a class and subject. Teachers may omit teacherId and rely on the authenticated teacher profile. Admin teacherId accepts the teacher user id from /users?role=teacher or the legacy teacher profile id.", r: ["admin", "teacher"], b: "CreateHomeworkRequest", e: "homework", notes: ["The selected subjectId must have an active subject offering for the selected semesterId.", "Admin frontend flows should send teacherId as the teacher user id returned by GET /users?role=teacher."] }),
  makeEndpoint({ m: "GET", p: "/homework", t: "Homework", s: "List Homework", u: "List homework with pagination and academic filters.", r: ["admin", "teacher"], q: homeworkListQuery, kind: "paginated", e: "homework", status: 200, notes: ["teacherId filter accepts the teacher user id returned by GET /users?role=teacher or the legacy teacher profile id. Prefer the user id in admin frontend flows."], derived: "Homework lists are enriched by SQL views such as vw_homework_details." }),
  makeEndpoint({ m: "GET", p: "/homework/students/:studentId", t: "Homework", s: "Get Student Homework", u: "Return homework assigned to one student. Parents are restricted to their linked children.", r: ["admin", "teacher", "parent"], e: "studentHomework", status: 200, notes: ["If the student exists but has no homework yet, the response remains 200 with items=[]."], derived: "Student homework uses view-backed projections such as vw_homework_details and vw_homework_submission_details." }),
  makeEndpoint({ m: "GET", p: "/homework/:id", t: "Homework", s: "Get Homework", u: "Return one homework detail including roster-level submission summary.", r: ["admin", "teacher"], e: "homework", status: 200, derived: "Homework detail is enriched through SQL views such as vw_homework_details and vw_homework_submission_details." }),
  makeEndpoint({ m: "PUT", p: "/homework/:id/submissions", t: "Homework", s: "Save Homework Submissions", u: "Create or update the homework submission roster.", r: ["admin", "teacher"], b: "SaveHomeworkSubmissionsRequest", kind: "array", e: "studentHomework", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/students/:studentId/profile", t: "Reporting", s: "Get Student Profile Report", u: "Return the full student profile payload used in admin and staff reporting screens.", r: ["admin", "teacher", "supervisor"], e: "studentProfileReport", status: 200, notes: ["If the student exists but has no related attendance, assessment, or behavior rows yet, the response stays 200 with zero-safe summaries."], derived: "This payload combines view-backed projections such as vw_student_profiles, vw_student_attendance_summary, vw_student_assessment_summary, and vw_student_behavior_summary." }),
  makeEndpoint({ m: "GET", p: "/reporting/students/:studentId/reports/attendance-summary", t: "Reporting", s: "Get Student Attendance Summary", u: "Return the student attendance summary used in charts and cards.", r: ["admin", "teacher", "supervisor"], e: "attendanceSummaryReport", status: 200, notes: ["No data yet returns 200 with zero-safe totals, not 404."], derived: "Derived from summary views such as vw_student_attendance_summary." }),
  makeEndpoint({ m: "GET", p: "/reporting/students/:studentId/reports/assessment-summary", t: "Reporting", s: "Get Student Assessment Summary", u: "Return the student assessment summary. Use assessmentSummary.subjects[] rather than items[].", r: ["admin", "teacher", "supervisor"], e: "assessmentSummaryReport", status: 200, notes: ["No data yet returns 200 with zero-safe overall metrics and an empty subjects array."], derived: "Derived from summary views such as vw_student_assessment_summary." }),
  makeEndpoint({ m: "GET", p: "/reporting/students/:studentId/reports/behavior-summary", t: "Reporting", s: "Get Student Behavior Summary", u: "Return the student behavior summary. Use /behavior/students/:studentId/records for the detailed timeline.", r: ["admin", "teacher", "supervisor"], e: "behaviorSummaryReport", status: 200, notes: ["No data yet returns 200 with zero-safe totals, not 404."], derived: "Derived from summary views such as vw_student_behavior_summary." }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/dashboard", t: "Reporting", s: "Get Admin Preview Parent Dashboard", u: "Return the canonical parent dashboard surface for admin monitoring, starting from the selected parent user account.", r: ["admin"], e: "parentDashboard", status: 200, notes: ["Admin-only, read-only preview surface.", "Path identifiers are users.id values, not parent profile ids.", "This is the preferred backend surface for parent-first monitoring and role parity previews."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/profile", t: "Reporting", s: "Get Admin Preview Parent Child Profile", u: "Return the canonical child profile payload under one selected parent user for admin monitoring.", r: ["admin"], e: "studentProfileReport", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires the selected child to be linked to the selected parent or returns 404 Student not linked to parent.", "Path identifiers are users.id for the parent and students.id for the child."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary", t: "Reporting", s: "Get Admin Preview Parent Child Attendance Summary", u: "Return the canonical child attendance summary under one selected parent user for admin monitoring.", r: ["admin"], e: "attendanceSummaryReport", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires parent-child linkage or returns 404 Student not linked to parent.", "No data yet returns 200 with zero-safe totals."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary", t: "Reporting", s: "Get Admin Preview Parent Child Assessment Summary", u: "Return the canonical child assessment summary under one selected parent user for admin monitoring.", r: ["admin"], e: "assessmentSummaryReport", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires parent-child linkage or returns 404 Student not linked to parent.", "Use assessmentSummary.subjects[] rather than items[]."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary", t: "Reporting", s: "Get Admin Preview Parent Child Behavior Summary", u: "Return the canonical child behavior summary under one selected parent user for admin monitoring.", r: ["admin"], e: "behaviorSummaryReport", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires parent-child linkage or returns 404 Student not linked to parent.", "Use /behavior/students/:studentId/records for the detailed timeline outside this summary view."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status", t: "Reporting", s: "Get Admin Preview Parent Child Transport Live Status", u: "Return the canonical parent transport live-status surface for one linked child under a selected parent user.", r: ["admin"], e: "parentTransportLiveStatus", status: 200, notes: ["Admin-only, read-only preview surface.", "Requires parent-child linkage or returns 404 Student not linked to parent.", "Wave 1 is polling-based and does not include Firebase or ETA."], derived: "This response is view-backed and combines active assignment, active trip live status, latest location, and recent event projections." }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/teachers/:teacherUserId/dashboard", t: "Reporting", s: "Get Admin Preview Teacher Dashboard", u: "Return the canonical teacher dashboard surface for admin monitoring, starting from the selected teacher user account.", r: ["admin"], e: "teacherDashboard", status: 200, notes: ["Admin-only, read-only preview surface.", "Path identifier is the teacher users.id from /users?role=teacher.", "Use this instead of reconstructing teacher dashboard parity from multiple admin endpoints."] }),
  makeEndpoint({ m: "GET", p: "/reporting/admin-preview/supervisors/:supervisorUserId/dashboard", t: "Reporting", s: "Get Admin Preview Supervisor Dashboard", u: "Return the canonical supervisor dashboard surface for admin monitoring, starting from the selected supervisor user account.", r: ["admin"], e: "supervisorDashboard", status: 200, notes: ["Admin-only, read-only preview surface.", "Path identifier is the supervisor users.id from /users?role=supervisor.", "Use this instead of reconstructing supervisor dashboard parity from multiple admin endpoints."] }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me", t: "Reporting", s: "Get Parent Dashboard", u: "Return the parent dashboard summary surface.", r: ["parent"], e: "parentDashboard", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me/students/:studentId/profile", t: "Reporting", s: "Get Parent Child Profile", u: "Return the child profile payload for the authenticated parent.", r: ["parent"], e: "studentProfileReport", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me/students/:studentId/reports/attendance-summary", t: "Reporting", s: "Get Parent Child Attendance Summary", u: "Return the child attendance summary for the authenticated parent.", r: ["parent"], e: "attendanceSummaryReport", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me/students/:studentId/reports/assessment-summary", t: "Reporting", s: "Get Parent Child Assessment Summary", u: "Return the child assessment summary for the authenticated parent.", r: ["parent"], e: "assessmentSummaryReport", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/parent/me/students/:studentId/reports/behavior-summary", t: "Reporting", s: "Get Parent Child Behavior Summary", u: "Return the child behavior summary for the authenticated parent.", r: ["parent"], e: "behaviorSummaryReport", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/teacher/me", t: "Reporting", s: "Get Teacher Dashboard", u: "Return the teacher dashboard surface.", r: ["teacher"], e: "teacherDashboard", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/supervisor/me", t: "Reporting", s: "Get Supervisor Dashboard", u: "Return the supervisor dashboard surface.", r: ["supervisor"], e: "supervisorDashboard", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/dashboards/admin/me", t: "Reporting", s: "Get Admin Dashboard", u: "Return the admin dashboard surface.", r: ["admin"], e: "adminDashboard", status: 200 }),
  makeEndpoint({ m: "GET", p: "/reporting/transport/summary", t: "Reporting", s: "Get Transport Summary", u: "Return the transport summary surface shared by admin and driver.", r: ["admin", "driver"], e: "transportSummary", status: 200, derived: "Transport summaries rely on views such as vw_trip_details, vw_latest_trip_location, vw_active_trip_live_status, and vw_trip_student_event_details." }),
  makeEndpoint({ m: "GET", p: "/reporting/transport/parent/me/students/:studentId/live-status", t: "Reporting", s: "Get Parent Child Transport Live Status", u: "Return the transport live status for one linked child. Wave 1 is polling-based and does not include Firebase or ETA.", r: ["parent"], e: "parentTransportLiveStatus", status: 200, derived: "This response is view-backed and combines active assignment, active trip live status, latest location, and recent event projections." })
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
      { key: "otherUserId", value: "47" },
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
const migrationContent = fs.readFileSync(path.join(root, "src", "database", "migrations", "1730000000000_init_auth_schema.js"), "utf8");
const viewNames = Array.from(new Set(migrationContent.match(/vw_[a-z_]+/g) ?? [])).sort();
const automationEvents = ["attendance_absent", "behavior_negative", "transport_trip_started", "transport_student_dropped_off"];
const targetFields = ["communication.announcements.targetRole", "communication.announcements.targetRoles", "communication.notifications.notificationType", "behavior.categories.behaviorType", "transport.trip-events.eventType"];

const moduleOrder = ["health", "auth", "users", "academic-structure", "students", "attendance", "assessments", "behavior", "transport", "communication", "homework", "reporting"];
const moduleTable = moduleOrder.map((key) => {
  const total = afterOpenApiByModule.get(key)?.total ?? 0;
  const tag = afterOpenApiByModule.get(key)?.tag ?? key;
  return `| ${tag} | ${total} | ${beforeOpenApiByModule.get(key)?.covered ?? 0}/${total} | ${beforePostmanByModule.get(key)?.covered ?? 0}/${total} | ${afterOpenApiByModule.get(key)?.covered ?? 0}/${total} | ${afterPostmanByModule.get(key)?.covered ?? 0}/${total} |`;
}).join("\n");

const missingBefore = baseline.masterOpenApi.missing.length > 0
  ? baseline.masterOpenApi.missing.map((route) => `- \`${route.method} ${route.path}\``).join("\n")
  : "- none";
const newRuntimeEndpoints = [
  "GET /reporting/admin-preview/parents/:parentUserId/dashboard",
  "GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/profile",
  "GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/attendance-summary",
  "GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/assessment-summary",
  "GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/reports/behavior-summary",
  "GET /reporting/admin-preview/parents/:parentUserId/students/:studentId/transport/live-status",
  "GET /reporting/admin-preview/teachers/:teacherUserId/dashboard",
  "GET /reporting/admin-preview/supervisors/:supervisorUserId/dashboard",
  "POST /communication/messages/bulk",
  "POST /communication/notifications/bulk"
];
const audit = `# OpenAPI / Postman Audit\n\n- Audit date: ${TODAY}\n- Runtime endpoint count: ${actualRoutes.length}\n- Runtime changes during this reconciliation: ${newRuntimeEndpoints.length > 0 ? `${newRuntimeEndpoints.length} new endpoint(s)` : "none"}\n\n## Coverage Summary\n\n| Artifact | Before | After |\n| --- | --- | --- |\n| Master OpenAPI | ${baseline.masterOpenApi.covered.length}/${actualRoutes.length} | ${final.masterOpenApi.covered.length}/${actualRoutes.length} |\n| Master Postman | ${baseline.masterPostman.covered.length}/${actualRoutes.length} | ${final.masterPostman.covered.length}/${actualRoutes.length} |\n| Auth OpenAPI | ${baseline.authOpenApi.covered.length}/7 | ${final.authOpenApi.covered.length}/7 |\n| Auth Postman | ${baseline.authPostman.covered.length}/7 | ${final.authPostman.covered.length}/7 |\n\n## Per-Module Coverage\n\n| Module | Actual | OpenAPI Before | Postman Before | OpenAPI After | Postman After |\n| --- | --- | --- | --- | --- | --- |\n${moduleTable}\n\n## [NEW] Runtime Endpoints Added In This Pass\n\n${newRuntimeEndpoints.map((route) => `- \`${route}\``).join("\n")}\n\n## Runtime Endpoints Missing From Master OpenAPI Before This Update\n\n${missingBefore}\n\n## Views, Events, Targets Alignment\n\n### SQL Views Referenced\n${viewNames.map((name) => `- \`${name}\``).join("\n")}\n\n### Automation Events Documented\n${automationEvents.map((name) => `- \`${name}\``).join("\n")}\n\n### Target / Event Fields Documented\n${targetFields.map((name) => `- \`${name}\``).join("\n")}\n\n## Reconciliation Notes\n\n- \`/health\` and \`/health/ready\` now use root-level servers instead of inheriting \`/api/v1\`.\n- The auth subset now covers all 7 live auth routes, including forgot-password and reset-password.\n- IDs in the auth subset were normalized to numeric-string ids instead of UUID assumptions.\n- The new admin-preview monitoring endpoints are marked with \`[NEW]\`-style audit visibility through this report and are documented as admin-only, read-only, and \`users.id\`-based surfaces.\n- Communication Phase 2 is now documented with admin-only bulk message and bulk notification delivery, plus additive \`targetRoles[]\` support for announcements.\n`;
fs.writeFileSync(auditPath, audit);
console.log(`Master OpenAPI: ${final.masterOpenApi.covered.length}/${actualRoutes.length}`);
console.log(`Master Postman: ${final.masterPostman.covered.length}/${actualRoutes.length}`);
console.log(`Auth OpenAPI: ${final.authOpenApi.covered.length}/7`);
console.log(`Auth Postman: ${final.authPostman.covered.length}/7`);
