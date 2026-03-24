type FileNode = {
  name: string;
  type: 'directory' | 'file';
  children?: FileNode[];
};

type FileExplorerProps = {
  tree: FileNode[];
};

function TreeNode({ node, depth = 0 }: { depth?: number; node: FileNode }) {
  return (
    <div>
      <div
        className="rounded-xl px-3 py-2 text-sm transition hover:bg-amber-50"
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        <span
          className={
            node.type === 'directory'
              ? 'font-medium text-ink'
              : 'text-slate-600'
          }
        >
          {node.type === 'directory' ? '▾ ' : ''}
          {node.name}
        </span>
      </div>
      {node.children?.map((child) => (
        <TreeNode
          key={`${node.name}-${child.name}`}
          depth={depth + 1}
          node={child}
        />
      ))}
    </div>
  );
}

export function FileExplorer({ tree }: FileExplorerProps) {
  return (
    <div className="rounded-2xl border border-sand bg-mist p-3">
      <div className="mb-3 px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Explorer
        </p>
      </div>
      {tree.map((node) => (
        <TreeNode key={node.name} node={node} />
      ))}
    </div>
  );
}
