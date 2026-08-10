import { createRequestId } from './request-id';

describe('createRequestId', () => {
  it('preserves a safe caller-provided request id', () => {
    expect(createRequestId('client-request-123')).toBe('client-request-123');
  });

  it.each(['short', 'contains spaces', '../unsafe', 'a'.repeat(129)])(
    'replaces an unsafe request id: %s',
    (requestId) => {
      expect(createRequestId(requestId)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    },
  );
});
