import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModuleNgFactory } from '../out-tsc/src/app/app.module.ngfactory';

void platformBrowserDynamic().bootstrapModuleFactory(AppModuleNgFactory);
