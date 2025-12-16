'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ChapterDocument } from '@/lib/db/schema';

interface BoardViewProps {
  chapters: ChapterDocument[];
  onNodeClick?: (chapterId: string) => void;
  onUpdatePosition?: (id: string, x: number, y: number) => void;
  onNavigate?: (chapterId: string) => void;
}

export default function BoardView({ chapters, onNodeClick, onUpdatePosition, onNavigate }: BoardViewProps) {
  // Convert chapters to React Flow nodes
  // Use saved position if available, otherwise use default layout
  const initialNodes: Node[] = chapters.map((chapter, index) => ({
    id: chapter.id,
    position: { 
      x: chapter.position_x ?? index * 250, 
      y: chapter.position_y ?? 100 
    },
    data: { label: chapter.title },
    type: 'default',
  }));

  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  // Handle node drag stop - save position to database
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onUpdatePosition && node.position) {
        onUpdatePosition(node.id, node.position.x, node.position.y);
      }
    },
    [onUpdatePosition]
  );

  // Handle node double click - navigate to editor
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNavigate) {
        onNavigate(node.id);
      }
    },
    [onNavigate]
  );

  return (
    <div className="w-full h-full" style={{ minHeight: '600px' }}>
      {chapters.length === 0 ? (
        // Empty state
        <div className="flex items-center justify-center h-full">
          <p className="text-zinc-400 font-sans text-sm">
            No chapters yet. Create your first chapter to get started.
          </p>
        </div>
      ) : (
        // React Flow Board
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeDragStop={handleNodeDragStop}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      )}
    </div>
  );
}
