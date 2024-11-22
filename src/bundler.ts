import * as babel from '@babel/core'
import reactStrictBabelPreset from 'react-strict-dom/babel-preset'

declare module '@babel/core' {
  interface TransformCaller {
    name: string
    supportsStaticESM?: boolean | undefined
    supportsDynamicImport?: boolean | undefined
    supportsExportNamespaceFrom?: boolean | undefined
    supportsTopLevelAwait?: boolean | undefined
    // Added properties
    isDev?: boolean | undefined
    platform?: string
  }
}

type StyleXRule = string

/**
 * Creates a bundler for processing StyleX rules using Babel and React Strict DOM.
 * @returns An object with methods to transform files, remove entries, and bundle CSS.
 */
export function createBundler() {
  const styleXRulesMap = new Map<string, StyleXRule[]>()

  /**
   * Determines if the source code should be transformed based on the presence of StyleX imports.
   */
  function shouldTransform(sourceCode: string) {
    return (
      sourceCode.includes('stylex') || sourceCode.includes('react-strict-dom')
    )
  }

  /**
   * Transforms the source code using Babel, extracting StyleX rules and storing them.
   * @param id - The unique identifier for the file (usually the file path).
   * @param sourceCode - The source code to transform.
   * @param babelConfig - The Babel configuration options to use during transformation.
   * @returns An object containing the transformed code, source map, and metadata.
   */
  async function transform(
    id: string,
    sourceCode: string,
    babelConfig: babel.TransformOptions,
    options: {
      isDev: boolean
      shouldSkipTransformError: boolean
    }
  ) {
    const { isDev, shouldSkipTransformError } = options
    const { code, map, metadata } = await babel
      .transformAsync(sourceCode, {
        filename: id,
        caller: {
          name: 'postcss-react-strict-dom',
          platform: 'web',
          isDev,
          supportsStaticESM: true,
        },
        ...babelConfig,
      })
      .catch((error) => {
        if (shouldSkipTransformError) {
          console.warn(
            `[postcss-react-strict-dom] Failed to transform "${id}": ${error.message}`
          )

          return { code: sourceCode, map: null, metadata: {} }
        }
        throw error
      })
    const stylex = (metadata as { stylex?: StyleXRule[] }).stylex
    if (stylex != null && stylex.length > 0) {
      styleXRulesMap.set(id, stylex)
    }

    return { code, map, metadata }
  }

  /**
   * Removes the stored StyleX rules for the specified file.
   * @param id - The unique identifier for the file (usually the file path).
   */
  function remove(id: string) {
    styleXRulesMap.delete(id)
  }

  /**
   * Bundles all collected StyleX rules into a single CSS string.
   * @returns The generated CSS string from the collected StyleX rules.
   */
  function bundle() {
    const rules = Array.from(styleXRulesMap.values()).flat()

    const css = reactStrictBabelPreset.generateStyles(rules)

    return css
  }

  return {
    shouldTransform,
    transform,
    remove,
    bundle,
  }
}
