import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';

/** HOME's «Каркас» stays as it was (owner, 19.11): the configurator's example has two gates and a door since then; HOME's
 *  frame keeps the one gate and no door it showed — its end wall's posts and its tour's names were set out for that. */
export const HOME_FRAME_EXAMPLE: ConfiguratorState = { ...DEFAULT_CONFIGURATOR_STATE, gates: 1, gateType: 'standard', doors: 0 };
