import koa from 'koa'
import { bodyParser } from '@koa/bodyparser'
import { BetterGI } from './types.js'
import Router from 'koa-router'
import { match } from 'ts-pattern'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import dotenv from 'dotenv'
import path from 'node:path'
import {
  WebhookClient,
  AttachmentBuilder,
  WebhookMessageCreateOptions,
} from 'discord.js'

dotenv.config()

const app = new koa()

app.use(bodyParser())

const router = new Router()

const webhookClient = new WebhookClient({
  url: process.env.DISCORD_WEBHOOK_URL,
})

const getContent = (data: BetterGI.Notification) => {
  return match(data)
    .with({ event: BetterGI.LifecycleEvent.Test }, (d) => {
      return `Test 🚀`
    })
    .with({ action: BetterGI.TaskAction.Started }, (d) => {
      return `🚀 Starting ${d.event}`
    })
    .with({ action: BetterGI.TaskAction.Progress }, (d) => {
      return `🚧 ${d.event} in progress`
    })
    .with({ conclusion: BetterGI.TaskConclusion.Failure }, (d) => {
      return `⚠️⚠️ ${d.event} failed: ${JSON.stringify(d.task)}`
    })
    .with({ conclusion: BetterGI.TaskConclusion.Success }, (d) => {
      return `🎉 ${d.event} completed!`
    })
    .with({ conclusion: BetterGI.TaskConclusion.Cancelled }, (d) => {
      return `${d.event} cancelled`
    })
    .exhaustive()
}

const renderDiscordMessage = (
  data: BetterGI.Notification
): WebhookMessageCreateOptions => {
  if (data.event !== BetterGI.LifecycleEvent.Test) {
    if (data.screenshot) {
      const file = new AttachmentBuilder(Buffer.from(data.screenshot, 'base64'))

      return {
        files: [file],
        content: getContent(data),
      }
    }
  }

  return {
    content: getContent(data),
  }
}

const sendWebhook = async (data: BetterGI.TaskNotification) => {
  return webhookClient.send(renderDiscordMessage(data))
}

// log all requests
app.use(async (ctx, next) => {
  console.log(`${ctx.method} ${ctx.url}`)
  console.log(ctx.request.body)
  await next()
})

// generate a unique endpoint and write it to file
// if one already exists, read it from file
const getEndpoint = async () => {
  const cacheDir = path.join(import.meta.dirname, '../cache')
  const filePath = path.join(cacheDir, 'endpoint')

  if (!fs.existsSync(cacheDir)) {
    await fs.promises.mkdir(cacheDir)
  }

  try {
    return await fs.promises.readFile(filePath, 'utf-8')
  } catch (e) {
    const endpoint = uuidv4()
    await fs.promises.writeFile(filePath, endpoint)
    return endpoint
  }
}

const endpoint = await getEndpoint()

router.post(`/${endpoint}`, async (ctx) => {
  const body = ctx.request.body as BetterGI.TaskNotification

  await sendWebhook(body)

  ctx.status = 200
  ctx.body = 'OK'
})

router.get('/', (ctx) => {
  ctx.body = 'OK'
})

app.use(router.routes())

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log('Server is running on port', port)
  console.log('Webhook endpoint:', `http://localhost:${port}/${endpoint}`)
})
