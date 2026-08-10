import { Types } from 'mongoose';
import { serializeMongoDocument } from './schema-options';

describe('serializeMongoDocument', () => {
  it('maps MongoDB internals to the public API id contract', () => {
    const id = new Types.ObjectId();
    const document = serializeMongoDocument({
      _id: id,
      __v: 4,
      name: 'Project Alpha',
    });

    expect(document).toEqual({
      id: id.toHexString(),
      name: 'Project Alpha',
    });
  });
});
