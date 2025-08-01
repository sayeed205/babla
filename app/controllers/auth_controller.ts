import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import AuthSession from '#models/auth_session'
import User from '#models/user'
import { traktPollValidator } from '#validators/auth_validator'
import env from '#start/env'

export default class AuthController {
  async start({ request }: HttpContext) {
    const backendUrl = app.inProduction
      ? `${request.protocol()}://${request.host()}`
      : 'https://iahmed.us.kg'
    const { tg } = await app.container.make('tg')
    const bot = await tg.getUser('self')

    // todo)) update origin
    const session = await AuthSession.create({})
    const callbackUrl = `${backendUrl}/auth/callback/${session.id}`
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${bot.id}&origin=${backendUrl}&return_to=${callbackUrl}&request_access=write`
    return {
      authUrl,
      session: session.id,
      expires: DateTime.now().plus({ minute: 10 }),
    }
  }

  async callback({ response }: HttpContext) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Processing Telegram Auth...</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f9fafb;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }

    .processing-container {
      background: #ffffff;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
      text-align: center;
      width: 100%;
      max-width: 400px;
    }

    .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #e74c3c;
      margin-top: 1rem;
    }

    .success {
      color: #27ae60;
      margin-top: 1rem;
    }

    .user-info {
      font-size: 0.9rem;
      color: #555;
      margin-top: 0.5rem;
      word-break: break-word;
    }

    button {
      background-color: #3498db;
      color: #fff;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="processing-container">
    <div class="loader"></div>
    <h2>Processing authentication...</h2>
    <div id="status"></div>
  </div>

  <script>
    function getAuthResult() {
      const params = new URLSearchParams(window.location.hash.substring(1));
const data = params.get('tgAuthResult');

      if (data) {
        try {
        console.log(data)
          const decoded = JSON.parse(atob(data));
          console.log('decoded', decoded);
          return decoded;
        } catch (e) {
          console.error('Error decoding auth result:', e);
          return null;
        }
      }
      return null;
    }

    function processAuth() {
      const authResult = getAuthResult();

      if (!authResult) {
        document.getElementById('status').innerHTML =
          '<div class="error">Authentication failed: No auth data found.</div>';
        return;
      }

      fetch(window.location.href, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authResult)
      })
      .then(response => response.json())
      .then(data => {
        if (!data.error) {
          document.querySelector('.loader').style.display = 'none';
          document.getElementById('status').innerHTML =
            '<div class="success">Authentication successful!</div>' +
            '<div class="user-info">Logged in as: <strong>' +
            (data?.first_name || 'Unknown') +
            ' (@' + (data?.username || 'unknown') + ')</strong></div>' +
            '<div class="user-info">You can now safely close this window.</div>';


        } else {
          document.querySelector('.loader').style.display = 'none';
          document.getElementById('status').innerHTML =
            '<div class="error">Authentication failed: ' + (data.message || 'Unknown error') + '</div>';
        }
      })
      .catch(error => {
        console.error('Error:', error);
        document.querySelector('.loader').style.display = 'none';
        document.getElementById('status').innerHTML =
          '<div class="error">Authentication failed: Network error.</div>';
      });
    }

    processAuth();
  </script>
</body>
</html>
`
    return response.type('.html').send(html)
  }

  async verifyCallback({ request, params }: HttpContext) {
    const sessionId = params.id
    try {
      const authData = request.all()
      if (!authData.id || !authData.hash) {
        return {
          error: 'Invalid authentication data',
          message: 'Missing required parameters',
        }
      }

      const user = await User.find(authData.id)
      if (!user) {
        //  check if the id is admin's id
        if (authData.id === env.get('TG_ADMIN_ID')) {
          const { tg } = await app.container.make('tg')
          const adminUser = await tg.getUser(authData.id)
          await User.create({
            id: adminUser.id,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            avatar: authData.photo_url,
            username: adminUser.username,
          })
          const authSession = await AuthSession.find(sessionId)

          if (!authSession) {
            return {
              error: 'Authentication failed',
              message: 'Authentication failed',
            }
          }
          authSession.tgId = authData.id
          authSession.verifiedAt = DateTime.now()
          await authSession.save()
          return authData
        }
        return {
          error: 'Invalid user',
          message: 'You are not authorized to use this service.',
        }
      }

      const { verifyTGAuth } = await app.container.make('tg')

      if (!verifyTGAuth(authData)) {
        return {
          error: 'Authentication failed',
          message: 'Invalid hash verification',
        }
      }

      const authTime = Number.parseInt(authData.auth_date)
      const currentTime = Math.floor(Date.now() / 1000)
      const maxAge = 10 * 60 // 10 minutes

      if (currentTime - authTime > maxAge) {
        return {
          error: 'Authentication failed',
          message: 'Authentication failed: Auth data is too old.',
        }
      }
      const authSession = await AuthSession.find(sessionId)

      if (!authSession) {
        return {
          error: 'Authentication failed',
          message: 'Authentication failed',
        }
      }
      authSession.tgId = authData.id
      authSession.verifiedAt = DateTime.now()
      await authSession.save()
      user.firstName = authData.first_name
      user.username = authData.username
      user.avatar = authData.photo_url
      await user.save()
      return authData
    } catch {
      return {
        error: 'Authentication failed',
        message: 'Authentication failed',
      }
    }
  }

  async poll({ params, response }: HttpContext) {
    const sessionId = params.id
    const authSession = await AuthSession.find(sessionId)
    if (!authSession) {
      return response.notFound({ message: 'Session not found' })
    }
    if (DateTime.now() > authSession.createdAt.plus({ minutes: 10 })) {
      await authSession.delete()
      return response.status(410).json({ message: 'Authentication expired' })
    }
    if (!authSession.verifiedAt) {
      return response.status(202).json({ message: 'Please continue polling.' })
    }
    if (authSession.tgId) {
      const user = await User.find(authSession.tgId)
      if (!user) {
        await authSession.delete()
        return response.status(400).json({ message: 'Authentication failed' })
      }
      const token = await User.accessTokens.create(user)
      return response.status(200).json({ user, token })
    }
    await authSession.delete()
    return response.status(403).json({ message: 'Authentication failed' })
  }

  async me({ auth }: HttpContext) {
    return auth.getUserOrFail()
  }

  async startTrakt({}: HttpContext) {
    const trakt = await app.container.make('trakt')
    return await trakt.getCodes()
  }

  async pollTrakt({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { code } = await request.validateUsing(traktPollValidator)

    const trakt = await app.container.make('trakt')
    const res = await trakt.checkCodes(code)
    if (res.status !== 200) return response.status(res.status).json(res)
    user.trakt = res.data
    await user.save()
    return response.json({ message: res.message, status: res.status })
  }
}
