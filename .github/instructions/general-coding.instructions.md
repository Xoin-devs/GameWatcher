---
applyTo: "**/*"
---

# Project coding standards for general programming

- Use clear and descriptive names for variables, functions, classes, and other identifiers. Follow language-specific naming conventions (e.g., `camelCase` for variables and functions, `PascalCase` for classes).
- Use ALL_CAPS for constants and configuration values that should not change.
- Maintain consistent indentation and formatting throughout the codebase to enhance readability.
- Write code that is easy to read and understand. Avoid complex and nested structures when simpler alternatives exist.
- Break down code into smaller, reusable functions or modules, each handling a single responsibility.
- Implement robust error handling using appropriate mechanisms (e.g., try-catch blocks, error codes) and provide meaningful error messages.
- Include comments to explain the purpose of complex code blocks and document public APIs with clear descriptions of their behavior, parameters, and return values.
- Avooid comments that are obvious or redundant; focus on explaining why something is done rather than what is done.
- Avoid comments for one line.
- Define constants for values that have specific meanings to improve code clarity and maintainability.
- Validate all inputs to functions and methods to prevent unexpected behavior or security vulnerabilities.
- Follow best practices to secure code, such as sanitizing inputs, managing secrets appropriately, and adhering to the principle of least privilege.
- Write efficient code by avoiding unnecessary computations and choosing appropriate data structures and algorithms.
- Organize files and directories logically to make the project structure intuitive and navigable.
- Leverage language-specific features and standard libraries to write concise and effective code.
- Use language-specific idioms and patterns to write idiomatic code that aligns with the expectations of other developers familiar with the language.

### REFACTORING GUIDANCE
When refactoring large files:
- Break work into logical, independently functional chunks
- Ensure each intermediate state maintains functionality

### RATE LIMIT AVOIDANCE
- For very large files, suggest splitting changes across multiple sessions
- Prioritize changes that are logically complete units
- Always provide clear stopping points
