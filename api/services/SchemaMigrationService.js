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
    return model.sync({force: true})
  }

  /**
   * Alter an existing schema
   * @param model model object
   */
  alterModel(model) {
    return model.sync()
  }

  /**
   * Drop collections in current connection
   * @param connection connection object
   */
  dropDB(connection) {
    return connection.sync({force: true})
  }

  /**
   * Alter an existing database
   * @param connection connection object
   */
  alterDB(connection) {
    return connection.sync()
  }
}
