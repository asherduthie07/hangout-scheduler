import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, Check, X, Ban, Sparkles, User, FileText, Settings, Sliders, ChevronLeft, ChevronRight, Bell, AlertCircle, RefreshCw, Layers, Plus } from 'lucide-react';
import { UserInfo, Booking, RecurringTimeSlot, BlockedSlot, AvailabilityConfig, HangoutStatus } from '../types.js';

interface HostDashboardProps {
  currentUser: UserInfo;
  onLogout: () => void;
  isAdminDevOverride?: boolean; // True if backing through backdoor Admin portal
}

type CalendarViewMode = 'month' | 'week' | 'day';

export default function HostDashboard({ currentUser, onLogout, isAdminDevOverride }: HostDashboardProps) {
  // Calendar Navigation
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Base State Loaded from API
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<AvailabilityConfig>({ recurringSlots: [], blockedSlots: [] });
  const [hangouts, setHangouts] = useState<HangoutStatus[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form blockout fields
  const [blockLabel, setBlockLabel] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('10:00');
  const [isBlocking, setIsBlocking] = useState(false);

  // Form recurring slots fields (Quick editor)
  const [recurringSlotMon, setRecurringSlotMon] = useState(true);
  const [recurringSlotTue, setRecurringSlotTue] = useState(true);
  const [recurringSlotWed, setRecurringSlotWed] = useState(true);
  const [recurringSlotThu, setRecurringSlotThu] = useState(true);
  const [recurringSlotFri, setRecurringSlotFri] = useState(true);
  const [recurringStart, setRecurringStart] = useState('15:00');
  const [recurringEnd, setRecurringEnd] = useState('19:00');
  const [isUpdatingRecurring, setIsUpdatingRecurring] = useState(false);

  // Selected Booking details modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Reschedule Action form state
  const [isRescheduling, setIsRescheduling] = useState<string | null>(null); // Booking ID
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStart, setRescheduleStart] = useState('16:00');
  const [rescheduleEnd, setRescheduleEnd] = useState('16:30');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Quick loaders
  const loadHostData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const bRes = await fetch(`/api/bookings?userId=${currentUser.id}&role=host`);
      const bookingsJson = await bRes.json();
      
      const aRes = await fetch('/api/availability');
      const availabilityJson = await aRes.json();

      const hRes = await fetch('/api/hangouts');
      const hangoutsJson = await hRes.json();

      if (bookingsJson.success) setBookings(bookingsJson.data);
      if (availabilityJson.success) setAvailability(availabilityJson.data);
      if (hangoutsJson.success) setHangouts(hangoutsJson.data);
    } catch (err) {
      setError('Failed to reach full-stack server endpoints.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHostData();
  }, [currentUser.id]);

  // Approve / Reject status update
  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'cancelled' | 'completed') => {
    try {
      const response = await fetch(`/api/bookings/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const res = await response.json();
      if (res.success) {
        setSelectedBooking(null);
        loadHostData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Host Manual Blockout exception
  const handleAddBlockout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockLabel || !blockDate) return;

    setIsBlocking(true);
    try {
      const startTime = new Date(`${blockDate}T${blockStart}:00`).toISOString();
      const endTime = new Date(`${blockDate}T${blockEnd}:59`).toISOString();

      const response = await fetch('/api/availability/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime, label: blockLabel })
      });
      const res = await response.json();
      if (res.success) {
        setBlockLabel('');
        setBlockDate('');
        loadHostData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleRemoveBlockout = async (id: string) => {
    try {
      const response = await fetch(`/api/availability/blocked/${id}`, {
        method: 'DELETE'
      });
      const res = await response.json();
      if (res.success) {
        loadHostData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Host Recurring availability ranges
  const handleUpdateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingRecurring(true);
    try {
      const selectedDays: number[] = [];
      if (recurringSlotMon) selectedDays.push(1);
      if (recurringSlotTue) selectedDays.push(2);
      if (recurringSlotWed) selectedDays.push(3);
      if (recurringSlotThu) selectedDays.push(4);
      if (recurringSlotFri) selectedDays.push(5);

      const response = await fetch('/api/availability/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysOfWeek: selectedDays,
          startTime: recurringStart,
          endTime: recurringEnd
        })
      });
      const res = await response.json();
      if (res.success) {
        alert('Recurring available hours updated successfully!');
        loadHostData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingRecurring(false);
    }
  };

  // Propose Reschedule Action
  const handleProposeReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRescheduling || !rescheduleDate) return;

    try {
      const startIso = new Date(`${rescheduleDate}T${rescheduleStart}:00`).toISOString();
      const endIso = new Date(`${rescheduleDate}T${rescheduleEnd}:59`).toISOString();

      const response = await fetch(`/api/bookings/${isRescheduling}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedBy: 'host',
          newStartTime: startIso,
          newEndTime: endIso,
          reason: rescheduleReason || 'Host schedule adjustments'
        })
      });
      const res = await response.json();
      if (res.success) {
        setIsRescheduling(null);
        setRescheduleReason('');
        loadHostData();
        alert('Rescheduling proposal relayed to the attendee key log.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Monthly Helper Grid generators
  const getDaysInMonth = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    
    const days: Date[] = [];
    
    // Prefix padding
    const startOffset = firstDay.getDay(); // Sunday=0
    for (let i = startOffset; i > 0; i--) {
      days.push(new Date(y, m, 1 - i));
    }
    // Main days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(y, m, i));
    }
    // Postfix padding
    const totalDaysCount = days.length;
    const endPadding = 42 - totalDaysCount; // Render exactly 6 calendar rows
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(y, m + 1, i));
    }
    
    return days;
  };

  const getDaysInWeek = (date: Date) => {
    const days: Date[] = [];
    const currentDayOfWeek = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - currentDayOfWeek); // Set to Sunday
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const formatMonthName = (date: Date) => {
    return date.toLocaleString([], { month: 'long', year: 'numeric' });
  };

  const formatTimeStr = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeHM = (isoString: string) => {
    const date = new Date(isoString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDateStrPretty = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDayNameShort = (date: Date) => {
    return date.toLocaleString([], { weekday: 'short', day: 'numeric' });
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Filter criteria
  const pendingRequests = bookings.filter(b => b.status === 'pending');
  const upcomingMeetings = bookings.filter(b => b.status === 'approved');

  // Stats
  const activeBlockedCount = availability.blockedSlots.length;
  const activeHangoutsCount = hangouts.length;

  return (
    <div id="host-dashboard" className="min-h-screen bg-transparent text-text-main pb-20 relative">
      
      {/* Top Navbar */}
      <nav className="bg-bg-card/75 backdrop-blur-xl border-b border-border-custom px-6 py-4 sticky top-0 z-40 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-accent-main text-accent-text rounded-xl shadow-sm">
              <Calendar className="w-5 h-5" />
            </span>
            <div className="flex items-center gap-2.5">
              <div>
                <span className="text-base font-sans font-bold tracking-tight text-text-main block">Host Control Console</span>
                <span className="text-[10px] font-mono text-accent-bronze uppercase tracking-wider block -mt-1 font-bold">Hangout Orchestrator</span>
              </div>
              {isAdminDevOverride && (
                <span className="bg-accent-soft text-accent-main text-[9px] uppercase font-mono px-2 py-0.5 rounded-full border border-accent-main/15 font-bold tracking-wider">
                  Admin System Bypass
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {pendingRequests.length > 0 && (
              <motion.div 
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="flex items-center gap-1.5 bg-accent-bronze/15 text-accent-bronze px-3 py-1.5 rounded-full border border-accent-bronze/25 text-xs font-bold"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{pendingRequests.length} Pending Hangout{pendingRequests.length > 1 ? 's' : ''}</span>
              </motion.div>
            )}

            <div className="text-right">
              <div className="text-sm font-bold text-text-main flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-main animate-pulse" />
                {currentUser.username}
              </div>
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Hangout Host</div>
            </div>
            
            <button
              onClick={onLogout}
              className="text-xs font-semibold text-text-main hover:text-accent-main px-3 py-1.5 border border-border-custom bg-bg-card hover:bg-bg-inner rounded-xl transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* QUICK STATS CLUSTERS BAR */}
      <div className="max-w-7xl mx-auto px-6 mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card border border-border-custom p-4 rounded-2xl shadow-sm flex items-center gap-3.5"
        >
          <div className="p-2.5 bg-accent-soft text-accent-main rounded-xl border border-accent-main/10">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Approved Hangouts</div>
            <div className="text-base font-bold text-text-main font-mono">{upcomingMeetings.length}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-bg-card border border-border-custom p-4 rounded-2xl shadow-sm flex items-center gap-3.5"
        >
          <div className="p-2.5 bg-accent-bronze/10 text-accent-bronze rounded-xl border border-accent-bronze/15">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold text-text-muted tracking-wide">Pending Requests</div>
            <div className="text-base font-bold text-accent-bronze font-mono">{pendingRequests.length}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-card border border-border-custom p-4 rounded-2xl shadow-sm flex items-center gap-3.5"
        >
          <div className="p-2.5 bg-red-500/10 text-red-700 rounded-xl border border-red-500/15">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Blocked Spans</div>
            <div className="text-base font-bold text-red-700 font-mono">{activeBlockedCount}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-bg-card border border-border-custom p-4 rounded-2xl shadow-sm flex items-center gap-3.5"
        >
          <div className="p-2.5 bg-accent-soft text-accent-main rounded-xl border border-accent-main/10">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Active Broadcasts</div>
            <div className="text-base font-bold text-accent-main font-mono">{activeHangoutsCount}</div>
          </div>
        </motion.div>

      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CALENDAR DISPLAY PANEL (MAIN SECTION) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-card/70 backdrop-blur-md border border-border-custom p-6 rounded-3xl shadow-sm space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-custom pb-4 gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-base font-sans font-extrabold text-text-main tracking-tight min-w-[150px]">
                  {formatMonthName(currentDate)}
                </h2>
                <div className="flex items-center bg-bg-inner border border-border-custom rounded-xl p-1 text-xs font-semibold text-text-muted">
                  {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
                    <button 
                      key={mode}
                      onClick={() => setViewMode(mode)} 
                      className={`px-3 py-1 rounded-lg cursor-pointer transition-colors capitalize ${
                        viewMode === mode 
                          ? 'bg-accent-main text-accent-text font-bold shadow-sm' 
                          : 'hover:bg-bg-card hover:text-text-main'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Back / Forth triggers */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const next = new Date(currentDate);
                    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
                    if (viewMode === 'week') next.setDate(next.getDate() - 7);
                    if (viewMode === 'day') next.setDate(next.getDate() - 1);
                    setCurrentDate(next);
                  }}
                  className="p-2 border border-border-custom bg-bg-card rounded-lg hover:bg-bg-inner text-text-main transition-colors cursor-pointer"
                  title="Previous Span"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-2 border border-border-custom bg-bg-card text-xs font-bold rounded-lg hover:bg-bg-inner text-text-main transition-all cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const next = new Date(currentDate);
                    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
                    if (viewMode === 'week') next.setDate(next.getDate() + 7);
                    if (viewMode === 'day') next.setDate(next.getDate() + 1);
                    setCurrentDate(next);
                  }}
                  className="p-2 border border-border-custom bg-bg-card rounded-lg hover:bg-bg-inner text-text-main transition-colors cursor-pointer"
                  title="Next Span"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="py-24 text-center font-mono text-text-muted flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-border-custom border-t-accent-main rounded-full animate-spin" />
                <span className="text-xs">Accessing Schedule Relational Matrix...</span>
              </div>
            )}

            {!isLoading && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewMode}-${currentDate.toISOString()}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  
                  {/* MONTH VIEW CALENDAR */}
                  {viewMode === 'month' && (
                    <div className="space-y-1">
                      {/* Grid Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center py-2 bg-bg-inner/60 rounded-xl border border-border-custom">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName) => (
                          <span key={dName} className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            {dName}
                          </span>
                        ))}
                      </div>

                      {/* Day Grid Cells (Render complete calendar matrix) */}
                      <div className="grid grid-cols-7 gap-1">
                        {getDaysInMonth(currentDate).map((day, idx) => {
                          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                          const isTodayCell = isSameDay(day, new Date());
                          
                          // Collect bookings on this date
                          const dayBookings = bookings.filter((b) => isSameDay(new Date(b.startTime), day) && b.status !== 'cancelled');
                          // Collect manual blockout labels
                          const dayBlocks = availability.blockedSlots.filter((b) => isSameDay(new Date(b.startTime), day));

                          return (
                            <div
                              key={idx}
                              className={`min-h-[92px] p-2 border border-border-custom/40 rounded-xl flex flex-col justify-between text-left transition-all ${
                                isCurrentMonth ? 'bg-bg-card/30' : 'bg-bg-inner/20 opacity-30 pointer-events-none'
                              } ${isTodayCell ? 'border-accent-main/60 bg-accent-soft/20 ring-1 ring-accent-main/10' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-mono font-bold ${isTodayCell ? 'text-accent-main font-bold' : 'text-text-main'}`}>
                                  {day.getDate()}
                                </span>
                                {dayBookings.length > 0 && (
                                  <span className="w-2 h-2 rounded-full bg-accent-main" />
                                )}
                              </div>

                              <div className="space-y-1 mt-1 flex-grow overflow-y-auto max-h-[70px] scrollbar-none">
                                {/* Blocks List */}
                                {dayBlocks.map((bl, bIdx) => (
                                  <div
                                    key={bl.id || bIdx}
                                    className="text-[9px] font-sans font-bold leading-tight px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-800 border border-red-500/15 truncate"
                                    title="Host Blocked"
                                  >
                                    🚫 {bl.label || 'Blocked'}
                                  </div>
                                ))}

                                {/* Bookings Map */}
                                {dayBookings.map((bk) => (
                                  <button
                                    key={bk.id}
                                    onClick={() => setSelectedBooking(bk)}
                                    className={`w-full text-left text-[9px] leading-tight px-1.5 py-0.5 rounded-md border truncate font-bold cursor-pointer transition-all ${
                                      bk.status === 'approved' 
                                        ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 hover:bg-emerald-500/20' 
                                        : bk.status === 'completed' 
                                        ? 'bg-accent-soft text-accent-main border-accent-main/15 hover:bg-accent-main hover:text-accent-text' 
                                        : 'bg-accent-bronze/10 text-accent-bronze border-accent-bronze/25 hover:bg-accent-bronze/20'
                                    }`}
                                  >
                                    ⚡ {bk.bookerName}: {bk.reason}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* WEEK VIEW CALENDAR */}
                  {viewMode === 'week' && (
                    <div className="grid grid-cols-7 gap-1.5">
                      {getDaysInWeek(currentDate).map((day, dIdx) => {
                        const isTodayCell = isSameDay(day, new Date());
                        const dayBookings = bookings.filter((b) => isSameDay(new Date(b.startTime), day) && b.status !== 'cancelled');
                        const dayBlocks = availability.blockedSlots.filter((b) => isSameDay(new Date(b.startTime), day));

                        return (
                          <div
                            key={dIdx}
                            className={`p-3 border border-border-custom rounded-2xl min-h-[220px] flex flex-col space-y-3 bg-bg-card/30 ${
                              isTodayCell ? 'border-accent-main bg-accent-soft/10 ring-1 ring-accent-main/15' : ''
                            }`}
                          >
                            <div className="text-center pb-2 border-b border-border-custom">
                              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                {day.toLocaleString([], { weekday: 'short' })}
                              </div>
                              <div className="text-sm font-mono font-bold text-text-main">
                                {day.getDate()}
                              </div>
                            </div>

                            <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[170px] scrollbar-none">
                              {/* Blocks */}
                              {dayBlocks.map((bl, bIdx) => (
                                <div
                                  key={bl.id || bIdx}
                                  className="text-[9px] font-semibold p-1.5 rounded-lg bg-red-500/10 text-red-700 border border-red-500/10 text-center"
                                >
                                  Blocked Label: {bl.label}
                                </div>
                              ))}

                              {/* Bookings */}
                              {dayBookings.length === 0 && dayBlocks.length === 0 ? (
                                <div className="text-[9px] text-text-muted/60 text-center italic pt-4">No events</div>
                              ) : (
                                dayBookings.map((bk) => (
                                  <button
                                    key={bk.id}
                                    onClick={() => setSelectedBooking(bk)}
                                    className={`w-full text-left p-1.5 rounded-lg border font-semibold text-[10px] space-y-1 block cursor-pointer transition-colors ${
                                      bk.status === 'approved' 
                                        ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/15 hover:bg-emerald-500/20' 
                                        : bk.status === 'completed' 
                                        ? 'bg-accent-soft text-accent-main border-accent-main/10 hover:bg-accent-main/20' 
                                        : 'bg-accent-bronze/10 text-accent-bronze border-accent-bronze/15 hover:bg-accent-bronze/20'
                                    }`}
                                  >
                                    <div className="font-bold truncate">{bk.reason}</div>
                                    <div className="font-mono text-[8px] opacity-75">{formatTimeStr(bk.startTime)}</div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* DAY VIEW CALENDAR */}
                  {viewMode === 'day' && (
                    <div className="border border-border-custom rounded-2xl p-4 bg-bg-card/25 space-y-3.5">
                      <div className="flex items-center gap-3 pb-3 border-b border-border-custom">
                        <span className="w-3 h-3 rounded-full bg-accent-main" />
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                          Schedule listings for {formatDateStrPretty(currentDate.toISOString())}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {(() => {
                          const dayBookings = bookings.filter((b) => isSameDay(new Date(b.startTime), currentDate) && b.status !== 'cancelled');
                          const dayBlocks = availability.blockedSlots.filter((b) => isSameDay(new Date(b.startTime), currentDate));

                          if (dayBookings.length === 0 && dayBlocks.length === 0) {
                            return <p className="text-xs text-text-muted italic text-center py-10">No scheduled hangouts, bookings, or user blocks designated for today.</p>;
                          }

                          return (
                            <>
                              {/* Blocks list */}
                              {dayBlocks.map((bl) => (
                                <div key={bl.id} className="flex justify-between items-center p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl">
                                  <div className="flex items-center gap-2.5">
                                    <Ban className="w-4 h-4 text-red-500" />
                                    <div>
                                      <span className="text-xs font-bold text-red-800">Unavailable blocked time: {bl.label}</span>
                                      <p className="text-[10px] text-text-muted font-mono">{formatTimeStr(bl.startTime)} - {formatTimeStr(bl.endTime)}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveBlockout(bl.id)}
                                    className="text-xs text-red-650 hover:text-red-700 bg-red-500/10 p-1.5 rounded-lg border border-red-500/10 cursor-pointer"
                                  >
                                    Lift Exception
                                  </button>
                                </div>
                              ))}

                              {/* Bookings */}
                              {dayBookings.map((bk) => (
                                <div
                                  key={bk.id}
                                  onClick={() => setSelectedBooking(bk)}
                                  className="p-3.5 border border-border-custom bg-bg-card hover:bg-bg-inner rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-4"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-text-main">{bk.reason}</span>
                                      <span className={`px-1.5 py-0.5 text-[8px] uppercase font-mono font-bold rounded-lg ${
                                        bk.status === 'approved' ? 'bg-emerald-500/10 text-emerald-800' :
                                        bk.status === 'completed' ? 'bg-accent-soft text-accent-main' :
                                        'bg-accent-bronze/10 text-accent-bronze'
                                      }`}>
                                        {bk.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-text-muted mt-1 font-mono">
                                      Attendee: {bk.bookerName} | Duration: {formatTimeStr(bk.startTime)} - {formatTimeStr(bk.endTime)}
                                    </p>
                                  </div>
                                  <span className="text-xs text-accent-main font-bold">Inspect &rarr;</span>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </div>

        {/* RIGHT COLUMN: BROADCAST ALERTS & MANUAL RULES SETTERS */}
        <div className="space-y-6">
          
          {/* FRIENDS BROADCAST STATUS (Live Broadcast) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-bg-card border border-border-custom p-6 rounded-3xl shadow-sm space-y-4"
          >
            <h3 className="text-sm font-sans font-extrabold text-text-main flex items-center justify-between border-b border-border-custom pb-3">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-main" />
                Friends' Cozy Availability Alerts
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-accent-soft text-accent-main rounded-full">
                {hangouts.length} Active
              </span>
            </h3>

            {hangouts.length === 0 ? (
              <p className="text-xs text-text-muted italic text-center py-6">
                No active informal broadcast announcements published by bookers.
              </p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {hangouts.map((hg) => (
                  <motion.div
                    key={hg.id}
                    initial={{ scale: 0.98 }}
                    animate={{ scale: 1 }}
                    className="p-3 bg-bg-inner/60 border border-border-custom rounded-2xl space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-main flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-accent-bronze" /> {hg.bookerName}
                      </span>
                      {hg.dateString && (
                        <span className="text-[9px] font-mono font-bold text-accent-main bg-accent-soft px-1.5 py-0.5 rounded-md">
                          {hg.dateString}
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted italic leading-relaxed">“{hg.message}”</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* BLOCK MANUAL UNAVAILABLE HOURS FORM */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-bg-card border border-border-custom p-6 rounded-3xl shadow-sm space-y-4"
          >
            <h3 className="text-sm font-sans font-extrabold text-text-main flex items-center gap-2 border-b border-border-custom pb-3">
              <Ban className="w-4 h-4 text-red-500 animate-pulse" /> Manual Blockout Hours
            </h3>

            <form onSubmit={handleAddBlockout} className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Description / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Lunch break or dental checkup"
                  value={blockLabel}
                  onChange={(e) => setBlockLabel(e.target.value)}
                  className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl focus:outline-none focus:border-accent-main outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Target Blockout Date</label>
                <input
                  type="date"
                  value={blockDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl focus:outline-none focus:border-accent-main outline-none font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Start hour</label>
                  <input
                    type="time"
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl focus:outline-none focus:border-accent-main outline-none font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">End hour</label>
                  <input
                    type="time"
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl focus:outline-none focus:border-accent-main outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isBlocking}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-2.5 bg-red-700 text-white font-bold rounded-xl text-xs hover:bg-red-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isBlocking ? 'Blocking...' : 'Enforce Security Block'}
              </motion.button>
            </form>
          </motion.div>

          {/* RECURRING AVAILABILITY RULES QUICK SETTER */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg-card border border-border-custom p-6 rounded-3xl shadow-sm space-y-4"
          >
            <h3 className="text-sm font-sans font-extrabold text-text-main flex items-center gap-2 border-b border-border-custom pb-3">
              <Settings className="w-4 h-4 text-accent-main" /> Recurring Weekly Availability
            </h3>

            <form onSubmit={handleUpdateRecurring} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Active Weekly Weekdays</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Mon', active: recurringSlotMon, setter: setRecurringSlotMon },
                    { label: 'Tue', active: recurringSlotTue, setter: setRecurringSlotTue },
                    { label: 'Wed', active: recurringSlotWed, setter: setRecurringSlotWed },
                    { label: 'Thu', active: recurringSlotThu, setter: setRecurringSlotThu },
                    { label: 'Fri', active: recurringSlotFri, setter: setRecurringSlotFri },
                  ].map((dayObj, dIdx) => (
                    <button
                      type="button"
                      key={dIdx}
                      onClick={() => dayObj.setter(!dayObj.active)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        dayObj.active
                          ? 'bg-accent-main text-accent-text border-accent-main shadow-xs'
                          : 'bg-bg-inner text-text-muted border-border-custom hover:bg-bg-inner/80'
                      }`}
                    >
                      {dayObj.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-muted uppercase block">Start Hour</label>
                  <input
                    type="time"
                    value={recurringStart}
                    onChange={(e) => setRecurringStart(e.target.value)}
                    className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl outline-none font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-muted uppercase block">End Hour</label>
                  <input
                    type="time"
                    value={recurringEnd}
                    onChange={(e) => setRecurringEnd(e.target.value)}
                    className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-bg-inner border border-border-custom rounded-xl text-[11px] text-text-muted leading-relaxed">
                ℹ️ Booker dashboard automatically generates bookings daily using rules within this window.
              </div>

              <motion.button
                type="submit"
                disabled={isUpdatingRecurring}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-2.5 bg-accent-main text-accent-text font-bold rounded-xl text-xs hover:bg-accent-hover transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isUpdatingRecurring ? 'Updating...' : 'Publish Recurring Availability'}
              </motion.button>
            </form>
          </motion.div>

        </div>
      </div>

      {/* DETAIL MODAL FOR SELECTED BOOKING */}
      <AnimatePresence>
        {selectedBooking && (
          <div id="booking-detail-modal" className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-border-custom max-w-md w-full p-6 shadow-2xl rounded-3xl space-y-4 text-text-main"
            >
              <div className="flex items-center justify-between border-b border-border-custom pb-3">
                <h4 className="text-sm font-extrabold uppercase text-text-main tracking-wider">
                  Inspect Slot Request
                </h4>
                <button 
                  onClick={() => { setSelectedBooking(null); setIsRescheduling(null); }}
                  className="text-text-muted hover:text-text-main font-bold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Booking Info Body */}
              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Proposed Reason</span>
                  <p className="text-sm font-bold text-text-main mt-0.5">{selectedBooking.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Booker Name</span>
                    <p className="text-xs font-bold text-accent-main flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5" /> {selectedBooking.bookerName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Status Span</span>
                    <p className="mt-0.5">
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-mono font-bold rounded-full border ${
                        selectedBooking.status === 'approved' ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' :
                        selectedBooking.status === 'completed' ? 'bg-accent-soft text-accent-main border-accent-main/15' :
                        'bg-accent-bronze/10 text-accent-bronze'
                      }`}>
                        {selectedBooking.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Scheduled Horizon</span>
                  <p className="text-xs font-semibold text-text-main flex items-center gap-1.5 mt-0.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-accent-bronze" /> {formatDateStrPretty(selectedBooking.startTime)} | {formatTimeStr(selectedBooking.startTime)} - {formatTimeStr(selectedBooking.endTime)}
                  </p>
                </div>

                {selectedBooking.note && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Friend Note Detail</span>
                    <p className="p-3 bg-bg-inner/65 border border-border-custom rounded-xl italic text-text-muted mt-1">
                      “{selectedBooking.note}”
                    </p>
                  </div>
                )}

                {/* Waitlist list queue */}
                {selectedBooking.waitlist && selectedBooking.waitlist.length > 0 && (
                  <div className="p-3 bg-accent-soft border border-accent-main/15 rounded-xl space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-accent-main tracking-wider block">
                      ⏰ Waitlist candidates ({selectedBooking.waitlist.length})
                    </span>
                    <div className="space-y-1">
                      {selectedBooking.waitlist.map((wl, wlIdx) => (
                        <div key={wlIdx} className="text-[10px] text-text-main flex items-center justify-between">
                          <span className="font-semibold">&#183; {wl.bookerName}</span>
                          <span className="font-mono text-[9px] text-text-muted italic">{wl.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proposed reschedules pending display */}
                {selectedBooking.proposedReschedule && (
                  <div className="p-3 bg-accent-soft border border-accent-main/10 rounded-xl space-y-1.5 text-text-main">
                    <span className="text-[9px] uppercase font-bold text-accent-main tracking-wider block">
                      ⚠️ Reschedule Request Proposed By {selectedBooking.proposedReschedule.proposedBy.toUpperCase()}
                    </span>
                    <p className="font-mono text-[10px]">
                      New date proposal: {formatDateStrPretty(selectedBooking.proposedReschedule.newStartTime)} at {formatTimeStr(selectedBooking.proposedReschedule.newStartTime)}
                    </p>
                    <p className="italic text-[10px] text-text-muted">Message: "{selectedBooking.proposedReschedule.reason}"</p>
                    
                    {/* Decision panel if proposed by booker */}
                    {selectedBooking.proposedReschedule.proposedBy === 'booker' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/bookings/${selectedBooking.id}/reschedule/respond`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ accept: true })
                              });
                              if ((await res.json()).success) {
                                alert('Proposal Accepted and schedule updated!');
                                setSelectedBooking(null);
                                loadHostData();
                              }
                            } catch (e) { console.error(e); }
                          }}
                          className="px-2.5 py-1 bg-accent-main text-accent-text text-[10px] font-bold rounded hover:bg-accent-hover cursor-pointer"
                        >
                          Approve Proposed New Slot
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/bookings/${selectedBooking.id}/reschedule/respond`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ accept: false })
                              });
                              if ((await res.json()).success) {
                                alert('Proposal rejected.');
                                setSelectedBooking(null);
                                loadHostData();
                              }
                            } catch (e) { console.error(e); }
                          }}
                          className="px-2.5 py-1 bg-bg-inner text-text-muted border border-border-custom text-[10px] font-bold rounded hover:bg-bg-inner/80 cursor-pointer"
                        >
                          Reject Proposal
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Operations */}
              {!isRescheduling ? (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border-custom">
                  {selectedBooking.status === 'pending' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'approved')}
                      className="flex-grow py-2 bg-accent-main text-accent-text text-xs font-bold rounded-xl hover:bg-accent-hover cursor-pointer"
                    >
                      Approve Request
                    </motion.button>
                  )}
                  {selectedBooking.status === 'approved' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'completed')}
                      className="flex-grow py-2 bg-accent-soft text-accent-main border border-accent-main/15 text-xs font-bold rounded-xl hover:bg-accent-main hover:text-accent-text cursor-pointer"
                    >
                      Mark Completed
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsRescheduling(selectedBooking.id);
                      setRescheduleDate(selectedBooking.startTime.split('T')[0]);
                      setRescheduleStart(formatTimeHM(selectedBooking.startTime));
                      setRescheduleEnd(formatTimeHM(selectedBooking.endTime));
                    }}
                    className="flex-grow py-2 bg-bg-inner text-text-main border border-border-custom text-xs font-bold rounded-xl hover:bg-bg-inner/80 cursor-pointer"
                  >
                    Reschedule
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                    className="py-2 px-3.5 bg-red-500/10 text-red-700 border border-red-500/15 text-xs font-bold rounded-xl hover:bg-red-500 hover:text-white cursor-pointer"
                  >
                    Reject/Cancel Slot
                  </motion.button>
                </div>
              ) : (
                /* INLINE RESCHEDULER FORM FOR HOST */
                <form onSubmit={handleProposeReschedule} className="space-y-3.5 pt-3 border-t border-border-custom text-xs">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-text-muted">Propose Custom Time Adjustment</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase">Select New Date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl focus:outline-none focus:border-accent-main outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-text-muted uppercase">Start Time</label>
                      <input
                        type="time"
                        value={rescheduleStart}
                        onChange={(e) => setRescheduleStart(e.target.value)}
                        className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl outline-none font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-text-muted uppercase">End Time</label>
                      <input
                        type="time"
                        value={rescheduleEnd}
                        onChange={(e) => setRescheduleEnd(e.target.value)}
                        className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase">Message / Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Host schedule adjustments"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className="w-full p-2.5 bg-bg-inner border border-border-custom text-text-main rounded-xl focus:outline-none focus:border-accent-main outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(null)}
                      className="px-3.5 py-2 bg-bg-inner text-text-muted border border-border-custom rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-accent-main hover:bg-accent-hover text-accent-text font-bold rounded-xl"
                    >
                      Transmit Proposal
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
