import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Compass,
  Sparkles,
  HelpCircle,
  Minimize2,
  Maximize2,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useAuth, useTheme } from '../../hooks';

interface PageGuideStep {
  title: string;
  description: string;
  actionHint?: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface PageGuide {
  pageTitle: string;
  category: string;
  greeting: string;
  steps: PageGuideStep[];
}

export const PandaGuideBot: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { isGoldPink, theme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isWaving, setIsWaving] = useState(false);
  const [hasNewTip, setHasNewTip] = useState(true);

  // Trigger playful wave whenever location changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setHasNewTip(true);
    setIsWaving(true);
    const timer = setTimeout(() => setIsWaving(false), 2000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Contextual step database per route
  const guide: PageGuide = useMemo(() => {
    const path = location.pathname.toLowerCase();

    // 1. Inventory & Dead-stock
    if (path.includes('/admin/inventory')) {
      return {
        pageTitle: '3NF Campus Inventory & Dead-Stock',
        category: 'Inventory System',
        greeting: `Hey ${user?.name ? user.name.split(' ')[0] : 'there'}! I can guide you through the real 3NF inventory.`,
        steps: [
          {
            title: '1. Filter by Equipment Category',
            description: 'Use the category filter tabs (Computers, Printers, Projectors) to quickly isolate hardware types.',
            actionHint: 'Click any category pill at the top.',
          },
          {
            title: '2. Review Dead-Stock Metrics',
            description: 'Check the summary cards showing Total Capital Investment, Recorded Inventory Value, and Total Physical Assets.',
            actionHint: 'Notice labs D-01 through D-12 values.',
          },
          {
            title: '3. Inspect Specifications & Serial Numbers',
            description: 'Click on any batch item (e.g. OptiPlex 7020 i7-14700 or Epson EB-E01 3LCD) to see full processor, RAM, and vendor serials.',
            actionHint: 'View 3NF specification breakdowns.',
          },
          {
            title: '4. View Laboratory Breakdown',
            description: 'Filter by specific departmental lab (D-01 to D-12) to see exactly what hardware is deployed in each room.',
            actionHint: 'Select a lab from the dropdown.',
          },
        ],
      };
    }

    // 2. Labs Catalog & Search
    if (path.includes('/labs') && !path.includes('/new')) {
      return {
        pageTitle: 'Laboratory Search & Occupancy',
        category: 'Campus Facilities',
        greeting: `Looking for a workspace? Here is how to find and reserve the right lab:`,
        steps: [
          {
            title: '1. Switch View Modes',
            description: 'Use the top-right toggle to switch between the visual Occupancy Grid (live seat matrix) and the Catalog Filter list.',
            actionHint: 'Try toggling Occupancy Grid vs Catalog.',
          },
          {
            title: '2. Filter by Campus Building',
            description: 'Filter laboratories by building (Systems & OS, Data Center Complex, AI & Advanced Computing Center, etc.).',
            actionHint: 'Open the Advanced Filter panel.',
          },
          {
            title: '3. Check Live Availability',
            description: 'Look for the green Available badge or seat occupancy percentage to find an uncrowded facility.',
            actionHint: 'Hover over the occupancy progress bars.',
          },
          {
            title: '4. Book or Inspect Details',
            description: 'Click "Book Session" to reserve workstation slots or "View Details" to see hardware assets installed in that lab.',
            actionLabel: 'Create a Booking',
            actionUrl: `/${role || 'student'}/bookings/new`,
          },
        ],
      };
    }

    // 3. Create Booking
    if (path.includes('/bookings/new')) {
      return {
        pageTitle: 'Book a Workstation or Lab',
        category: 'Reservation Engine',
        greeting: 'Let us schedule your session with zero conflicts!',
        steps: [
          {
            title: '1. Choose Target Laboratory',
            description: 'Select one of the 12 departmental labs (e.g. Linux Lab D-01, Database Lab D-02, or AI Lab D-08).',
            actionHint: 'Select from the lab dropdown.',
          },
          {
            title: '2. Set Date & Time Slot',
            description: 'Pick your scheduled date and time window. The engine automatically checks for overlapping reservations.',
            actionHint: 'Choose standard campus hours.',
          },
          {
            title: '3. Attach Required Hardware Resources',
            description: 'Select needed hardware like Dell OptiPlex workstations, Epson 3LCD Projector, or Samsung Flip board.',
            actionHint: 'Check matching available resources.',
          },
          {
            title: '4. Submit for DFD Verification',
            description: 'Our backend scheduling state machine will evaluate priority, resolve conflicts, and assign your slot or queue position.',
            actionHint: 'Click "Confirm Reservation".',
          },
        ],
      };
    }

    // 4. Bookings List & Status
    if (path.includes('/bookings')) {
      return {
        pageTitle: 'Session Bookings & Queue Tracker',
        category: 'My Reservations',
        greeting: 'Here are all your scheduled lab reservations:',
        steps: [
          {
            title: '1. Monitor Reservation Status',
            description: 'Confirmed sessions are highlighted in green, Queued sessions in amber, and Active live sessions in indigo.',
            actionHint: 'Check your upcoming session cards.',
          },
          {
            title: '2. Track Queue Position',
            description: 'If high-demand labs have overlapping requests, your queue position and estimated start time are updated in real-time.',
            actionHint: 'View the Queue Status widget.',
          },
          {
            title: '3. Navigate to Your Lab',
            description: 'Click "View Walking Route" on any confirmed booking to see the shortest path from the campus entrance.',
            actionLabel: 'Open Campus Route',
            actionUrl: `/${role || 'student'}/route`,
          },
        ],
      };
    }

    // 5. Campus Route & Navigation
    if (path.includes('/route')) {
      return {
        pageTitle: 'Campus Navigation & Routing',
        category: 'Wayfinding Engine',
        greeting: 'Lost on campus? Let me guide you along the shortest path!',
        steps: [
          {
            title: '1. Select Destination Lab',
            description: 'Choose your destination room or select from your confirmed bookings in the dropdown selector.',
            actionHint: 'Pick any lab D-01 through D-12.',
          },
          {
            title: '2. View Shortest Path Graph',
            description: 'The interactive topology map calculates the optimal route using the campus Dijkstra pathfinding algorithm.',
            actionHint: 'Notice highlighted path nodes & distance.',
          },
          {
            title: '3. Review ETA & Directions',
            description: 'Check walking distance in meters, estimated travel time, and step-by-step turns along campus landmarks.',
            actionHint: 'Walking speed is calibrated at ~80m/min.',
          },
        ],
      };
    }

    // 6. Admin Resources
    if (path.includes('/admin/resources')) {
      return {
        pageTitle: 'Hardware Assets & Peripherals',
        category: 'Resource Management',
        greeting: 'Manage PCs, Printers, Displays, and Servers across all labs:',
        steps: [
          {
            title: '1. Filter Hardware Assets',
            description: 'Filter by equipment type (Workstation / PC, Printer, Projector, Interactive Display) or by room assignment.',
            actionHint: 'Use the filter toolbar above.',
          },
          {
            title: '2. Check Hardware Operational Status',
            description: 'Quickly spot equipment marked as Available, In-Use, Maintenance, or Partially Written-Off.',
            actionHint: 'Inspect status badges.',
          },
          {
            title: '3. Change Equipment State',
            description: 'Admins can toggle device status to schedule repairs or take offline hardware out of the booking rotation.',
            actionHint: 'Click the action dropdown on any row.',
          },
        ],
      };
    }

    // 7. Telemetry & Monitoring
    if (path.includes('/admin/monitoring')) {
      return {
        pageTitle: 'Live Telemetry & System Monitoring',
        category: 'Infrastructure Health',
        greeting: 'Real-time telemetry and constraint enforcement console:',
        steps: [
          {
            title: '1. Review Campus Alerts',
            description: 'Active alerts display hardware anomalies, maintenance notices, and write-off audits.',
            actionHint: 'Click "Resolve" when an issue is handled.',
          },
          {
            title: '2. Monitor Room Telemetry',
            description: 'Track environmental metrics like ambient room temperature, acoustic noise (dB), and facility power draw (kW).',
            actionHint: 'Updated automatically every 20 seconds.',
          },
          {
            title: '3. DFD Constraint Console',
            description: 'Switch to the DFD sub-tab to verify that idempotency (C1), lock serialization (C2), and quota limits (C3) are satisfied.',
            actionHint: 'Click "DFD Architecture & Constraints".',
          },
        ],
      };
    }

    // 8. Maintenance
    if (path.includes('/admin/maintenance')) {
      return {
        pageTitle: 'Equipment Maintenance & Service Orders',
        category: 'Facility Operations',
        greeting: 'Keep campus hardware in peak operational condition:',
        steps: [
          {
            title: '1. Review Maintenance Work Orders',
            description: 'Inspect scheduled, in-progress, and completed maintenance tickets for labs and specific hardware units.',
            actionHint: 'Check target lab assignments.',
          },
          {
            title: '2. Track Service Windows',
            description: 'Verify start and completion timestamps to ensure lab downtime does not conflict with classes.',
            actionHint: 'Review date ranges.',
          },
          {
            title: '3. Update or Complete Tickets',
            description: 'Once technician inspection is complete, mark the order finished to restore the asset back to "Available".',
            actionHint: 'Use status action triggers.',
          },
        ],
      };
    }

    // 9. Reports
    if (path.includes('/admin/reports')) {
      return {
        pageTitle: 'Analytics, Audits & Utilization Reports',
        category: 'Executive Insights',
        greeting: 'Analyze campus lab utilization and export audit spreadsheets:',
        steps: [
          {
            title: '1. Select Analysis Time Window',
            description: 'Adjust start and end date ranges to evaluate booking volume and laboratory load across the semester.',
            actionHint: 'Pick date filters at the top.',
          },
          {
            title: '2. Review Peak Hours & Queue Rates',
            description: 'Inspect peak utilization periods (typically 14:00 - 16:00) and queue resolution success metrics.',
            actionHint: 'View the summary metric cards.',
          },
          {
            title: '3. Export Official CSV Audit',
            description: 'Click "Export CSV Report" to download a full CSV audit record containing lab hours, session counts, and utilization rates.',
            actionHint: 'Click the green Export button.',
          },
        ],
      };
    }

    // 10. Dashboard
    if (path.includes('/dashboard')) {
      return {
        pageTitle: `${role === 'admin' ? 'Administrator' : role === 'faculty' ? 'Faculty' : 'Student'} Dashboard`,
        category: 'Central Overview',
        greeting: `Welcome back! Here is your quick navigation guide for today:`,
        steps: [
          {
            title: '1. Scan Live Metrics',
            description: 'Get an immediate glance at total available labs, active bookings, pending queues, and system health.',
            actionHint: 'Check the top statistics cards.',
          },
          {
            title: '2. Quick Navigation Shortcuts',
            description: 'Jump directly to Laboratory Search, Bookings, 3NF Inventory, or Campus Navigation from the sidebar or dashboard shortcuts.',
            actionLabel: 'Explore Laboratories',
            actionUrl: `/${role || 'student'}/labs`,
          },
          {
            title: '3. Role Switcher in Navbar',
            description: 'You can test the system as Student, Faculty, or Admin anytime by clicking the user profile menu in the top right.',
            actionHint: 'Click your avatar to switch demo roles.',
          },
        ],
      };
    }

    // 11. Login
    if (path.includes('/login')) {
      return {
        pageTitle: 'Smart Campus Authentication',
        category: 'Sign In',
        greeting: 'Welcome to Smart Campus! Here is how to log in:',
        steps: [
          {
            title: '1. Select a Demo Persona',
            description: 'Click on any demo persona button (Student: Anya Bandgar, Faculty: Prof. Rajesh, Admin: Dr. Vikramaditya) to prefill credentials.',
            actionHint: 'Click any persona card.',
          },
          {
            title: '2. Sign In to Portal',
            description: 'Click "Sign In" to access the role-specific workspace and real 3NF campus inventory.',
            actionHint: 'Instant simulated session token.',
          },
        ],
      };
    }

    // Default fallback
    return {
      pageTitle: 'Smart Campus Portal',
      category: 'Campus Navigator',
      greeting: `Hi there! I am your Panda Campus Guide 🐼.`,
      steps: [
        {
          title: '1. Explore Laboratories',
          description: 'Browse the 12 departmental laboratories from D-01 to D-12 with real workstation counts and live occupancy.',
          actionLabel: 'Go to Labs',
          actionUrl: `/${role || 'student'}/labs`,
        },
        {
          title: '2. Check 3NF Inventory',
          description: 'Review capital equipment, Dell workstations, HP/Epson printers, and projectors in the inventory dashboard.',
          actionLabel: 'Go to Inventory',
          actionUrl: '/admin/inventory',
        },
        {
          title: '3. Plan Campus Route',
          description: 'Calculate the shortest walking path across campus buildings using our graph routing engine.',
          actionLabel: 'Campus Route',
          actionUrl: `/${role || 'student'}/route`,
        },
      ],
    };
  }, [location.pathname, role, user]);

  const currentStep = guide.steps[currentStepIndex] || guide.steps[0];
  const totalSteps = guide.steps.length;

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <aside aria-label="Panda Campus Guide" className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end select-none pointer-events-none">
      {/* Speech Bubble / Step Guide Modal */}
      {isOpen && (
        <div
          className={`pointer-events-auto mb-3 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl backdrop-blur-xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-200 transition-colors ${
            isGoldPink
              ? 'bg-white/95 border border-pink-200/90 shadow-2xl shadow-rose-900/15 text-slate-800 ring-1 ring-pink-100/80'
              : 'bg-slate-900/95 dark:bg-slate-950/95 border border-indigo-500/30 dark:border-indigo-400/20 shadow-2xl shadow-indigo-950/50 text-slate-100'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-start justify-between gap-2 pb-2.5 border-b ${
              isGoldPink ? 'border-pink-100' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-base shadow-md ${
                  isGoldPink
                    ? 'bg-gradient-to-tr from-amber-400 via-pink-400 to-rose-500 shadow-pink-400/30'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/25'
                }`}
              >
                🐼
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold tracking-tight ${
                      isGoldPink ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    Panda Guide
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                      isGoldPink
                        ? 'bg-pink-50 text-pink-700 border-pink-200'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    Step {currentStepIndex + 1} of {totalSteps}
                  </span>
                </div>
                <p
                  className={`text-[10px] font-medium truncate max-w-[190px] ${
                    isGoldPink ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {guide.pageTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentStepIndex(0)}
                title="Restart Steps"
                className={`p-1 rounded-lg transition-colors ${
                  isGoldPink
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-pink-50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Panda"
                className={`p-1 rounded-lg transition-colors ${
                  isGoldPink
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-pink-50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-1 my-3">
            {guide.steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? isGoldPink
                      ? 'w-7 bg-gradient-to-r from-pink-500 to-amber-500 shadow-sm shadow-pink-400/40'
                      : 'w-7 bg-indigo-500 shadow-sm shadow-indigo-500/50'
                    : idx < currentStepIndex
                    ? isGoldPink
                      ? 'w-3 bg-pink-300'
                      : 'w-3 bg-indigo-400/40'
                    : isGoldPink
                    ? 'w-3 bg-slate-200'
                    : 'w-3 bg-slate-800'
                }`}
                aria-label={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-1.5">
              <Sparkles
                className={`w-3.5 h-3.5 shrink-0 ${
                  isGoldPink ? 'text-pink-500' : 'text-indigo-400'
                }`}
              />
              <h4
                className={`text-xs font-bold leading-snug ${
                  isGoldPink ? 'text-slate-900' : 'text-white'
                }`}
              >
                {currentStep.title}
              </h4>
            </div>

            <p
              className={`text-xs leading-relaxed font-normal pl-5 ${
                isGoldPink ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              {currentStep.description}
            </p>

            {currentStep.actionHint && (
              <div
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg mt-2 font-medium border ${
                  isGoldPink
                    ? 'text-amber-900 bg-amber-50/90 border-amber-200/80'
                    : 'text-amber-300/90 bg-amber-500/10 border-amber-500/20'
                }`}
              >
                <Lightbulb
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isGoldPink ? 'text-amber-600' : 'text-amber-400'
                  }`}
                />
                <span>Tip: {currentStep.actionHint}</span>
              </div>
            )}

            {currentStep.actionUrl && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    navigate(currentStep.actionUrl!);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-white text-xs font-semibold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] ${
                    isGoldPink
                      ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 shadow-pink-500/25'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
                  }`}
                >
                  <span>{currentStep.actionLabel || 'Go to Page'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div
            className={`flex items-center justify-between pt-3 mt-2 border-t text-xs ${
              isGoldPink ? 'border-pink-100' : 'border-slate-800'
            }`}
          >
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                currentStepIndex === 0
                  ? isGoldPink
                    ? 'text-slate-300 cursor-not-allowed opacity-50'
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                  : isGoldPink
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <span
              className={`text-[10px] font-mono ${
                isGoldPink ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {currentStepIndex + 1}/{totalSteps}
            </span>

            {currentStepIndex < totalSteps - 1 ? (
              <button
                onClick={handleNext}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-white font-semibold transition-all shadow-md ${
                  isGoldPink
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-pink-600/25'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-white font-semibold transition-all shadow-md ${
                  isGoldPink
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Got it!</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Animated Panda Button */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Helper preview bubble when minimized */}
        {!isOpen && hasNewTip && (
          <div
            onClick={() => {
              setIsOpen(true);
              setHasNewTip(false);
            }}
            className={`cursor-pointer hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border shadow-lg transition-all hover:scale-105 animate-bounce duration-1000 ${
              isGoldPink
                ? 'bg-white/95 text-slate-800 border-pink-200/90 shadow-pink-900/10 hover:border-pink-300'
                : 'bg-slate-900/90 dark:bg-slate-950/90 text-white border-indigo-500/30 shadow-indigo-950/40 hover:border-indigo-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isGoldPink ? 'bg-pink-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isGoldPink ? 'bg-pink-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span
              className={`font-medium text-[11px] ${
                isGoldPink ? 'text-slate-800' : 'text-slate-100'
              }`}
            >
              Need help here? Click me! 🐼
            </span>
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen((prev) => !prev);
            setHasNewTip(false);
          }}
          aria-label="Toggle Panda Campus Guide"
          title={isOpen ? 'Close Panda Guide' : 'Open Page Steps Guide'}
          className={`group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 transition-all transform hover:-translate-y-1 active:translate-y-0 ${
            isGoldPink
              ? 'bg-gradient-to-tr from-white via-rose-50 to-amber-50 text-slate-800 border-pink-300 hover:border-amber-400 shadow-2xl shadow-pink-300/30 hover:shadow-pink-400/40'
              : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white border-indigo-500/40 hover:border-indigo-400 shadow-2xl shadow-indigo-900/50 hover:shadow-indigo-500/30'
          } ${isWaving ? 'scale-110' : ''}`}
        >
          {/* Glowing Aura Ring */}
          <span
            className={`absolute -inset-1 rounded-2xl blur-xs transition duration-300 -z-10 ${
              isGoldPink
                ? 'bg-gradient-to-r from-amber-400 via-rose-400 to-pink-500 opacity-40 group-hover:opacity-75'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 opacity-30 group-hover:opacity-60'
            }`}
          />

          {/* Custom Stylized Panda Face Illustration */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
            {/* Panda SVG Illustration */}
            <svg
              viewBox="0 0 100 100"
              className={`w-full h-full filter drop-shadow-md transition-transform duration-300 ${
                isWaving ? 'animate-wiggle' : 'group-hover:scale-105'
              }`}
            >
              {/* Ears */}
              <circle cx="24" cy="24" r="14" fill={isGoldPink ? '#3d332a' : '#1e293b'} />
              <circle cx="24" cy="24" r="7" fill={isGoldPink ? '#fbcfe8' : '#64748b'} />
              <circle cx="76" cy="24" r="14" fill={isGoldPink ? '#3d332a' : '#1e293b'} />
              <circle cx="76" cy="24" r="7" fill={isGoldPink ? '#fbcfe8' : '#64748b'} />

              {/* Head */}
              <circle
                cx="50"
                cy="54"
                r="38"
                fill="#ffffff"
                stroke={isGoldPink ? '#f472b6' : '#0f172a'}
                strokeWidth="2.5"
              />

              {/* Eye Patches */}
              <ellipse
                cx="36"
                cy="48"
                rx="10"
                ry="13"
                fill={isGoldPink ? '#3d332a' : '#1e293b'}
                transform="rotate(-15 36 48)"
              />
              <ellipse
                cx="64"
                cy="48"
                rx="10"
                ry="13"
                fill={isGoldPink ? '#3d332a' : '#1e293b'}
                transform="rotate(15 64 48)"
              />

              {/* Eyes */}
              <circle cx="37" cy="47" r="4.5" fill="#ffffff" />
              <circle cx="38" cy="46" r="2.5" fill="#0f172a" />
              <circle cx="63" cy="47" r="4.5" fill="#ffffff" />
              <circle cx="62" cy="46" r="2.5" fill="#0f172a" />

              {/* Cute Cheeks */}
              <circle
                cx="28"
                cy="59"
                r="4.5"
                fill={isGoldPink ? '#fb7185' : '#f472b6'}
                opacity={isGoldPink ? '0.85' : '0.6'}
              />
              <circle
                cx="72"
                cy="59"
                r="4.5"
                fill={isGoldPink ? '#fb7185' : '#f472b6'}
                opacity={isGoldPink ? '0.85' : '0.6'}
              />

              {/* Nose */}
              <polygon points="50,56 46,51 54,51" fill="#0f172a" />

              {/* Mouth */}
              <path
                d="M 44 60 Q 50 64 56 60"
                stroke="#0f172a"
                strokeWidth="2.5"
                fill="transparent"
                strokeLinecap="round"
              />

              {/* Head accessory: Golden Crown in Gold-Pink Mode, Academic Cap in Dark Mode */}
              {isGoldPink ? (
                <>
                  {/* Royal Gold Crown */}
                  <polygon
                    points="34,26 34,14 42,20 50,11 58,20 66,14 66,26"
                    fill="#f59e0b"
                    stroke="#d97706"
                    strokeWidth="1.5"
                  />
                  <line x1="34" y1="26" x2="66" y2="26" stroke="#b45309" strokeWidth="2" />
                  {/* Crown Jewels */}
                  <circle cx="50" cy="19" r="2.5" fill="#f43f5e" />
                  <circle cx="42" cy="22" r="1.5" fill="#fef08a" />
                  <circle cx="58" cy="22" r="1.5" fill="#fef08a" />
                  <circle cx="35" cy="15" r="1.5" fill="#fbbf24" />
                  <circle cx="65" cy="15" r="1.5" fill="#fbbf24" />
                </>
              ) : (
                <>
                  {/* Academic Graduation Cap */}
                  <path d="M 50 16 L 36 22 L 50 28 L 64 22 Z" fill="#6366f1" />
                  <line x1="50" y1="28" x2="50" y2="34" stroke="#6366f1" strokeWidth="2" />
                  <circle cx="64" cy="26" r="2.5" fill="#fbbf24" />
                </>
              )}
            </svg>
          </div>

          {/* Notification Dot */}
          <span
            className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-md ${
              isGoldPink
                ? 'bg-gradient-to-r from-amber-500 to-pink-500'
                : 'bg-gradient-to-r from-pink-500 to-rose-500'
            }`}
          >
            ?
          </span>
        </button>
      </div>
    </aside>
  );
};
