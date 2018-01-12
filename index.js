var inherits = require('inherits')
var Sub = require('./sub')
var Stream = require('stream')

inherits(Mux, Stream)

function Mux (opts) {
  this.cbs = {}
  this.subs = {}
  this.nextId = 0
  Stream.call(this)
}

Mux.prototype.stream = function (opts) {
  var id = ++this.nextId
  var sub = new Sub(this, id)
  this._write({req: id, value: opts, stream: true})
  return sub
}

Mux.prototype.request = function (opts, cb) {
  var id = ++this.nextId
  this.cbs[id] = cb
  this._write({req: id, value: opts, stream: false})
  return id
}

Mux.prototype.message = function (value) {
  this._write({req: 0, stream: false, end: false, value: value})
}

Mux.prototype.write = function (data) {
  if(data.req == 0)
    this.options.onMessage && this.options.onMessage(data)
  else if(data.stream) {
    var sub = this.subs[data.req] //TODO: handle +/- subs
    if(sub) {
      if(data.end === true) sub._end(data.value)
      else         sub._write(data.value)
    }
    //we received a new stream!
    else if (data.req > 0) {

    }
    //else, we received a reply to a stream we didn't make,
    //which should never happen!
  }
}

Mux.prototype.end = function (err) {
  var _err = err || new Error('parent stream closed') 
  for(var i in this.cbs) {
    var cb = this.cbs[i]
    delete this.cbs[i]
    cb(_err)
  }
  for(var i in this.subs) {
    var sub = this.subs[i]
    delete this.subs[i]
    sub._end(_err)
  }
  //end the next piped to stream with the written error
  this._end(err)
}

