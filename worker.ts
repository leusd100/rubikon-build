import vinextWorker from 'vinext/server/app-router-entry';
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
    if (
      !env?.ASSETS ||
      !isImmutableAssetPathname(new URL(request.url).pathname)
    ) {
      return vinextWorker.fetch(request, env, ctx);
    }

    const response = await env.ASSETS.fetch(request);
    return withImmutableCacheControl(response);
  },
};

export default worker;
