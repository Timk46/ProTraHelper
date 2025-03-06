# ClientAngular

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.2.4.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Application Routing Guide

The application uses Angular's routing system to navigate between different components. Below is a detailed explanation of the available routes:

### Authentication Routes

- `/login` - Login page for user authentication
- `/not-registered` - Page shown to logged-in users who are not registered for a subject

### Main Application Routes

All routes below require authentication via the `LoggedInGuard`:

- `/dashboard` - Main dashboard view (requires `RegisteredForSubjectGuard`)
  - `/dashboard/contentBoard` - Content board overview
  - `/dashboard/concept` - General concept overview
  - `/dashboard/concept/:conceptId` - Specific concept view
    - `/dashboard/concept/:conceptId/question/:questionId` - Dynamic question component within a concept. This route can be used to directly navigate to a specific question within a concept. For example, `/dashboard/concept/5/question/42` will open question with ID 42 in concept 5. This is particularly useful for sharing links to specific questions in discussions or for bookmarking important questions.
  - `/dashboard/discussion` - Discussion list view
  - `/dashboard/codeTask` - Code task component
  - `/dashboard/pdfViewer/:uniqueIdentifier` - PDF viewer for specific documents
  - `/dashboard/graph` - Graph visualization component
  - `/dashboard/chatbot` - Chatbot interface
  - `/dashboard/video` - Video timestamp component
  - `/dashboard/task-evaluation-overview` - Task evaluation overview
  - `/dashboard/mcqcreation` - Multiple choice question creation interface

### Lecturer/Admin Routes

These routes require both `LoggedInGuard` and `AdminGuard`:

- `/dashboard/editchoice/:questionId` - Edit choice questions
- `/dashboard/editcoding/:questionId` - Edit coding questions
- `/dashboard/editfillin/:questionId` - Edit fill-in questions
- `/dashboard/editfreetext/:questionId` - Edit free text questions
- `/dashboard/editgraph/:questionId` - Edit graph questions

### Standalone Routes

- `/discussion-view/:discussionId` - Detailed discussion view (requires authentication)
- `/graphtask/:questionId` - Graph task component (requires authentication)

### Lazy-Loaded Modules

- `/tutor-kai/*` - Tutor-Kai module (lazy-loaded, requires authentication)
- `/admin/*` - Admin module (lazy-loaded, requires both authentication and admin privileges)

To navigate programmatically, use Angular's Router service:
