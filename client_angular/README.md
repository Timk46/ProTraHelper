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

### Dynamic routing functionality

  -`/dashboard/concept/:conceptId/question/:questionId` - Dynamic question component within a concept. This route can be used to directly navigate to a specific question within a concept. For example, `/dashboard/concept/5/question/42` will open question with ID 42 in concept 5. This is particularly useful for sharing links to specific questions in discussions or for bookmarking important questions.
