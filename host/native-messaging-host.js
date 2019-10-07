#!node

// Might be good to use an explicit path to node on the shebang line
// in case it isn't in PATH when launched by Chrome

var sendMessage = require('native-messaging')(handleMessage)

// pvh's extension ID is: fcanljfkfdhddpeikfmdojfclefaeioj

function handleMessage(req) {
  if (req.message === 'ping') {
    sendMessage({ message: 'pong', body: 'hello from nodejs app' })
  } else sendMessage({ message: 'unrecognized', body: 'no clue what to do' })
}
