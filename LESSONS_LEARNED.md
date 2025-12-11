# Lessons Learned / Anti-Patterns

1. **Firebase Auth**: Do not use `getAuth()` directly in components; always pass the user object from `App.jsx`.
2. **Tailwind**: Do not use dynamic template literals for color classes (e.g., `bg-${color}-500`) because Tailwind can't purge them. Use full class names.
3. **Line Endings**: Always enforce LF line endings.
4. **Vite**: Do not use `require()` imports; use ES `import`.
