export interface ParentNotificationRecipient {
  parentUserId: string;
  parentId: string;
  studentId: string;
  studentFullName: string;
  academicNo: string;
  relationType: string;
  isPrimary: boolean;
}

export interface RouteParentNotificationRecipient
  extends ParentNotificationRecipient {
  routeId: string;
  routeName: string;
  stopId: string;
  stopName: string;
}

export interface StudentAbsentAutomationContext {
  attendanceId: string;
  studentId: string;
  studentName: string;
  subjectName: string;
  sessionDate: Date | string;
}

export interface NegativeBehaviorAutomationContext {
  behaviorRecordId: string;
  studentId: string;
  studentName: string;
  categoryName: string;
  behaviorDate: Date | string;
}

export interface TripStartedAutomationContext {
  tripId: string;
  routeId: string;
  routeName: string;
  tripDate: Date | string;
}

export interface StudentDroppedOffAutomationContext {
  tripStudentEventId: string;
  studentId: string;
  studentName: string;
  stopName: string;
}

export interface AutomationPort {
  onStudentAbsent(context: StudentAbsentAutomationContext): Promise<void>;
  onNegativeBehavior(context: NegativeBehaviorAutomationContext): Promise<void>;
  onTripStarted(context: TripStartedAutomationContext): Promise<void>;
  onStudentDroppedOff(context: StudentDroppedOffAutomationContext): Promise<void>;
}
