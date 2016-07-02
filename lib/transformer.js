'use strict'
const _ = require('lodash')
const JSData = require('js-data')
const lib = require('.')

module.exports = {

  /**
   * Augment the model definition with some jsdata-required properties
   */
  transformModels (app) {
    const models = app.models
    const dbConfig = app.config.database
    return _.mapValues(models, (model, modelName) => {
      const config = model.constructor.config(app) || {}
      const schema = model.constructor.schema(app) || {}

      if (!config.options){
        config.options = {}
      }

      if (!config.options.table) {
        config.options.table = modelName.toLowerCase()
      }

      return {
        identity: modelName.toLowerCase(),
        globalId: modelName,
        name: modelName.toLowerCase(),
        tableName: config.tableName || modelName.toLowerCase(),
        connection: config.store || dbConfig.models.defaultStore,
        migrate: config.migrate || dbConfig.models.migrate,
        config: config.options,
        schema: schema
      }

    })
  },
  /**
   * Transform the Trails.js "stores" config into a JSData object
   */
  transformStores (app) {
    const stores = app.config.database.stores
    const jsdata = {}
    Object.keys(stores).forEach(key => {

      let store = new JSData.DS({
        cacheResponse: stores[key].cacheResponse || false,
        bypassCache: stores[key].bypassCache || true,
        keepChangeHistory: stores[key].keepChangeHistory || false,
        resetHistoryOnInject: stores[key].resetHistoryOnInject || false,
        upsert: stores[key].upsert || false,
        notify: stores[key].notify || false,
        log: stores[key].log || false
      })
      store = lib.Adapters.loadAdapter(store, stores[key])
      store.close = () => {
        // this.adapters = {}
      }
      jsdata[key] = store
    })

    return jsdata
  }

}
