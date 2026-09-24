import React, { useState } from 'react';
import { RouteNode, RouteEdge } from '../../types';
import { Navigation, MapPin, Compass } from 'lucide-react';

interface RouteTopologyProps {
  nodes: RouteNode[];
  edges: RouteEdge[];
  activePath: string[]; // array of node IDs
  sourceNodeId?: string;
  destinationNodeId?: string;
  className?: string;
}

export const RouteTopology: React.FC<RouteTopologyProps> = ({
  nodes,
  edges,
  activePath = [],
  sourceNodeId,
  destinationNodeId,
  className = '',
}) => {
  const [hoveredNode, setHoveredNode] = useState<RouteNode | null>(null);

  // Check if an edge is in the active path
  const isEdgeInPath = (edge: RouteEdge): boolean => {
    if (activePath.length < 2) return false;
    for (let i = 0; i < activePath.length - 1; i++) {
      const u = activePath[i];
      const v = activePath[i + 1];
      if ((edge.from === u && edge.to === v) || (edge.from === v && edge.to === u)) {
        return true;
      }
    }
    return false;
  };

  // Build node lookup map
  const nodeMap = new Map<string, RouteNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  return (
    <div className={`relative w-full rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-2xl flex flex-col ${className}`}>
      {/* Topology Header Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
        <Compass className="w-4 h-4 text-indigo-400 animate-spin-slow" />
        <span className="font-semibold text-white">Campus Wayfinding Graph</span>
        <span className="text-[10px] text-slate-400">({nodes.length} nodes • {edges.length} corridors)</span>
      </div>

      {hoveredNode && (
        <div className="absolute top-4 right-4 z-10 bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-indigo-500/30 text-xs shadow-xl animate-in fade-in">
          <p className="font-bold text-indigo-300">{hoveredNode.name}</p>
          <p className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
            Type: {hoveredNode.type || 'Building'}
          </p>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="w-full h-80 sm:h-96 flex items-center justify-center p-2">
        <svg
          viewBox="50 150 800 520"
          className="w-full h-full select-none"
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="campusGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
            </pattern>
            {/* Glow Filter for Active Path */}
            <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="1000" height="700" fill="url(#campusGrid)" />

          {/* Normal Inactive Edges */}
          {edges.map((edge, idx) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const isHighlighted = isEdgeInPath(edge);

            return (
              <line
                key={`edge-${idx}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isHighlighted ? '#6366f1' : '#334155'}
                strokeWidth={isHighlighted ? 4 : 2}
                strokeDasharray={isHighlighted ? '6 4' : undefined}
                className={isHighlighted ? 'animate-pulse' : ''}
                filter={isHighlighted ? 'url(#pathGlow)' : undefined}
              />
            );
          })}

          {/* Edge distance labels */}
          {edges.map((edge, idx) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;

            return (
              <text
                key={`dist-${idx}`}
                x={midX}
                y={midY - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                className="font-mono pointer-events-none select-none"
              >
                {edge.weight}m
              </text>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isStart = node.id === sourceNodeId || node.id === activePath[0];
            const isEnd =
              node.id === destinationNodeId || node.id === activePath[activePath.length - 1];
            const isInPath = activePath.includes(node.id);

            let fillColor = '#1e293b';
            let strokeColor = '#475569';
            let radius = 14;

            if (isStart) {
              fillColor = '#10b981';
              strokeColor = '#059669';
              radius = 18;
            } else if (isEnd) {
              fillColor = '#6366f1';
              strokeColor = '#4f46e5';
              radius = 20;
            } else if (isInPath) {
              fillColor = '#4f46e5';
              strokeColor = '#818cf8';
              radius = 16;
            }

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Halo pulse for start and destination */}
                {(isStart || isEnd) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 8}
                    fill={isStart ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.25)'}
                    className="animate-ping origin-center"
                    style={{ animationDuration: '3s' }}
                  />
                )}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="3"
                />

                {/* Node icon label inside */}
                {isStart ? (
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#ffffff"
                    pointerEvents="none"
                  >
                    START
                  </text>
                ) : isEnd ? (
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#ffffff"
                    pointerEvents="none"
                  >
                    LAB
                  </text>
                ) : (
                  <circle cx={node.x} cy={node.y} r="3" fill="#94a3b8" />
                )}

                {/* Name label beneath node */}
                <text
                  x={node.x}
                  y={node.y + radius + 15}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isInPath ? '600' : '400'}
                  fill={isInPath ? '#e0e7ff' : '#94a3b8'}
                  className="pointer-events-none"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Departure / Entrance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            <span>Booked Destination</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-indigo-500 rounded" />
            <span>Optimal Shortest Path</span>
          </div>
        </div>
        <span className="text-slate-500 italic">Dijkstra Shortest Path Engine</span>
      </div>
    </div>
  );
};
