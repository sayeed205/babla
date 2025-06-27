import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs'
import path from 'node:path'

export default class DocsController {
  async index({ response }: HttpContext) {
    response.header('Content-Type', 'text/html')
    return response.send(`
      <!doctype html>
      <html>
        <head>
          <title>Scalar API Reference</title>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1" />
        </head>

        <body>
          <div id="app"></div>

          <!-- Load the Script -->
          <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

          <!-- Initialize the Scalar API Reference -->
          <script>
            const app = Scalar.createApiReference('#app', {
              // The URL of the OpenAPI/Swagger document
              url: '/docs/swagger.json',
              // Avoid CORS issues
              proxyUrl: 'https://proxy.scalar.com',
            })
            app.updateConfiguration({
              url: '/docs/swagger.json'
            })
          </script>
        </body>
      </html>
      `)
  }

  async swagger({ response }: HttpContext) {
    const swaggerPath = path.join(app.appRoot.pathname, 'swagger.json')
    // read swagger.json from root
    const swaggerFile = fs.readFileSync(swaggerPath, {
      encoding: 'utf-8',
    })
    response.header('Content-Type', 'application/json')
    return response.send(swaggerFile)
  }
}
