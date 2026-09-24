import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookingForm } from '../../../../components/booking';
import { Breadcrumbs } from '../../../../components/common';
import { useAuth } from '../../../../hooks';

export const CreateBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  const labId = searchParams.get('labId') || undefined;
  const date = searchParams.get('date') || undefined;
  const startTime = searchParams.get('startTime') || undefined;
  const endTime = searchParams.get('endTime') || undefined;
  const rawResources = searchParams.get('resources');
  const initialResources = rawResources ? rawResources.split(',').filter(Boolean) : undefined;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <Breadcrumbs
        items={[
          { label: 'Bookings', href: `${basePrefix}/bookings` },
          { label: 'Create Reservation' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reserve Laboratory</h1>
        <p className="text-xs text-slate-400 mt-1">
          Submit your resource requirements and session purpose for automated scheduling evaluation
        </p>
      </div>

      <BookingForm
        initialLabId={labId}
        initialDate={date}
        initialStartTime={startTime}
        initialEndTime={endTime}
        initialResources={initialResources}
        onSuccess={(bookingId) => navigate(`${basePrefix}/bookings/${bookingId}`)}
      />
    </div>
  );
};
