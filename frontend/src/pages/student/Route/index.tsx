import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Compass } from 'lucide-react';
import { useCampusRoute, useBooking, useAuth } from '../../../hooks';
import { RouteTopology, RouteSummary } from '../../../components/route';
import { Button, Breadcrumbs, Skeleton, ErrorMessage } from '../../../components/common';

export const CampusRoutePage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  const { data: booking } = useBooking(bookingId);
  const { data: route, isLoading, error, refetch, isRefetching } = useCampusRoute(bookingId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Bookings', href: `${basePrefix}/bookings` },
            { label: 'Campus Route' },
          ]}
        />
        <ErrorMessage
          title="Wayfinding Graph Unavailable"
          message="Could not compute topology path for this booking."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              {
                label: booking ? 'Bookings' : 'Laboratories',
                href: `${basePrefix}/${booking ? 'bookings' : 'labs'}`,
              },
              ...(booking
                ? [{ label: booking.bookingId, href: `${basePrefix}/bookings/${bookingId}` }]
                : []),
              { label: 'Campus Map & Route' },
            ]}
          />
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-400" />
            <span>Campus Wayfinding Navigation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time shortest path guidance from {route.source} to {route.destination}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isRefetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Recalculate Route
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (booking) navigate(`${basePrefix}/bookings/${bookingId}`);
              else navigate(`${basePrefix}/labs`);
            }}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            {booking ? 'Back to Booking' : 'Back to Labs'}
          </Button>
        </div>
      </div>

      {/* SVG Interactive Topology Canvas */}
      <RouteTopology
        nodes={route.nodes}
        edges={route.edges}
        activePath={route.path}
        sourceNodeId={route.path[0]}
        destinationNodeId={route.path[route.path.length - 1]}
      />

      {/* Turn-by-Turn Waypoints & Summary */}
      <RouteSummary route={route} />
    </div>
  );
};
