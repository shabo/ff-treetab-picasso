export function nextIndex(index, key, count, columns) {
  if (count <= 0) return -1;
  switch (key) {
    case 'ArrowRight':
      return Math.min(index + 1, count - 1);
    case 'ArrowLeft':
      return Math.max(index - 1, 0);
    case 'ArrowDown':
      return Math.min(index + columns, count - 1);
    case 'ArrowUp': {
      const next = index - columns;
      return next >= 0 ? next : index;
    }
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return index;
  }
}

export function columnsFor(gridWidth, cellWidth) {
  if (!(cellWidth > 0)) return 1;
  return Math.max(1, Math.floor(gridWidth / cellWidth));
}
