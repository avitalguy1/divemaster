import { InferSelectModel } from 'drizzle-orm';
import { users, diveCenters, studentProfiles, courses, requirementItems } from '@/lib/db/schema';

export type User = InferSelectModel<typeof users>;
export type DiveCenter = InferSelectModel<typeof diveCenters>;
export type StudentProfile = InferSelectModel<typeof studentProfiles>;
export type Course = InferSelectModel<typeof courses>;
export type RequirementItem = InferSelectModel<typeof requirementItems>;

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface UserResponse {
  id: string;
  diveCenterId: string;
  email: string | null;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  padiNumber: string | null;
  phone: string | null;
  locale: string;
  isActive: boolean;
}
