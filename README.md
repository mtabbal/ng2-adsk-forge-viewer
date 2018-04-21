# Angular Autodesk Forge Viewer

Angular wrapper for the [Autodesk Forge Viewer](https://developer.autodesk.com).

The wrapper was designed to meet the following requirements:

- A viewer component that can be dropped in to an angular anywhere; the component would take care of loading required Scripts and CSS from Autodesk's servers, rather than requiring these to be declared in the index.html.
  - Ensure the viewer can be displayed and removed from the DOM via *ngIf 
- A basic viewer extension to subscribe to common viewer events - such as Seletion changed, object tree loaded etc. and expose these events on the component
- Provide TypeScript typings for most of the Forge Viewer API to make the component nice to work with.
  - All events have strongly typed arguments too.
  - Three.js typings are included too so that where the forge API returns a three js object (such as camera) that is fully typed too.
  > NOTE that I do NOT work for Autodesk and have developed these typings based on the Forge viewer documentation. Some typings might NOT be correct.
- A component that can be dropped in to display a document thumbnail.

## Dependencies

The library targets Angular 5.

## Using the viewer component

Follow these steps to get the viewer working in your app

### Step 1
Add the ng2-adsk-forge-viewer NPM package to your app - npm install `ng2-adsk-forge-viewer --save` or `yarn add ng2-adsk-forge-viewer`

### Step 2
Add `<adsk-forge-viewer></adsk-forge-viewer>` element to your component html

component.html:
```html
<adsk-forge-viewer [viewerOptions]="viewerOptions3d"
                   (onViewerScriptsLoaded)="setViewerOptions()"
                   (onViewingApplicationInitialized)="loadDocument($event)">
</adsk-forge-viewer>
```

### Step 3
There is a specific flow of logic to initialize the viewer:

1. The viewer is constructed and loads scripts/resources from Autodesk's servers
2. The onViewerScriptsLoaded event emits to indicate all viewer resources have been loaded
3. viewerOptions input can now be set, which triggers the creation of the ViewingApplication (i.e. Autodesk.Viewing.Initializer is called)
    - A helper method `getDefaultViewerOptions` can be used to get the most basic viewer options
4. The `onViewingApplicationInitialized` event is emitted and you can now load a document. The event arguments contain a reference to the viewer which can be used to set the documentId to load. E.g.:
  ```typescript
  public loadDocument(event: ViewingApplicationInitializedEvent) {
    event.viewerComponent.DocumentId = 'DOCUMENT_URN_GOES_HERE';
  }
  ```

### Step 4
When the document has been loaded the `onDocumentChanged` event is emitted. This event can be used to define the view to display (by default, the viewer will load the first 3D viewable it can find).

An example of displaying a 2D viewable:

component.html:
```html
<adsk-forge-viewer [viewerOptions]="viewerOptions2d"
                    (onViewerScriptsLoaded)="setViewerOptions()"
                    (onViewingApplicationInitialized)="loadDocument($event)"
                    (onDocumentChanged)="documentChanged($event)"></adsk-forge-viewer>
```

component.ts:
```typescript
public documentChanged(event: DocumentChangedEvent) {
    const viewerApp = event.viewingApplication;
    if (!viewerApp.bubble) return;

    // Use viewerApp.bubble to get a list of 2D obecjts
    const viewables = viewerApp.bubble.search({ type: 'geometry', role: '2d' });
    if (viewables && viewables.length > 0) {
      event.viewerComponent.selectItem(viewables[0].data);
    }
  }
```

## FAQ

### 1. What ViewerOptions can be used to initialise the Viewer Component?

The ViewerOptions interface is as follows:

```typescript
interface ViewerOptions {
  initializerOptions: Autodesk.Viewing.InitializerOptions;
  viewerApplicationOptions?: Autodesk.Viewing.ViewingApplicationOptions;
  viewerConfig?: Autodesk.Viewing.ViewerConfig;
  headlessViewer?: boolean;
  showFirstViewable?: boolean;
  debugMessages?: boolean;
}
```

`initializerOptions` allows you to provide arguments for the [Autodesk.Viewing.Initializer](https://developer.autodesk.com/en/docs/viewer/v2/reference/javascript/initializer/). One of the most important settings is how the Forge viewer is to obtain it's access token.

You can provide an access key as a string, but I'd recommend using the function - the viewer will call the function you provide to obtain a new token when required - e.g. when the viewer first initialises or when the current token held by the viewer is shortly expiring.

Your viewer options code would look something like this:

```typescript
this.viewerOptions3d = {
  initializerOptions: {
    env: 'AutodeskProduction',
    getAccessToken: (onGetAccessToken: (token: string, expire: number) => void) => {
      // Call back-end API endpoint to get a new token
      // Pass new token and expire time to Viewer's callback method
      onGetAccessToken(ACCESS_TOKEN, EXPIRE_TIME);
    },
  },
};
```

The viewer component creates a Forge Viewer Application. The `viewerApplicationOptions` setting allows you to provide additional options to the viewering application. (https://developer.autodesk.com/en/docs/viewer/v2/reference/javascript/viewingapplication/).

`viewerConfig` allows you to provide additional options to Viewer3D's registered with the viewing application. Such as whether to ues the light or dark theme, any extensions to register with the viewer etc.

### 2. How do I configure a 'headless' viewer?

By default, the viewer component will intialise a 'full' `ViewingApplication` with toolbar, navigation controls etc. If you want a 'headless viewer' without these additional bits of UI, set the `headlessViewer` of the ViewOptions to true:

```typescript
this.viewerOptions3d = {
  initializerOptions: {
    env: 'AutodeskProduction',
    getAccessToken: (onGetAccessToken: (token: string, expire: number) => void) => {
      // Call back-end API endpoint to get a new token
      // Pass new token and expire time to Viewer's callback method
      onGetAccessToken(ACCESS_TOKEN, EXPIRE_TIME);
    },
  },
  headlessViewer: true,
};
```

## Extensions

Basic extension and how it's events can be tapped in to

Some common use cases that the component supports
