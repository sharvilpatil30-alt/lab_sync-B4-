import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  Cpu,
  Navigation,
  RotateCcw,
  RefreshCw,
  XCircle,
  ShieldCheck,
  Check,
  X,
  Play,
} from 'lucide-react';
import {
  useBooking,
  useLab,
  useResources,
  useCampusRoute,
  useCancelBooking,
  useUpdateBookingStatus,
  useAuth,
} from '../../../../hooks';
import {
  Button,
  StatusBadge,
  Skeleton,
  Breadcrumbs,
  ErrorMessage,
  ConfirmDialog,
  useToast,
} from '../../../../components/common';
import {
  BookingSummary,
  BookingStatusTracker,
  QueueStatus,
} from '../../../../components/booking';
import { DistanceDisplay, ETADisplay, RouteTopology } from '../../../../components/route';
import { BookingStatus } from '../../../../types';

export const BookingDetailsPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';
  const { addToast } = useToast();

  const {
    data: booking,
    isLoading: bookingLoading,
    error: bookingError,
    refetch: refetchBooking,
    isRefetching: isRefetchingBooking,
  } = useBooking(bookingId);

  const labId = booking
    ? typeof booking.lab === 'object' && booking.lab !== null
      ? (booking.lab as any).id
      : booking.lab
    : undefined;

  const { data: lab } = useLab(labId);
  const { data: allResources = [] } = useResources();
  const {
    data: route,
    refetch: refetchRoute,
    isRefetching: isRefetchingRoute,
  } = useCampusRoute(bookingId);

  const cancelMutation = useCancelBooking();
  const updateStatusMutation = useUpdateBookingStatus();

  // Action Dialog States
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [adminActionDialog, setAdminActionDialog] = useState<{
    targetStatus: BookingStatus;
    title: string;
    message: string;
    isDestructive?: boolean;
  } | null>(null);

  const handleRefresh = async () => {
    await Promise.all([refetchBooking(), refetchRoute()]);
    addToast({
      type: 'info',
      title: 'Status Refreshed',
      message: 'Latest reservation and scheduling engine data synchronized.',
    });
  };

  const handleConfirmCancel = async () => {
    if (!booking) return;
    try {
      await cancelMutation.mutateAsync({
        bookingId: booking.id || booking.bookingId,
        reason: 'Cancelled by user from booking details page',
      });
      addToast({
        type: 'info',
        title: 'Reservation Cancelled',
        message: `Booking ${booking.bookingId} has been cancelled.`,
      });
      setShowCancelDialog(false);
      await refetchBooking();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.message || 'Could not cancel booking.',
      });
    }
  };

  const handleConfirmAdminAction = async () => {
    if (!booking || !adminActionDialog) return;
    try {
      await updateStatusMutation.mutateAsync({
        bookingId: booking.id || booking.bookingId,
        status: adminActionDialog.targetStatus,
        reason: `Administrative transition to ${adminActionDialog.targetStatus}`,
      });
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Booking transitioned to ${adminActionDialog.targetStatus}.`,
      });
      setAdminActionDialog(null);
      await refetchBooking();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not update status.',
      });
    }
  };

  if (bookingLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (bookingError || !booking) {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Bookings', href: `${basePrefix}/bookings` },
            { label: 'Booking Details' },
          ]}
        />
        <ErrorMessage
          title="Booking Record Not Found"
          message={`Unable to retrieve records for booking ID ${bookingId}.`}
          onRetry={() => refetchBooking()}
        />
      </div>
    );
  }

  // Find allocated resources details
  const allocated = (booking.allocatedResources || []).map((resItem) => {
    const resId = typeof resItem === 'object' && resItem !== null ? (resItem as any).id : resItem;
    return (
      allResources.find((r) => r.id === resId || r.resourceId === resId) || {
        name: resId,
        resourceId: resId,
        type: 'Standard Compute Bench',
        operationalStatus: 'available',
      }
    );
  });

  const normalizedStatus = (booking.status || '').toUpperCase();
  const canCancel = [
    'REQUESTED',
    'DRAFT',
    'VALIDATED',
    'PENDING',
    'QUEUED',
    'CONFIRMED',
    'WAITLISTED',
  ].includes(normalizedStatus);

  const canRetry = ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(normalizedStatus);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Bar with Breadcrumbs & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: 'Bookings', href: `${basePrefix}/bookings` },
            { label: booking.bookingId },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefetchingBooking || isRefetchingRoute}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs text-slate-300"
          >
            Refresh Status
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${basePrefix}/bookings`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs text-slate-400"
          >
            Back to Bookings
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`${basePrefix}/route/${booking.id || booking.bookingId}`)}
            leftIcon={<Navigation className="w-3.5 h-3.5" />}
          >
            View Campus Route
          </Button>
        </div>
      </div>

      {/* SECTION 1: Booking Summary */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            Section 1
          </span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Booking Summary
          </h2>
        </div>
        <BookingSummary booking={booking} lab={lab} />
      </div>

      {/* SECTION 2: Status Tracker */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            Section 2
          </span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Lifecycle Progress & Status Tracker
          </h2>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-2">
          <BookingStatusTracker status={booking.status} />
        </div>
      </div>

      {/* SECTION 3: Scheduling / Queue */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            Section 3
          </span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Scheduling & Queue Engine Evaluation
          </h2>
        </div>
        <QueueStatus booking={booking} />
      </div>

      {/* SECTION 4: Allocated Resources */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            Section 4
          </span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Allocated Resources ({allocated.length})
          </h2>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Resource Allocation Inventory
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {normalizedStatus === 'CONFIRMED' || normalizedStatus === 'ACTIVE'
                ? 'Leased & Bound to Workstation'
                : 'Pending Promotion / Execution'}
            </span>
          </div>

          {allocated.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              Standard laboratory workstation assigned (no dedicated external instruments or hardware units requested).
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Resource Name</th>
                    <th className="p-3">Resource ID</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Allocated Quantity</th>
                    <th className="p-3">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {allocated.map((res: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-semibold text-slate-200">{res.name}</td>
                      <td className="p-3 font-mono text-[11px] text-indigo-400">{res.resourceId}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {res.type || 'Hardware Node'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-200">
                        1 Unit
                      </td>
                      <td className="p-3">
                        <StatusBadge status={res.operationalStatus || 'available'} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: Route */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            Section 5
          </span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Wayfinding & Campus Corridor Route
          </h2>
        </div>

        {route ? (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Indoor Topology Shortest Path
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <DistanceDisplay distanceMeters={route.distanceMeters} />
                <ETADisplay minutes={route.estimatedTravelTimeMinutes} />
                <StatusBadge status={route.routeStatus} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Origin Source</span>
                <strong className="text-emerald-400 text-sm">{route.source}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Destination Facility</span>
                <strong className="text-indigo-400 text-sm">{route.destination}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Route Health</span>
                <span className="text-slate-300 font-mono text-xs capitalize">
                  Status: {route.routeStatus} • {route.path.length} waypoints
                </span>
              </div>
            </div>

            {/* Embedded Visual Route Topology */}
            <div className="pt-2">
              <RouteTopology
                nodes={route.nodes}
                edges={route.edges}
                activePath={route.path}
                sourceNodeId={route.path[0]}
                destinationNodeId={route.path[route.path.length - 1]}
                className="h-72 sm:h-80"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`${basePrefix}/route/${booking.id || booking.bookingId}`)}
                rightIcon={<Navigation className="w-3.5 h-3.5 text-indigo-400" />}
              >
                Open Full Screen Navigation & Turn-by-Turn Guide
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl glass-panel border border-slate-800 text-center text-xs text-slate-400">
            Route calculation in progress for this reservation destination...
          </div>
        )}
      </div>

      {/* SECTION 6: Actions */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            Section 6
          </span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Operational Actions & Permissions
          </h2>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Available Session Controls</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Actions permitted based on your active role: <strong className="text-indigo-400 uppercase">{role}</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Action: Refresh Status */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                isLoading={isRefetchingBooking}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh Status
              </Button>

              {/* Action: View Route */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`${basePrefix}/route/${booking.id || booking.bookingId}`)}
                leftIcon={<Compass className="w-3.5 h-3.5 text-indigo-400" />}
              >
                View Route
              </Button>

              {/* Action: Retry / Adjust Booking */}
              {canRetry && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `${basePrefix}/bookings/create?labId=${labId}&date=${booking.date}&startTime=${booking.startTime}&endTime=${booking.endTime}`
                    )
                  }
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Retry / Reschedule
                </Button>
              )}

              {/* Action: Cancel Booking */}
              {canCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowCancelDialog(true)}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Cancel Booking
                </Button>
              )}
            </div>
          </div>

          {/* Admin Dedicated Transition Controls */}
          {role === 'admin' && (
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-2">
                Administrator Override Controls
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {normalizedStatus !== 'CONFIRMED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAdminActionDialog({
                        targetStatus: 'CONFIRMED',
                        title: 'Approve & Confirm Reservation?',
                        message: `Manually grant clearance and bind workstation benches for booking ${booking.bookingId}.`,
                      })
                    }
                    className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Force Confirm
                  </Button>
                )}

                {normalizedStatus !== 'ACTIVE' && normalizedStatus !== 'COMPLETED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAdminActionDialog({
                        targetStatus: 'ACTIVE',
                        title: 'Mark Session Active?',
                        message: `Mark student/faculty as checked in and session currently running.`,
                      })
                    }
                    className="text-xs text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Set Active
                  </Button>
                )}

                {normalizedStatus !== 'COMPLETED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAdminActionDialog({
                        targetStatus: 'COMPLETED',
                        title: 'Mark Reservation Completed?',
                        message: `Mark session concluded and release all allocated compute hardware back to pool.`,
                      })
                    }
                    className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
                    leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                  >
                    Complete Session
                  </Button>
                )}

                {normalizedStatus !== 'REJECTED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAdminActionDialog({
                        targetStatus: 'REJECTED',
                        title: 'Administrative Rejection?',
                        message: `Decline reservation ${booking.bookingId} due to facility scheduling or maintenance policy.`,
                        isDestructive: true,
                      })
                    }
                    className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    leftIcon={<X className="w-3.5 h-3.5" />}
                  >
                    Reject Booking
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog: Cancel Booking */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        title="Cancel Laboratory Reservation?"
        message={`Are you sure you want to cancel booking ${booking.bookingId}? Any allocated workstations and hardware devices will be released back to the scheduling pool immediately.`}
        confirmLabel="Confirm Cancellation"
        isDestructive={true}
        isLoading={cancelMutation.isPending}
        onConfirm={handleConfirmCancel}
        onClose={() => setShowCancelDialog(false)}
      />

      {/* Confirmation Dialog: Admin Override Actions */}
      {adminActionDialog && (
        <ConfirmDialog
          isOpen={true}
          title={adminActionDialog.title}
          message={adminActionDialog.message}
          confirmLabel="Execute Transition"
          isDestructive={adminActionDialog.isDestructive}
          isLoading={updateStatusMutation.isPending}
          onConfirm={handleConfirmAdminAction}
          onClose={() => setAdminActionDialog(null)}
        />
      )}
    </div>
  );
};
