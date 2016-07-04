'use strict'

const Service = require('trails-service')

/**
 * @module SchemaMigrationService
 * @description Schema Migrations
 */
module.exports = class SchemaMigrationService extends Service {

  /**
   * Drop collection
   * @param model model object
   */
  dropModel(model) {
    this.app.log.debug('SchemaMigrationService: performing "drop" migration','for model', model.getModelName())
    return model.sync({force: true})
  }

  /**
   * Alter an existing schema
   * @param model model object
   */
  alterModel(model) {
    this.app.log.debug('SchemaMigrationService: performing "alter" migration','for model', model.getModelName())
    return model.sync()
  }

  /**
   * Drop collections in current connection
   * @param connection connection object
   */
  dropDB(connection) {
    this.app.log.debug('SchemaMigrationService: performing "drop" migration','for connection', connection.getConnectionName())
    return connection.sync({force: true})
  }

  /**
   * Alter an existing database
   * @param connection connection object
   */
  alterDB(connection) {
    this.app.log.debug('SchemaMigrationService: performing "alter" migration','for connection', connection.getConnectionName())
    return connection.sync()
  }
}
