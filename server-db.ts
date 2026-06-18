import fs from 'fs';
import path from 'path';
import { UserInfo, Booking, AvailabilityConfig, HangoutStatus, RecurringTimeSlot, BlockedSlot, WaitlistEntry } from './src/types.js';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Memory storage cache
export interface DatabaseSchema {
  users: Array<UserInfo & { password?: string }>;
  bookings: Booking[];
  availability: AvailabilityConfig;
  hangoutStatuses: HangoutStatus[];
}

let dbCache: DatabaseSchema = {
  users: [],
  bookings: [],
  availability: {
    recurringSlots: [],
    blockedSlots: []
  },
  hangoutStatuses: []
};

// Default recurring slots: Mon-Fri, 3PM - 7PM (15:00 - 19:00)
const defaultRecurringSlots: RecurringTimeSlot[] = [
  { dayOfWeek: 1, startTime: '15:00', endTime: '19:00' },
  { dayOfWeek: 2, startTime: '15:00', endTime: '19:00' },
  { dayOfWeek: 3, startTime: '15:00', endTime: '19:00' },
  { dayOfWeek: 4, startTime: '15:00', endTime: '19:00' },
  { dayOfWeek: 5, startTime: '15:00', endTime: '19:00' }
];

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

export function initDatabase() {
  try {
    ensureDirectoryExistence(DB_FILE);

    if (fs.existsSync(DB_FILE)) {
      const rawData = fs.readFileSync(DB_FILE, 'utf8');
      dbCache = JSON.parse(rawData);
    } else {
      // Create initial seed data
      dbCache = {
        users: [
          // Hidden back-door admin dev account
          { id: 'admin-dev-01', username: 'Admin', password: 'asher29001', role: 'host' }, // Admin has host-like dashboard access + details panel
          // Standard Host demo user
          { id: 'host-demo-01', username: 'Host', password: 'password123', role: 'host' },
          // Demo Bookers
          { id: 'booker-demo-01', username: 'Sarah', password: 'user123', role: 'booker' },
          { id: 'booker-demo-02', username: 'Derrick', password: 'user123', role: 'booker' }
        ],
        bookings: [],
        availability: {
          recurringSlots: defaultRecurringSlots,
          blockedSlots: []
        },
        hangoutStatuses: []
      };

      // Seed dynamic initial times relative to the current local time to make display stunning immediately.
      const today = new Date();
      const formatISOString = (daysOffset: number, hour: number, minute: number): string => {
        const d = new Date(today);
        d.setDate(today.getDate() + daysOffset);
        d.setHours(hour, minute, 0, 0);
        return d.toISOString();
      };

      // Populate demo bookings
      dbCache.bookings = [
        {
          id: 'b-01',
          bookerId: 'booker-demo-01',
          bookerName: 'Sarah',
          startTime: formatISOString(0, 15, 30), // Today at 15:30
          endTime: formatISOString(0, 16, 0),    // Today at 16:00
          reason: 'Project Kickoff & Review',
          note: 'I will prepare the slides beforehand.',
          status: 'pending',
          waitlist: []
        },
        {
          id: 'b-02',
          bookerId: 'booker-demo-02',
          bookerName: 'Derrick',
          startTime: formatISOString(1, 16, 0),  // Tomorrow at 16:00
          endTime: formatISOString(1, 16, 30),   // Tomorrow at 16:30
          reason: 'Freelance Design Sync',
          note: 'Reviewing the revised Figma landing page assets.',
          status: 'approved',
          waitlist: []
        },
        {
          id: 'b-03',
          bookerId: 'booker-demo-01',
          bookerName: 'Sarah',
          startTime: formatISOString(2, 17, 0),  // 2 days later at 17:00
          endTime: formatISOString(2, 17, 30),   // 2 days later at 17:30
          reason: 'Engineering Collaboration',
          note: 'Pair programming session for building the Express database router.',
          status: 'approved',
          waitlist: []
        }
      ];

      // Blocked out slot demo
      dbCache.availability.blockedSlots = [
        {
          id: 'bl-01',
          startTime: formatISOString(0, 18, 0), // Today 6PM - 7PM
          endTime: formatISOString(0, 19, 0),
          label: 'Dentist Appointment'
        }
      ];

      // Demo hangout alerts
      dbCache.hangoutStatuses = [
        {
          id: 'h-01',
          bookerId: 'booker-demo-01',
          bookerName: 'Sarah',
          message: 'Hey, I am around campus / downtown all afternoon on Friday if you want to grab coffee and chat casually!',
          createdAt: new Date().toISOString()
        }
      ];

      saveDatabase();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

export function saveDatabase() {
  try {
    ensureDirectoryExistence(DB_FILE);
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

export function getDatabaseState(): DatabaseSchema {
  return dbCache;
}
