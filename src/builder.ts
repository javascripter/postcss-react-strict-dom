import * as babel from '@babel/core'
import type { AtRule, Message, Root } from 'postcss'

import * as path from 'node:path'
import * as fs from 'node:fs'
import { normalize, resolve } from 'path'
import { globSync } from 'fast-glob'
import isGlob from 'is-glob'
import globParent from 'glob-parent'

import { createBundler } from './bundler'

/**
 * Parses a glob pattern and extracts its base directory and pattern.
 * @param pattern - The glob pattern to parse.
 * @returns An object containing the base directory and the remaining glob.
 */
function parseGlob(pattern: string) {
  // Based on:
  // https://github.com/chakra-ui/panda/blob/6ab003795c0b076efe6879a2e6a2a548cb96580e/packages/node/src/parse-glob.ts
  let glob = pattern
  const base = globParent(pattern)

  if (base !== '.') {
    glob = pattern.substring(base.length)
    if (glob.charAt(0) === '/') {
      glob = glob.substring(1)
    }
  }

  if (glob.substring(0, 2) === './') {
    glob = glob.substring(2)
  }
  if (glob.charAt(0) === '/') {
    glob = glob.substring(1)
  }

  return { base, glob }
}

/**
 * Parses a file path or glob pattern into a PostCSS dependency message.
 * @param fileOrGlob - The file path or glob pattern to parse.
 * @returns A PostCSS dependency message or null if the input is excluded.
 */
export function parseDependency(fileOrGlob: string) {
  // Based on:
  // https://github.com/chakra-ui/panda/blob/6ab003795c0b076efe6879a2e6a2a548cb96580e/packages/node/src/parse-dependency.ts
  if (fileOrGlob.startsWith('!')) {
    return null
  }

  let message: Message | null = null

  if (isGlob(fileOrGlob)) {
    const { base, glob } = parseGlob(fileOrGlob)
    message = { type: 'dir-dependency', dir: normalize(resolve(base)), glob }
  } else {
    message = { type: 'dependency', file: normalize(resolve(fileOrGlob)) }
  }

  return message
}

/**
 * Creates a builder for transforming files and bundling StyleX CSS.
 * @returns An object with methods to configure, build, and find StyleX at-rules.
 */
export function createBuilder() {
  let config: {
    include: string[]
    exclude: string[]
    cwd: string
    babelConfig: babel.TransformOptions
  } | null = null

  const bundler = createBundler()

  const fileModifiedMap = new Map<string, number>()

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

  /**
   * Retrieves the current configuration.
   * @throws If the builder has not been configured.
   * @returns The current configuration object.
   */
  function getConfig() {
    if (config == null) {
      throw new Error('Builder not configured')
    }
    return config
  }

  /**
   * Finds the `@stylex;` at-rule in the provided PostCSS root.
   * @param root - The PostCSS root node to search.
   * @returns The found StyleX at-rule, or null if not found.
   */
  function findStyleXAtRule(root: Root) {
    let styleXAtRule: AtRule | null = null
    root.walkAtRules((atRule) => {
      if (atRule.name === 'stylex' && !atRule.params) {
        styleXAtRule = atRule
      }
    })
    return styleXAtRule
  }

  /**
   * Retrieves all files that match the include and exclude patterns.
   * @returns An array of file paths.
   */
  function getFiles() {
    const { cwd, include, exclude } = getConfig()
    return globSync(include, {
      onlyFiles: true,
      ignore: exclude,
      cwd,
    })
  }

  /**
   * Transforms the included files, bundles the CSS, and returns the result.
   * @returns The bundled CSS as a string.
   */
  async function build() {
    const { cwd, babelConfig } = getConfig()

    const files = getFiles()
    const filesToTransform = []

    // Remove deleted files since the last build
    for (const file of fileModifiedMap.keys()) {
      if (!files.includes(file)) {
        fileModifiedMap.delete(file)
        bundler.remove(file)
      }
    }

    for (const file of files) {
      const filePath = path.resolve(cwd, file)
      const mtimeMs = fs.existsSync(filePath)
        ? fs.statSync(filePath).mtimeMs
        : -Infinity

      // Skip files that have not been modified since the last build
      // On first run, all files will be transformed
      const shouldSkip =
        fileModifiedMap.has(file) && mtimeMs === fileModifiedMap.get(file)

      if (shouldSkip) {
        continue
      }

      fileModifiedMap.set(file, mtimeMs)
      filesToTransform.push(file)
    }

    await Promise.all(
      filesToTransform.map((file) => {
        const filePath = path.resolve(cwd, file)
        const contents = fs.readFileSync(filePath, 'utf-8')
        if (!bundler.shouldTransform(contents)) {
          return
        }
        return bundler.transform(file, contents, babelConfig)
      })
    )

    const css = bundler.bundle()
    return css
  }

  /**
   * Retrieves the dependencies that PostCSS should watch.
   * @returns An array of PostCSS dependency messages.
   */
  function getDependencies() {
    const { include } = getConfig()
    const dependencies: Message[] = []

    for (const fileOrGlob of include) {
      const dependency = parseDependency(fileOrGlob)
      if (dependency != null) {
        dependencies.push(dependency)
      }
    }

    return dependencies
  }

  return {
    findStyleXAtRule,
    configure,
    build,
    getDependencies,
  }
}
