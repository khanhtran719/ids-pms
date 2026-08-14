export class MongoDemoSeedRepository {
  constructor(connection) {
    this.connection = connection;
  }

  async findSeedActor(email) {
    const user = await this.connection.collection('users').findOne(
      {
        email: email.trim().toLowerCase(),
        status: 'active',
        roleCodes: 'admin',
      },
      { projection: { _id: 1, displayName: 1, email: 1 } },
    );
    return user
      ? {
          id: user._id.toString(),
          displayName: user.displayName,
          email: user.email,
        }
      : null;
  }

  async upsertGroup(group) {
    const result = await this.connection.collection(group.collection).bulkWrite(
      group.documents.map((document) => ({
        updateOne: {
          filter: { demoSeedKey: document.demoSeedKey },
          update: { $setOnInsert: document },
          upsert: true,
        },
      })),
      { ordered: true },
    );
    return { inserted: result.upsertedCount, matched: result.matchedCount };
  }
}
