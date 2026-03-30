type FileNode = {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: FileNode[];
};

type FileExplorerProps = {
  selectedPath?: string;
  tree: FileNode[];
};

function TreeNode({
  node,
  depth = 0,
  selectedPath
}: {
  depth?: number;
  node: FileNode;
  selectedPath?: string;
}) {
  const isSelected = node.path === selectedPath;

  return (
    <div>
      <div
        className={
          isSelected
            ? 'rounded-xl bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200'
            : 'rounded-xl px-3 py-2 text-sm transition hover:bg-amber-50'
        }
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
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

export function FileExplorer({ selectedPath, tree }: FileExplorerProps) {
  return (
    <div className="rounded-2xl border border-sand bg-mist p-3">
      <div className="mb-3 px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          文件
        </p>
      </div>
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} selectedPath={selectedPath} />
      ))}
    </div>
  );
}
