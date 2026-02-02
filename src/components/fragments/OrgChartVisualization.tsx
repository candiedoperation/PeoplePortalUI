/**
  People Portal UI
  Copyright (C) 2026  Atheesh Thirumalairajan

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Tree, { type RawNodeDatum, type CustomNodeElementProps } from 'react-d3-tree';
import { Loader2, Plus, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface OrgChartNode extends RawNodeDatum {
    id: string;
    name: string;
    type: "ROOT" | "ROOT_MEMBER" | "DIVISION" | "PERSON";
    attributes?: {
        friendlyName?: string;
        description?: string;
        role?: string;
        email?: string;
        teamContext?: string[];
        [key: string]: any;
    };
    children?: OrgChartNode[];
    siblings?: OrgChartNode[];
    isPrimaryExpansion?: boolean;
    hasChildren?: boolean;
}

export const OrgChartVisualization = () => {
    const [data, setData] = useState<OrgChartNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
    // Store children for vertical layout nodes (depth >= 2) separately from tree
    const [verticalChildren, setVerticalChildren] = useState<Map<string, OrgChartNode[]>>(new Map());
    const [expandedVerticalNodes, setExpandedVerticalNodes] = useState<Set<string>>(new Set());

    // Load initial org chart data
    useEffect(() => {
        fetch("/api/org/orgchart?expandAll=false")
            .then(res => res.json())
            .then(json => {
                if (json.root) {
                    setData(json.root);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    // Custom node renderer
    const renderCustomNode = useCallback(({ nodeDatum, toggleNode, addChildren }: CustomNodeElementProps) => {
        const node = nodeDatum as unknown as OrgChartNode;
        const isLoading = loadingNodes.has(node.id);
        const hasLoadedChildren = nodeDatum.children && nodeDatum.children.length > 0;
        const needsLazyLoad = (node.hasChildren && !hasLoadedChildren);

        // Get the depth of the current node
        const depth = (nodeDatum as any).__rd3t?.depth ?? 0;

        // Dimensions matching "Thin card" aesthetic
        const CARD_WIDTH = 240;
        const CARD_HEIGHT = 100;
        const SIBLING_GAP = 20;
        const VERTICAL_GAP = 20; // Gap between vertically stacked cards

        // Styling helpers
        const getHeaderStyle = () => {
            switch (node.type) {
                case "ROOT": return "bg-slate-900 border-slate-900 text-slate-50";
                case "ROOT_MEMBER": return "bg-blue-600 border-blue-600 text-white";
                case "DIVISION": return "bg-orange-100 border-orange-200 text-orange-700";
                case "PERSON": return "bg-purple-600 border-purple-600 text-white"; // User asked for dark color
                default: return "bg-slate-200 border-slate-300 text-slate-700";
            }
        };

        const getInitials = (name: string) => {
            return name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
        };

        const handleLoadChildren = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (isLoading) return;

            // For depth >= 2, store children in state instead of adding to tree
            if (depth >= 2) {
                // Toggle if already loaded
                if (verticalChildren.has(node.id)) {
                    setExpandedVerticalNodes(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(node.id)) {
                            newSet.delete(node.id);
                        } else {
                            newSet.add(node.id);
                        }
                        return newSet;
                    });
                    return;
                }

                setLoadingNodes(prev => new Set(prev).add(node.id));
                try {
                    const res = await fetch(`/api/org/orgchart/node/${node.id}`);
                    const subtreeNode = await res.json();
                    if (subtreeNode.children && subtreeNode.children.length > 0) {
                        setVerticalChildren(prev => new Map(prev).set(node.id, subtreeNode.children));
                        setExpandedVerticalNodes(prev => new Set(prev).add(node.id));
                    }
                } catch (err) {
                    console.error("Failed to load children:", err);
                } finally {
                    setLoadingNodes(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(node.id);
                        return newSet;
                    });
                }
                return;
            }

            // For depth < 2, use normal tree expansion
            setLoadingNodes(prev => new Set(prev).add(node.id));
            try {
                const res = await fetch(`/api/org/orgchart/node/${node.id}`);
                const subtreeNode = await res.json();
                if (subtreeNode.children && subtreeNode.children.length > 0) {
                    addChildren(subtreeNode.children);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            toggleNode();
                        });
                    });
                }
            } catch (err) {
                console.error("Failed to load children:", err);
            } finally {
                setLoadingNodes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(node.id);
                    return newSet;
                });
            }
        };

        // Render a single Card
        const NodeCard = ({ data, offsetX = 0, offsetY = 0, isVertical = false }: {
            data: OrgChartNode,
            offsetX?: number,
            offsetY?: number,
            isVertical?: boolean
        }) => {
            const headerClass = getHeaderStyle();
            const BUTTON_AREA_HEIGHT = 44; // Space for the floating button below card

            // Compute header text based on this card's data (not parent node)
            // For subteam members, teamContext is [rootTeamName, subteamName], so prefer [1] if available
            const cardTeamContext = data.attributes?.teamContext;
            const displayTeamName = cardTeamContext?.[1] || cardTeamContext?.[0] || null;
            const cardIsExecutive = data.type === "ROOT_MEMBER";
            const cardHeaderText = cardIsExecutive
                ? (data.attributes?.role || "Executive")
                : (displayTeamName || (data.type === "DIVISION" ? "Division" : data.type === "ROOT" ? "Organization" : "Executive"));

            // Calculate button visibility for this card
            const hasVerticalChildren = depth >= 2 && verticalChildren.has(node.id);
            const isVerticalExpanded = expandedVerticalNodes.has(node.id);
            const showButton = depth >= 2
                ? (node.hasChildren || hasVerticalChildren) && data.id === node.id
                : (hasLoadedChildren || needsLazyLoad) && data.id === node.id;
            const needsLoad = depth >= 2
                ? !hasVerticalChildren && node.hasChildren
                : needsLazyLoad;
            const isExpanded = depth >= 2 ? isVerticalExpanded : !nodeDatum.__rd3t?.collapsed;

            // Division cards are thinner
            const isDivision = data.type === "DIVISION";
            const cardHeight = isDivision ? 85 : CARD_HEIGHT;

            // Get children count for division cards
            const childrenCount = data.children?.length || 0;

            return (
                <foreignObject
                    width={CARD_WIDTH}
                    height={cardHeight + (showButton ? BUTTON_AREA_HEIGHT : 0)}
                    x={-(CARD_WIDTH / 2) + offsetX}
                    y={isVertical ? offsetY : -(cardHeight / 2) + offsetY}
                >
                    <div className="flex flex-col items-center">
                        <Card className="w-full gap-2 flex flex-col overflow-hidden border shadow-sm hover:shadow-md transition-shadow" style={{ height: cardHeight }}>


                            <div style={{ paddingTop: 0 }} className={cn(
                                "h-7 w-full flex items-center justify-center px-2 text-[11px] font-semibold uppercase tracking-wide border-b shrink-0 text-center",
                                headerClass
                            )}>
                                <span className="truncate text-center w-full">{cardHeaderText}</span>
                            </div>

                            {isDivision ? (
                                <div className="flex-1 w-full px-3 flex flex-col items-center justify-center bg-card">
                                    <p className="text-sm font-bold text-card-foreground text-center">
                                        {data.name}
                                    </p>
                                    {childrenCount > 0 && (
                                        <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                                            {childrenCount} {childrenCount === 1 ? 'team' : 'teams'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 px-3 mt-4 flex items-center gap-3 bg-card min-h-0">

                                    <Avatar className="h-10 w-10 shrink-0 border-2 border-muted">
                                        <AvatarImage src={data.attributes?.avatar} alt={data.name} className="object-cover" />
                                        <AvatarFallback className="text-xs bg-muted text-muted-foreground font-medium">
                                            {getInitials(data.name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-bold truncate text-card-foreground leading-tight">
                                            {data.name}
                                        </span>
                                        {cardIsExecutive ? (
                                            cardTeamContext && (
                                                <span className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                                    {cardTeamContext}
                                                </span>
                                            )
                                        ) : (
                                            data.attributes?.role && (
                                                <span className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                                                    {data.attributes.role}
                                                </span>
                                            )
                                        )}
                                    </div>

                                </div>
                            )}
                        </Card>

                        {showButton && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full mt-3 bg-white dark:bg-zinc-900 border border-muted-foreground/30 hover:bg-muted text-muted-foreground"
                                onClick={needsLoad ? handleLoadChildren : (e) => {
                                    e.stopPropagation();
                                    if (depth >= 2) {
                                        handleLoadChildren(e);
                                    } else {
                                        toggleNode();
                                    }
                                }}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : isExpanded ? (
                                    <Minus size={14} />
                                ) : (
                                    <Plus size={14} />
                                )}
                            </Button>
                        )}
                    </div>
                </foreignObject>
            );
        };

        // Render vertical children for nodes at depth >= 2 (team owners and below)
        const renderVerticalChildren = () => {
            if (depth < 2) return null;

            // Read from state instead of nodeDatum.children
            const children = verticalChildren.get(node.id);
            const isExpanded = expandedVerticalNodes.has(node.id);
            if (!children || children.length === 0 || !isExpanded) return null;

            const INDENT_X = 40; // Horizontal indent for child cards
            const VERTICAL_LINE_X = -CARD_WIDTH / 2 + 20; // Position of vertical connector line
            const BUTTON_SPACE = 44; // Extra space to clear the parent's +/- button

            // Calculate positions - start children below the parent's button
            const firstChildY = (CARD_HEIGHT / 2) + BUTTON_SPACE + VERTICAL_GAP;
            const lastChildY = firstChildY + (children.length - 1) * (CARD_HEIGHT + VERTICAL_GAP);
            const verticalLineStartY = CARD_HEIGHT / 2; // Keep line starting from card bottom
            const verticalLineEndY = lastChildY + CARD_HEIGHT / 2;

            return (
                <g>
                    <line
                        x1={VERTICAL_LINE_X}
                        y1={verticalLineStartY}
                        x2={VERTICAL_LINE_X}
                        y2={verticalLineEndY}
                        stroke="#64748b"
                        strokeWidth={2}
                    />

                    {children.map((child, index) => {
                        const yOffset = firstChildY + index * (CARD_HEIGHT + VERTICAL_GAP);
                        const childCenterY = yOffset + CARD_HEIGHT / 2;

                        return (
                            <g key={child.id}>
                                <line
                                    x1={VERTICAL_LINE_X}
                                    y1={childCenterY}
                                    x2={-(CARD_WIDTH / 2) + INDENT_X}
                                    y2={childCenterY}
                                    stroke="#64748b"
                                    strokeWidth={2}
                                />
                                <NodeCard data={child} offsetX={INDENT_X} offsetY={yOffset} isVertical={true} />
                            </g>
                        );
                    })}
                </g>
            );
        };

        // For nodes at depth >= 2, use vertical layout (team owners and their reports)
        if (depth >= 2) {
            return (
                <g>
                    {/* Main Node */}
                    <NodeCard data={node} />

                    {/* Render children vertically */}
                    {renderVerticalChildren()}

                    {/* Siblings (if any) */}
                    {node.siblings?.map((sibling, index) => {
                        const offset = (CARD_WIDTH / 2) + 20 + (++index * (CARD_WIDTH + SIBLING_GAP)) - (CARD_WIDTH / 2);

                        return (
                            <g key={sibling.id}>
                                <line
                                    x1={(CARD_WIDTH / 2) + ((index - 1) * (CARD_WIDTH + SIBLING_GAP))}
                                    y1={0}
                                    x2={offset - (CARD_WIDTH / 2)}
                                    y2={0}
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    strokeDasharray="4,4"
                                />
                                <NodeCard data={sibling} offsetX={offset} />
                            </g>
                        );
                    })}
                </g>
            );
        }

        // Default rendering for depth < 2 (tree layout for Exec and Divisions)
        return (
            <g>
                {/* Main Node */}
                <NodeCard data={node} />

                {/* Siblings */}
                {node.siblings?.map((sibling, index) => {
                    const offset = (CARD_WIDTH / 2) + 20 + (++index * (CARD_WIDTH + SIBLING_GAP)) - (CARD_WIDTH / 2); // Calculate absolute X offset from center

                    return (
                        <g key={sibling.id}>
                            <line
                                x1={(CARD_WIDTH / 2) + ((index - 1) * (CARD_WIDTH + SIBLING_GAP))}
                                y1={0}
                                x2={offset - (CARD_WIDTH / 2)}
                                y2={0}
                                stroke="#94a3b8"
                                strokeWidth={2}
                                strokeDasharray="4,4"
                            />
                            <NodeCard data={sibling} offsetX={offset} />
                        </g>
                    );
                })}
            </g>
        );
    }, [loadingNodes, verticalChildren, expandedVerticalNodes]);

    const translate = useMemo(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500,
        y: 100
    }), []);

    // Hide default library links for nodes using vertical layout
    const pathClassFunc = useCallback((linkData: any) => {
        // Try different paths to find depth
        const targetDepth = linkData.target?.data?.__rd3t?.depth ?? linkData.target?.__rd3t?.depth ?? linkData.target?.depth ?? 0;
        // Only hide links TO nodes at depth >= 3 (children of team owners)
        // Keep links from Division (1) to team owners (2) visible
        const shouldHide = targetDepth >= 3;
        // Hide links from/to nodes at depth >= 3 since we're drawing custom vertical lines
        return shouldHide ? 'hide-link' : '';
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(200,200,200,0.1)_1px,transparent_1px)] [background-size:16px_16px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className='mt-2'>Crunching the Latest Data...</p>
            </div>
        );
    }

    if (!data) return null;

    if (data.id === 'error') {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(200,200,200,0.1)_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="flex flex-col items-center gap-2 p-6 rounded-lg border bg-card text-card-foreground shadow-sm max-w-md text-center">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold">Executive Board Not Found</h3>
                    <p className="text-sm text-muted-foreground">
                        The Executive Board could not be loaded. This usually means the "ExecutiveBoardMembers" team is empty or missing.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(200,200,200,0.1)_1px,transparent_1px)] [background-size:16px_16px]">
            <style>{`
                .hide-link,
                path.hide-link,
                .rd3t-link.hide-link {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
                /* Override default library link color for dark mode compatibility */
                .rd3t-link {
                    stroke: #64748b !important;
                }
            `}</style>
            <Tree
                data={data}
                orientation="vertical"
                pathFunc="step"
                pathClassFunc={pathClassFunc}
                translate={translate}
                nodeSize={{ x: 260, y: 240 }}
                separation={{ siblings: 1.1, nonSiblings: 1.3 }}
                renderCustomNodeElement={renderCustomNode}
                collapsible={true}
                initialDepth={2}
                enableLegacyTransitions={true}
                transitionDuration={300}
            />
        </div>
    );
};
