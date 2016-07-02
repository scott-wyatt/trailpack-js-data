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
    // return model.sequelize.query('SET FOREIGN_KEY_CHECKS = 0').then(() => {
    //   return model.sync({force: true})
    // }).then(() => {
    //   return model.sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
    // }).catch(err => {
    //   return model.sync({force: true})
    // })
    // return model.sync({force: true})
    // this.app.log.error(model)
  }

  /**
   * Alter an existing schema
   * @param model model object
   */
  alterModel(model) {
    // this.app.log.error(model)
    // return model.sync()
  }

  /**
   * Drop collections in current connection
   * @param connection connection object
   */
  dropDB(connection) {
    this.app.log.error(connection)
    // return connection.query('SET FOREIGN_KEY_CHECKS = 0').then(() => {
    //   return connection.sync({force: true})
    // }).then(() => {
    //   return connection.query('SET FOREIGN_KEY_CHECKS = 1')
    // }).catch(err => {
    //   return connection.sync({force: true})
    // })
    // return connection.sync({force: true})
  }

  /**
   * Alter an existing database
   * @param connection connection object
   */
  alterDB(connection) {
    this.app.log.error(connection)
    // return connection.sync()
  }
}
