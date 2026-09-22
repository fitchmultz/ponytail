import { withDefault } from './defaults.mjs';
export const pageSize = options => withDefault(options.pageSize, 25);
export const includeArchived = options => withDefault(options.includeArchived, true);
