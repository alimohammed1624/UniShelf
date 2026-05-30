'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Folder, FileText, FolderOpen } from 'lucide-react';
import { TreeNode } from '@/hooks/useResourceTree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DirtreeProps {
  parents: TreeNode[];
  children: TreeNode[];
  currentId: number;
}

export function Dirtree({ parents, children, currentId }: DirtreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<number>>(new Set());

  if (parents.length === 0 && children.length === 0) return null;

  const toggleDir = (id: number) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        {parents.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Parent Directories</h3>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              {parents.map((parent, idx) => (
                <React.Fragment key={parent.id}>
                  {idx > 0 && <span className="text-muted-foreground/50">/</span>}
                  <ParentLink node={parent} />
                </React.Fragment>
              ))}
              <span className="text-muted-foreground/50">/</span>
              <span className="text-sm font-medium text-foreground bg-accent px-2 py-0.5 rounded">
                {parents.length > 0 ? parents[parents.length - 1]?.title : ''}
              </span>
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Contents</h3>
            <div className="space-y-0.5">
              {children.map(node => (
                <TreeItem key={node.id} node={node} depth={0} expandedDirs={expandedDirs} onToggle={toggleDir} />
              ))}
            </div>
          </div>
        )}

        {parents.length === 0 && children.length === 0 && (
          <p className="text-sm text-muted-foreground">Root resource with no siblings</p>
        )}
      </CardContent>
    </Card>
  );
}

function ParentLink({ node }: { node: TreeNode }) {
  return (
    <Link href={`/resources/${node.id}`} className="hover:text-foreground text-muted-foreground hover:underline text-sm flex items-center gap-1">
      {node.is_directory ? <Folder className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
      {node.title}
    </Link>
  );
}

function TreeItem({ node, depth, expandedDirs, onToggle }: {
  node: TreeNode;
  depth: number;
  expandedDirs: Set<number>;
  onToggle: (id: number) => void;
}) {
  const isExpanded = expandedDirs.has(node.id);

  if (node.is_directory && node.children && node.children.length > 0) {
    return (
      <div>
        <button
          onClick={() => onToggle(node.id)}
          className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent text-sm transition-colors"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500" />
          )}
          <Link href={`/resources/${node.id}`} className="font-medium hover:underline truncate">
            {node.title}
          </Link>
        </button>
        {isExpanded && node.children.length > 0 && (
          <div className="ml-4 pl-3 border-l border-border space-y-0.5 mt-0.5">
            {node.children.map(child => (
              <TreeItem key={child.id} node={child} depth={depth + 1} expandedDirs={expandedDirs} onToggle={onToggle} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent text-sm transition-colors ml-3">
      <span className="w-5" />
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Link href={`/resources/${node.id}`} className="hover:underline truncate">
        {node.title}
      </Link>
    </div>
  );
}
