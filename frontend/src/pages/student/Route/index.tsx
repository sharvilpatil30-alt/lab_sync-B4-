import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useBooking, useLab, useAuth, useRouteAlgorithms } from '../../../hooks';
import {
  CampusMap2D,
  NavigationPanel,
  DeviceVerificationModal,
} from '../../../components/route';
import { Button, Breadcrumbs, ErrorMessage } from '../../../components/common';
import { useQuery } from '@tanstack/react-query';
import { routingService } from '../../../services';
import { validateGraph, toCampusMap, resolveCseNode, resolveLabNode } from '../../../services/cseRouting';
import { routeFromBackend } from '../../../services/routeEngine';
import { CampusLocationProvider, LocationMode } from '../../../services/locationProvider';

export const CampusRoutePage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePrefix = role === 'admin' ? '/admin' : role === 'faculty' ? '/faculty' : '/student';

  // Booking and Lab context if navigating from a booking or lab detail page
  const { data: booking, error: bookingError, isLoading: bookingLoading } = useBooking(bookingId);
  const paramLabId = searchParams.get('labId');
  const { data: directLab, error: labError, isLoading: labLoading } = useLab(paramLabId || undefined);
  const bookingLabId = typeof booking?.lab === 'string' ? booking.lab : booking?.lab?.id;
  const { data: bookingLab, error: bookingLabError, isLoading: bookingLabLoading } = useLab(bookingLabId || undefined);
  const graphQuery = useQuery({
    queryKey: ['cse-routing-graph'],
    queryFn: async () => validateGraph((await routingService.getNodes()).data),
    retry: false,
  });
  const graph = graphQuery.data;
  const map = useMemo(() => graph ? toCampusMap(graph) : { nodes: [], edges: [], buildings: [], labDestinationMap: {} }, [graph]);
  const { data: algorithms = [], error: algorithmError, refetch: refetchAlgorithms } = useRouteAlgorithms();
  const [algorithm, setAlgorithm] = useState('dijkstra');
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const queryDestination = searchParams.get('destination');
  useEffect(() => setSelectedDestination(null), [bookingId, paramLabId, queryDestination]);
  const startNodeId = graph?.startNodeId || '';
  const destinationNodeId = selectedDestination ?? (graph ? (
    queryDestination ? resolveCseNode(queryDestination, graph.nodes) :
    paramLabId ? resolveLabNode(directLab, graph.nodes) || resolveCseNode(paramLabId, graph.nodes) :
    bookingId ? resolveLabNode(booking?.lab, graph.nodes) || resolveLabNode(bookingLab, graph.nodes) : null
  ) : null) ?? '';
  const contextLoading = !selectedDestination && (paramLabId ? labLoading : bookingId ? bookingLoading || bookingLabLoading : false);
  const contextError = !selectedDestination && !destinationNodeId && !contextLoading
    ? (paramLabId ? labError : bookingId ? bookingError || bookingLabError : null) ||
      ((queryDestination || paramLabId || bookingId) && graph ? new Error('This destination is not mapped to a CSE lab. Select the correct lab from the list.') : null)
    : null;
  const routeQuery = useQuery({
    queryKey: ['cse-route', startNodeId, destinationNodeId, algorithm, graph],
    queryFn: async () => routeFromBackend((await routingService.computeRoute({ fromNodeId: startNodeId, toNodeId: destinationNodeId, algorithm })).data, graph!),
    enabled: !!graph && !!destinationNodeId && algorithms.includes(algorithm),
    retry: false,
  });
  const routeError = graphQuery.error || algorithmError || contextError || routeQuery.error;
  const route = routeError || routeQuery.isFetching ? null : routeQuery.data ?? null;

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

  useEffect(() => {
    setIsNavigating(false);
    setIsPaused(false);
    setNavProgress(0);
    setHasArrived(false);
    setIsVerificationModalOpen(false);
  }, [startNodeId, destinationNodeId, algorithm, routeQuery.isFetching]);

  // Initialize Location Provider
  useEffect(() => {
    locationProviderRef.current = new CampusLocationProvider((locState) => {
      setLocationMode(locState.mode);
      setLocationError(locState.error);
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
    setSelectedDestination(nodeId);
    setIsNavigating(false);
    setIsPaused(false);
    setNavProgress(0);
    setHasArrived(false);
  };

  const handleStartNavigationClick = () => {
    // Open Secure Device Verification before beginning route
    if (route) setIsVerificationModalOpen(true);
  };

  const handleVerificationComplete = () => {
    setIsVerificationModalOpen(false);
    setNavProgress(0);
    setHasArrived(false);
    setIsPaused(false);
    if (route) setIsNavigating(true);
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
      setLocationError(null);
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
              if (graphQuery.error) void graphQuery.refetch();
              else if (algorithmError) void refetchAlgorithms();
              else if (destinationNodeId) void routeQuery.refetch();
            }}
            disabled={routeQuery.isFetching || graphQuery.isFetching}
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

      {routeError && <ErrorMessage title="Route unavailable" message={routeError.message} />}
      {locationError && <ErrorMessage title="Location unavailable" message={locationError} />}
      {(graphQuery.isLoading || contextLoading || routeQuery.isFetching) && (
        <p role="status" className="text-xs text-[#627D98]">Loading CSE routing data…</p>
      )}

      {/* Main Navigation Workspace: 2D Campus Map & Floating/Side Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Interactive 2D Campus Vector Map */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <CampusMap2D
            nodes={map.nodes}
            edges={map.edges}
            buildings={map.buildings}
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
                Campus Node Graph: <strong className="text-[#0B1F3A]">{map.nodes.length} Waypoints</strong> •{' '}
                <strong className="text-[#0B1F3A]">{map.buildings.length} Facilities</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <label className="font-mono text-[#163A63] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                Engine:{' '}
                <select aria-label="Routing algorithm" value={algorithm} onChange={e => setAlgorithm(e.target.value)} className="bg-transparent" disabled={!algorithms.length}>
                  {algorithms.map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT: Floating Navigation & Destination Control Panel */}
        <div className="lg:col-span-4">
          <NavigationPanel
            buildings={map.buildings}
            labs={map.labDestinationMap}
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
