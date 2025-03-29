Guide to update your Angular application v15.0 -> v18.0 for basic applications
Before you update
You don't need to do anything before moving between these versions.
Update to the new version
Review these changes and perform the actions to update your application.

ERLEDIGT Make sure that you are using a supported version of node.js before you upgrade your application. Angular v16 supports node.js versions: v16 and v18.

ERLEDIGT Make sure that you are using a supported version of TypeScript before you upgrade your application. Angular v16 supports TypeScript version 4.9.3 or later.

ERLEDIGT In the application's project directory, run ng update @angular/core@16 @angular/cli@16 to update your application to Angular v16.

ERLEDIGT Run ng update @angular/material@16.

ERLEDIGT Make sure that you are using a supported version of Zone.js before you upgrade your application. Angular v16 supports Zone.js version 0.13.x or later.

ERLEDIGT Due to the removal of the Angular Compatibility Compiler (ngcc) in v16, projects on v16 and later no longer support View Engine libraries.

ERLEDIGT Update your code to remove any reference to @Directive/@Component moduleId property as it does not have any effect and will be removed in v17.

ERLEDIGT entryComponents is no longer available and any reference to it can be removed from the @NgModule and @Component public APIs.

ERLEDIGT QueryList.filter now supports type guard functions. Since the type will be narrowed, you may have to update your application code that relies on the old behavior.

Make sure that you are using a supported version of node.js before you upgrade your application. Angular v17 supports node.js versions: v18.13.0 and newer

Make sure that you are using a supported version of TypeScript before you upgrade your application. Angular v17 supports TypeScript version 5.2 or later.

Make sure that you are using a supported version of Zone.js before you upgrade your application. Angular v17 supports Zone.js version 0.14.x or later.

In the application's project directory, run ng update @angular/core@17 @angular/cli@17 to update your application to Angular v17.

Run ng update @angular/material@17.

Make sure you configure setupTestingRouter, canceledNavigationResolution, paramsInheritanceStrategy, titleStrategy, urlUpdateStrategy, urlHandlingStrategy, and malformedUriErrorHandler in provideRouter or RouterModule.forRoot since these properties are now not part of the Router's public API

You may need to adjust the equality check for NgSwitch because now it defaults to stricter check with === instead of ==. Angular will log a warning message for the usages where you'd need to provide an adjustment.

If you want the child routes of loadComponent routes to inherit data from their parent specify the paramsInheritanceStrategy to always, which in v17 is now set to emptyOnly.

Make sure that you are using a supported version of node.js before you upgrade your application. Angular v18 supports node.js versions: v18.19.0 and newer

In the application's project directory, run ng update @angular/core@18 @angular/cli@18 to update your application to Angular v18.

Run ng update @angular/material@18.

Update TypeScript to versions 5.4 or newer.
After you update
You don't need to do anything after moving between these versions.
