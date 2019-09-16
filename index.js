#! /usr/bin/env node
'use strict'

const cwd = process.cwd()

const fs = require('fs')
const path = require('path')
const http = require('http')
const serve = require('serve-static')(cwd)
const index = fs.readFileSync(path.join(cwd, 'index.html'), 'utf8')

http.createServer((req, res) => {
  const { url } = req

  if (/^.+\..+$/.test(url)) {
    return serve(req, res, require('finalhandler')(req, res))
  }

  const match = index.match(/src="(.+picosite.+)"/)

  res.writeHead(200, {
    'Content-Type': 'text/html'
  })
  res.write(index.replace(match[1], match[1] + '&base=/'))
  res.end()
}).listen(4000, () => {
  console.log('listening')
})
