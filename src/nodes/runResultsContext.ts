import { createContext } from 'react';
import type { NodeRunResult } from '../types';

/** Results of the last run, keyed by node id. Lets each node show its status. */
export const RunResultsContext = createContext<Record<string, NodeRunResult>>({});
