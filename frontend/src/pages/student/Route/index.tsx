import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useBooking, useLab, useAuth, useComputeRoute } from '../../../hooks';
import {
  CampusMap2D,
  NavigationPanel,
  DeviceVerificationModal,
} from '../../../components/route';
import { Button, Breadcrumbs } from '../../../components/common';
import {
  campusNodes,
  campusBuildings,
  labDestinationMap,
} from '../../../data/campusMapData';
import {
  CalculatedRoute,
  calculateCampusRoute,
} from '../../../services/routeEngine';
import { CampusLocationProvider, LocationMode } from '../../../services/locationProvider';

export const CampusRoutePage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  // Booking and Lab context if navigating from a booking or lab detail page
  const { data: booking } = useBooking(bookingId);
  const paramLabId = searchParams.get('labId');
  const { data: directLab } = useLab(paramLabId || undefined);

  // Determine initial destination node
  const getInitialDestinationNodeId = useCallback((): string => {
    // 1. From URL query param destination
    const queryDest = searchParams.get('destination');
    if (queryDest && campusNodes.some((n) => n.id === queryDest)) {
      return queryDest;
    }

    // 2. From URL query param labId
    if (paramLabId && labDestinationMap[paramLabId]) {
      return labDestinationMap[paramLabId].nodeId;
    }

    // 3. From booking if present
    if (booking) {
      const bLabId =
        typeof booking.lab === 'object' && booking.lab !== null
          ? (booking.lab as any).id
          : booking.lab;
      if (bLabId && labDestinationMap[bLabId]) {
        return labDestinationMap[bLabId].nodeId;
      }
    }

    // 4. Default: Alan Turing Hall (CSE Department / Systems Lab)
    return 'node_turing';
  }, [booking, paramLabId, searchParams]);

  // Start node (Departure): Main Gate by default, or nearest node if GPS used
  const [startNodeId, setStartNodeId] = useState<string>('node_gate');
  const [destinationNodeId, setDestinationNodeId] = useState<string>(getInitialDestinationNodeId);

  // Active calculated route state
  const [route, setRoute] = useState<CalculatedRoute | null>(null);

  // Navigation simulation & live tracking states
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [navProgress, setNavProgress] = useState(0); // 0.0 to 1.0
  const [navSpeed, setNavSpeed] = useState(1); // 1x, 2x, 4x
  const [hasArrived, setHasArrived] = useState(false);

  // Secure Device Verification Modal state
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Location Provider state
  const locationProviderRef = useRef<CampusLocationProvider | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>('demo-simulated');

  // Animation frame ref for continuous 60fps movement
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Update initial destination when booking or query parameters load
  useEffect(() => {
    const dest = getInitialDestinationNodeId();
    if (dest) {
      setDestinationNodeId(dest);
    }
  }, [getInitialDestinationNodeId]);

  const computeRouteMutation = useComputeRoute();

  // Recalculate route whenever start or destination changes
  useEffect(() => {
    let isCancelled = false;
    if (startNodeId && destinationNodeId) {
      const calculated = calculateCampusRoute(startNodeId, destinationNodeId);
      if (!isCancelled) {
        setRoute(calculated);
        setNavProgress(0);
        setHasArrived(false);
      }

      // Concurrently verify with real backend routing API: POST /api/v1/routes/compute
      computeRouteMutation
        .mutateAsync({
          fromNodeId: startNodeId,
          toNodeId: destinationNodeId,
          algorithm: 'dijkstra',
        })
        .then((backendRes) => {
          if (!isCancelled && backendRes?.path && calculated) {
            setRoute({
              ...calculated,
              pathNodeIds: backendRes.path,
              totalDistanceMeters: backendRes.distance || calculated.totalDistanceMeters,
            });
          }
        })
        .catch(() => {
          // Silently retain calculated campus topology route if backend endpoint is in progress
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [startNodeId, destinationNodeId]);

  // Initialize Location Provider
  useEffect(() => {
    locationProviderRef.current = new CampusLocationProvider((locState) => {
      setLocationMode(locState.mode);
      if (locState.mode === 'real-gps' && locState.nearestNodeId) {
        setStartNodeId(locState.nearestNodeId);
      }
    });

    return () => {
      if (locationProviderRef.current) {
        locationProviderRef.current.stopWatching();
      }
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Continuous movement loop using requestAnimationFrame
  useEffect(() => {
    if (!isNavigating || isPaused || !route) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const deltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Real walking duration for this route in seconds: distance / 1.4 m/s (approx 5 km/h)
      const baseDurationSec = Math.max(10, route.totalDistanceMeters / 1.4);
      // For a comfortable interactive simulation, scale so full route takes ~18 seconds at 1x speed
      const adjustedDurationSec = Math.min(25, Math.max(12, baseDurationSec * 0.15)) / navSpeed;

      const progressIncrement = deltaMs / 1000 / adjustedDurationSec;

      setNavProgress((prev) => {
        const next = prev + progressIncrement;
        if (next >= 1) {
          setIsNavigating(false);
          setHasArrived(true);
          return 1;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isNavigating, isPaused, route, navSpeed]);

  // User actions
  const handleSelectDestination = (nodeId: string) => {
    setDestinationNodeId(nodeId);
    setIsNavigating(false);
    setIsPaused(false);
    setNavProgress(0);
    setHasArrived(false);
  };

  const handleStartNavigationClick = () => {
    // Open Secure Device Verification before beginning route
    setIsVerificationModalOpen(true);
  };

  const handleVerificationComplete = () => {
    setIsVerificationModalOpen(false);
    setNavProgress(0);
    setHasArrived(false);
    setIsPaused(false);
    setIsNavigating(true);
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setIsPaused(false);
    setNavProgress(0);
  };

  const handlePauseResume = () => {
    setIsPaused((p) => !p);
  };

  const handleToggleLocationMode = async () => {
    if (locationMode === 'demo-simulated') {
      if (locationProviderRef.current) {
        await locationProviderRef.current.requestRealLocation();
      }
    } else {
      if (locationProviderRef.current) {
        locationProviderRef.current.setMode('demo-simulated');
      }
      setLocationMode('demo-simulated');
      setStartNodeId('node_gate');
    }
  };

  // Label for current context
  const contextName = booking
    ? `Booking #${booking.bookingId}`
    : directLab
    ? directLab.name
    : route?.destinationName || 'Campus Destination';

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      {/* Top Breadcrumbs & Page Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              {
                label: booking ? 'Bookings' : 'Facilities',
                href: `${basePrefix}/${booking ? 'bookings' : 'labs'}`,
              },
              ...(booking
                ? [{ label: booking.bookingId, href: `${basePrefix}/bookings/${bookingId}` }]
                : directLab
                ? [{ label: directLab.name, href: `${basePrefix}/labs/${paramLabId}` }]
                : []),
              { label: 'Campus Route & 2D Map' },
            ]}
          />
          <h1 className="text-2xl font-extrabold text-[#0B1F3A] tracking-tight mt-1 flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#2563EB]" />
            <span>Campus Navigation & Route Path</span>
          </h1>
          <p className="text-xs text-[#627D98] mt-0.5">
            Interactive 2D topological wayfinding to {contextName} across Rajarambapu Institute of Technology
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (startNodeId && destinationNodeId) {
                const calculated = calculateCampusRoute(startNodeId, destinationNodeId);
                setRoute(calculated);
                setNavProgress(0);
                setHasArrived(false);
              }
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-[#2563EB]" />}
            className="text-xs"
          >
            Recalculate Route
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (booking) navigate(`${basePrefix}/bookings/${bookingId}`);
              else if (paramLabId) navigate(`${basePrefix}/labs/${paramLabId}`);
              else navigate(`${basePrefix}/labs`);
            }}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {booking ? 'Back to Booking' : 'Back to Labs'}
          </Button>
        </div>
      </div>

      {/* Main Navigation Workspace: 2D Campus Map & Floating/Side Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Interactive 2D Campus Vector Map */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <CampusMap2D
            route={route}
            selectedDestinationNodeId={destinationNodeId}
            onSelectNode={handleSelectDestination}
            isNavigating={isNavigating}
            navProgress={navProgress}
            onArrival={() => {
              setIsNavigating(false);
              setHasArrived(true);
            }}
          />

          {/* Quick Guidance Info Strip Below Map */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-[#D9E2EC] text-xs text-[#627D98] shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <span>
                Campus Node Graph: <strong className="text-[#0B1F3A]">{campusNodes.length} Waypoints</strong> •{' '}
                <strong className="text-[#0B1F3A]">{campusBuildings.length} Facilities</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-mono text-[#163A63] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                Engine: A* Shortest Walkway
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Floating Navigation & Destination Control Panel */}
        <div className="lg:col-span-4">
          <NavigationPanel
            route={route}
            selectedDestinationNodeId={destinationNodeId}
            onSelectDestination={handleSelectDestination}
            isNavigating={isNavigating}
            navProgress={navProgress}
            onStartNavigation={handleStartNavigationClick}
            onStopNavigation={handleStopNavigation}
            onPauseResumeNavigation={handlePauseResume}
            isPaused={isPaused}
            navSpeed={navSpeed}
            onSetNavSpeed={setNavSpeed}
            locationMode={locationMode}
            onToggleLocationMode={handleToggleLocationMode}
            hasArrived={hasArrived}
            onResetArrival={() => setHasArrived(false)}
          />
        </div>
      </div>

      {/* Secure Device Verification Modal */}
      <DeviceVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onVerified={handleVerificationComplete}
        destinationName={route?.destinationName || 'Selected Laboratory'}
      />
    </div>
  );
};
