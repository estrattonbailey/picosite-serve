#! /usr/bin/env node
'use strict'

const cwd = process.cwd()

const fs = require('fs')
const path = require('path')
const http = require('http')
const getPort = require('get-port')
const colors = require('ansi-colors')
const chokidar = require('chokidar')

const args = require('minimist')(process.argv.slice(2))
const input = path.resolve(cwd, args.i || args.in || cwd)
const noreload = args.n || args.noreload

const serve = require('serve-static')(input)

;(async () => {
  const port = await getPort({ port: 4000 })

  const server = http.createServer((req, res) => {
    const { url } = req

    if (/^.+\..+$/.test(url)) {
      return serve(req, res, require('finalhandler')(req, res))
    }

    let index = fs.readFileSync(path.join(input, 'index.html'), 'utf8')

    if (args.l || args.local) {
      const match = index.match(/src="(.+picosite.+)"/)
      index = index.replace(match[1], match[1] + `&base=http://127.0.0.1:${port}`)
    }

    if (!noreload) {
      index += `
        <script>
          (function (global) {
            try {
              const socketio = document.createElement('script')
              socketio.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.1.1/socket.io.slim.js'
              socketio.onload = function init () {
                var disconnected = false
                var socket = io('http://localhost:${port}', {
                  reconnectionAttempts: 3
                })
                socket.on('connect', () => console.log('@picosite/serve connected'))
                socket.on('refresh', () => {
                  global.location.reload()
                })
                socket.on('disconnect', () => {
                  disconnected = true
                })
                socket.on('reconnect_failed', e => {
                  if (disconnected) return
                  console.error("@picosite/serve - connection to server on :${port} failed")
                })
              }
              document.head.appendChild(socketio)
            } catch (e) {}
          })(this);
        </script>
      `
    }

    res.writeHead(200, {
      'Content-Type': 'text/html'
    })
    res.write(index)
    res.end()
  }).listen(port, () => {
    console.log(
      colors.gray(`@picosite/serve`),
      colors.green(`running`),
      `on http://127.0.0.1:${port}`
    )
  })

  if (!noreload) {
    const socket = require('socket.io')(server, {
      serveClient: false
    })

    chokidar.watch(input, {
      persistent: true,
      ignoreInitial: true,
    })
      .on('add', () => socket.emit('refresh'))
      .on('change', () => socket.emit('refresh'))
      .on('unlink', () => socket.emit('refresh'))
  }
})()
