export type UserRole = 'host' | 'booker';

export interface UserInfo {
  id: string;
  username: string;
  role: UserRole;
  // Included directly in database for backdoor view as requested by dev
  password?: string;
}

export type BookingStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  bookerId: string;
  bookerName: string;
  reason: string;
  note?: string;
  requestedAt: string;
}

export interface Booking {
  id: string;
  bookerId: string;
  bookerName: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  reason: string;
  note?: string;
  status: BookingStatus;
  
  // Waitlist support
  waitlist: WaitlistEntry[];

  // Rescheduling support
  proposedReschedule?: {
    proposedBy: 'host' | 'booker';
    newStartTime: string;
    newEndTime: string;
    reason?: string;
  };
}

export interface BlockedSlot {
  id: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  label: string;
}

export interface RecurringTimeSlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "HH:MM" format
  endTime: string;   // "HH:MM" format
}

export interface AvailabilityConfig {
  recurringSlots: RecurringTimeSlot[];
  blockedSlots: BlockedSlot[];
}

export interface HangoutStatus {
  id: string;
  bookerId: string;
  bookerName: string;
  message: string;
  createdAt: string;
  dateString?: string; // Optional preferred date/day
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
