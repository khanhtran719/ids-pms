export async function seedDemo(repository, plan) {
  let inserted = 0;
  let matched = 0;
  const collections = [];
  for (const group of plan) {
    const result = await repository.upsertGroup(group);
    inserted += result.inserted;
    matched += result.matched;
    collections.push({
      collection: group.collection,
      inserted: result.inserted,
      matched: result.matched,
    });
  }
  return { inserted, matched, collections };
}
