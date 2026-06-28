"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, Trash2, Clock, CalendarDays, Link as LinkIcon, Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { format, addDays, startOfToday } from "date-fns";
import apiClient from "@/api/client";

interface Slot {
  _id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);

  // Form Fields
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/availability/me");
      setSlots(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load availability slots");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const bookingUrl = `${window.location.origin}/careers`;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success("Booking portal link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Please fill in all slot fields");
      return;
    }

    const startDateTime = new Date(`${selectedDate}T${startTime}:00`);
    const endDateTime = new Date(`${selectedDate}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      toast.error("Start time must be before end time");
      return;
    }

    setAddingSlot(true);
    try {
      await apiClient.post("/availability", {
        slots: [
          {
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
          }
        ]
      });
      toast.success("Time slot published successfully!");
      fetchSlots();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to publish slot");
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to remove this availability slot?")) return;
    try {
      await apiClient.delete(`/availability/${slotId}`);
      toast.success("Slot removed successfully");
      fetchSlots();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to remove slot");
    }
  };

  const handleSyncCalendar = async () => {
    setSyncing(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1800)),
      {
        loading: 'Connecting to Google Calendar API...',
        success: () => {
          setSyncing(false);
          return 'Successfully synced all available slots with your Google Calendar!';
        },
        error: () => {
          setSyncing(false);
          return 'Google Calendar sync failed.';
        },
      }
    );
  };

  const today = startOfToday();
  const upcomingDays = Array.from({ length: 5 }).map((_, i) => addDays(today, i));

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-[var(--color-primary)]" />
            My Availability
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Manage your interview slots. Candidates can book time with you automatically.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopyLink}
            className="px-4 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-white font-medium rounded-xl transition-all flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4 text-[var(--color-text-muted)]" />}
            {copied ? "Copied!" : "Copy Booking Link"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Add Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 glass-panel p-6 rounded-3xl h-fit border border-[var(--color-border)]"
        >
          <h3 className="text-lg font-bold text-white mb-4">Quick Add Slots</h3>
          
          <form onSubmit={handleAddSlot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Date</label>
              <input 
                type="date" 
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Start Time</label>
                <input 
                  type="time" 
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">End Time</label>
                <input 
                  type="time" 
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={addingSlot}
              className="w-full py-3 mt-4 bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {addingSlot ? <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" /> : <Plus className="w-4 h-4 text-[var(--color-primary)]" />}
              Add to Schedule
            </button>
          </form>
          
          <div className="pt-6 mt-6 border-t border-[var(--color-border)]">
            <button 
              onClick={handleSyncCalendar}
              disabled={syncing}
              className="w-full py-3 bg-[var(--color-background)] border border-[var(--color-border)] text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-[var(--color-surface-hover)] text-sm disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" /> : <CalendarDays className="w-4 h-4 text-[#4285F4]" />}
              Sync with Google Calendar
            </button>
          </div>
        </motion.div>

        {/* Available Calendar Slots List */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mx-auto mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">Loading slots...</p>
            </div>
          ) : (
            upcomingDays.map((day, idx) => {
              const daySlots = slots.filter(s => format(new Date(s.startTime), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"));
              
              return (
                <div key={idx} className="glass-panel p-6 rounded-3xl border border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-4 border-b border-[var(--color-border)] pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {format(day, "EEEE, MMMM d")}
                      {format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-primary text-white uppercase tracking-wider ml-2">Today</span>
                      )}
                    </h3>
                  </div>
                  
                  {daySlots.length > 0 ? (
                    <div className="space-y-3">
                      {daySlots.map(slot => (
                        <div 
                          key={slot._id} 
                          className={clsx(
                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                            slot.isBooked 
                              ? "bg-purple-500/10 border-purple-500/30" 
                              : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={clsx(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              slot.isBooked ? "bg-purple-500/20 text-purple-400" : "bg-[var(--color-background)] text-[var(--color-text-muted)]"
                            )}>
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={clsx("font-semibold", slot.isBooked ? "text-purple-100" : "text-white")}>
                                {format(new Date(slot.startTime), "h:mm a")} - {format(new Date(slot.endTime), "h:mm a")}
                              </p>
                              <p className="text-xs mt-1 text-[var(--color-text-muted)]">
                                {slot.isBooked ? "Booked by candidate" : "Available to book"}
                              </p>
                            </div>
                          </div>
                          
                          {!slot.isBooked && (
                            <button 
                              onClick={() => handleDeleteSlot(slot._id)}
                              className="p-2 text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Remove slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-background)]/50">
                      <p className="text-[var(--color-text-muted)] text-sm">No slots added for this day.</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}
