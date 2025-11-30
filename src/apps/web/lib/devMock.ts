type TestRecord = {
  test_id: string;
  title: string;
  start_time: string | null;
  due_time: string | null;
  type: string;
  status: string;
  url: string;
  duration: number | null;
};

const store = new Map<string, TestRecord>();

// Seed with a couple of demo entries
(() => {
  const now = Date.now();
  // Seed 1: an open (regular) exam that is currently running
  const id1 = String(now - 10000);
  const start1 = new Date(now - 1000 * 60 * 60).toISOString(); // started 1 hour ago
  const due1 = new Date(now + 1000 * 60 * 60 * 24).toISOString(); // ends in 24 hours
  store.set(id1, {
    test_id: id1,
    title: 'Đề thi mẫu 1 (Thường)',
    start_time: start1,
    due_time: due1,
    type: 'regular',
    status: 'regular',
    url: '/assets/sample-papers/sample1.pdf',
    duration: 120,
  });

  // Seed 2: a closed (practice) premium exam (past due)
  const id2 = String(now - 5000);
  const start2 = new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(); // started 7 days ago
  const due2 = new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString(); // ended 6 days ago
  store.set(id2, {
    test_id: id2,
    title: 'Đề thi mẫu 2 (VIP)',
    start_time: start2,
    due_time: due2,
    type: 'premium',
    status: 'practice',
    url: '/assets/sample-papers/sample2.pdf',
    duration: 90,
  });
})();

export const devStore = {
  findMany: async () => Array.from(store.values()).sort((a, b) => (b.start_time ?? '').localeCompare(a.start_time ?? '')),
  create: async (data: Partial<TestRecord>) => {
    const id = data.test_id ?? String(Date.now());
    const rec: TestRecord = {
      test_id: id,
      title: data.title ?? 'Untitled',
      start_time: data.start_time ?? null,
      due_time: data.due_time ?? null,
      type: data.type ?? 'practice',
      status: data.status ?? 'Regular',
      url: data.url ?? '',
      duration: typeof data.duration === 'number' ? data.duration : null,
    };
    store.set(id, rec);
    return rec;
  },
  update: async (test_id: string, data: Partial<TestRecord>) => {
    const existing = store.get(test_id);
    if (!existing) throw new Error('Not found');
    const updated = { ...existing, ...data };
    store.set(test_id, updated);
    return updated;
  },
  delete: async (test_id: string) => {
    return store.delete(test_id);
  },
};
