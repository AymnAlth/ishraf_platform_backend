export interface ParentProfile {
  parentId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  relationType: string | null;
}

export interface TeacherProfile {
  teacherId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  qualification: string | null;
  hireDate: Date | null;
}

export interface SupervisorProfile {
  supervisorId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  department: string | null;
}

export interface DriverProfile {
  driverId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string;
  driverStatus: string;
}
