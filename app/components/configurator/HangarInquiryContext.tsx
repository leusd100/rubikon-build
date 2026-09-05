'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';

type HangarInquiryContextValue = {
  state: ConfiguratorState;
  setState: (state: ConfiguratorState) => void;
  isAttached: boolean;
  attachConfiguration: () => void;
};

const HangarInquiryContext = createContext<HangarInquiryContextValue | null>(null);

export function HangarInquiryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfiguratorState>(DEFAULT_CONFIGURATOR_STATE);
  const [isAttached, setIsAttached] = useState(false);
  const value = useMemo(
    () => ({ state, setState, isAttached, attachConfiguration: () => setIsAttached(true) }),
    [isAttached, state],
  );

  return <HangarInquiryContext.Provider value={value}>{children}</HangarInquiryContext.Provider>;
}

export function useHangarInquiryContext() {
  return useContext(HangarInquiryContext);
}
