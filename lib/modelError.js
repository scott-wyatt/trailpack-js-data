/* eslint no-console: [0, { allow: ["log","warn", "error"] }] */
'use strict'
module.exports = class ModelError extends Error {
  constructor(code, message, errors) {
    super(message)
    console.log(code,errors)
    this.code = code
    this.name = 'Model error'
    this.errors = errors

    Object.defineProperty(ModelError.prototype, 'message', {
      configurable: true,
      enumerable: true
    })
  }
}
