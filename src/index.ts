import path from 'path'
import { build, createServer, loadConfigFromFile, mergeConfig, Plugin, UserConfig, ViteDevServer } from "vite";
import c from 'picocolors'

export default function plugin({ config, entry }: { config: string, entry: string }): Plugin {
  let api: ViteDevServer;
  let mode: string;

  return {
    name: 'vite-hono-api',
    async configResolved(resolvedConfig) {
      mode = resolvedConfig.mode;
      const loaded = await loadConfigFromFile({ command: 'serve', mode, isSsrBuild: true }, config);
      api = await createServer(mergeConfig(loaded?.config ?? {}, { root: path.resolve(config, '..'), server: { port: 5173 + 1 } }));
    },
    async configureServer(server) {
      const print = server.printUrls
      server.printUrls = () => {
        print()
        server.config.logger.info("")
        server.config.logger.info(`  ${c.magenta(c.bold('API'))}  ${c.dim(api.config.mode)}`)
        server.config.logger.info("")
        api.printUrls()
      }
      await api.listen()
    },
    async closeBundle() {
      const loaded = await loadConfigFromFile({ command: 'build', mode, isSsrBuild: true }, config);
      const virtualModuleId = 'virtual:my-module'
      const resolvedVirtualModuleId = '\0' + virtualModuleId;
      await build(mergeConfig(loaded?.config ?? {},
        {
          root: path.resolve(config, '..'),
          plugins: [{
            name: 'vite-hono-api',
            apply: 'build',
            resolveId(id: string) {
              if (id === virtualModuleId) {
                return resolvedVirtualModuleId
              }
            },
            load(id: string) {
              if (id === resolvedVirtualModuleId) {
                return `import { serve } from '@hono/node-server';import app from '${entry}';\nserve(app)`
              }
            },
          }],
          ssr: {
            target: "node",
            noExternal: true,
          },
          build: {
            ssr: true,
            rollupOptions: {
              input: virtualModuleId,
              output: {
                entryFileNames: 'index.js',
              }
            }
          }
        } as UserConfig)).then(() => api.close())
    },
  }
}
