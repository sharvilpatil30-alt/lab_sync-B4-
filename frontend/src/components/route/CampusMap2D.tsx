import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CampusBuilding,
  CampusNode,
  CampusEdge,
} from '../../data/campusMapData';
import { CalculatedRoute, PositionOnPath, interpolatePositionOnRoute } from '../../services/routeEngine';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation2,
  User,
  MapPin,
  CheckCircle2,
  Compass,
} from 'lucide-react';

interface CampusMap2DProps {
  nodes: CampusNode[];
  edges: CampusEdge[];
  buildings: CampusBuilding[];
  route: CalculatedRoute | null;
  selectedDestinationNodeId?: string;
  onSelectNode: (nodeId: string) => void;
  isNavigating: boolean;
  navProgress: number; // 0.0 to 1.0
  onArrival?: () => void;
  className?: string;
}

export const CampusMap2D: React.FC<CampusMap2DProps> = ({
  route,
  nodes: campusNodes,
  edges: campusEdges,
  buildings: campusBuildings,
  selectedDestinationNodeId,
  onSelectNode,
  isNavigating,
  navProgress,
  onArrival,
  className = '',
}) => {
  // Map pan & zoom state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredBuilding, setHoveredBuilding] = useState<CampusBuilding | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate current student position along route
  const currentPosition: PositionOnPath = route
    ? interpolatePositionOnRoute(route.pathCoordinates, navProgress)
    : {
        x: campusNodes[0]?.x ?? 0,
        y: campusNodes[0]?.y ?? 0,
        bearing: 90,
        segmentIndex: 0,
        progressPercent: 0,
        isComplete: false,
      };

  // Trigger arrival callback when complete
  useEffect(() => {
    if (isNavigating && navProgress >= 1 && onArrival) {
      onArrival();
    }
  }, [isNavigating, navProgress, onArrival]);

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(2.5, s + 0.2));
  const handleZoomOut = () => setScale((s) => Math.max(0.65, s - 0.2));
  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterOnStudent = () => {
    if (!currentPosition) return;
    // Center point in 1150 x 780 viewBox
    const targetX = 575 - currentPosition.x;
    const targetY = 390 - currentPosition.y;
    setPan({ x: targetX * 0.7, y: targetY * 0.7 });
    setScale(1.3);
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // primary click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((s) => Math.max(0.65, Math.min(2.5, s + zoomFactor)));
  };

  // Touch pan & pinch handlers for mobile
  const touchStartRef = useRef<{ x: number; y: number; dist: number }>({ x: 0, y: 0, dist: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX - pan.x,
        y: touch.clientY - pan.y,
        dist: 0,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - touchStartRef.current.x,
        y: touch.clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / touchStartRef.current.dist;
      setScale((s) => Math.max(0.65, Math.min(2.5, s * (1 + (ratio - 1) * 0.1))));
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Check if an edge is part of calculated route
  const isEdgeInRoute = useCallback(
    (u: string, v: string): boolean => {
      if (!route || route.pathNodeIds.length < 2) return false;
      for (let i = 0; i < route.pathNodeIds.length - 1; i++) {
        const p1 = route.pathNodeIds[i];
        const p2 = route.pathNodeIds[i + 1];
        if ((p1 === u && p2 === v) || (p1 === v && p2 === u)) return true;
      }
      return false;
    },
    [route]
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[520px] sm:h-[620px] rounded-2xl border border-[#D9E2EC] bg-[#F8FAFC] overflow-hidden select-none shadow-xs text-left ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Map Control Toolbar (Floating Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-[#D9E2EC] shadow-md">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg text-[#163A63] hover:text-[#0B1F3A] hover:bg-[#EFF6FF] transition-colors"
          title="Zoom In (+)"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg text-[#163A63] hover:text-[#0B1F3A] hover:bg-[#EFF6FF] transition-colors"
          title="Zoom Out (-)"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px w-full bg-[#D9E2EC] my-0.5" />
        <button
          onClick={handleResetView}
          className="p-2 rounded-lg text-[#163A63] hover:text-[#0B1F3A] hover:bg-[#EFF6FF] transition-colors"
          title="Reset / Fit Map"
          aria-label="Fit map"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleCenterOnStudent}
          className="p-2 rounded-lg text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
          title="Center on My Position"
          aria-label="Center on student"
        >
          <Navigation2 className="w-4 h-4" />
        </button>
      </div>

      {/* Campus Map Legend & Mode Indicator (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-3 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#D9E2EC] shadow-xs text-xs text-[#163A63]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#15803D] border border-white shadow-2xs" />
          <span className="text-[11px] font-medium text-[#102A43]">Current Position</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#0B1F3A] border border-white shadow-2xs" />
          <span className="text-[11px] font-medium text-[#102A43]">Selected Destination</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-1.5 bg-[#2563EB] rounded" />
          <span className="text-[11px] font-medium text-[#102A43]">Active Route</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#627D98] text-[10px] pl-2 border-l border-[#D9E2EC]">
          <span>Drag to pan • Scroll to zoom</span>
        </div>
      </div>

      {/* Building Hover Details Card */}
      {hoveredBuilding && (
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-[#D9E2EC] shadow-lg max-w-xs animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              {hoveredBuilding.code}
            </span>
            <span className="text-xs font-bold text-[#0B1F3A] truncate">{hoveredBuilding.shortName}</span>
          </div>
          <p className="text-[11px] text-[#627D98] mt-1 line-clamp-2">{hoveredBuilding.name}</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#627D98] pt-1.5 border-t border-[#D9E2EC]">
            <span>{hoveredBuilding.department}</span>
            <span className="font-semibold text-[#2563EB]">Click to Navigate</span>
          </div>
        </div>
      )}

      {/* SVG Interactive Canvas */}
      <svg
        viewBox="0 0 1150 780"
        className="w-full h-full select-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.12s ease-out',
        }}
      >
        <defs>
          {/* Subtle Canvas Dot Pattern */}
          <pattern id="campusDots" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#D9E2EC" />
          </pattern>

          {/* Pathway Tile Pattern */}
          <pattern id="walkwayPattern" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 16 16 M 16 0 L 0 16" stroke="#E2E8F0" strokeWidth="0.75" />
          </pattern>

          {/* Route Glow Filter */}
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#2563EB" floodOpacity="0.4" />
          </filter>

          {/* Building Drop Shadow */}
          <filter id="buildingShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0B1F3A" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* 1. Base Ground Background */}
        <rect x="0" y="0" width="1150" height="780" fill="#F8FAFC" />
        <rect x="0" y="0" width="1150" height="780" fill="url(#campusDots)" opacity="0.6" />

        {/* 2. Landscaped Zones & Green Lawns */}
        {/* Central Science Quad Garden */}
        <rect x="330" y="320" width="160" height="90" rx="16" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1.5" />
        <text x="410" y="365" textAnchor="middle" fontSize="11" fontWeight="600" fill="#15803D" opacity="0.8">
          Central Science Quad
        </text>

        {/* North Botanical Lawn */}
        <rect x="180" y="60" width="140" height="40" rx="10" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
        <text x="250" y="84" textAnchor="middle" fontSize="9" fill="#166534">
          Botanical Garden
        </text>

        {/* Sports Arena Green */}
        <rect x="990" y="140" width="130" height="100" rx="14" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1.5" />
        <text x="1055" y="195" textAnchor="middle" fontSize="10" fontWeight="600" fill="#15803D">
          Sports Field & Track
        </text>

        {/* West Parking Bay */}
        <rect x="60" y="550" width="110" height="120" rx="10" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
        <text x="115" y="615" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748B">
          West Parking (P1)
        </text>

        {/* East Parking Bay */}
        <rect x="1000" y="350" width="110" height="120" rx="10" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
        <text x="1055" y="415" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748B">
          East Parking (P2)
        </text>

        {/* 3. Main Roads & Broad Avenues */}
        <path
          d="M 40 470 L 1110 470"
          stroke="#E2E8F0"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 40 470 L 1110 470"
          stroke="#CBD5E1"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
        {/* North-South Academic Connector */}
        <path
          d="M 380 180 L 380 660"
          stroke="#E2E8F0"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M 590 180 L 590 640"
          stroke="#E2E8F0"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* 4. Campus Graph Walkway Edges */}
        {campusEdges.map((edge, idx) => {
          const u = campusNodes.find((n) => n.id === edge.from);
          const v = campusNodes.find((n) => n.id === edge.to);
          if (!u || !v) return null;

          const isInActiveRoute = isEdgeInRoute(edge.from, edge.to);

          return (
            <line
              key={`edge-${idx}`}
              x1={u.x}
              y1={u.y}
              x2={v.x}
              y2={v.y}
              stroke={isInActiveRoute ? '#2563EB' : '#D9E2EC'}
              strokeWidth={isInActiveRoute ? 7 : 3}
              strokeDasharray={isInActiveRoute ? '8 4' : '3 3'}
              strokeLinecap="round"
              className={isInActiveRoute ? 'animate-pulse' : ''}
              filter={isInActiveRoute ? 'url(#routeGlow)' : undefined}
            />
          );
        })}

        {/* 5. Highlighted Active Route Polyline Overlay */}
        {route && route.pathCoordinates.length > 1 && (
          <g>
            {/* Glowing route backdrop */}
            <polyline
              points={route.pathCoordinates.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#2563EB"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.25"
            />
            {/* Foreground Solid Navy/Blue Active Route */}
            <polyline
              points={route.pathCoordinates.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#0B1F3A"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Moving Direction Dash overlay */}
            <polyline
              points={route.pathCoordinates.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#60A5FA"
              strokeWidth="2.5"
              strokeDasharray="6 8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* 6. Campus Buildings */}
        {campusBuildings.map((bld) => {
          const isSelected =
            bld.entranceNodeId === selectedDestinationNodeId ||
            (route && route.destinationNodeId === bld.entranceNodeId);
          const isHovered = hoveredBuilding?.id === bld.id;

          return (
            <g
              key={bld.id}
              onClick={() => onSelectNode(bld.entranceNodeId)}
              onMouseEnter={() => setHoveredBuilding(bld)}
              onMouseLeave={() => setHoveredBuilding(null)}
              className="cursor-pointer transition-all duration-150"
            >
              {/* Building Footprint with subtle elevation */}
              <rect
                x={bld.x}
                y={bld.y}
                width={bld.width}
                height={bld.height}
                rx={12}
                fill="#FFFFFF"
                stroke={isSelected ? '#0B1F3A' : isHovered ? '#2563EB' : '#D9E2EC'}
                strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                filter="url(#buildingShadow)"
              />

              {/* Building Header Strip */}
              <rect
                x={bld.x}
                y={bld.y}
                width={bld.width}
                height={26}
                rx={10}
                fill={isSelected ? '#0B1F3A' : isHovered ? '#EFF6FF' : '#F8FAFC'}
              />

              {/* Department Code Badge */}
              <text
                x={bld.x + 10}
                y={bld.y + 17}
                fontSize="10"
                fontWeight="700"
                fill={isSelected ? '#FFFFFF' : '#163A63'}
                letterSpacing="0.05em"
              >
                {bld.code}
              </text>

              {/* Building Short Name */}
              <text
                x={bld.x + bld.width / 2}
                y={bld.y + bld.height / 2 + 5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#0B1F3A"
                className="pointer-events-none"
              >
                {bld.shortName}
              </text>

              {/* Floor count tag */}
              <text
                x={bld.x + bld.width / 2}
                y={bld.y + bld.height / 2 + 20}
                textAnchor="middle"
                fontSize="9"
                fill="#627D98"
                className="pointer-events-none"
              >
                {bld.department}
              </text>

              {/* Entrance Door Icon indicator */}
              <circle
                cx={bld.x + bld.width / 2}
                y={bld.y + bld.height}
                r="4.5"
                fill={isSelected ? '#0B1F3A' : '#2563EB'}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </g>
          );
        })}

        {/* 7. Start Point Pin (Main Gate / Departure) */}
        {route && (
          <g transform={`translate(${route.pathCoordinates[0].x}, ${route.pathCoordinates[0].y})`}>
            {/* Halo Pulse */}
            <circle cx="0" cy="0" r="18" fill="rgba(21, 128, 61, 0.2)" className="animate-ping" />
            <circle cx="0" cy="0" r="12" fill="#15803D" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x="0" y="4" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#FFFFFF">
              IN
            </text>
            <rect x="-30" y="-28" width="60" height="18" rx="5" fill="#15803D" />
            <text x="0" y="-16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#FFFFFF">
              START
            </text>
          </g>
        )}

        {/* 8. Destination Point Pin */}
        {route && (
          <g
            transform={`translate(${
              route.pathCoordinates[route.pathCoordinates.length - 1].x
            }, ${route.pathCoordinates[route.pathCoordinates.length - 1].y})`}
          >
            {/* Ripple Pulse */}
            <circle cx="0" cy="0" r="22" fill="rgba(11, 31, 58, 0.2)" className="animate-ping" />
            <circle cx="0" cy="0" r="14" fill="#0B1F3A" stroke="#FFFFFF" strokeWidth="3" />
            <MapPin className="w-4 h-4 text-white" />
            <text x="0" y="4" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#FFFFFF">
              LAB
            </text>
            <rect x="-42" y="-32" width="84" height="20" rx="6" fill="#0B1F3A" stroke="#FFFFFF" strokeWidth="1" />
            <text x="0" y="-18" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#FFFFFF">
              DESTINATION
            </text>
          </g>
        )}

        {/* 9. Live Student / Person Marker */}
        {route && currentPosition && (
          <g
            transform={`translate(${currentPosition.x}, ${currentPosition.y})`}
            className="transition-transform duration-75"
          >
            {/* Outer animated radar pulse ring */}
            <circle
              cx="0"
              cy="0"
              r="26"
              fill="rgba(37, 99, 235, 0.18)"
              className="animate-ping"
              style={{ animationDuration: '2s' }}
            />

            {/* Directional Beacon Cone facing bearing */}
            <path
              d="M 0 0 L -12 -28 L 12 -28 Z"
              fill="rgba(37, 99, 235, 0.3)"
              transform={`rotate(${currentPosition.bearing})`}
            />

            {/* Outer Avatar Disc */}
            <circle
              cx="0"
              cy="0"
              r="16"
              fill="#2563EB"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              filter="url(#buildingShadow)"
            />

            {/* Inner Person Avatar Glyph */}
            <circle cx="0" cy="-4" r="4.5" fill="#FFFFFF" />
            <path d="M -7 9 C -7 3, 7 3, 7 9 Z" fill="#FFFFFF" />

            {/* "You Are Here" Label Pill */}
            <g transform="translate(0, 28)">
              <rect
                x="-42"
                y="-10"
                width="84"
                height="20"
                rx="6"
                fill="#0B1F3A"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#FFFFFF"
                letterSpacing="0.02em"
              >
                YOU ARE HERE
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};
