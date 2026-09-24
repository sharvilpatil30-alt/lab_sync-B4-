import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarPlus,
  RefreshCw,
  Search as SearchIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useMyBookings, useCancelBooking, useAuth } from '../../../../hooks';
import { Booking } from '../../../../types';
import { BookingCard } from '../../../../components/booking';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  ErrorMessage,
  useToast,
  Input,
} from '../../../../components/common';

type BookingTab = 'all' | 'upcoming' | 'active' | 'queued' | 'completed' | 'cancelled' | 'rejected';

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<BookingTab>(
    (searchParams.get('tab') as BookingTab) || 'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<Booking | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const { data: bookings = [], isLoading, error, refetch, isRefetching } = useMyBookings();
  const cancelMutation = useCancelBooking();

  const handleTabChange = (tab: BookingTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'all') newParams.delete('tab');
    else newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  };

  // Filter Bookings logic
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Tab filter
      if (activeTab === 'upcoming' && b.status !== 'CONFIRMED') return false;
      if (activeTab === 'active' && b.status !== 'ACTIVE') return false;
      if (activeTab === 'queued' && b.status !== 'QUEUED' && b.status !== 'PENDING') return false;
      if (activeTab === 'completed' && b.status !== 'COMPLETED') return false;
      if (activeTab === 'cancelled' && b.status !== 'CANCELLED') return false;
      if (activeTab === 'rejected' && b.status !== 'REJECTED') return false;

      // 2. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const labName = typeof b.lab === 'object' && b.lab !== null ? (b.lab as any).name : b.lab;
        const matchesId = b.bookingId.toLowerCase().includes(q);
        const matchesLab = labName ? labName.toLowerCase().includes(q) : false;
        const matchesPurpose = b.purpose ? b.purpose.toLowerCase().includes(q) : false;
        if (!matchesId && !matchesLab && !matchesPurpose) return false;
      }

      // 3. Date filter
      if (dateFilter && b.date !== dateFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, activeTab, searchTerm, dateFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  const handleConfirmCancel = async () => {
    if (!selectedBookingToCancel) return;
    try {
      await cancelMutation.mutateAsync({
        bookingId: selectedBookingToCancel.id || selectedBookingToCancel.bookingId,
        reason: 'Cancelled by user from portal',
      });
      addToast({
        type: 'info',
        title: 'Booking Cancelled',
        message: `Reservation ${selectedBookingToCancel.bookingId} has been successfully cancelled.`,
      });
      setSelectedBookingToCancel(null);
    } catch {
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: 'Could not cancel booking. Please try again.',
      });
    }
  };

  const tabs: { id: BookingTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: bookings.length },
    {
      id: 'upcoming',
      label: 'Upcoming',
      count: bookings.filter((b) => b.status === 'CONFIRMED').length,
    },
    {
      id: 'active',
      label: 'Active',
      count: bookings.filter((b) => b.status === 'ACTIVE').length,
    },
    {
      id: 'queued',
      label: 'Queued/Pending',
      count: bookings.filter((b) => b.status === 'QUEUED' || b.status === 'PENDING').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: bookings.filter((b) => b.status === 'COMPLETED').length,
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      count: bookings.filter((b) => b.status === 'CANCELLED').length,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      count: bookings.filter((b) => b.status === 'REJECTED').length,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Reservations</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track scheduling approvals, active workstation leases, and view campus routes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Status
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`${basePrefix}/bookings/create`)}
            leftIcon={<CalendarPlus className="w-4 h-4" />}
          >
            New Booking
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Booking ID, lab name, or purpose..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-56 shrink-0">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter by date"
          />
        </div>

        {(searchTerm || dateFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setDateFilter('');
              setCurrentPage(1);
            }}
            className="text-xs text-rose-400 hover:text-rose-300"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <ErrorMessage
          title="Could not retrieve bookings"
          message={(error as any)?.message || 'An error occurred while fetching your bookings.'}
          onRetry={() => refetch()}
        />
      )}

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-8 h-8 text-slate-400" />}
          title={
            searchTerm || dateFilter || activeTab !== 'all'
              ? 'No Matching Reservations'
              : 'No Reservations Found'
          }
          description={
            searchTerm || dateFilter || activeTab !== 'all'
              ? 'No records match your active tab or search criteria. Try clearing search filters.'
              : 'You have not submitted any laboratory booking requests yet. Reserve workstation time in specialized facilities.'
          }
          actionLabel="Reserve a Lab"
          onAction={() => navigate(`${basePrefix}/bookings/create`)}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing <strong className="text-slate-200">{paginatedBookings.length}</strong> of{' '}
              <strong className="text-slate-200">{filteredBookings.length}</strong> reservations
            </span>
            <span>
              Page <strong className="text-slate-200">{currentPage}</strong> of{' '}
              <strong className="text-slate-200">{totalPages}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedBookings.map((booking: Booking) => (
              <BookingCard
                key={booking.id || booking.bookingId}
                booking={booking}
                onCancel={(b) => setSelectedBookingToCancel(b)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                        currentPage === pNum
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Booking Cancellation */}
      <ConfirmDialog
        isOpen={!!selectedBookingToCancel}
        title="Cancel Laboratory Reservation?"
        message={`Are you sure you want to cancel booking ${selectedBookingToCancel?.bookingId}? Any allocated workstations and hardware devices will be released back to the scheduling pool immediately.`}
        confirmLabel="Confirm Cancellation"
        isDestructive={true}
        isLoading={cancelMutation.isPending}
        onConfirm={handleConfirmCancel}
        onClose={() => setSelectedBookingToCancel(null)}
      />
    </div>
  );
};
