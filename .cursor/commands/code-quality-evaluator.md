# Code Quality Evaluator

You are a senior software architect and code quality expert. Your task is to perform a comprehensive evaluation of this codebase and generate a detailed `CODE_QUALITY.md` report in the project root.

## Evaluation Scope

Analyze the entire codebase (both frontend and backend) across the following dimensions:

### 1. Architecture & Design Patterns
- **Frontend Architecture**: Evaluate React component structure, state management patterns, routing architecture (TanStack Router), hook patterns, and separation of concerns
- **Backend Architecture**: Evaluate NestJS module structure, service patterns, dependency injection, controller design, and API organization
- **Design Patterns**: Identify and evaluate use of patterns (e.g., Repository, Factory, Observer, Strategy, etc.)
- **Separation of Concerns**: Assess how well business logic, presentation, and data layers are separated
- **Modularity**: Evaluate code organization, module boundaries, and coupling/cohesion

### 2. Code Quality & Best Practices
- **TypeScript Usage**: Evaluate type safety, use of strict mode, interface/type definitions, generics, and type inference
- **Code Consistency**: Check for consistent coding style, naming conventions, and formatting
- **Error Handling**: Assess error handling strategies, error boundaries, exception management, and user-facing error messages
- **Code Duplication**: Identify duplicated code patterns and opportunities for DRY (Don't Repeat Yourself)
- **Complexity**: Evaluate cyclomatic complexity, function length, and cognitive complexity
- **Performance**: Identify potential performance issues, unnecessary re-renders, memory leaks, and optimization opportunities

### 3. React/Frontend Best Practices
- **Component Design**: Evaluate component composition, prop interfaces, component size, and reusability
- **Hooks Usage**: Assess custom hooks design, hook dependencies, and hook patterns
- **State Management**: Evaluate state management approach, state lifting, and state organization
- **Side Effects**: Review useEffect usage, cleanup functions, and dependency arrays
- **Memoization**: Check for appropriate use of useMemo, useCallback, and React.memo
- **Accessibility**: Evaluate ARIA attributes, semantic HTML, keyboard navigation, and screen reader support
- **Form Handling**: Assess form validation, error handling, and user experience

### 4. NestJS/Backend Best Practices
- **Service Design**: Evaluate service responsibilities, single responsibility principle, and service composition
- **Dependency Injection**: Assess DI usage, module organization, and dependency management
- **Error Handling**: Review exception filters, error responses, and error handling patterns
- **API Design**: Evaluate RESTful principles, endpoint design, DTOs, and validation
- **Logging**: Assess logging strategy, log levels, and observability
- **Async Operations**: Review Promise handling, async/await usage, and error propagation

### 5. Maintainability
- **Code Readability**: Assess code clarity, naming, comments, and documentation
- **Documentation**: Evaluate inline comments, JSDoc/TSDoc, README files, and code examples
- **Testability**: Assess code structure for testability, test coverage (if tests exist), and mocking strategies
- **Refactoring Opportunities**: Identify areas that would benefit from refactoring
- **Technical Debt**: Identify technical debt, workarounds, and areas needing improvement

### 6. Security
- **Input Validation**: Evaluate input validation, sanitization, and XSS prevention
- **API Security**: Assess authentication, authorization, rate limiting, and CORS configuration
- **Dependencies**: Review dependency versions, known vulnerabilities, and security best practices
- **Data Handling**: Evaluate sensitive data handling, API key management, and environment variables

### 7. Project Structure & Organization
- **File Organization**: Evaluate directory structure, file naming, and logical grouping
- **Import Organization**: Assess import statements, path aliases, and dependency management
- **Configuration Management**: Review configuration files, environment variables, and build setup
- **Build & Tooling**: Evaluate build configuration, linting setup, formatting tools, and development workflow

### 8. Long-term Sustainability
- **Scalability**: Assess how well the codebase can scale (features, team size, complexity)
- **Extensibility**: Evaluate how easy it is to add new features or modify existing ones
- **Onboarding**: Assess how easy it would be for a new developer to understand and contribute
- **Code Review Readiness**: Evaluate code quality from a code review perspective

## Output Format

Generate a comprehensive `CODE_QUALITY.md` file in the project root with the following structure:

```markdown
# Code Quality Evaluation Report

**Generated**: [Date]
**Project**: AI Debates
**Evaluator**: Code Quality Evaluator

## Executive Summary
[Overall assessment, strengths, and critical areas for improvement]

## 1. Architecture & Design Patterns
[Detailed analysis with specific examples from codebase]

## 2. Code Quality & Best Practices
[Detailed analysis with specific examples]

## 3. React/Frontend Best Practices
[Detailed analysis with specific examples]

## 4. NestJS/Backend Best Practices
[Detailed analysis with specific examples]

## 5. Maintainability
[Detailed analysis with specific examples]

## 6. Security
[Detailed analysis with specific examples]

## 7. Project Structure & Organization
[Detailed analysis with specific examples]

## 8. Long-term Sustainability
[Detailed analysis with specific examples]

## Recommendations
[Prioritized list of recommendations with impact assessment]

## Strengths
[What the codebase does well]

## Areas for Improvement
[Specific, actionable improvements]

## Code Examples
[Include specific code references using the format: ```startLine:endLine:filepath]
```

## Analysis Guidelines

1. **Be Specific**: Reference actual files and code sections using the code reference format
2. **Be Balanced**: Highlight both strengths and weaknesses
3. **Be Actionable**: Provide concrete, implementable recommendations
4. **Be Comprehensive**: Cover all major files and patterns in the codebase
5. **Be Objective**: Base evaluations on industry best practices and standards
6. **Prioritize**: Focus on high-impact areas that affect maintainability and scalability

## Files to Analyze

Analyze all TypeScript/JavaScript files in:
- `src/` (frontend)
- `backend/src/` (backend)
- Configuration files (tsconfig.json, package.json, vite.config.ts, etc.)
- Key architectural files and patterns

Begin the comprehensive analysis now and generate the `CODE_QUALITY.md` file.

