import { Component } from '@angular/core';
import { ViewerOptions } from './modules/viewer/viewer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'app';

  public viewerOptions: ViewerOptions;
  public documentId: string;

  setViewerOptions() {
    this.viewerOptions = {
      initializerOptions: {
        env: 'AutodeskProduction',
        getAccessToken: (onGetAccessToken: (token: string, expire: number) => void) => {
          const accessToken = '<YOUR_APPLICATION_TOKEN>';
          const expireTimeSeconds = 60 * 30;
          onGetAccessToken(accessToken, expireTimeSeconds);
        },
      },
    };
  }

  loadDocument() {
    this.documentId = '<YOUR_URN_ID>';
  }
}
