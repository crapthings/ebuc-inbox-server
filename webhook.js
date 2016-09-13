var fs = require('fs')
var util = require('util')

var async = require('async')

var express = require('express')
var multiparty = require('multiparty')

const WebSocket = require('ws')
var DDP = require('ddp.js').default

var ddp = new DDP({
  endpoint: "ws://localhost:3000/websocket",
  SocketConstructor: WebSocket
})

var server = express()

var options = {
  port: 3125
}

server.head('/webhook', function(req, res) {
  console.log('Received head request from webhook.')
  res.sendStatus(200)
})

server.post('/webhook', function(req, res) {
  console.log('Receiving webhook.')
  var form = new multiparty.Form({
    maxFieldsSize: 70000000
  })

  form.on('progress', function() {
    var start = Date.now()
    var lastDisplayedPercentage = -1
    return function(bytesReceived, bytesExpected) {
      var elapsed = Date.now() - start
      var percentage = Math.floor(bytesReceived / bytesExpected * 100)
      if (percentage % 20 === 0 && percentage !== lastDisplayedPercentage) {
        lastDisplayedPercentage = percentage
        console.log('Form upload progress ' +
          percentage + '% of ' + bytesExpected / 1000000 + 'Mb. ' + elapsed + 'ms')
      }
    }
  }())

  form.parse(req, function(err, fields) {
    // console.log(util.inspect(fields.mailinMsg, {
    //   depth: 5
    // }))

    // console.log(JSON.stringify(fields.mailinMsg, null, 4))

    // console.log('Parsed fields: ' + Object.keys(fields))

    /* Write down the payload for ulterior inspection. */
    async.auto({
      writeParsedMessage: function(cbAuto) {
        fs.writeFile('payload.json', fields.mailinMsg, cbAuto)
      },
      writeAttachments: function(cbAuto) {
        var msg = JSON.parse(fields.mailinMsg)
        async.eachLimit(msg.attachments, 3, function(attachment, cbEach) {
          fs.writeFile(attachment.generatedFileName, fields[attachment.generatedFileName], 'base64', cbEach)
        }, cbAuto)
      }
    }, function(err) {
      if (err) {
        console.log(err.stack)
        res.sendStatus(500, 'Unable to write payload')
      } else {
        console.log('Webhook payload written.')
        ddp.method('inbox:create', [fields.mailinMsg])
        res.sendStatus(200)
      }
    })
  })
})

server.listen(options.port, function(err) {
  if (err) {
    console.log(err)
  } else {
    console.log('Http server listening on port ' + options.port)
  }
})
