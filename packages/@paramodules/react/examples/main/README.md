# 🚀 @typectx/react example

This example showcases a basic social media wireframe built with @typectx/react dependency injection patterns, demonstrating how to eliminate prop-drilling while maintaining type safety and testability.

A preview browser should automatically show up, but if it doesn't, simply click on the Terminal icon in the sidebar, then click on 3001 under PREVIEWS.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

## 🏗️ Architecture Overview

```
src/
├── components/        # UI components as App Services
│   ├── app.tsx       # Main app component
│   ├── comment.tsx   # Comment component
│   ├── feed.tsx      # Feed component
│   ├── post.tsx      # Post component
│   ├── reply.tsx     # Reply component
│   └── session.tsx   # Session management component
├── api.ts            # API service definitions and data fetching
├── req.ts            # Request data used globally
├── index.css         # Global styles
├── main.tsx          # Application entry point
├── hooks.ts          # Stability/debug helper hooks for the demo
└── query.ts          # React Query initialization
```

## 📚 Learning Path

1. **Explore `src/api.ts`** - See how to integrate react-query for data loading and preloading
2. **Check `src/req.ts`** - See how request services are defined with `service(...).request()`.
3. **Review `src/components/`** - Understand how to create components as app services with JSX
4. **Examine `src/main.tsx`** - See how everything is assembled and used
5. **Experiment with the live demo** - Notice the absence of waterfall loading

## 📖 Related Documentation

- [typectx Core Library](https://github.com/typectx/typectx)
- [typectx Documentation](https://github.com/typectx/typectx#readme)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ using [typectx](https://github.com/typectx/typectx) - Fully type-inferred Context and DI container for Typescript**
