import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, BookOpen, Plus, Sparkles, MessageCircle, Info, RefreshCw, Send, CheckCircle2, AlertCircle, Trash2, Heart } from 'lucide-react';
import { UserInfo, Booking, ApiResponse, HangoutStatus } from '../types.js';

interface BookerDashboardProps {
  currentUser: UserInfo;
  onLogout: () => void;
}

export default function BookerDashboard({ currentUser, onLogout }: BookerDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Slot States
  const [slots, setSlots] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');

  // Selected Booking Slot
  const [chosenSlot, setChosenSlot] = useState<{ start: string; end: string } | null>(null);
  
  // Waitlist Select State
  const [chosenWaitlistBookingId, setChosenWaitlistBookingId] = useState<string | null>(null);
  const [chosenWaitlistTime, setChosenWaitlistTime] = useState<string | null>(null);

  // Form Fields
  const [bookerName, setBookerName] = useState(currentUser.username);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [durationHours, setDurationHours] = useState<number>(1.0);
  
  // Post states
  const [postSuccess, setPostSuccess] = useState('');
  const [postError, setPostError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Booker's existing bookings
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Informal Hangout States
  const [hangoutMessage, setHangoutMessage] = useState('');
  const [hangoutDate, setHangoutDate] = useState('');
  const [hangoutSuccess, setHangoutSuccess] = useState('');
  const [isPostingHangout, setIsPostingHangout] = useState(false);

  // Reschedule proposal modal states
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleSlot, setNewRescheduleSlot] = useState<{ start: string; end: string } | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);
  const [rescheduleMessage, setRescheduleMessage] = useState('');

  // Load slots for selected date
  const loadSlotsForDate = async (dateStr: string) => {
    setIsLoadingSlots(true);
    setSlotError('');
    try {
      const response = await fetch(`/api/slots?date=${dateStr}`);
      const res = await response.json();
      if (res.success) {
        setSlots(res.data.slots);
        setSuggestions(res.data.suggestions);
      } else {
        setSlotError(res.error || 'Failed to check host availability.');
      }
    } catch (err) {
      setSlotError('Error reaching schedule server.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Load slots for rescheduling modal
  const loadRescheduleSlots = async (dateStr: string) => {
    setIsLoadingRescheduleSlots(true);
    try {
      const response = await fetch(`/api/slots?date=${dateStr}`);
      const res = await response.json();
      if (res.success) {
        setRescheduleSlots(res.data.slots.filter((s: any) => s.status === 'available'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRescheduleSlots(false);
    }
  };

  // Load bookings belonging only to this visitor (Ensures Privacy!)
  const loadMyBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const response = await fetch(`/api/bookings?userId=${currentUser.id}&role=booker`);
      const res = await response.json();
      if (res.success) {
        setMyBookings(res.data);
      }
    } catch (err) {
      console.error('Failed to load active requests calendar.');
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    loadSlotsForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    loadMyBookings();
  }, [currentUser.id]);

  useEffect(() => {
    if (newRescheduleDate) {
      loadRescheduleSlots(newRescheduleDate);
    }
  }, [newRescheduleDate]);

  // Handle standard booking submit
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    setPostSuccess('');

    if (!chosenSlot) {
      setPostError('Please click any available time slot first.');
      return;
    }
    if (!reason.trim()) {
      setPostError('A hangout reason is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Dynamically calculate end time based on the custom duration selector
      const calculatedEndTime = new Date(new Date(chosenSlot.start).getTime() + durationHours * 3600000).toISOString();

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookerId: currentUser.id,
          bookerName: bookerName.trim(),
          startTime: chosenSlot.start,
          endTime: calculatedEndTime,
          reason: reason.trim(),
          note: note.trim()
        })
      });
      const res = await response.json();
      if (res.success) {
        setPostSuccess('Your hangout request was scheduled successfully and is pending host approval!');
        setReason('');
        setNote('');
        setChosenSlot(null);
        loadMyBookings();
        loadSlotsForDate(selectedDate);
      } else {
        setPostError(res.error || 'Failed to submit scheduling draft.');
      }
    } catch (err) {
      setPostError('Error communicating with appointment services.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Join Waitlist on Booked Slot
  const handleJoinWaitlist = async (targetBookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${targetBookingId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookerId: currentUser.id,
          bookerName: currentUser.username,
          reason: 'Auto waitlist claimant request'
        })
      });
      const res = await response.json();
      if (res.success) {
        alert('You successfully joined the waitlist for this slot! You will be notified if the host cancels.');
        loadMyBookings();
        loadSlotsForDate(selectedDate);
      } else {
        alert(res.error || 'Failed to join waitlist.');
      }
    } catch (err) {
      alert('Error joining waitlist.');
    }
  };

  // Submit Informal Hangout
  const handlePostHangout = async (e: React.FormEvent) => {
    e.preventDefault();
    setHangoutSuccess('');
    if (!hangoutMessage.trim()) return;

    setIsPostingHangout(true);
    try {
      const response = await fetch('/api/hangouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookerId: currentUser.id,
          bookerName: currentUser.username,
          message: hangoutMessage.trim(),
          dateString: hangoutDate
        })
      });
      const res = await response.json();
      if (res.success) {
        setHangoutSuccess('Broadcast updated! Note visible to the host casually.');
        setHangoutMessage('');
        setHangoutDate('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPostingHangout(false);
    }
  };

  // Propose Rescheduling submission
  const submitRescheduleProposal = async () => {
    if (!reschedulingBooking || !newRescheduleSlot) return;

    try {
      const response = await fetch(`/api/bookings/${reschedulingBooking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedBy: 'booker',
          newStartTime: newRescheduleSlot.start,
          newEndTime: newRescheduleSlot.end,
          reason: rescheduleMessage || 'Booker requesting time adjustment'
        })
      });

      const res = await response.json();
      if (res.success) {
        alert('Rescheduling proposal delivered to the host.');
        setReschedulingBooking(null);
        setNewRescheduleSlot(null);
        setRescheduleMessage('');
        loadMyBookings();
      } else {
        alert(res.error || 'Failed to issue reschedule proposal.');
      }
    } catch (e) {
      alert('Error proposing reschedule.');
    }
  };

  // Accept Host Rescheduling Proposal
  const respondHostReschedule = async (bookingId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/reschedule/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });
      const res = await response.json();
      if (res.success) {
        alert(accept ? 'Rescheduled date confirmed!' : 'Rescheduled proposal rejected.');
        loadMyBookings();
        loadSlotsForDate(selectedDate);
      } else {
        alert(res.error || 'Error completing rescheduling decision.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment request? If others are on the waitlist, your slot will immediately be promoted to them.')) return;

    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      const res = await response.json();
      if (res.success) {
        alert('Appointment successfully cancelled.');
        loadMyBookings();
        loadSlotsForDate(selectedDate);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper date formatter
  const formatTimeStr = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateStrPretty = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div id="booker-dashboard" className="min-h-screen bg-transparent text-text-main pb-20 relative">
      {/* Premium Elegant Navbar */}
      <nav className="bg-bg-card/75 backdrop-blur-xl border-b border-border-custom px-6 py-4 sticky top-0 z-40 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-accent-main text-accent-text rounded-xl shadow-sm">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <span className="text-base font-sans font-bold tracking-tight text-text-main block">Dr. Bion Zastakoti</span>
              <span className="text-[10px] font-mono text-accent-bronze uppercase tracking-wider block -mt-1 font-bold">Coordination Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-text-main flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {currentUser.username}
              </div>
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider">Booker (Visitor)</div>
            </div>
            <motion.button
              onClick={onLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-xs font-semibold text-text-main hover:text-accent-main px-3.5 py-1.5 border border-border-custom bg-bg-card hover:bg-bg-inner rounded-xl transition-all cursor-pointer"
            >
              Sign Out
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Hangout Scheduling Engine (Slots Selector) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-card/60 backdrop-blur-xl border border-border-custom p-6 rounded-3xl shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <div>
                <h2 className="text-base font-sans font-bold text-text-main flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent-main" /> Choose Hangout Start Time
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Private slots automatically generated daily. Full privacy: other friends' hangouts remain hidden.
                </p>
              </div>
              <button 
                onClick={() => loadSlotsForDate(selectedDate)}
                className="p-2 text-text-muted hover:text-text-main transition-colors hover:scale-105 active:scale-95"
                title="Refresh Availability"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingSlots ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wide block">Target Calendar Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setChosenSlot(null);
                  }}
                  className="w-full px-4 py-2 bg-bg-inner border border-border-custom text-sm focus:outline-none rounded-xl text-text-main font-mono focus:border-accent-main transition-all"
                />
              </div>

              {/* Suggestions Panel (Nearest Free Slots) */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent-bronze" /> Quick Select Recs Today
                </label>
                <div className="flex flex-wrap gap-2">
                  {suggestions.length > 0 ? (
                    suggestions.map((sTime, idx) => (
                      <motion.button
                        type="button"
                        key={idx}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          const start = sTime;
                          const end = new Date(new Date(sTime).getTime() + 30 * 60 * 1000).toISOString();
                          setChosenSlot({ start, end });
                        }}
                        className="px-2.5 py-1.5 bg-accent-soft hover:bg-accent-main/15 text-accent-main text-[11px] font-mono font-bold rounded-lg border border-accent-main/15 transition-all cursor-pointer"
                      >
                        {formatTimeStr(sTime)}
                      </motion.button>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted bg-bg-inner/40 p-2 rounded-xl italic border border-border-custom">
                      No matching quick recommendations.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Available vs Occupied Slot Cards list */}
            {isLoadingSlots ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-text-muted">
                <div className="w-8 h-8 border-2 border-border-custom border-t-accent-main rounded-full animate-spin"></div>
                <div className="text-xs font-mono">Scanning Host Availability Lifespans...</div>
              </div>
            ) : slots.length === 0 ? (
              <div className="p-8 text-center bg-bg-inner/30 border border-dashed border-border-custom rounded-2xl">
                <p className="text-sm text-text-main">The Host has not scheduled any availability rules for this day.</p>
                <p className="text-xs text-text-muted mt-1">Please browse onto a different day (Monday to Friday 3PM-7PM suggested).</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Hourly Windows on {formatDateStrPretty(selectedDate)}
                </h3>
                
                {/* Clean inline slots grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {slots.map((slot, index) => {
                    const isSelected = chosenSlot && chosenSlot.start === slot.startTime;
                    
                    if (slot.status === 'blocked') {
                      return null; // Ensure host blocked events are completely hidden
                    }

                    if (slot.status === 'occupied') {
                      // Render as waitlisted placeholder
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: Math.min(index * 0.03, 0.3) }}
                          className="p-3.5 bg-bg-inner/80 border border-border-custom rounded-2xl text-left flex flex-col justify-between group relative"
                        >
                          <div className="text-xs text-text-muted font-mono font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-text-muted/60" />
                            {formatTimeStr(slot.startTime)} - {formatTimeStr(slot.endTime)}
                          </div>
                          <div className="text-[10px] text-accent-bronze mt-1 uppercase tracking-wider font-bold">Occupied</div>
                          <motion.button
                            type="button"
                            onClick={() => handleJoinWaitlist(slot.existingBooking.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="mt-2.5 w-full bg-accent-soft text-accent-main hover:bg-accent-main hover:text-accent-text text-[10px] font-sans font-bold py-1.5 px-2 rounded-xl border border-accent-main/15 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            Join Waitlist ({slot.existingBooking.waitlistLength || 0})
                          </motion.button>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.button
                        type="button"
                        key={index}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                        onClick={() => setChosenSlot({ start: slot.startTime, end: slot.endTime })}
                        whileHover={{ scale: isSelected ? 1 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-3.5 text-left rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-accent-main text-accent-text border-accent-main shadow-md'
                            : 'bg-bg-inner/40 text-text-main border-border-custom hover:border-accent-main/40 hover:bg-bg-inner/80'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold flex items-center gap-1">
                          <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-accent-text' : 'text-accent-main'}`} />
                          {formatTimeStr(slot.startTime)} - {formatTimeStr(slot.endTime)}
                        </div>
                        <div className={`text-[10px] uppercase font-bold tracking-wider mt-2.5 ${
                          isSelected ? 'text-accent-text/80' : 'text-accent-main'
                        }`}>
                          Available
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal-like Booking Form Block */}
            <AnimatePresence>
              {chosenSlot && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-bg-inner/40 rounded-2xl p-6 border border-border-custom space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-custom pb-3.5 gap-2">
                    <h4 className="text-[10px] font-bold uppercase text-text-muted tracking-wider">
                      Confirm Hangout Details & Custom Duration
                    </h4>
                    <span className="text-[10px] bg-accent-soft text-accent-main border border-accent-main/15 font-mono px-2.5 py-1 rounded-lg font-bold">
                      Starts: {formatTimeStr(chosenSlot.start)} ({formatDateStrPretty(selectedDate)})
                    </span>
                  </div>

                  {postError && <p className="text-xs text-red-700 p-3 bg-red-500/10 border border-red-500/20 rounded-xl font-medium">{postError}</p>}
                  {postSuccess && <p className="text-xs text-emerald-800 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl font-medium animate-bounce">{postSuccess}</p>}

                  {/* HIGHLY INTERACTIVE DURATION SELECTOR MODULE */}
                  <div className="bg-bg-card p-4 rounded-xl border border-border-custom space-y-3.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">
                      Choose Hangout Duration (Default 1 hour)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[0.5, 1.0, 1.2, 1.5, 2.0, 3.0].map((hours) => (
                        <motion.button
                          type="button"
                          key={hours}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setDurationHours(hours)}
                          className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                            durationHours === hours
                              ? 'bg-accent-main text-accent-text border-accent-main shadow-sm'
                              : 'bg-bg-inner/60 text-text-main border-border-custom hover:bg-bg-inner hover:text-text-main'
                          }`}
                        >
                          {hours === 1.2 ? '1.2h (72 min)' : `${hours}h`}
                        </motion.button>
                      ))}
                      
                      {/* Custom Decimal Number Selector */}
                      <div className="flex items-center gap-1.5 ml-2 border-l border-border-custom pl-3">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="12.0"
                          value={durationHours}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) {
                              setDurationHours(val);
                            }
                          }}
                          className="w-16 px-2 py-1.5 text-xs font-mono border border-border-custom bg-bg-inner text-text-main rounded-lg text-center focus:border-accent-main"
                          title="Enter custom duration ratio"
                        />
                        <span className="text-[11px] text-text-muted font-medium">hours</span>
                      </div>
                    </div>
                    
                    <div className="text-[11px] text-text-muted pt-1 font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-accent-bronze" /> 
                      <span>This hangout is set from </span>
                      <span className="font-bold text-accent-main">{formatTimeStr(chosenSlot.start)}</span> 
                      <span> to </span>
                      <span className="font-bold text-accent-main">
                        {formatTimeStr(new Date(new Date(chosenSlot.start).getTime() + durationHours * 3600000).toISOString())}
                      </span>
                      <span>({durationHours} hours).</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Your Name</label>
                      <input
                        type="text"
                        value={bookerName}
                        onChange={(e) => setBookerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs border border-border-custom bg-bg-card text-text-main rounded-xl focus:border-accent-main focus:ring-1 focus:ring-accent-main/20 outline-none font-sans"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Hangout Reason</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Catch up over coffee or casual workspace sync"
                        className="w-full px-3.5 py-2.5 text-xs border border-border-custom bg-bg-card text-text-main rounded-xl focus:border-accent-main focus:ring-1 focus:ring-accent-main/20 outline-none placeholder:text-text-muted/60"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Optional Note (What are we up to?)</label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Provide additional details or what you want to talk about here..."
                      className="w-full px-3.5 py-2.5 text-xs border border-border-custom bg-bg-card text-text-main rounded-xl resize-none focus:border-accent-main focus:ring-1 focus:ring-accent-main/20 outline-none placeholder:text-text-muted/60"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setChosenSlot(null)}
                      className="px-4 py-2 text-xs bg-bg-card text-text-muted border border-border-custom rounded-xl hover:bg-bg-inner hover:text-text-main transition-colors cursor-pointer"
                    >
                      Cancel Selection
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateBooking}
                      disabled={isSubmitting}
                      className="px-4.5 py-2 text-xs bg-accent-main hover:bg-accent-hover text-accent-text rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                    >
                      {isSubmitting ? (
                        <span className="w-3.5 h-3.5 border-2 border-accent-text/30 border-t-accent-text rounded-full animate-spin"></span>
                      ) : 'Schedule Hangout Slot'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* MY BOOKINGS LIST PANEL (With reschedule control) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg-card/60 backdrop-blur-xl border border-border-custom p-6 rounded-3xl shadow-sm"
          >
            <h3 className="text-sm font-sans font-bold text-text-main border-b border-border-custom pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-bronze" />
                My Hangout Logs & Statuses
              </span>
              <button onClick={loadMyBookings} className="text-text-muted hover:text-text-main transition-colors" title="Reload History">
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBookings ? 'animate-spin' : ''}`} />
              </button>
            </h3>

            {isLoadingBookings ? (
              <div className="py-12 text-center text-xs font-mono text-text-muted animate-pulse">
                Accessing your secure history log...
              </div>
            ) : myBookings.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted italic font-sans pb-4">
                You haven't scheduled any hangouts yet. Select an available hourly block above to request a slot.
              </div>
            ) : (
              <div className="divide-y divide-border-custom">
                {myBookings.map((b, bIdx) => (
                  <motion.div 
                    key={b.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: bIdx * 0.05 }}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-text-main">{b.reason}</span>
                        <span className={`px-2 py-0.5 text-[9px] uppercase font-mono font-bold rounded-full border ${
                          b.status === 'approved' ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' :
                          b.status === 'cancelled' ? 'bg-bg-inner text-text-muted border-border-custom' :
                          b.status === 'completed' ? 'bg-accent-soft text-accent-main border-accent-main/15' :
                          'bg-accent-bronze/10 text-accent-bronze border-accent-bronze/20'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-2 font-mono">
                        <span>{formatDateStrPretty(b.startTime)}</span>
                        <span>•</span>
                        <span>{formatTimeStr(b.startTime)} - {formatTimeStr(b.endTime)}</span>
                      </div>
                      {b.note && <p className="text-[11px] text-text-muted italic font-sans max-w-lg">“{b.note}”</p>}

                      {/* Display Waitlist queue if any */}
                      {b.waitlist && b.waitlist.length > 0 && (
                        <div className="text-[10px] text-accent-bronze bg-accent-soft px-2.5 py-1 rounded-lg inline-block border border-accent-bronze/15 font-bold">
                          Waitlisted Candidates Behind You: {b.waitlist.length}
                        </div>
                      )}

                      {/* IF A RESCHEDULE HAS BEEN PROPOSED */}
                      {b.proposedReschedule && (
                        <div className="mt-2 text-xs bg-accent-soft border border-accent-main/15 rounded-xl p-3 text-text-main max-w-lg space-y-2">
                          <div className="font-bold flex items-center gap-1.5 text-accent-main">
                            <Info className="w-3.5 h-3.5 text-accent-main" />
                            {b.proposedReschedule.proposedBy === 'host' ? 'Host proposed rescheduling:' : 'Pending Host acceptance of your reschedule proposal:'}
                          </div>
                          <div className="font-mono text-[11px] font-semibold text-text-main">
                            New date: {formatDateStrPretty(b.proposedReschedule.newStartTime)} at{' '}
                            {formatTimeStr(b.proposedReschedule.newStartTime)} - {formatTimeStr(b.proposedReschedule.newEndTime)}
                          </div>
                          {b.proposedReschedule.reason && (
                            <p className="italic text-[10px] text-text-muted">“{b.proposedReschedule.reason}”</p>
                          )}
                          
                          {/* If proposed by host, allow booker to decide */}
                          {b.proposedReschedule.proposedBy === 'host' && (
                            <div className="flex gap-2 pt-1.5">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => respondHostReschedule(b.id, true)}
                                className="px-3 py-1 bg-accent-main text-accent-text rounded-lg text-[10px] font-bold hover:bg-accent-hover cursor-pointer transition-colors"
                              >
                                Accept & Update
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => respondHostReschedule(b.id, false)}
                                className="px-3 py-1 bg-bg-card text-text-muted border border-border-custom rounded-lg text-[10px] font-bold hover:bg-bg-inner cursor-pointer transition-colors"
                              >
                                Reject Proposal
                              </motion.button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reschedule/Cancel Command Buttons */}
                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setReschedulingBooking(b);
                            setNewRescheduleDate(b.startTime.split('T')[0]);
                          }}
                          className="px-2.5 py-1.5 text-xs text-accent-main hover:text-accent-hover hover:bg-accent-main/10 border border-accent-main/15 hover:border-accent-main/30 rounded-lg transition-all cursor-pointer font-bold"
                        >
                          Request Reschedule
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1, color: '#ef4444' }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCancelBooking(b.id)}
                          className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Cancel meeting"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT COLUMN: INFORMAL HANGOUT STATUS & FAQS */}
        <div className="space-y-6">
          {/* PROFILE CARD FOR DR. BION ZASTAKOTI */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-bg-card border border-border-custom rounded-3xl p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-accent-bronze/10 p-0.5 shadow-sm flex items-center justify-center">
                  <div className="w-full h-full bg-accent-main rounded-full flex items-center justify-center font-mono font-bold text-sm text-accent-text">
                    BZ
                  </div>
                </div>
                <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-bg-card rounded-full animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-mono font-bold tracking-wider text-accent-bronze uppercase">Coordinator Pro</div>
                <h3 className="text-base font-sans font-bold text-text-main tracking-tight">Dr. Bion Zastakoti</h3>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="bg-accent-soft text-accent-main border border-accent-main/10 px-2 py-0.5 text-[9px] rounded-full font-bold">Expert</span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-500/10 px-2 py-0.5 text-[9px] rounded-full font-bold">Flexible</span>
                </div>
              </div>
            </div>
            
            <p className="text-[11px] text-text-muted leading-relaxed font-sans border-t border-border-custom pt-3.5">
              👋 Dr. Zastakoti welcomes you! Whether booking a formal session or a casual check-in, use this portal. You can choose specific hours and request exact custom durations (e.g. 1.2 or 3 hours).
            </p>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div className="bg-bg-inner/60 p-2 rounded-xl border border-border-custom">
                <div className="text-[9px] text-text-muted">Slots</div>
                <span className="text-[11px] font-bold text-accent-main block">Hourly</span>
              </div>
              <div className="bg-bg-inner/60 p-2 rounded-xl border border-border-custom">
                <div className="text-[9px] text-text-muted">Status</div>
                <span className="text-[11px] font-bold text-accent-bronze block">Active Friendly</span>
              </div>
              <div className="bg-bg-inner/60 p-2 rounded-xl border border-border-custom">
                <div className="text-[9px] text-text-muted">Scale</div>
                <span className="text-[11px] font-bold text-accent-main block">Custom</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg-card/60 backdrop-blur-xl border border-border-custom p-6 rounded-3xl shadow-sm space-y-4"
          >
            <h3 className="text-sm font-sans font-bold text-text-main flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-accent-main" /> "I'm Free & Open to Hangout"
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Don't want to lock down a formal, hard schedule? Express casual availability with a welcoming note! Your status displays directly on the Host's board.
            </p>

            {hangoutSuccess && (
              <p className="text-xs text-emerald-800 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl font-medium">{hangoutSuccess}</p>
            )}

            <form onSubmit={handlePostHangout} className="space-y-3.5">
              <textarea
                value={hangoutMessage}
                onChange={(e) => setHangoutMessage(e.target.value)}
                placeholder="Message: e.g. I am studying in library near Café today or working downtown on Friday!"
                rows={3}
                required
                className="w-full p-3.5 text-xs bg-bg-inner border border-border-custom rounded-xl focus:outline-none focus:border-accent-main focus:ring-1 focus:ring-accent-main/20 text-text-main placeholder:text-text-muted/60 resize-none font-sans"
              />

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Optional Reference Day</label>
                <input
                  type="text"
                  placeholder="e.g. Friday Afternoon"
                  value={hangoutDate}
                  onChange={(e) => setHangoutDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-bg-inner border border-border-custom rounded-xl focus:outline-none focus:border-accent-main focus:ring-1 focus:ring-accent-main/20 text-text-main placeholder:text-text-muted/65 font-sans"
                />
              </div>

              <motion.button
                type="submit"
                disabled={isPostingHangout}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-2.5 bg-accent-main hover:bg-accent-hover font-bold text-accent-text text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5 text-accent-text" /> Broadcast Hangout Status
              </motion.button>
            </form>
          </motion.div>

          {/* Privacy Rules Reminder Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-bg-inner/60 rounded-3xl border border-border-custom p-6 shadow-sm space-y-3"
          >
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-accent-main">
              Host Security Guard
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              To prioritize the Host's personal boundaries:
            </p>
            <ul className="text-xs text-text-main space-y-1.5 list-disc list-inside">
              <li>Full list of blocked hours is auto-hidden.</li>
              <li>Names of other attendee reservations are restricted.</li>
              <li>Schedules on dates beyond recurring margins are locked.</li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* RESCHEDULER MODAL POPUP */}
      <AnimatePresence>
        {reschedulingBooking && (
          <div id="reschedule-modal" className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-bg-card border border-border-custom max-w-md w-full p-6 shadow-2xl rounded-3xl space-y-4 text-text-main"
            >
              <h4 className="text-sm font-bold uppercase text-text-main tracking-wider border-b border-border-custom pb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-main" /> Propose New Hangout Time
              </h4>
              
              <p className="text-[11px] text-text-muted">
                Current slot: {formatDateStrPretty(reschedulingBooking.startTime)} at {formatTimeStr(reschedulingBooking.startTime)}
              </p>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Select Date</label>
                  <input
                    type="date"
                    value={newRescheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setNewRescheduleDate(e.target.value);
                      setNewRescheduleSlot(null);
                    }}
                    className="w-full text-xs p-2.5 bg-bg-inner border border-border-custom rounded-lg focus:outline-none focus:border-accent-main text-text-main font-mono"
                  />
                </div>

                {/* Slot picker for modal */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Select Available Hour</label>
                  {isLoadingRescheduleSlots ? (
                    <p className="text-xs text-text-muted animate-pulse">Scanning available gaps...</p>
                  ) : rescheduleSlots.length === 0 ? (
                    <p className="text-xs text-accent-bronze italic">No available times on this day.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                      {rescheduleSlots.map((rS, idx) => {
                        const isChosen = newRescheduleSlot && newRescheduleSlot.start === rS.startTime;
                        return (
                          <motion.button
                            type="button"
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setNewRescheduleSlot({ start: rS.startTime, end: rS.endTime })}
                            className={`p-2 text-xs text-center font-mono rounded-lg border transition-all cursor-pointer ${
                              isChosen
                                ? 'bg-accent-main text-accent-text border-accent-main font-bold shadow-sm'
                                : 'bg-bg-inner text-text-main border-border-custom hover:bg-bg-inner/80'
                            }`}
                          >
                            {formatTimeStr(rS.startTime)} - {formatTimeStr(rS.endTime)}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Reschedule Reason / Message</label>
                  <input
                    type="text"
                    placeholder="e.g. Schedule conflicts or emergency"
                    value={rescheduleMessage}
                    onChange={(e) => setRescheduleMessage(e.target.value)}
                    className="w-full p-2.5 text-xs text-text-main border border-border-custom bg-bg-inner rounded-xl focus:outline-none focus:border-accent-main placeholder:text-text-muted/60 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-custom">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setReschedulingBooking(null)}
                  className="px-4 py-2 bg-bg-inner text-text-muted border border-border-custom text-xs rounded-xl hover:bg-bg-inner/80"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={submitRescheduleProposal}
                  disabled={!newRescheduleSlot}
                  className="px-4.5 py-2 bg-accent-main hover:bg-accent-hover text-accent-text text-xs disabled:opacity-50 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Propose Reschedule
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
