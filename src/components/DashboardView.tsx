/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckSquare, CalendarDays, FileText, Link2, Folder, 
  Clock, ArrowUpRight, TrendingUp, Sparkles, BookOpen, Plus
} from 'lucide-react';
import { WorkspaceState, WorkspaceItem } from '../types';
import { findItemById } from '../utils';

function getStableValue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 1000) / 1000;
}

interface DashboardViewProps {
  state: WorkspaceState;
  setState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  onSelectItem: (id: string) => void;
  setActiveView: (view: any) => void;
  activeItemId?: string | null;
  pushToast: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'alert') => void;
  theme?: 'light' | 'dark';
}

export function DashboardView({ state, setState, onSelectItem, setActiveView, activeItemId, pushToast, theme = 'dark' }: DashboardViewProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 340 });

  // Custom node positioning overrides with persistence across view switches
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem('dragged_node_positions');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Track dragging processes and timings for smart mobile touch-hold and quick mouse drags
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStartCoords, setDragStartCoords] = useState<{ x: number; y: number } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [isTouchHolding, setIsTouchHolding] = useState(false);
  const touchHoldTimerRef = useRef<any>(null);

  // Auto clean-up drag timers on unmount
  useEffect(() => {
    return () => {
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
      }
    };
  }, []);

  // Update dragged node position from raw page cursor coordinates scaling to current SVG viewBox size
  const updateDragPosition = (clientX: number, clientY: number, activeId: string) => {
    if (!activeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;

    let svgX = (clientX - rect.left) * scaleX;
    let svgY = (clientY - rect.top) * scaleY;

    // Outer safe dynamic boundary margins matching the map constraints
    const isMobile = dimensions.width < 500;
    const paddingX = isMobile ? 50 : 68;
    const paddingY = isMobile ? 45 : 55;

    svgX = Math.max(paddingX, Math.min(dimensions.width - paddingX, svgX));
    svgY = Math.max(paddingY, Math.min(dimensions.height - paddingY, svgY));

    setCustomPositions(prev => {
      const updated = {
        ...prev,
        [activeId]: { x: svgX, y: svgY }
      };
      try {
        localStorage.setItem('dragged_node_positions', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to persist custom node position', err);
      }
      return updated;
    });
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    // Only drag with left mouse button click
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    setDragStartCoords({ x: e.clientX, y: e.clientY });
    setHasMoved(false);
    setIsTouchHolding(false);
  };

  const handleTouchStart = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
    }

    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    setDragStartCoords({ x: clientX, y: clientY });
    setHasMoved(false);
    setIsTouchHolding(false);

    // Setup 250ms hold requirement on mobile before initiating drag behavior
    touchHoldTimerRef.current = setTimeout(() => {
      setIsTouchHolding(true);
      setDraggedNodeId(nodeId);
      // Give fine tactile vibration pulse if supported on high-end smartphone browsers
      if (navigator.vibrate) {
        try {
          navigator.vibrate(35);
        } catch (_) {}
      }
    }, 250);
  };

  // Wire up document-level pointer events keeping drags fluid even when user slips slightly off-node bounds
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggedNodeId) return;

      if (dragStartCoords) {
        const dx = e.clientX - dragStartCoords.x;
        const dy = e.clientY - dragStartCoords.y;
        if (Math.sqrt(dx * dx + dy * dy) > 3) {
          setHasMoved(true);
        }
      }

      updateDragPosition(e.clientX, e.clientY, draggedNodeId);
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!draggedNodeId) return;

      // If they released without moving, fire onSelectItem as a standard click
      if (!hasMoved) {
        onSelectItem(draggedNodeId);
      }

      setDraggedNodeId(null);
      setDragStartCoords(null);
      setHasMoved(false);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (touchHoldTimerRef.current && dragStartCoords) {
        const touch = e.touches[0];
        const dx = touch.clientX - dragStartCoords.x;
        const dy = touch.clientY - dragStartCoords.y;

        // If finger swiped significantly prior to trigger time, abort touch-hold to preserve standard viewport scrolling
        if (!isTouchHolding && Math.sqrt(dx * dx + dy * dy) > 8) {
          clearTimeout(touchHoldTimerRef.current);
          touchHoldTimerRef.current = null;
        }
      }

      if (!draggedNodeId || !isTouchHolding) return;

      // In touch holding state, we lock standard browser viewport elastic scroll
      if (e.cancelable) {
        e.preventDefault();
      }
      setHasMoved(true);

      const touch = e.touches[0];
      updateDragPosition(touch.clientX, touch.clientY, draggedNodeId);
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = null;
      }

      if (draggedNodeId) {
        if (!hasMoved) {
          onSelectItem(draggedNodeId);
        }
        setDraggedNodeId(null);
        setDragStartCoords(null);
        setHasMoved(false);
        setIsTouchHolding(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [draggedNodeId, dragStartCoords, hasMoved, isTouchHolding, dimensions]);

  // Events tab selection state: 'all' | 'today' | 'tomorrow'
  const [eventTab, setEventTab] = useState<'all' | 'today' | 'tomorrow'>('all');
  
  // Quick event adding states
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState('12:00');

  const dashboardFilteredMeetings = useMemo(() => {
    return state.meetings.filter(m => {
      if (eventTab === 'today') return m.date === '2026-06-05';
      if (eventTab === 'tomorrow') return m.date === '2026-06-06';
      return true; // 'all'
    }).sort((a, b) => {
      const dateA = `${a.date}T${a.time}`;
      const dateB = `${b.date}T${b.time}`;
      return dateA.localeCompare(dateB);
    });
  }, [state.meetings, eventTab]);

  const handleQuickAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    // Default dates based on tab preference or today
    const dateSelected = eventTab === 'tomorrow' ? '2026-06-06' : '2026-06-05';

    const newMeeting = {
      id: `meeting-${Math.random().toString(36).substr(2, 5)}-${Date.now().toString(36)}`,
      type: 'meeting' as const,
      title: quickTitle,
      description: 'Quick scheduled event from overview.',
      date: dateSelected,
      time: quickTime,
      duration: 30,
      labelIds: [],
      linkedIds: [],
      createdAt: '2026-06-05'
    };

    setState(prev => ({
      ...prev,
      meetings: [newMeeting, ...prev.meetings],
      notifications: [
        {
          id: `notif-${Math.random().toString(36).substr(2, 5)}`,
          title: 'Meeting Scheduled',
          message: `Quick scheduled "${quickTitle}" successfully for ${dateSelected} at ${quickTime}.`,
          type: 'success',
          read: false,
          timestamp: quickTime,
          actionItemId: newMeeting.id
        },
        ...(prev.notifications || [])
      ]
    }));

    pushToast('Event Scheduled', `"${quickTitle}" scheduled for ${dateSelected} at ${quickTime}`, 'success');

    // Reset fields
    setQuickTitle('');
    setIsQuickAdding(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initial content size estimation
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height });
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Statistics calculation helpers
  const stats = useMemo(() => {
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.status === 'done').length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalNotes = state.notes.length;
    const totalMeetings = state.meetings.length;

    // Link ratio: percentage of items containing at least 1 relationship mapping link
    const totalItems = totalTasks + totalNotes + totalMeetings;
    const linkedItems = [
      ...state.tasks,
      ...state.meetings,
      ...state.notes
    ].filter(i => i.linkedIds && i.linkedIds.length > 0).length;

    const linkRatio = totalItems > 0 ? Math.round((linkedItems / totalItems) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate,
      totalNotes,
      totalMeetings,
      totalItems,
      linkRatio
    };
  }, [state]);

  // Unified items list for the visual workspace layout
  const allCoreItems = useMemo(() => {
    const list: { id: string; title: string; type: 'task' | 'meeting' | 'note'; linkedIds: string[]; folderColor?: string }[] = [];
    
    state.tasks.slice(0, 5).forEach(t => {
      const folder = state.folders.find(f => f.id === t.folderId);
      list.push({ id: t.id, title: t.title, type: 'task', linkedIds: t.linkedIds, folderColor: folder?.color });
    });

    state.meetings.slice(0, 4).forEach(m => {
      const folder = state.folders.find(f => f.id === m.folderId);
      list.push({ id: m.id, title: m.title, type: 'meeting', linkedIds: m.linkedIds, folderColor: folder?.color });
    });

    state.notes.slice(0, 4).forEach(n => {
      const folder = state.folders.find(f => f.id === n.folderId);
      list.push({ id: n.id, title: n.title, type: 'note', linkedIds: n.linkedIds, folderColor: folder?.color });
    });

    return list;
  }, [state]);

  // Construct coordinates for drawing a neat orbital nodes graphics tree in the central visual box
  const graphNodes = useMemo(() => {
    const isMobile = dimensions.width < 500;
    const centerX = dimensions.width / 2;
    // Lower center slightly on mobile to accommodate labels
    const centerY = (dimensions.height / 2) - (isMobile ? 12 : 5);

    // Dynamic radius with conservative margins to ensure circles and label boxes never overflow
    const paddingX = isMobile ? 50 : 68;
    const paddingY = isMobile ? 45 : 55;

    const minX = paddingX;
    const maxX = dimensions.width - paddingX;
    const minY = paddingY;
    const maxY = dimensions.height - paddingY;

    const radiusX = Math.max(50, (dimensions.width / 2) - paddingX);
    const radiusY = Math.max(40, (dimensions.height / 2) - paddingY);

    const tasks = allCoreItems.filter(item => item.type === 'task');
    const meetings = allCoreItems.filter(item => item.type === 'meeting');
    const notes = allCoreItems.filter(item => item.type === 'note');

    const taskCount = tasks.length;
    const meetingCount = meetings.length;
    const noteCount = notes.length;

    // 1. Initial smart categorized positioning
    const nodes = allCoreItems.map((item) => {
      const hasCustom = customPositions[item.id];
      if (hasCustom) {
        return {
          ...item,
          x: hasCustom.x,
          y: hasCustom.y,
          isLocked: true
        };
      }

      // Compute smart grouped coordinate clusters based on responsive layout structure
      let targetX = centerX;
      let targetY = centerY;
      const spreadRadius = isMobile ? 32 : 55;

      if (item.type === 'task') {
        const itemIndex = tasks.findIndex(t => t.id === item.id);
        const subAngle = taskCount > 0 ? (itemIndex / taskCount) * 2 * Math.PI : 0;
        if (isMobile) {
          // Top cluster for tasks
          targetX = dimensions.width * 0.5 + spreadRadius * 1.2 * Math.cos(subAngle);
          targetY = dimensions.height * 0.22 + spreadRadius * 0.5 * Math.sin(subAngle);
        } else {
          // Left cluster for tasks
          targetX = dimensions.width * 0.22 + spreadRadius * Math.cos(subAngle);
          targetY = dimensions.height * 0.5 + spreadRadius * Math.sin(subAngle);
        }
      } else if (item.type === 'meeting') {
        const itemIndex = meetings.findIndex(m => m.id === item.id);
        const subAngle = meetingCount > 0 ? (itemIndex / meetingCount) * 2 * Math.PI : 0;
        if (isMobile) {
          // Central cluster for events/meetings
          targetX = dimensions.width * 0.5 + spreadRadius * 1.2 * Math.cos(subAngle);
          targetY = dimensions.height * 0.5 + spreadRadius * 0.5 * Math.sin(subAngle);
        } else {
          // Center cluster for events/meetings
          targetX = dimensions.width * 0.50 + spreadRadius * Math.cos(subAngle);
          targetY = dimensions.height * 0.45 + spreadRadius * Math.sin(subAngle);
        }
      } else {
        const itemIndex = notes.findIndex(n => n.id === item.id);
        const subAngle = noteCount > 0 ? (itemIndex / noteCount) * 2 * Math.PI : 0;
        if (isMobile) {
          // Bottom cluster for notes
          targetX = dimensions.width * 0.5 + spreadRadius * 1.2 * Math.cos(subAngle);
          targetY = dimensions.height * 0.78 + spreadRadius * 0.5 * Math.sin(subAngle);
        } else {
          // Right cluster for notes
          targetX = dimensions.width * 0.78 + spreadRadius * Math.cos(subAngle);
          targetY = dimensions.height * 0.5 + spreadRadius * Math.sin(subAngle);
        }
      }

      return {
        ...item,
        x: targetX,
        y: targetY,
        isLocked: false
      };
    });

    // 2. Perform spring-like repulsion relaxation algorithm to prevent node overlaps
    // Moderated to be realistic so nodes are not forced outward to squash onto border edges.
    const minSeparationX = isMobile ? 72 : 92;
    const minSeparationY = isMobile ? 38 : 46;

    const iterations = 100;
    for (let step = 0; step < iterations; step++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];

          let dx = nodeA.x - nodeB.x;
          let dy = nodeA.y - nodeB.y;

          if (dx === 0 && dy === 0) {
            dx = 1;
            dy = 1;
          }

          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Force separation if they overlap both bounds
          if (absDx < minSeparationX && absDy < minSeparationY) {
            const overlapX = minSeparationX - absDx;
            const overlapY = minSeparationY - absDy;

            // Repel proportional to the overlap severity
            const forceX = (overlapX / minSeparationX) * 1.5;
            const forceY = (overlapY / minSeparationY) * 1.2;

            const dirX = dx >= 0 ? 1 : -1;
            const dirY = dy >= 0 ? 1 : -1;

            const moveX = (forceX * dirX) / 2;
            const moveY = (forceY * dirY) / 2;

            if (!nodeA.isLocked) {
              nodeA.x += moveX;
              nodeA.y += moveY;
            }
            if (!nodeB.isLocked) {
              nodeB.x -= moveX;
              nodeB.y -= moveY;
            }
          }
        }
      }

      // Constrain points within safe coordinate boundaries
      nodes.forEach(node => {
        if (!node.isLocked) {
          node.x = Math.max(minX, Math.min(maxX, node.x));
          node.y = Math.max(minY, Math.min(maxY, node.y));
        }
      });
    }

    return nodes;
  }, [allCoreItems, dimensions, customPositions]);

  // Grab active connections from state
  const graphConnections = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; id1: string; id2: string; active: boolean }[] = [];
    const processed = new Set<string>();

    graphNodes.forEach(node => {
      node.linkedIds.forEach(linkedId => {
        const targetNode = graphNodes.find(n => n.id === linkedId);
        if (targetNode) {
          const pairKey = [node.id, targetNode.id].sort().join('-');
          if (!processed.has(pairKey)) {
            processed.add(pairKey);
            const isHovered = hoveredNodeId === node.id || hoveredNodeId === targetNode.id || activeItemId === node.id || activeItemId === targetNode.id;
            lines.push({
              x1: node.x,
              y1: node.y,
              x2: targetNode.x,
              y2: targetNode.y,
              id1: node.id,
              id2: targetNode.id,
              active: isHovered
            });
          }
        }
      });
    });

    return lines;
  }, [graphNodes, hoveredNodeId, activeItemId]);

  return (
    <div id="dashboard-view" className="space-y-7 pb-10">

      {/* Bento Grid Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4.5 space-y-3 relative group hover:border-white/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Linked Items</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-white">{stats.linkRatio}%</h3>
            <p className="text-slate-400 text-[10px] sm:text-xs">Database records linked.</p>
          </div>
        </div>

        <button 
          onClick={() => setActiveView('tasks')}
          className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4.5 space-y-3 relative text-left group hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tasks Completion</span>
            <CheckSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-white">{stats.completionRate}%</h3>
            <p className="text-slate-400 text-[10px] sm:text-xs">{stats.pendingTasks} tasks remaining.</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveView('meetings')}
          className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4.5 space-y-3 relative text-left group hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Events</span>
            <CalendarDays className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-white">{stats.totalMeetings}</h3>
            <p className="text-slate-400 text-[10px] sm:text-xs">Scheduled events.</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveView('notes')}
          className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4.5 space-y-3 relative text-left group hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Notes</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-white">{stats.totalNotes}</h3>
            <p className="text-slate-400 text-[10px] sm:text-xs">Notes.</p>
          </div>
        </button>

      </div>

      {/* GRAPHICAL GRAPH CENTER - HIGHLIGHT COMPLEX VISUAL LINK RELATIONSHIP MAP */}
      <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-6 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400 animate-pulse" />
              Workspace Link Map
            </span>
            <div className="flex items-center gap-2">
              {Object.keys(customPositions).length > 0 && (
                <button
                  onClick={() => {
                    setCustomPositions({});
                    try {
                      localStorage.removeItem('dragged_node_positions');
                    } catch (_) {}
                    pushToast('Rearranged Successfully', 'Workspace map nodes intelligently organized into clean categorical structure.', 'success');
                  }}
                  className="p-1 px-2.5 text-[9px] sm:text-[10px] bg-[#1a1b26] border border-indigo-500/30 text-indigo-350 hover:bg-indigo-500/10 hover:text-indigo-250 rounded-md font-bold cursor-pointer transition-all uppercase tracking-wider shadow-sm"
                >
                  Rearrange Nodes
                </button>
              )}
              <span className="text-white/40 text-[10px] font-medium hidden sm:block">Drag on desktop or touch-hold on mobile to organize nodes.</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Arrange workspace nodes customizable to your preference. Tap to review connections.</p>
        </div>

        {/* Scaled Responsive Graph Container */}
        <div 
          ref={containerRef}
          id="central-svg-canvas-wrapper" 
          className={`w-full h-84 md:h-96 relative border rounded-xl overflow-hidden flex items-center justify-center touch-none select-none transition-all ${
            theme === 'light' 
              ? 'bg-[#f8fafc] border-slate-200 shadow-inner' 
              : 'bg-black border-white/5'
          }`}
        >
          <svg 
            className="w-full h-full absolute inset-0" 
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          >
            {/* Draw mapping connective lines */}
            {graphConnections.map((line, idx) => (
              <line
                key={idx}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.active ? '#6366f1' : (theme === 'light' ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.24)')}
                strokeWidth={line.active ? 2.5 : 1}
                strokeDasharray={line.active ? 'none' : '4,4'}
                className="transition-all duration-300"
              />
            ))}

            {/* Render Nodes layout */}
            {graphNodes.map((node) => {
              const isSelected = activeItemId === node.id;
              const isHovered = hoveredNodeId === node.id || isSelected;
              const isCurrentlyDragged = draggedNodeId === node.id;
              const activeFocusId = hoveredNodeId || activeItemId;
              const hasHoveredPeer = activeFocusId !== null && !isHovered && node.linkedIds.includes(activeFocusId);
              
              // Define node background style based on item type
              let color = '#3b82f6'; // Blue for notes
              let stroke = '#1d4ed8';
              if (node.type === 'task') {
                color = '#a855f7'; // Purple for tasks
                stroke = '#7e22ce';
              } else if (node.type === 'meeting') {
                color = '#10b981'; // Green for meetings
                stroke = '#047857';
              }

              const isMobile = dimensions.width < 500;
              const boxWidth = isMobile ? 110 : 145;
              const maxChars = isMobile ? 14 : 22;
              const labelText = node.title.length > maxChars 
                ? `${node.title.substring(0, maxChars - 2)}...` 
                : node.title;

              return (
                <g 
                  key={node.id}
                  className={`select-none group focus:outline-none ${isCurrentlyDragged ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onTouchStart={(e) => handleTouchStart(e, node.id)}
                >
                  {/* Transparent touch area booster (minimally 44px for WCAG touch compliance) */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={28}
                    fill="transparent"
                  />
                  {/* Outer connection halo glow circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isCurrentlyDragged ? 28 : (isHovered ? 24 : (hasHoveredPeer ? 21 : 16))}
                    fill={`${color}${isCurrentlyDragged ? '15' : '08'}`}
                    stroke={isSelected || isCurrentlyDragged ? '#6366f1' : (isHovered ? '#818cf8' : (hasHoveredPeer ? '#4f46e5' : 'transparent'))}
                    strokeWidth={isSelected || isCurrentlyDragged ? 2.5 : 1.5}
                    className="transition-all duration-200 animate-pulse"
                  />
                  {/* Central Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isCurrentlyDragged ? 17 : (isHovered ? 15 : 13)}
                    fill={isHovered || isCurrentlyDragged ? stroke : color}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                    className="transition-all duration-200 shadow-xl"
                  />
                  {/* Node Type Abbreviation Letter */}
                  <text
                    x={node.x}
                    y={node.y + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {node.type.substring(0, 1).toUpperCase()}
                  </text>
                  {/* Hover or Large Screen Permanent Title Description */}
                  <g className="transition-all duration-300 font-sans font-medium">
                    <rect
                      x={node.x - boxWidth / 2}
                      y={node.y + (isCurrentlyDragged ? 28 : 24)}
                      width={boxWidth}
                      height={19}
                      rx={6}
                      fill={theme === 'light' ? '#ffffff' : '#0C0C0F'}
                      stroke={isSelected || isCurrentlyDragged ? '#6366f1' : (isHovered ? (theme === 'light' ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.35)') : 'transparent')}
                      strokeWidth={isSelected ? 1.5 : 1}
                      className="transition-all duration-300 shadow-sm"
                      opacity={isHovered ? 0.95 : 0}
                    />
                    <text
                      x={node.x}
                      y={node.y + 36}
                      textAnchor="middle"
                      fill={isHovered ? (theme === 'light' ? '#0f172a' : '#ffffff') : (theme === 'light' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.6)')}
                      fontSize={isMobile ? 8 : 9}
                      fontWeight={isHovered ? '700' : '500'}
                      className="transition-all duration-300"
                      style={{
                        textShadow: theme === 'light' ? 'none' : (!isHovered ? '0px 1.5px 3px rgba(0, 0, 0, 0.95)' : 'none'),
                        pointerEvents: 'none'
                      }}
                    >
                      {labelText}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Split Feed Panel for Tasks, Events and Document Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Unfinished critical tasks checklist list */}
        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-purple-400" />
              Pending Tasks
            </span>
            <button 
              onClick={() => setActiveView('tasks')}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center"
            >
              Go to Board
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
          
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {state.tasks.filter(t => t.status !== 'done').length === 0 ? (
              <div className="text-xs text-white/40 py-4 text-center">All tasks are completed!</div>
            ) : (
              state.tasks.filter(t => t.status !== 'done').map(task => {
                const folder = state.folders.find(f => f.id === task.folderId);
                return (
                  <div 
                    key={task.id}
                    onClick={() => onSelectItem(task.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className="space-y-1 overflow-hidden pr-3">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-all">{task.title}</div>
                      <div className="flex items-center gap-2 text-[10px] text-white/40">
                        {folder && (
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: folder.color }} />
                            {folder.name}
                          </span>
                        )}
                        <span>•</span>
                        <span>Due {task.dueDate || 'No due date'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.linkedIds.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-bold border border-indigo-500/20 flex items-center gap-0.5" title={`${task.linkedIds.length} Linked references`}>
                          <Link2 className="w-2.5 h-2.5" />
                          {task.linkedIds.length}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        task.priority === 'high' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : task.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-white/5 text-slate-400 border-white/10'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming scheduled sync events in timeline queue */}
        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                Upcoming Events
              </span>
              <p className="text-[10px] text-white/35 font-medium hidden sm:block">Schedule & track upcoming meetings</p>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsQuickAdding(!isQuickAdding)}
                className={`p-1 px-2.5 text-[10px] rounded border font-semibold cursor-pointer transition-all ${
                  isQuickAdding 
                    ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' 
                    : 'bg-white/5 border-white/5 text-slate-350 hover:bg-white/10'
                }`}
                title="Quick schedule an event inline"
              >
                <Plus className="w-3 h-3 inline-block mr-0.5" />
                Quick Add
              </button>
              <button 
                onClick={() => setActiveView('meetings')}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center"
              >
                Full Calendar
                <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>

          {/* Quick tab controls */}
          <div className="flex bg-black p-1 rounded-lg border border-white/5 text-[10px] font-bold">
            <button
              onClick={() => setEventTab('all')}
              className={`flex-1 text-center py-1 rounded transition-all cursor-pointer ${
                eventTab === 'all' ? 'bg-[#1D1D22] text-white font-extrabold' : 'text-slate-450 hover:text-slate-250'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setEventTab('today')}
              className={`flex-1 text-center py-1 rounded transition-all cursor-pointer ${
                eventTab === 'today' ? 'bg-[#1D1D22] text-white font-extrabold' : 'text-slate-450 hover:text-slate-250'
              }`}
            >
              Today (Jun 4)
            </button>
            <button
              onClick={() => setEventTab('tomorrow')}
              className={`flex-1 text-center py-1 rounded transition-all cursor-pointer ${
                eventTab === 'tomorrow' ? 'bg-[#1D1D22] text-white font-extrabold' : 'text-slate-450 hover:text-slate-250'
              }`}
            >
              Tomorrow (Jun 5)
            </button>
          </div>

          {/* Inline Quick event composer */}
          {isQuickAdding && (
            <form onSubmit={handleQuickAddEvent} className="bg-black/60 p-3 rounded-xl border border-white/10 space-y-2.5 font-sans">
              <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                Add Event to {eventTab === 'tomorrow' ? 'Tomorrow (Jun 5)' : 'Today (Jun 4)'}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Event title (e.g. Lunch with team)..."
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="flex-1 bg-[#121215] border border-white/5 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="time"
                  required
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  className="w-22 bg-[#121215] border border-white/5 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsQuickAdding(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-655 hover:bg-emerald-600 text-white rounded font-bold cursor-pointer transition-colors"
                >
                  Schedule
                </button>
              </div>
            </form>
          )}
          
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {dashboardFilteredMeetings.length === 0 ? (
              <div className="text-xs text-white/40 py-8 text-center font-sans">No events found for this filter tab.</div>
            ) : (
              dashboardFilteredMeetings.map(meeting => {
                const folder = state.folders.find(f => f.id === meeting.folderId);
                const isToday = meeting.date === '2026-06-05';
                return (
                  <div 
                    key={meeting.id}
                    onClick={() => onSelectItem(meeting.id)}
                    className="flex items-start justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className="space-y-1.5 overflow-hidden pr-3">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-all flex items-center gap-2">
                        <span>{meeting.title}</span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" title="Scheduled for today!" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-white/40 font-sans">
                        <span className="inline-flex items-center gap-0.5 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                          <Clock className="w-2.5 h-2.5 animate-pulse" />
                          {meeting.time} ({meeting.duration}m)
                        </span>
                        <span>on {meeting.date}</span>
                        {folder && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-white/5 rounded border border-white/10" style={{ color: folder.color }}>
                            {folder.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {meeting.linkedIds.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-bold border border-indigo-500/20 flex items-center gap-0.5 shrink-0" title={`${meeting.linkedIds.length} Linked references`}>
                        <Link2 className="w-2.5 h-2.5" />
                        {meeting.linkedIds.length}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
