"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  className?: string;
  radius?: number;
}

export default function RadialOrbitalTimeline({
  timelineData,
  className,
  radius = 200,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
      case "in-progress":
        return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
      case "pending":
        return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
      default:
        return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    }
  };


  return (
    <div
      className={`w-full flex flex-col items-center justify-center ${className ? 'overflow-visible' : 'overflow-hidden'} ${className ?? 'h-screen bg-black'}`}
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-primary via-secondary to-accent animate-pulse flex items-center justify-center z-10">
            <div className="absolute w-20 h-20 rounded-full border border-primary/20 animate-ping opacity-70"></div>
            <div
              className="absolute w-24 h-24 rounded-full border border-primary/10 animate-ping opacity-50"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="w-8 h-8 rounded-full bg-primary-foreground/80 backdrop-blur-md"></div>
          </div>

          <div
            className="absolute rounded-full border border-border/30"
            style={{ width: radius * 2, height: radius * 2 }}
          />

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => { nodeRefs.current[item.id] = el; }}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)`,
                    width: `${item.energy * 0.5 + 40}px`,
                    height: `${item.energy * 0.5 + 40}px`,
                    left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  }}
                ></div>

                <div
                  className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-primary text-primary-foreground"
                      : isRelated
                      ? "bg-primary/30 text-primary"
                      : "bg-card text-muted-foreground"
                  }
                  border-2
                  ${
                    isExpanded
                      ? "border-primary shadow-lg shadow-primary/30"
                      : isRelated
                      ? "border-primary animate-pulse"
                      : "border-border/60"
                  }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-150" : ""}
                `}
                >
                  <Icon size={16} />
                </div>

                <div
                  className={`
                  absolute top-12  whitespace-nowrap
                  text-xs font-semibold tracking-wider
                  transition-all duration-300
                  ${isExpanded ? "text-foreground scale-125" : "text-muted-foreground"}
                `}
                >
                  {item.title}
                </div>

                {isExpanded && (
                  <>
                    {/* connector line */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-px h-3 bg-white/30"
                      style={{ [position.y > 0 ? 'bottom' : 'top']: '-12px' }}
                    />

                    <Card
                      className={`absolute left-1/2 -translate-x-1/2 w-[280px] overflow-visible rounded-xl border border-white/20 bg-black shadow-xl shadow-black/60 ${position.y > 0 ? 'bottom-16' : 'top-16'}`}
                    >
                      <CardContent className="p-5">
                        {/* Status + Date row */}
                        <div className="flex items-center justify-between gap-3">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                              item.status === 'completed'
                                ? 'bg-white text-black border-white'
                                : item.status === 'in-progress'
                                ? 'bg-black text-white border-white'
                                : 'bg-black/40 text-white border-white/50'
                            }`}
                          >
                            {item.status === "completed" ? "COMPLETE" : item.status === "in-progress" ? "IN PROGRESS" : "PENDING"}
                          </Badge>
                          <span className="text-[11px] text-white/50 font-mono">
                            {item.date}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="mt-3 text-[15px] font-semibold text-white leading-tight">
                          {item.title}
                        </h3>

                        {/* Content */}
                        <p className="mt-2 text-[13px] leading-relaxed text-white/60 line-clamp-3">
                          {item.content}
                        </p>

                        {/* Divider */}
                        <div className="my-2.5 h-px bg-white/10" />

                        {/* Energy Level */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Zap size={12} className="text-white/40" />
                            <span className="text-[11px] text-white/50">Energy Level</span>
                          </div>
                          <span className="text-[11px] text-white/70 font-mono">{item.energy}%</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${item.energy}%` }}
                          />
                        </div>

                        {/* Connected Nodes */}
                        {item.relatedIds.length > 0 && (
                          <>
                            <div className="my-2.5 h-px bg-white/10" />
                            <div className="flex items-center gap-1.5 mb-2">
                              <Link size={10} className="text-white/40" />
                              <span className="text-[10px] uppercase tracking-wider font-medium text-white/40">
                                Connected Nodes
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.relatedIds.map((relatedId) => {
                                const relatedItem = timelineData.find((i) => i.id === relatedId);
                                return (
                                  <button
                                    key={relatedId}
                                    className="inline-flex items-center gap-1 rounded border border-white/20 bg-transparent px-2.5 py-1 text-[11px] font-medium text-white/60 transition-all duration-200 hover:border-white/40 hover:text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleItem(relatedId);
                                    }}
                                  >
                                    {relatedItem?.title}
                                    <ArrowRight size={9} className="text-white/40" />
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
