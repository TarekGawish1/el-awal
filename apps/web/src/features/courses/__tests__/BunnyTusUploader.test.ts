import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBunnyTusUpload } from '../utils/bunny-tus-uploader';
import * as tus from 'tus-js-client';

vi.mock('tus-js-client', () => {
  return {
    Upload: vi.fn().mockImplementation((file, options) => {
      return {
        options,
        file,
        start: vi.fn().mockImplementation(function (this: any) {
          options.onProgress?.(50, 100);
          options.onSuccess?.();
        }),
        abort: vi.fn(),
      };
    }),
  };
});

describe('createBunnyTusUpload', () => {
  const fakeFile = new File(['fake-video-content'], 'test.mp4', { type: 'video/mp4' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('configures tus.Upload with Bunny Stream requirements and headers', () => {
    const onProgress = vi.fn();
    const onSuccess = vi.fn();

    const uploader = createBunnyTusUpload({
      file: fakeFile,
      videoId: 'vid-123',
      libraryId: 'lib-456',
      authorizationSignature: 'sig-789',
      authorizationExpire: 1728669600,
      title: 'Test Lesson Title',
      onProgress,
      onSuccess,
    });

    uploader.start();

    expect(tus.Upload).toHaveBeenCalledWith(
      fakeFile,
      expect.objectContaining({
        endpoint: 'https://video.bunnycdn.com/tusupload',
        headers: {
          AuthorizationSignature: 'sig-789',
          AuthorizationExpire: '1728669600',
          VideoId: 'vid-123',
          LibraryId: 'lib-456',
        },
        metadata: {
          filename: 'test.mp4',
          filetype: 'video/mp4',
          title: 'Test Lesson Title',
        },
      }),
    );

    expect(onProgress).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('calls abort cleanly on the underlying tus instance', () => {
    const uploader = createBunnyTusUpload({
      file: fakeFile,
      videoId: 'vid-123',
      libraryId: 'lib-456',
      authorizationSignature: 'sig-789',
      authorizationExpire: 1728669600,
    });

    uploader.abort();
    // Verify abort does not throw even before start
    expect(() => uploader.abort()).not.toThrow();
  });
});
