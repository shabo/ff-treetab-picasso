// Flattens a TST light tree ({id, children: [...]}) into tab IDs in pre-order.
// Iterative, so deep trees cannot overflow the stack.
export function flattenTree(root) {
  const ids = [];
  const stack = [root];
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || typeof item !== 'object' || !Number.isInteger(item.id)) continue;
    ids.push(item.id);
    if (Array.isArray(item.children)) {
      for (let i = item.children.length - 1; i >= 0; i--) stack.push(item.children[i]);
    }
  }
  return ids;
}
