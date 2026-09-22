import { withDefault } from './defaults.mjs';
export const title = options => withDefault(options.title, 'Untitled');
