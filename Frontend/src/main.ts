import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAppInitializer, inject } from '@angular/core';
import { App } from './app/app';
import { routes } from './app/routes';
import { ApiConfig, authInterceptor } from './app/core/api';
bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => inject(ApiConfig).load()),
  ],
}).catch(console.error);
