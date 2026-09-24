import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  Eye,
  RefreshCw,
  Search,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  Filter,
  User as UserIcon,
} from 'lucide-react';
import { useAllBookings, useLabs, useUpdateBookingStatus, useCancelBooking } from '../../../../hooks';
import { Booking, BookingStatus } from '../../../../types';
import {
  Table,
  StatusBadge,
  Button,
  Select,
  Breadcrumbs,
  Input,
  Column,
  ConfirmDialog,
  useToast,
} from '../../../../components/common';

export const AdminAllBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [labFilter, setLabFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [queueStateFilter, setQueueStateFilter] = useState('all');

  const { data: labs = [] } = useLabs();
  const { data: bookings = [], isLoading, refetch, isRefetching } = useAllBookings({
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    labId: labFilter !== 'all' ? labFilter : undefined,
    date: dateFilter || undefined,
  });

  const updateStatusMutation = useUpdateBookingStatus();
  const cancelMutation = useCancelBooking();

  const [actionDialog, setActionDialog] = useState<{
    booking: Booking;
    actionType: 'confirm' | 'cancel' | 'complete';
    title: string;
    message: string;
    isDestructive?: boolean;
  } | null>(null);

  const handleExecuteAdminAction = async () => {
    if (!actionDialog) return;
    try {
      if (actionDialog.actionType === 'cancel') {
        await cancelMutation.mutateAsync({
          bookingId: actionDialog.booking.id || actionDialog.booking.bookingId,
          reason: 'Administrative cancellation',
        });
      } else if (actionDialog.actionType === 'confirm') {
        await updateStatusMutation.mutateAsync({
          bookingId: actionDialog.booking.id || actionDialog.booking.bookingId,
          status: 'CONFIRMED' as BookingStatus,
          reason: 'Manual administrative clearance',
        });
      } else if (actionDialog.actionType === 'complete') {
        await updateStatusMutation.mutateAsync({
          bookingId: actionDialog.booking.id || actionDialog.booking.bookingId,
          status: 'COMPLETED' as BookingStatus,
          reason: 'Session completed by administrator',
        });
      }

      addToast({
        type: 'success',
        title: 'Action Executed',
        message: `Reservation ${actionDialog.booking.bookingId} has been updated.`,
      });
      setActionDialog(null);
      await refetch();
    } catch {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: 'Could not perform administrative action.',
      });
    }
  };

  // Client-side filtering for user name/search and queue state
  const filteredBookings = bookings.filter((b) => {
    const userStr = typeof b.user === 'object' && b.user !== null ? (b.user as any).name : String(b.user || '');
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      !searchTerm.trim() ||
      (b.bookingId || '').toLowerCase().includes(term) ||
      userStr.toLowerCase().includes(term) ||
      (b.purpose || '').toLowerCase().includes(term);

    const matchesQueueState =
      queueStateFilter === 'all' ||
      (queueStateFilter === 'queued' && (b.status === 'QUEUED' || b.queuePosition)) ||
      (queueStateFilter === 'priority' && b.userRole === 'faculty') ||
      (queueStateFilter === 'allocated' && (b.status === 'CONFIRMED' || b.status === 'ACTIVE'));

    return matchesSearch && matchesQueueState;
  });

  const getQueueStateLabel = (b: Booking) => {
    if (b.status === 'QUEUED') {
      return (
        <span className="font-mono text-xs text-amber-400 font-semibold">
          Pos #{b.queuePosition ?? 1}
        </span>
      );
    }
    if (b.status === 'ACTIVE') {
      return <span className="text-xs text-blue-400 font-semibold font-mono">Running</span>;
    }
    if (b.status === 'CONFIRMED') {
      return <span className="text-xs text-emerald-400 font-semibold font-mono">Bench Leased</span>;
    }
    if (b.userRole === 'faculty') {
      return <span className="text-[10px] text-purple-300 font-mono px-1.5 py-0.2 rounded bg-purple-500/20">Priority Hold</span>;
    }
    return <span className="text-[11px] text-slate-500 font-mono">Direct</span>;
  };

  const getUserDisplayName = (b: Booking) => {
    if (typeof b.user === 'object' && b.user !== null) {
      return (b.user as any).name || (b.user as any).email || 'Campus User';
    }
    return b.user || (b.userRole === 'faculty' ? 'Faculty Member' : 'Student Applicant');
  };

  const columns: Column<Booking>[] = [
    {
      key: 'bookingId',
      header: 'Booking ID',
      render: (b: Booking) => (
        <span className="font-mono text-xs font-bold text-indigo-400">
          {b.bookingId}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User & Applicant',
      render: (b: Booking) => (
        <div className="flex items-center gap-1.5">
          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-200 text-xs">{getUserDisplayName(b)}</span>
        </div>
      ),
    },
    {
      key: 'userRole',
      header: 'Role',
      render: (b: Booking) => (
        <span
          className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded ${
            b.userRole === 'faculty'
              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {b.userRole}
        </span>
      ),
    },
    {
      key: 'lab',
      header: 'Laboratory Target',
      render: (b: Booking) => (
        <div>
          <span className="font-semibold text-slate-200 text-xs">
            {typeof b.lab === 'object' && b.lab !== null ? (b.lab as any).name : b.lab}
          </span>
          <p className="text-[11px] text-slate-400 line-clamp-1">{b.purpose}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Date & Time Slot',
      render: (b: Booking) => (
        <div className="text-xs text-slate-300 font-mono text-[11px]">
          <p className="font-medium text-slate-200">{b.date}</p>
          <p className="text-slate-400">{b.startTime} - {b.endTime}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b: Booking) => <StatusBadge status={b.status} size="sm" />,
    },
    {
      key: 'queueState',
      header: 'Queue State',
      render: (b: Booking) => getQueueStateLabel(b),
    },
    {
      key: 'actions',
      header: 'Inspection & Actions',
      className: 'text-right',
      render: (b: Booking) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Quick Action: Confirm if Queued or Pending */}
          {(b.status === 'QUEUED' || b.status === 'PENDING' || b.status === 'VALIDATED') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActionDialog({
                  booking: b,
                  actionType: 'confirm',
                  title: 'Approve & Confirm Reservation?',
                  message: `Promote booking ${b.bookingId} out of queue and allocate workstations.`,
                })
              }
              className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 px-2"
              title="Force Confirm"
            >
              <CheckCircle2 className="w-3 h-3" />
            </Button>
          )}

          {/* Quick Action: Cancel if active/confirmed/queued */}
          {(b.status === 'CONFIRMED' || b.status === 'QUEUED' || b.status === 'ACTIVE') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setActionDialog({
                  booking: b,
                  actionType: 'cancel',
                  title: 'Cancel Reservation?',
                  message: `Administratively cancel ${b.bookingId} and release workstation resources.`,
                  isDestructive: true,
                })
              }
              className="text-xs text-rose-400 hover:bg-rose-500/10 px-2"
              title="Cancel Booking"
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Open Details */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/admin/bookings/${b.id || b.bookingId}`)}
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: 'All Bookings Oversight' }]} />
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-indigo-400" />
            <span>Campus Reservation Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Supervise all reservations across students, researchers, and academic faculty
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          isLoading={isRefetching}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Data
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by applicant user, booking ID, or purpose..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="w-full sm:w-48">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter Date"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Reservation States' },
              { value: 'CONFIRMED', label: 'Confirmed (Leased)' },
              { value: 'ACTIVE', label: 'Active Now' },
              { value: 'QUEUED', label: 'Queued (Waitlisted)' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />

          <Select
            label="Filter by Facility"
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Campus Facilities' },
              ...labs.map((l) => ({ value: l.id || l.labId, label: l.name })),
            ]}
          />

          <Select
            label="Queue / Scheduling State"
            value={queueStateFilter}
            onChange={(e) => setQueueStateFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Scheduling Types' },
              { value: 'queued', label: 'Queued / Waitlist Only' },
              { value: 'priority', label: 'Faculty Priority Holds' },
              { value: 'allocated', label: 'Benches Allocated (Confirmed/Active)' },
            ]}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredBookings}
        keyExtractor={(b) => b.id || b.bookingId}
        isLoading={isLoading}
        onRowClick={(b) => navigate(`/admin/bookings/${b.id || b.bookingId}`)}
      />

      {/* Confirmation Dialog for Admin Actions */}
      {actionDialog && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setActionDialog(null)}
          onConfirm={handleExecuteAdminAction}
          title={actionDialog.title}
          message={actionDialog.message}
          confirmLabel="Execute Action"
          isDestructive={actionDialog.isDestructive}
          isLoading={updateStatusMutation.isPending || cancelMutation.isPending}
        />
      )}
    </div>
  );
};
