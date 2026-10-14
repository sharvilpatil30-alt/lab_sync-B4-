import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Clock,
  Cpu,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Compass,
  Layers,
  RotateCcw,
  XCircle,
  Building,
  Users,
  Check,
} from 'lucide-react';
import { Lab, Resource, BookingStatus } from '../../types';
import { Button, Input, Select, ErrorMessage, StatusBadge } from '../common';
import { useCreateBooking, useLabs, useAvailableResources, useAuth } from '../../hooks';

// getRandomValues also works on the team's HTTP LAN origin (randomUUID requires HTTPS).
const createRequestKey = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

// Validation Schema with Zod
const bookingSchema = z
  .object({
    labId: z.string().min(1, 'Please select a laboratory facility.'),
    date: z.string().min(1, 'Please select a reservation date.').refine((val) => {
      if (!val) return false;
      const selected = new Date(`${val}T23:59:59+05:30`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selected >= today;
    }, 'Date must be today or in the future.'),
    startTime: z.string().min(1, 'Start time is required.'),
    endTime: z.string().min(1, 'End time is required.'),
    selectedResourceId: z.string().min(1, 'Please select a workstation.'),
    requiredResources: z.array(z.string()),
    purpose: z.string().min(10, 'Purpose description must be at least 10 characters long.'),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: 'End time must be later than start time.',
      path: ['endTime'],
    }
  );

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  initialLabId?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialResources?: string[];
  onSuccess?: (bookingId: string) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  initialLabId,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialResources,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  const { data: labs = [], isLoading: labsLoading, error: labsError, refetch: refetchLabs } = useLabs();
  const createBookingMutation = useCreateBooking();

  // Wizard Step: 1 to 6
  // STEP 1: Select lab
  // STEP 2: Select date/time
  // STEP 3: Select individual seat/workstation
  // STEP 4: Enter purpose
  // STEP 5: Review
  // STEP 6: Confirm / Submission Result
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Submission Outcome State
  const [submissionOutcome, setSubmissionOutcome] = useState<{
    status: 'idle' | 'submitting' | 'accepted' | 'queued' | 'rejected' | 'error';
    bookingId?: string;
    message?: string;
    queuePosition?: number;
    estimatedStart?: string;
  }>({ status: 'idle' });

  // Conflict warning state for 409
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // Default date = tomorrow
  const defaultDate =
    initialDate ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    })();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      labId: initialLabId || '',
      date: defaultDate,
      startTime: initialStartTime || '10:00',
      endTime: initialEndTime || '12:00',
      selectedResourceId: initialResources?.[0] || '',
      requiredResources: initialResources || [],
      purpose: '',
    },
    mode: 'onChange',
  });

  const selectedLabId = watch('labId');
  const selectedDate = watch('date');
  const selectedStartTime = watch('startTime');
  const selectedEndTime = watch('endTime');
  const selectedResourceId = watch('selectedResourceId');
  const enteredPurpose = watch('purpose');

  // Pre-populate lab if passed via props or URL
  useEffect(() => {
    if (initialLabId) {
      setValue('labId', initialLabId);
    } else if (!selectedLabId && labs.length > 0) {
      setValue('labId', labs[0].id || labs[0].labId);
    }
  }, [labs, selectedLabId, setValue, initialLabId]);

  const selectedLab = useMemo(() => {
    return labs.find((l) => l.id === selectedLabId || l.labId === selectedLabId);
  }, [labs, selectedLabId]);

  // Compute ISO time range for live availability probe
  const { startIso, endIso } = useMemo(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      return { startIso: '', endIso: '' };
    }
    try {
      const s = new Date(`${selectedDate}T${selectedStartTime}:00+05:30`).toISOString();
      const e = new Date(`${selectedDate}T${selectedEndTime}:00+05:30`).toISOString();
      return { startIso: s, endIso: e };
    } catch {
      return { startIso: '', endIso: '' };
    }
  }, [selectedDate, selectedStartTime, selectedEndTime]);

  // Real availability hook
  const {
    data: availableSeats = [],
    isLoading: isAvailabilityLoading,
    error: availabilityError,
    refetch: refetchAvailability,
  } = useAvailableResources(selectedLab?.id || selectedLabId, startIso, endIso);

  const submitting = useRef(false);
  const requestKey = useRef(createRequestKey());
  useEffect(() => { requestKey.current = createRequestKey(); }, [selectedLabId, selectedResourceId, selectedDate, selectedStartTime, selectedEndTime, enteredPurpose]);
  useEffect(() => { register('selectedResourceId'); register('requiredResources'); }, [register]);
  useEffect(() => {
    setValue('selectedResourceId', '');
    setValue('requiredResources', []);
  }, [selectedLabId, selectedDate, selectedStartTime, selectedEndTime, setValue]);

  const handleSelectSeat = (resourceId: string) => {
    setValue('selectedResourceId', resourceId, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('requiredResources', [resourceId]);
    setConflictMessage(null);
  };

  const canSelectSeat = (seat: { available: boolean; preemptable?: boolean }) =>
    seat.available || ((role === 'faculty' || role === 'admin') && seat.preemptable === true);

  // Step Validation logic
  const handleNextFromStep = async (currentStep: number) => {
    if (currentStep === 1) {
      const valid = await trigger('labId');
      if (valid) setStep(2);
    } else if (currentStep === 2) {
      const validDate = await trigger('date');
      const validStart = await trigger('startTime');
      const validEnd = await trigger('endTime');
      if (validDate && validStart && validEnd && startIso && endIso && Date.parse(startIso) > Date.now() && Date.parse(endIso) > Date.parse(startIso)) {
        refetchAvailability();
        setStep(3);
      } else {
        setConflictMessage('Choose a future start time and a later end time (IST).');
      }
    } else if (currentStep === 3) {
      if (!availabilityError && availableSeats.some(s => s.resourceId === selectedResourceId && canSelectSeat(s))) setStep(4);
    } else if (currentStep === 4) {
      const validPurpose = await trigger('purpose');
      if (validPurpose) setStep(5);
    } else if (currentStep === 5) {
      if (await trigger()) { setStep(6); await executeBookingSubmission(); }
    }
  };

  const handleBack = () => {
    if (step > 1 && step < 6) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  // Step 6 Execution (never duplicate submit)
  const executeBookingSubmission = async () => {
    if (submitting.current) return;
    submitting.current = true;

    setSubmissionOutcome({ status: 'submitting' });
    setConflictMessage(null);

    const resourceIdToBook = selectedResourceId;

    try {
      if (!resourceIdToBook || availabilityError || !availableSeats.some(s => s.resourceId === resourceIdToBook && canSelectSeat(s))) throw new Error('Choose an available workstation before confirming.');
      const res = await createBookingMutation.mutateAsync({
        resourceId: resourceIdToBook,
        idempotencyKey: requestKey.current,
        startTime: startIso,
        endTime: endIso,
        labId: selectedLab?.id || selectedLabId,
        date: selectedDate,
        purpose: enteredPurpose,
      });

      const newBookingId = res.bookingId || res.id;
      const resStatus = res.status;

      if (resStatus === 'QUEUED') {
        setSubmissionOutcome({
          status: 'queued',
          bookingId: newBookingId,
          message: 'The requested time slot has been queued for scheduling.',
          queuePosition: res.queuePosition || 1,
          estimatedStart: res.estimatedStart || `${selectedDate} ${selectedStartTime}`,
        });
      } else if (resStatus === 'REJECTED') {
        setSubmissionOutcome({
          status: 'rejected',
          bookingId: newBookingId,
          message:
            res.cancellationReason ||
            'Capacity or equipment conflict prevented automatic reservation approval.',
        });
      } else {
        // CONFIRMED, ACTIVE, etc.
        setSubmissionOutcome({
          status: 'accepted',
          bookingId: newBookingId,
          message: 'Workstation seat reservation confirmed by campus backend.',
        });
        if (onSuccess && newBookingId) {
          onSuccess(newBookingId);
        }
      }
    } catch (err: any) {
      // Handle 409 Conflict: resource is no longer available
      if (err.statusCode === 409 || err.code === 'CONFLICT' || err.message?.includes('conflict')) {
        const conflictText =
          'Scheduling Conflict: This workstation seat is no longer available for the chosen time window. Live availability has been refreshed.';
        setConflictMessage(conflictText);
        setSubmissionOutcome({
          status: 'error',
          message: conflictText,
        });
        refetchAvailability();
        return;
      }

      const errorMsg =
        err.message ||
        'An unexpected server error occurred during reservation submission.';
      setSubmissionOutcome({
        status: 'error',
        message: errorMsg,
      });
    } finally { submitting.current = false; }
  };

  if (labsError) return <ErrorMessage title="Laboratories unavailable" message={labsError.message} onRetry={() => { void refetchLabs(); }} />;

  if (labsLoading) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
        <Sparkles className="w-6 h-6 text-indigo-400 mx-auto animate-pulse mb-2" />
        Loading laboratory catalog and capacity constraints...
      </div>
    );
  }

  const stepTitles = [
    'Select Lab',
    'Date & Time',
    'Seat Selection',
    'Purpose',
    'Review',
    'Confirmation',
  ];

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 max-w-3xl mx-auto shadow-2xl">
      {/* Wizard Progress Stepper */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            Reservation Wizard • Step {step} of 6
          </span>
          <span className="text-xs text-slate-400 font-medium">{stepTitles[step - 1]}</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s < step
                  ? 'bg-emerald-500'
                  : s === step
                  ? 'bg-indigo-500 ring-2 ring-indigo-500/30'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {conflictMessage && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{conflictMessage}</p>
            <button
              type="button"
              onClick={() => {
                setConflictMessage(null);
                setStep(3);
              }}
              className="mt-1 text-[11px] underline text-indigo-300 hover:text-white"
            >
              Return to Step 3 and select another seat
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Select Laboratory Facility */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              <span>STEP 1: Choose Laboratory Facility</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select the Department of Computer Science & Engineering lab room
            </p>
          </div>

          <Controller
            name="labId"
            control={control}
            render={({ field }) => (
              <Select
                label="Laboratory Facility *"
                options={labs.map((l) => ({
                  value: l.id || l.labId,
                  label: `${l.labId} — ${l.name} (${l.capacity} Workstations)`,
                }))}
                error={errors.labId?.message}
                {...field}
              />
            )}
          />

          {selectedLab && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300 font-medium">
                <span>Facility Code: <strong className="text-indigo-400 font-mono">{selectedLab.labId}</strong></span>
                <span>Workstation Capacity: <strong className="text-white">{selectedLab.capacity}</strong></span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">{selectedLab.description}</p>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>{selectedLab.location || `Wing D, Room ${selectedLab.labId}`} • {selectedLab.building}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <Button
              variant="primary"
              onClick={() => handleNextFromStep(1)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next: Select Date & Time
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Date & Time */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>STEP 2: Select Date & Time Slot</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Specify your arrival date and expected duration window (Indian Standard Time • IST)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Input
                  label="Target Date *"
                  type="date"
                  error={errors.date?.message}
                  {...field}
                />
              )}
            />

            <Controller
              name="startTime"
              control={control}
              render={({ field }) => (
                <Input
                  label="Start Time (IST) *"
                  type="time"
                  error={errors.startTime?.message}
                  {...field}
                />
              )}
            />

            <Controller
              name="endTime"
              control={control}
              render={({ field }) => (
                <Input
                  label="End Time (IST) *"
                  type="time"
                  error={errors.endTime?.message}
                  {...field}
                />
              )}
            />
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-indigo-300 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Timezone: <strong>Asia/Kolkata (IST, UTC+05:30)</strong>. Timestamps will be transmitted in ISO 8601 with offset.</span>
          </div>

          {selectedStartTime && selectedEndTime && selectedEndTime <= selectedStartTime && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>End time must be scheduled later than start time.</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Lab Selection
            </Button>
            <Button
              variant="primary"
              onClick={() => handleNextFromStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next: Select Seat
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Individual Seat / Workstation Selection */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>STEP 3: Select Workstation / Seat</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose your specific workstation bench in {selectedLab?.name}
              </p>
            </div>
            {isAvailabilityLoading && (
              <span className="text-[11px] text-indigo-400 flex items-center gap-1 animate-pulse">
                <RotateCcw className="w-3 h-3 animate-spin" /> Checking live seats...
              </span>
            )}
          </div>

          {availabilityError && <ErrorMessage title="Seat availability unavailable" message={availabilityError.message} onRetry={() => { void refetchAvailability(); }} />}

          {/* Seat Grid */}
          {availableSeats.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 font-medium">Available bookable workstations for this slot:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                {availableSeats.map((seat) => {
                  const isSelected = selectedResourceId === seat.resourceId;
                  const isAvailable = canSelectSeat(seat);

                  return (
                    <button
                      key={seat.resourceId}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={!isAvailable}
                      onClick={() => handleSelectSeat(seat.resourceId)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500/40 text-white'
                          : isAvailable
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200 cursor-pointer'
                          : 'bg-slate-900/50 border-slate-800/40 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {seat.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAvailable ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span>{seat.available ? 'Available' : isAvailable ? 'Faculty priority — cancels student booking' : 'Occupied'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">No confirmed available workstations</p>
              <p className="text-[11px] text-slate-500">
                Choose another time or retry availability for {selectedLab?.name}.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Date & Time
            </Button>
            <Button
              variant="primary"
              onClick={() => handleNextFromStep(3)}
              disabled={!!availabilityError || isAvailabilityLoading || !availableSeats.some(s => s.resourceId === selectedResourceId && canSelectSeat(s))}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next: Enter Purpose
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Enter Purpose */}
      {step === 4 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>STEP 4: Academic Purpose</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Explain why this workstation is needed (minimum 10 characters)
            </p>
          </div>

          <Controller
            name="purpose"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Project / Session Purpose *
                </label>
                <textarea
                  {...field}
                  rows={4}
                  placeholder="e.g. Distributed neural network model fine-tuning and benchmark verification for academic laboratory assignment."
                  className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <div className="flex justify-between items-center mt-1 text-[11px]">
                  {errors.purpose ? (
                    <span className="text-rose-400">{errors.purpose.message}</span>
                  ) : (
                    <span className="text-slate-500">Provide sufficient academic context</span>
                  )}
                  <span className={`font-mono ${field.value.length < 10 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {field.value.length} / 10 min chars
                  </span>
                </div>
              </div>
            )}
          />

          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400">Quick suggestions:</span>
            <div className="flex flex-wrap gap-2">
              {[
                'Laboratory Coursework Practical',
                'Senior Capstone Project',
                'Deep Learning Model Inference',
                'Database Query Optimization Lab',
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setValue('purpose', template, { shouldValidate: true })}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-white transition-colors"
                >
                  + {template}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Seat Selection
            </Button>
            <Button
              variant="primary"
              onClick={() => handleNextFromStep(4)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next: Review Booking
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Review */}
      {step === 5 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>STEP 5: Review Reservation Request</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify your booking details prior to final submission
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Laboratory</span>
                <p className="text-slate-100 font-bold mt-0.5">{selectedLab?.name}</p>
                <p className="text-[11px] text-indigo-400 font-mono">{selectedLab?.labId}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Location</span>
                <p className="text-slate-200 mt-0.5">{selectedLab?.location || 'Wing D'}</p>
                <p className="text-[11px] text-slate-400">{selectedLab?.building}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Reserved Date</span>
                <p className="text-slate-100 font-medium mt-0.5">{selectedDate}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Time Window (IST)</span>
                <p className="text-slate-100 font-medium mt-0.5">
                  {selectedStartTime} — {selectedEndTime}
                </p>
              </div>
            </div>

            <div className="pb-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Selected Workstation / Seat</span>
              <p className="text-indigo-300 font-mono font-bold mt-0.5">
                {selectedResourceId ? `Seat Resource ID: ${selectedResourceId}` : 'Standard Workstation Bench'}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Academic Purpose</span>
              <p className="text-slate-300 mt-0.5 italic">{enteredPurpose}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Purpose
            </Button>
            <Button
              variant="primary"
              onClick={() => handleNextFromStep(5)}
              isLoading={createBookingMutation.isPending}
              loadingText="Submitting to Backend..."
              rightIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Book Workstation
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6: Submission Outcome */}
      {step === 6 && (
        <div className="space-y-6 text-center animate-in fade-in duration-200 py-4">
          {submissionOutcome.status === 'submitting' && (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
              <h3 className="text-base font-bold text-white">Communicating with Backend...</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Verifying resource constraints and executing ACID booking allocation...
              </p>
            </div>
          )}

          {submissionOutcome.status === 'accepted' && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Confirmed (HTTP 201)
                </span>
                <h3 className="text-lg font-bold text-white mt-2">Workstation Booking Confirmed</h3>
                <p className="text-xs text-slate-300 mt-1">{submissionOutcome.message}</p>
              </div>

              {submissionOutcome.bookingId && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 inline-block font-mono text-xs text-indigo-300">
                  Booking ID: <strong className="text-white">{submissionOutcome.bookingId}</strong>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`${basePrefix}/route?bookingId=${submissionOutcome.bookingId}`)}
                  leftIcon={<Compass className="w-4 h-4" />}
                >
                  Campus Route
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`${basePrefix}/bookings`)}
                  leftIcon={<Layers className="w-4 h-4" />}
                >
                  View My Bookings
                </Button>
              </div>
            </div>
          )}

          {submissionOutcome.status === 'error' && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 shadow-lg">
                <XCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Booking Submission Failed</h3>
              <p className="text-xs text-rose-300 max-w-sm mx-auto">{submissionOutcome.message}</p>
              <div className="pt-2">
                <Button variant="secondary" onClick={() => setStep(3)} leftIcon={<RotateCcw className="w-4 h-4" />}>
                  Choose Another Seat
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
