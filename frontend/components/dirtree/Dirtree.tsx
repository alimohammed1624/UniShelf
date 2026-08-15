'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Folder, FileText, FolderOpen } from 'lucide-react';
import { TreeNode } from '@/hooks/useResourceTree';
import { Card, CardContent } from '@/components/ui/card';

interface DirtreeProps {
  parents: TreeNode[];
  children: TreeNode[];
  currentId: number;
  currentTitle: string;
}

export function Dirtree({ parents, children, currentId, currentTitle }: DirtreeProps) {
  const [collapsedDirs, setCollapsedDirs] = useState<Set<number>>(new Set());

  if (parents.length === 0 && children.length === 0) return null;

  const toggleDir = (id: number) => {
    setCollapsedDirs(prev => {
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
                {currentTitle}
              </span>
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Contents</h3>
            <div>
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-5 flex justify-center flex-shrink-0">
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                </span>
                <span className="text-sm font-medium truncate">{currentTitle}</span>
              </div>
              {children.map((node, idx) => (
                <TreeItem
                  key={node.id}
                  node={node}
                  ancestorLines={[]}
                  isLast={idx === children.length - 1}
                  collapsedDirs={collapsedDirs}
                  onToggle={toggleDir}
                />
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

/** Connector column: a vertical guide per ancestor level, then the elbow for this node. */
function TreeGuides({ ancestorLines, isLast }: { ancestorLines: boolean[]; isLast: boolean }) {
  return (
    <>
      {ancestorLines.map((hasLine, idx) => (
        <span key={idx} className="relative w-5 flex-shrink-0" aria-hidden="true">
          {hasLine && <span className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />}
        </span>
      ))}
      <span className="relative w-5 flex-shrink-0" aria-hidden="true">
        <span className={`absolute left-2.5 top-0 w-px bg-border ${isLast ? 'h-1/2' : 'bottom-0'}`} />
        <span className="absolute left-2.5 right-0 top-1/2 h-px bg-border" />
      </span>
    </>
  );
}

function TreeItem({ node, ancestorLines, isLast, collapsedDirs, onToggle }: {
  node: TreeNode;
  ancestorLines: boolean[];
  isLast: boolean;
  collapsedDirs: Set<number>;
  onToggle: (id: number) => void;
}) {
  const childNodes = node.children ?? [];
  const hasChildren = node.is_directory && childNodes.length > 0;
  const isExpanded = hasChildren && !collapsedDirs.has(node.id);

  return (
    <div>
      <div className="flex items-stretch rounded-md hover:bg-accent transition-colors">
        <TreeGuides ancestorLines={ancestorLines} isLast={isLast} />
        <div className="flex items-center gap-1.5 py-1 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? `Collapse ${node.title}` : `Expand ${node.title}`}
              className="w-4 h-4 flex items-center justify-center rounded flex-shrink-0"
            >
              <ChevronRight
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          {node.is_directory ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <Link
            href={`/resources/${node.id}`}
            className={`text-sm truncate hover:underline ${node.is_directory ? 'font-medium' : ''}`}
          >
            {node.title}
          </Link>
        </div>
      </div>
      {isExpanded && childNodes.map((child, idx) => (
        <TreeItem
          key={child.id}
          node={child}
          ancestorLines={[...ancestorLines, !isLast]}
          isLast={idx === childNodes.length - 1}
          collapsedDirs={collapsedDirs}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
