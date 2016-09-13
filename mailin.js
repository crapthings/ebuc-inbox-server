var mailin = require('mailin')

var isProduction = process.env.NODE_ENV === 'production'

var webhookUrl = 'http://localhost:3125/webhook'

var options = {
  port: isProduction ? 25 : 3025,
  disableWebhook: false,
  webhook: webhookUrl,
}

mailin.start(options)
