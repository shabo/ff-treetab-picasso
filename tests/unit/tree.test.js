import { describe, expect, it } from 'vitest';
import { flattenTree } from '../../src/lib/tree.js';

describe('flattenTree', () => {
  it('[TM-040] single node', () => {
    expect(flattenTree({ id: 1 })).toEqual([1]);
  });

  it('[TM-041] nested tree in pre-order', () => {
    const tree = {
      id: 1,
      children: [
        { id: 2, children: [{ id: 3 }, { id: 4 }] },
        { id: 5, children: [] }
      ]
    };
    expect(flattenTree(tree)).toEqual([1, 2, 3, 4, 5]);
  });

  it.each([null, undefined, {}, { id: 'x' }])('[TM-042] invalid root %j gives []', (v) => {
    expect(flattenTree(v)).toEqual([]);
  });

  it('[TM-043] children that are not an array are ignored', () => {
    expect(flattenTree({ id: 1, children: 'nope' })).toEqual([1]);
  });

  it('[TM-044] depth 100 without stack overflow', () => {
    let node = { id: 99 };
    for (let i = 98; i >= 0; i--) node = { id: i, children: [node] };
    const ids = flattenTree(node);
    expect(ids).toHaveLength(100);
    expect(ids[0]).toBe(0);
    expect(ids[99]).toBe(99);
  });

  it('[TM-045] 1000 siblings', () => {
    const children = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1 }));
    const ids = flattenTree({ id: 0, children });
    expect(ids).toHaveLength(1001);
    expect(ids[1000]).toBe(1000);
  });

  it('skips invalid children but keeps valid siblings', () => {
    expect(flattenTree({ id: 1, children: [null, { id: 'x' }, { id: 2 }] })).toEqual([1, 2]);
  });
});
