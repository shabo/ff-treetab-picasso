import { describe, expect, it } from 'vitest';
import { createSerialQueue } from '../../src/lib/queue.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('createSerialQueue', () => {
  it('[TM-050] runs tasks in order, one at a time', async () => {
    const q = createSerialQueue();
    const log = [];
    const a = q.run(async () => {
      log.push('a-start');
      await tick();
      log.push('a-end');
      return 'A';
    });
    const b = q.run(async () => {
      log.push('b-start');
      return 'B';
    });
    await expect(a).resolves.toBe('A');
    await expect(b).resolves.toBe('B');
    expect(log).toEqual(['a-start', 'a-end', 'b-start']);
  });

  it('[TM-051] a rejected task does not block later tasks', async () => {
    const q = createSerialQueue();
    const a = q.run(async () => {
      throw new Error('boom');
    });
    const b = q.run(async () => 'ok');
    await expect(a).rejects.toThrow('boom');
    await expect(b).resolves.toBe('ok');
  });

  it('[TM-052] 100 concurrent read-modify-write updates lose nothing', async () => {
    const q = createSerialQueue();
    let stored = 0;
    const read = async () => {
      await tick();
      return stored;
    };
    const write = async (v) => {
      await tick();
      stored = v;
    };
    await Promise.all(
      Array.from({ length: 100 }, () =>
        q.run(async () => {
          const v = await read();
          await write(v + 1);
        })
      )
    );
    expect(stored).toBe(100);
  });

  it('accepts sync functions', async () => {
    const q = createSerialQueue();
    await expect(q.run(() => 5)).resolves.toBe(5);
  });
});
