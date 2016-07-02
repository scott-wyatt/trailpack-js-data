'use strict'

const Trailpack = require('trailpack-datastore')
const lib = require('./lib')
const _ = require('lodash')

module.exports = class DataTrailpack extends Trailpack {

  /**
   * TODO document method
   */
  validate () {
    const stores = _.get(this.app.config, 'database.stores')
    if (stores && Object.keys(stores).length === 0) {
      this.app.config.log.logger.warn('No store configured at config.database.stores, models will be ignored')
    }
    return Promise.all([
      lib.Validator.validateDatabaseConfig(this.app.config.database)
    ])
  }

  /**
   * Merge configuration into models, load js-data collections.
   */
  configure () {
    this.app.config.database.orm = 'js-data'
    _.merge(this.app.config, lib.FailsafeConfig)
  }

  /**
   * Initialize js-data. This will compile the schema and connect to the
   * database.
   */
  initialize () {
    super.initialize()

    this.orm = this.orm || {}
    this.app.orm = {}
    this.connections = lib.Transformer.transformStores(this.app)
    this.models = lib.Transformer.transformModels(this.app)

    _.each(this.models, (model, modelName) => {
      _.each(this.connections, (connection, name) => {
        if (model.connection == name) {
          this.app.orm[model.globalId] = connection.defineResource(model.config)
        }
      })
    })

    _.each(this.models, (model, modelName) => {
      if (!this.app.orm[model.globalId]) return //ignore model if not configured

      // if (this.app.orm[model.globalId].associate)
      //   this.app.orm[model.globalId].associate(this.app.orm)

      this.orm[model.globalId.toLowerCase()] = this.app.orm[model.globalId]
    })

    return this.migrate()
  }

  /**
   * Close all database connections
   */
  unload() {
    return Promise.all(
      _.map(this.connections, connection => {
        return new Promise((resolve, reject) => {
          connection.close()
          resolve()
        })
      })
    )
  }

  migrate() {
    const SchemaMigrationService = this.app.services.SchemaMigrationService
    const database = this.app.config.database

    if (database.models.migrate == 'none') return

    return Promise.all(
      _.map(this.connections, connection => {

        if (database.models.migrate == 'drop') {
          return SchemaMigrationService.dropDB(connection)
        }
        else if (database.models.migrate == 'alter') {
          return SchemaMigrationService.alterDB(connection)
        }
      })
    )
  }

  constructor (app) {
    super(app, {
      config: require('./config'),
      api: require('./api'),
      pkg: require('./package')
    })
  }
}

