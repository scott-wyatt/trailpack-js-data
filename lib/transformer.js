/* eslint no-console: [0, { allow: ["log","warn", "error"] }] */

'use strict'

const _ = require('lodash')
const JSData = require('js-data')
const lib = require('.')
const Schemator = require('js-data-schema')

module.exports = {

  /**
   * Augment the model definition with some jsdata-required properties
   */
  transformModels (app) {
    const models = app.models
    const dbConfig = app.config.database
    const schemator = new Schemator()

    return _.mapValues(models, (model, modelName) => {
      const config = model.constructor.config(app) || {}
      const schema = schemator.defineSchema(modelName, model.constructor.schema(app) || {})

      if (!config.options){
        config.options = {}
      }
      if (!config.options.name) {
        config.options.name = modelName
      }
      if (!config.options.tableName) {
        config.options.tableName = modelName.toLowerCase()
      }
      if (!config.options.schema) {
        config.options.schema = schema
      }
      if (!config.options.idAttribute) {
        config.options.idAttribute = 'id'
      }
      return {
        identity: modelName.toLowerCase(),
        globalId: modelName,
        name: config.tableName || modelName.toLowerCase(),
        tableName: config.tableName || modelName.toLowerCase(),
        connection: config.store || dbConfig.models.defaultStore,
        migrate: config.migrate || dbConfig.models.migrate,
        config: config.options,
        schema: schema,
        attributes: schema.schema,
        idAttribute: config.idAttribute || 'id',
        beforeCreate: config.beforeCreate,
        afterCreate: config.afterCreate,
        beforeUpdate: config.beforeUpdate,
        afterUpdate: config.afterUpdate,
        beforeValidate: config.beforeValidate,
        afterValidate: config.afterValidate,
        beforeDestroy: config.beforeDestroy,
        afterDestroy: config.afterDestroy,
        sync: (force) => {
          // lib.Adapters.
        }
      }
    })
  },

  /**
   * Transform the Trails.js "stores" config into a JSData "adapters" object
   */
  transformAdapters (app) {
    const stores = app.config.database.stores
    const adapters = _.map(stores, 'adapter')
    return _.keyBy(adapters, 'identity')
  },

  /**
   * Transform the Trails.js "stores" config into a JSData object
   */
  transformStores (app) {
    const stores = app.config.database.stores
    const jsdata = {}
    Object.keys(stores).forEach(key => {
      const connection = lib.Adapters.loadConnection(stores[key])
      let store = new JSData.DS({
        cacheResponse: stores[key].cacheResponse || false,
        bypassCache: stores[key].bypassCache || true,
        keepChangeHistory: stores[key].keepChangeHistory || false,
        resetHistoryOnInject: stores[key].resetHistoryOnInject || false,
        upsert: stores[key].upsert || false,
        notify: stores[key].notify || false,
        log: stores[key].log || false
      })

      _.each(stores[key], (value, key) => {
        if (['cacheResponse','bypassCache','keepChangeHistory','resetHistoryOnInject','upsert','notify','log'].indexOf(key) == -1) {
          store[key] = value
        }
      })

      store.getConnectionName = () => {
        return key
      }

      store = lib.Adapters.loadAdapter(store, connection)

      jsdata[key] = store
    })

    return jsdata
  }

}
