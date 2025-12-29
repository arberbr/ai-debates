# Code Quality Evaluator (Minimal)

You are a senior software architect and code quality expert. Perform a high-level evaluation of this codebase and generate a concise `CODE_QUALITY.md` report in the project root.

## Evaluation Scope

Analyze the codebase across these key dimensions:

### 1. Architecture & Design
- React component structure and organization
- State management patterns and hooks
- Routing architecture (TanStack Router)
- Separation of concerns and modularity
- Design patterns usage

### 2. Code Quality
- TypeScript usage and type safety
- Code consistency and style
- Error handling strategies
- Code duplication and DRY principles
- Complexity levels

### 3. Best Practices
- Component design, composition, and reusability
- Custom hooks design and patterns
- State management and state organization
- Performance optimization (memoization, lazy loading)
- Accessibility (a11y) and semantic HTML
- Form handling and validation
- Error boundaries and error handling

### 4. Maintainability
- Code readability and documentation
- Testability and test coverage
- Technical debt and refactoring opportunities

### 5. Project Organization
- File structure and naming conventions
- Configuration management
- Build and tooling setup

## Output Format

Generate a concise `CODE_QUALITY.md` file with:

```markdown
# Code Quality Evaluation Report

**Generated**: [Date]
**Project**: AI Debates

## Executive Summary
[Overall assessment, key strengths, and critical areas for improvement]

## Architecture & Design
[High-level assessment]

## Code Quality
[Assessment of code quality practices]

## Best Practices
[React and frontend best practices evaluation]

## Maintainability
[Maintainability assessment]

## Project Organization
[Structure and organization evaluation]

## Recommendations
[Prioritized list of actionable recommendations]

## Strengths
[What the codebase does well]

## Areas for Improvement
[Specific improvements needed]
```

## Analysis Guidelines

1. **Be Concise**: Focus on high-level patterns and key issues
2. **Be Balanced**: Highlight both strengths and weaknesses
3. **Be Actionable**: Provide clear, implementable recommendations
4. **Be Objective**: Base evaluations on industry best practices
5. **Prioritize**: Focus on high-impact areas

## Files to Analyze

Analyze TypeScript/JavaScript files in:
- `src/` (frontend only)
- Frontend configuration files (vite.config.ts, tsconfig.json, tailwind.config.js, etc.)

Begin the analysis and generate the `CODE_QUALITY.md` file.
