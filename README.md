# postcss-react-strict-dom

**postcss-react-strict-dom** is a PostCSS plugin that enables static CSS
extraction with React Strict DOM, compatible with various bundlers like Next.js
and Expo Web.

## Installation

Install the plugin via npm or yarn:

```bash
npm install postcss-react-strict-dom --save-dev
# or
yarn add postcss-react-strict-dom --dev
```

## Usage

Configure `postcss.config.js` to include `postcss-react-strict-dom` in your project.

### PostCSS Configuration

Below is an example `postcss.config.js` setup for this plugin. By default, the plugin will reuse your project's Babel configuration for static CSS extraction.

```typescript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-react-strict-dom': {
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
        'node_modules/react-strict-dom/dist/**/*.{js,jsx,ts,tsx}',
      ],
    },
    autoprefixer: {},
  },
}
```

#### Configuration Options

- **include**: Array of paths or glob patterns to compile.
- **exclude**: Array of paths or glob patterns to exclude from compilation. Paths in `exclude` take precedence over `include`.
- **cwd**: Working directory for the plugin; defaults to `process.cwd()`.
- **babelConfig**: Options for Babel configuration. By default, the plugin reads from `babel.config.js` in your project. For custom configurations, set `babelrc: false` and specify desired options. Refer to [Babel Config Options](https://babeljs.io/docs/options) for available options.

Example extracted code snippet:

```typescript
/**
 * Configures the builder with the provided options.
 * @param options - The options to configure the builder.
 */
function configure(options: {
  include: string[]
  exclude: string[]
  cwd: string
  babelConfig: babel.TransformOptions
}) {
  config = options
}
```

### Babel Configuration

A separate Babel configuration file (`babel.config.js`) is required to support React Strict DOM. Configure it as shown below, referencing the `react-strict-dom` Babel preset.

#### Babel Config for React Strict DOM

Reference: [React Strict DOM Babel Preset](https://facebook.github.io/react-strict-dom/api/babel-preset/)

```javascript
// babel.config.js
import reactStrictBabelPreset from 'react-strict-dom/babel-preset'

export default function babelConfig() {
  return {
    presets: [[reactStrictBabelPreset, { rootDir: process.cwd() }]],
  }
}
```

### Running the Plugin

Once configured, the plugin will automatically process and extract static CSS based on your defined `include` and `exclude` options. This setup supports both web and native platforms for integrated projects like Expo.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Acknowledgments

Special thanks to the contributors of [React Strict DOM](https://facebook.github.io/react-strict-dom) and StyleX for their foundational work in CSS-in-JS and static extraction patterns.
````
