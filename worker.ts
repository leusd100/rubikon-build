import vinextWorker from 'vinext/server/app-router-entry';
import videoByteLengths from 'virtual:rubikon-video-byte-lengths';
import { withVideoByteRange } from './worker/video-range';
import { withLowPriorityModulePreloads } from './worker/modulepreload-priority';
import { withHeroThemeSources } from './worker/hero-theme-sources';
import {
  isImmutableAssetPathname,
  withImmutableCacheControl,
} from './worker/cache-policy';

interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response> | Response;
  };
}

const worker = {
  async fetch(
    request: Request,
    env?: WorkerEnv,
    ctx?: Parameters<typeof vinextWorker.fetch>[2],
  ) {
    const pathname = new URL(request.url).pathname;
    const videoLength = videoByteLengths[pathname];
    if (env?.ASSETS && videoLength !== undefined) {
      const asset = await env.ASSETS.fetch(request);
      return withVideoByteRange(request, asset, videoLength);
    }
    if (
      !env?.ASSETS ||
      !isImmutableAssetPathname(pathname)
    ) {
      return withHeroThemeSources(request, withLowPriorityModulePreloads(await vinextWorker.fetch(request, env, ctx)));
    }

    const response = await env.ASSETS.fetch(request);
    return withImmutableCacheControl(response);
  },
};

export default worker;
