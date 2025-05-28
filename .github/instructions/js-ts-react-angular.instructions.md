---
applyTo: "**/*.ts,**/*.tsx,**/*.js,**/*.jsx"
---

Apply the [general coding guidelines](./general-coding.instructions.md) to all code.

# Project coding standards for Javascript, TypeScript, React and Angular

## Javascript Guidelines
- Use `const` for variables that are not reassigned and `let` for variables that are reassigned. Avoid using `var`.
- Prefer arrow functions (`() => {}`) for anonymous functions, especially for callbacks and function expressions.
- Ensure all functions and methods have clear and descriptive names that convey their purpose.
- Use strict equality operators (`===` and `!==`) instead of abstract equality operators (`==` and `!=`).
- Always handle errors gracefully using `try...catch` blocks or promise `.catch()` methods. Provide meaningful error messages.
- Write modular code by encapsulating functionality into reusable functions or classes. Avoid monolithic functions.
- Adhere to consistent indentation using 2 spaces per indentation level.
- Use single quotes (`'`) for strings, except when the string contains a single quote that would require escaping.
- Place a space before the opening brace in blocks (e.g., `if (condition) {`).
- End every statement with a semicolon (`;`) to avoid automatic semicolon insertion pitfalls.
- Use template literals (`` `Hello, ${name}!` ``) instead of string concatenation for constructing strings.
- Avoid deeply nested code by returning early from functions when possible.
- Use array methods like `.map()`, `.filter()`, and `.reduce()` for array transformations instead of manual loops.
- Validate function inputs and throw errors for invalid arguments to ensure robustness.
- Group related functions and variables together to maintain logical structure within the code.
- Use descriptive names for boolean variables and functions (e.g., `isAvailable`, `hasPermission`).
- Avoid using magic numbers; define them as named constants to provide context.
- Comment complex or non-obvious code sections to explain the rationale behind the implementation.

## TypeScript Guidelines
- Enable full strictness in `tsconfig.json` (e.g., `"strict": true`) to catch errors early and enforce sound type safety.
- Avoid the non-primitive boxed types (`Number`, `String`, `Boolean`, `Symbol`, `Object`); use lowercase primitives (`number`, `string`, `boolean`, `symbol`, `object`) instead.
- Define explicit type annotations for function parameters and return types; leverage type inference sparingly for local variables.
- Use `interface` or `type` aliases to describe object shapes; prefer interfaces for extensibility and type aliases for unions and primitives.
- Use `enum` for sets of related constants; export enums centrally and import where needed to ensure consistency.
- Favor generics (`<T>`) for reusable components and functions; ensure generic parameters are actually used to avoid unused type parameters.
- Apply utility types (`Partial`, `Required`, `Pick`, `Omit`, `Record`, etc.) to transform types without duplicating definitions.
- Organize code into ES modules (`import`/`export`); use index files for clean module re-exports.
- Implement exhaustive `switch` statements on discriminated unions and include a `never` fallback to ensure completeness.
- Handle asynchronous errors with `async/await` and `try…catch`; use promise `.catch()` where appropriate.
- Use `unknown` instead of `any` when accepting arbitrary values, and validate or narrow types before using.
- Apply consistent naming: `PascalCase` for types and interfaces, `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for constants.
- Leverage ESLint with the `@typescript-eslint` plugin and Prettier to enforce style and catch semantic issues.
- Keep module files focused (one primary export per file) and group related types and functions together.
- Avoid ambient declarations except for third-party library augmentation; prefer inline module declarations in `.d.ts` files.

## React Guidelines
- Always assume `"strict": true` in `tsconfig.json`—Copilot should generate strictly typed components to catch errors early.
- Suggest only function components using hooks (`useState`, `useEffect`, etc.) over class components for cleaner, more concise code.
- For every component, define a `Props` interface (or `type`) and annotate both props and state explicitly for clarity.
- Extract reusable logic (data fetching, event handlers) into custom hooks named `useXxx` to enforce separation of concerns.
- Use `Partial`, `Pick`, `Omit`, `Record`, etc., to transform prop or state types without duplicating definitions.
- Never default to `any`; use `unknown` for external data and apply type guards before use to preserve type safety.
- Wrap pure components in `React.memo` and wrap expensive computations in `useMemo` to prevent unnecessary re-renders.
- Structure each feature folder with its component, hook, styles, and tests grouped together (e.g., `src/features/Widget/Widget.tsx`).
- Prepend each component and hook with concise JSDoc describing its purpose, inputs, and outputs so auto-generated docs stay accurate.
- When using third-party libraries, ensure Copilot includes the corresponding `@types/*` import to maintain complete type coverage.

## Angular Guidelines
- Always generate modules, components, services, and pipes via `ng generate` to keep config and conventions consistent.
- Organize code into feature modules instead of file-type directories (e.g., `app/users/` with `users.module.ts`).
- Favor standalone components and `providedIn: 'root'` services over NgModules when possible, per the 2025 style guide update.
- Use TypeScript interfaces (no `I` prefix) for all data models to enforce shape consistency across services and components.
- Use `pipe(map, filter, switchMap, catchError)` for all `Observable` transformations, and unsubscribe automatically via the `async` pipe or `takeUntil`.
- Inject services via constructors (using `@Injectable({ providedIn: 'root' })`) to keep components thin and testable.
- Prefer `FormGroup`/`FormControl` over template-driven forms for complex validation and stronger typing of form data.
- Implement `CanActivate`/`CanDeactivate` guards returning `Observable<boolean>` or `Promise<boolean>` to protect routes, ensuring proper types.
- Configure `loadChildren` in the router for large features to improve startup performance and reduce initial bundle size.
- Use the Angular style guide’s `Do`/`Consider`/`Avoid` terminology when generating examples or comments to align with framework conventions.
