// src/cli/ui/banner.js
// Prints the RouterX startup banner once per invocation.

import chalk from 'chalk';
import pkg from '../../../package.json' with { type: 'json' };
import { divider, sectionTitle } from './layout.js';
import { getCliSession, hasBannerBeenShown, markBannerShown } from '../state/session.js';

export function renderStartupBanner() {
  if (hasBannerBeenShown()) {
    return;
  }

  const session = getCliSession();
  const title = sectionTitle(`RouterX v${pkg.version}`, { icon: '🚀', meta: 'OpenRouter CLI' });
  const environmentLine = chalk.dim(`Environment: ${session.environment}`);

  console.log('');
  console.log(title);
  console.log(environmentLine);
  console.log(divider());
  console.log('');

  markBannerShown();
}
