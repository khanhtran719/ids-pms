import type { SchemaOptions } from 'mongoose';

type MongoDocumentJson = Record<string, unknown> & {
  _id?: { toString(): string } | string;
  __v?: unknown;
};

export function serializeMongoDocument(
  document: MongoDocumentJson,
): Record<string, unknown> {
  const id = document._id;
  const publicFields: MongoDocumentJson = { ...document };
  delete publicFields._id;
  delete publicFields.__v;

  return {
    ...publicFields,
    ...(id === undefined ? {} : { id: id.toString() }),
  };
}

export const BASE_SCHEMA_OPTIONS: SchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (_document, returnedObject) =>
      serializeMongoDocument(returnedObject as MongoDocumentJson),
  },
};
