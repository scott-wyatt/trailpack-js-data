'use strict'

const _ = require('lodash')
const Service = require('trails-service')
const ModelError = require('../../lib').ModelError

const manageError = err => {
  if (err.name === 'jsDataValidationError') {
    return Promise.reject(new ModelError('E_VALIDATION', err.message, err.errors))
  }
  return Promise.reject(err)
}

/**
 * Trails Service that maps abstract ORM methods to their respective Waterine
 * methods. This service can be thought of as an "adapter" between trails and
 * Sequelize. All methods return native ES6 Promises.
 */
module.exports = class FootprintService extends Service {

  /**
   * Internal method to retreive model object
   * @param modelName name of the model to retreive
   * @returns {*} jsData model object
   * @private
   */
  _getModel(modelName) {
    return this.app.orm[modelName] || this.app.packs['js-data'].orm[modelName]
  }

  _addRelations(model, populate) {
    if (populate === true || populate === 'all') {
      return model.loadRelations()
    }

    const fields = populate.split(',')

    return model.loadRelations(fields)
  }

  /**
   * Create a model, or models. Multiple models will be created if "values" is
   * an array.
   *
   * @param modelName The name of the model to create
   * @param values The model's values
   * @param options to pass to jsData
   * @return Promise
   */
  create(modelName, values, options) {
    const Model = this._getModel(modelName)
    const modelOptions = _.defaultsDeep({}, options, _.get(this.app.config, 'footprints.models.options'))
    if (!Model) {
      return Promise.reject(new ModelError('E_NOT_FOUND', `${modelName} can't be found`))
    }

    let query
    let populate = false

    if (modelOptions.populate) {
      populate = modelOptions.populate
      delete modelOptions.populate
    }

    query = Model.create(values, modelOptions)

    if (populate) {
      this._addRelations(Model, populate)
    }

    return query.catch(manageError)
  }

  /**
   * Find all models that satisfy the given criteria. If a primary key is given,
   * the return value will be a single Object instead of an Array.
   *
   * @param modelName The name of the model
   * @param criteria The criteria that filter the model resultset
   * @param options to pass to jsData
   * @return Promise
   */
  find(modelName, criteria, options) {
    const Model = this._getModel(modelName)
    const modelOptions = _.defaultsDeep({}, options, _.get(this.app.config, 'footprints.models.options'))

    if (!Model) {
      return Promise.reject(new ModelError('E_NOT_FOUND', `${modelName} can't be found`))
    }

    let query
    let populate = false

    if (modelOptions.populate) {
      populate = modelOptions.populate
      delete modelOptions.populate
    }

    if (!_.isPlainObject(criteria) || modelOptions.findOne === true) {
      if (modelOptions.findOne === true) {
        // this.app.log.error('FIND ONE BY ID', criteria)
        query = Model.find(criteria, modelOptions)
      }
      else {
        // this.app.log.error('FIND ONE BY CRITERIA', criteria)
        query = Model.find(criteria, modelOptions)
      }
    }
    else {
      // this.app.log.error('FIND ALL',criteria, modelOptions)
      // criteria = {where: criteria}
      query = Model.findAll(criteria, modelOptions)
    }

    if (populate) {
      this._addRelations(Model, populate)
    }

    return query.catch(manageError)
  }

  /**
   * Update an existing model, or models, matched by the given by criteria, with
   * the given values. If the criteria given is the primary key, then return
   * exactly the object that is updated; otherwise, return an array of objects.
   *
   * @param modelName The name of the model
   * @param criteria The criteria that determine which models are to be updated   *
   * @param [id] A optional model id; overrides "criteria" if both are specified.
   * @param values to update
   * @param options extends { where: criteria } then passed to jsData
   * @return Promise
   */
  update(modelName, criteria, values, options) {
    const Model = this._getModel(modelName)

    if (!Model) {
      return Promise.reject(new ModelError('E_NOT_FOUND', `${modelName} can't be found`))
    }

    let query
    if (!criteria) {
      criteria = {}
    }

    if (_.isPlainObject(criteria)) {
      // this.app.log.error('PLAIN',criteria, values, options)
      query = Model.updateAll(criteria, values, options)
      .then(results => {
        return Model.findAll(criteria, options)
      })
    }
    else {
      criteria = {
        [Model.idAttribute]: criteria
      }
      // this.app.log.error('NOT PLAIN',criteria, values, options)
      query = Model.update(criteria, values, options)
      .then(result => {
        return Model.find(criteria, options)
      })
    }

    return query.catch(manageError)
  }

  /**
   * Destroy (delete) the model, or models, that match the given criteria.
   *
   * @param modelName The name of the model
   * @param criteria The criteria that determine which models are to be updated
   * @return Promise
   */
  destroy(modelName, criteria, options) {
    const Model = this._getModel(modelName)

    if (!Model) {
      return Promise.reject(new ModelError('E_NOT_FOUND', `${modelName} can't be found`))
    }

    let query
    if (!criteria) {
      criteria = {}
    }

    if (_.isPlainObject(criteria)) {
      // this.app.log.error('DESTROY PLAIN', criteria)
      let results
      // Find the results we are destroying so they can be returned in a footprint's way
      Model.findAll(criteria)
      .then(fResults => {
        results = fResults
      })
      query = Model.destroyAll(criteria)
      .then(dResults => {
        return results
      })
    }
    else {
      criteria = {
        [Model.idAttribute]: criteria
      }
      // this.app.log.error('DESTROY NOT PLAIN', criteria)
      let result
      Model.find(criteria)
      .then(fResult => {
        result = fResult
      })
      query = Model.destroy(criteria)
      .then(dResult => {
        return result
      })
    }

    return query.catch(manageError)
  }
}
