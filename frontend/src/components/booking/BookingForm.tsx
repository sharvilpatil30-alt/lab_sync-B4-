import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Calendar,
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
  Hourglass,
  Building,
  Users,
} from 'lucide-react';
import { Lab, Resource, BookingStatus } from '../../types';
import { Button, Input, Select, ErrorMessage, StatusBadge } from '../common';
import { useCreateBooking, useLabs, useResources, useAuth } from '../../hooks';

// Validation Schema with Zod
const bookingSchema = z
  .object({
    labId: z.string().min(1, 'Please select a laboratory facility.'),
    date: z.string().min(1, 'Please select a reservation date.').refine((val) => {
      if (!val) return false;
      const selected = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selected >= today;
    }, 'Date must be today or in the future.'),
    startTime: z.string().min(1, 'Start time is required.'),
    endTime: z.string().min(1, 'End time is required.'),
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

  const { data: labs = [], isLoading: labsLoading } = useLabs();
  const { data: allResources = [] } = useResources();
  const createBookingMutation = useCreateBooking();

  // Wizard Step: 1 to 6
  // STEP 1: Select lab
  // STEP 2: Select date/time
  // STEP 3: Select resources
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

  // Default date = tomorrow
  const defaultDate =
    initialDate ||
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })();

  const {
    control,
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
      requiredResources: initialResources || [],
      purpose: '',
    },
    mode: 'onChange',
  });

  const selectedLabId = watch('labId');
  const selectedDate = watch('date');
  const selectedStartTime = watch('startTime');
  const selectedEndTime = watch('endTime');
  const selectedResources = watch('requiredResources') || [];
  const enteredPurpose = watch('purpose');

  // Set default lab if available
  useEffect(() => {
    if (!selectedLabId && labs.length > 0) {
      setValue('labId', initialLabId || labs[0].id || labs[0].labId);
    }
  }, [labs, selectedLabId, setValue, initialLabId]);

  const selectedLab = labs.find((l) => l.id === selectedLabId || l.labId === selectedLabId);

  // Available resources for selected lab
  const availableLabResources = allResources.filter((r) => {
    const rLab = typeof r.lab === 'object' && r.lab !== null ? (r.lab as any).id : r.lab;
    return rLab === selectedLab?.id || rLab === selectedLab?.labId;
  });

  const toggleResource = (id: string) => {
    const current = selectedResources || [];
    const updated = current.includes(id) ? current.filter((r) => r !== id) : [...current, id];
    setValue('requiredResources', updated);
  };

  // Step Validation logic
  const handleNextFromStep = async (currentStep: number) => {
    if (currentStep === 1) {
      const valid = await trigger('labId');
      if (valid) setStep(2);
    } else if (currentStep === 2) {
      const validDate = await trigger('date');
      const validStart = await trigger('startTime');
      const validEnd = await trigger('endTime');
      if (validDate && validStart && validEnd) setStep(3);
    } else if (currentStep === 3) {
      // Resources selection is optional or validated
      setStep(4);
    } else if (currentStep === 4) {
      const validPurpose = await trigger('purpose');
      if (validPurpose) setStep(5);
    } else if (currentStep === 5) {
      setStep(6);
      await executeBookingSubmission();
    }
  };

  const handleBack = () => {
    if (step > 1 && step < 6) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  // Step 6 Execution (never duplicate submit)
  const executeBookingSubmission = async () => {
    if (submissionOutcome.status === 'submitting') return;

    setSubmissionOutcome({ status: 'submitting' });
    try {
      const res = await createBookingMutation.mutateAsync({
        labId: selectedLab?.id || selectedLabId,
        date: selectedDate,
        startTime: selectedStartTime,
        endTime: selectedEndTime,
        purpose: enteredPurpose,
        requiredResources: selectedResources,
      });

      const newBookingId = res.bookingId || res.id;
      const resStatus = res.status;

      if (resStatus === 'QUEUED') {
        setSubmissionOutcome({
          status: 'queued',
          bookingId: newBookingId,
          message: 'The requested time slot is in high demand. Your request has been queued.',
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
          message: 'Reservation approved and workstation bench assigned.',
        });
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'An unexpected server error occurred during reservation submission.';
      setSubmissionOutcome({
        status: 'error',
        message: errorMsg,
      });
    }
  };

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
    'Resources',
    'Purpose',
    'Review',
    'Confirmation',
  ];

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 max-w-3xl mx-auto shadow-2xl">
      {/* 6-Step Workflow Progress Indicator */}
      <div className="border-b border-slate-800 pb-4">
        <div className="grid grid-cols-6 gap-2">
          {stepTitles.map((title, idx) => {
            const stepNumber = idx + 1;
            const isCompleted = step > stepNumber;
            const isCurrent = step === stepNumber;
            return (
              <div key={title} className="flex flex-col items-center text-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? '✓' : stepNumber}
                </div>
                <span
                  className={`text-[10px] mt-1 hidden sm:block truncate ${
                    isCurrent ? 'text-indigo-400 font-semibold' : 'text-slate-500'
                  }`}
                >
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Select Lab */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              <span>STEP 1: Select Facility Laboratory</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose the laboratory workstation room matching your research domain
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {labs.map((lab) => {
              const isSelected = selectedLabId === (lab.id || lab.labId);
              return (
                <div
                  key={lab.id || lab.labId}
                  onClick={() => setValue('labId', lab.id || lab.labId, { shouldValidate: true })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                      : 'glass-card border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">
                        {lab.labId}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100">{lab.name}</h4>
                    </div>
                    <StatusBadge status={lab.operationalStatus} size="sm" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{lab.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
                    <span>{lab.building}</span>
                    <span>Cap: {lab.capacity} seats</span>
                  </div>
                </div>
              );
            })}
          </div>

          {errors.labId && (
            <p className="text-xs text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errors.labId.message}
            </p>
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
              Specify your arrival date and expected duration window
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
                  label="Start Time *"
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
                  label="End Time *"
                  type="time"
                  error={errors.endTime?.message}
                  {...field}
                />
              )}
            />
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
              Next: Select Resources
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Select Resources */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>STEP 3: Select Hardware Resources</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Reserve dedicated GPU nodes, oscilloscopes, or FPGA kits hosted in {selectedLab?.name}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-mono">
              {selectedResources.length} Selected
            </span>
          </div>

          {availableLabResources.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No specialized accessory units cataloged for this room. Standard PC workstations and network connectivity will be allocated automatically.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {availableLabResources.map((res) => {
                const resId = res.id || res.resourceId;
                const isChecked = selectedResources.includes(resId);
                return (
                  <div
                    key={resId}
                    onClick={() => toggleResource(resId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                        : 'glass-card border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleResource(resId)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">
                            {res.resourceId}
                          </span>
                          <h4 className="text-xs font-bold text-slate-100">{res.name}</h4>
                        </div>
                      </div>
                      <StatusBadge status={res.operationalStatus} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{res.description}</p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">{res.type}</span>
                      <span className={res.availability ? 'text-emerald-400' : 'text-slate-500'}>
                        {res.availability ? 'Ready' : 'In Use'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Date & Time
            </Button>
            <Button
              variant="primary"
              onClick={() => handleNextFromStep(3)}
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
              <span>STEP 4: Academic or Research Purpose</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Explain why this facility is needed (minimum 10 characters for automated queue evaluation)
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
                  placeholder="e.g. Distributed neural network model fine-tuning and CUDA benchmark verification for senior capstone research project."
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

          {/* Quick Purpose Template Tags */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400">Quick suggestions:</span>
            <div className="flex flex-wrap gap-2">
              {[
                'Senior Capstone Thesis Evaluation',
                'Embedded IoT System Simulation',
                'Deep Learning Model Inference Test',
                'Cybersecurity Penetration Lab',
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
              Back to Resources
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
              Please double check all parameters before committing to the campus resource allocator
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Facility Lab
                </span>
                <span className="font-bold text-sm text-white">{selectedLab?.name}</span>
                <span className="block text-slate-400 text-[11px] mt-0.5">
                  {selectedLab?.building} • Floor {selectedLab?.floor} ({selectedLab?.location})
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  Date & Slot Window
                </span>
                <span className="font-bold text-sm text-indigo-300">{selectedDate}</span>
                <span className="block text-slate-400 text-[11px] mt-0.5 font-mono">
                  {selectedStartTime} - {selectedEndTime}
                </span>
              </div>
            </div>

            <div className="pb-4 border-b border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">
                Requested Hardware ({selectedResources.length})
              </span>
              {selectedResources.length === 0 ? (
                <span className="text-slate-400 italic">Standard workstation seats only.</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedResources.map((id) => {
                    const res = allResources.find((r) => r.id === id || r.resourceId === id);
                    return (
                      <span
                        key={id}
                        className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[11px]"
                      >
                        {res?.name || id}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">
                Declared Purpose
              </span>
              <p className="text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {enteredPurpose}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Edit
            </Button>
            <Button
              variant="primary"
              onClick={() => handleNextFromStep(5)}
              rightIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Submit Reservation
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6: Confirm & Outcome Handling (accepted, queued, rejected, error/retry) */}
      {step === 6 && (
        <div className="space-y-6 py-4 animate-in fade-in duration-200">
          {submissionOutcome.status === 'submitting' && (
            <div className="p-8 text-center space-y-4">
              <Hourglass className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-white">Submitting Reservation...</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluating schedule priority, queue placement, and hardware lock.
                </p>
              </div>
            </div>
          )}

          {submissionOutcome.status === 'accepted' && (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reservation Confirmed!</h3>
                <p className="text-xs text-emerald-300 mt-1">{submissionOutcome.message}</p>
                <div className="mt-2 inline-block px-3 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-400 font-bold">
                  Booking ID: {submissionOutcome.bookingId}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (onSuccess && submissionOutcome.bookingId) {
                      onSuccess(submissionOutcome.bookingId);
                    } else {
                      navigate(`${basePrefix}/bookings/${submissionOutcome.bookingId}`);
                    }
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View Booking Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`${basePrefix}/route/${submissionOutcome.bookingId}`)}
                  leftIcon={<Compass className="w-4 h-4 text-indigo-400" />}
                >
                  Open Campus Route
                </Button>
              </div>
            </div>
          )}

          {submissionOutcome.status === 'queued' && (
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Automated Queue Placement
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Booking Placed in Queue</h3>
                <p className="text-xs text-amber-300 mt-1">{submissionOutcome.message}</p>
                <div className="mt-3 inline-flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Queue Position</span>
                    <strong className="text-amber-400 font-mono text-base">
                      #{submissionOutcome.queuePosition}
                    </strong>
                  </div>
                  <div className="border-l border-slate-800 pl-4">
                    <span className="text-slate-500 block text-[10px]">Estimated Start</span>
                    <strong className="text-slate-200 font-mono">
                      {submissionOutcome.estimatedStart}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`${basePrefix}/bookings/${submissionOutcome.bookingId}`)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Track Queue Status
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`${basePrefix}/dashboard`)}
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          )}

          {submissionOutcome.status === 'rejected' && (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reservation Request Rejected</h3>
                <p className="text-xs text-rose-300 mt-1">{submissionOutcome.message}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <Button
                  variant="primary"
                  onClick={() => setStep(2)}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Adjust Time Slot
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`${basePrefix}/labs`)}
                >
                  Search Other Labs
                </Button>
              </div>
            </div>
          )}

          {submissionOutcome.status === 'error' && (
            <div className="space-y-4">
              <ErrorMessage
                title="Submission Failed"
                message={submissionOutcome.message || 'An unexpected error occurred while communicating with the backend.'}
                onRetry={executeBookingSubmission}
              />
              <div className="flex justify-center pt-2">
                <Button variant="ghost" onClick={() => setStep(5)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back to Review
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
