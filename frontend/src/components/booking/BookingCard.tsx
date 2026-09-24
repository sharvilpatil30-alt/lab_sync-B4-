import React from 'react';
import { Calendar, Clock, Navigation, Eye, XCircle } from 'lucide-react';
import { Booking } from '../../types';
import { StatusBadge, Button } from '../common';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';

interface BookingCardProps {
  booking: Booking;
  onCancel?: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onCancel }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  const canCancel = ['PENDING', 'QUEUED', 'CONFIRMED'].includes(booking.status);

  return (
    <div className="glass-card p-5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all duration-200 shadow-lg space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-mono text-indigo-400 font-semibold tracking-wider">
            {booking.bookingId}
          </span>
          <h4 className="text-sm font-bold text-slate-100 mt-0.5 line-clamp-1">
            {typeof booking.lab === 'object' && booking.lab !== null
              ? (booking.lab as any).name
              : booking.lab}
          </h4>
        </div>
        <StatusBadge status={booking.status} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{booking.date}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{booking.startTime} - {booking.endTime}</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
        {booking.purpose}
      </p>

      {booking.status === 'QUEUED' && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
          <span>In Queue: #{booking.queuePosition || 1}</span>
          <span className="text-[10px] text-amber-400/80">Est. start: {booking.estimatedStart ? new Date(booking.estimatedStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`${basePrefix}/bookings/${booking.id || booking.bookingId}`)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          className="flex-1"
        >
          Details
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`${basePrefix}/route/${booking.id || booking.bookingId}`)}
          leftIcon={<Navigation className="w-3.5 h-3.5 text-indigo-400" />}
          className="flex-1"
        >
          Route
        </Button>

        {canCancel && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancel(booking)}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2"
            title="Cancel Booking"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
