const _ = require('lodash');
const md5 = require('md5');
const lazyExecutor = require('smallorange-graphql-lazy-executor');
const {
	Observable,
	Subject
} = require('rxjs');
const {
	GraphQLError,
	buildSchema,
	specifiedRules
} = require('graphql');
const {
	getArgumentValues
} = require('graphql/execution/values');

const {
	subscriptionHasSingleRootField
} = require('./customValidators');

module.exports = class Subscriptions {
	constructor(schema, events = {}, customExecutor = null, concurrency = Number.MAX_SAFE_INTEGER) {
		if (!schema) {
			throw new Error('No GraphQL schema provided.');
		}

		this.schema = _.isString(schema) ? buildSchema(schema) : schema;
		this.events = events;
		this.customExecutor = customExecutor;
		this.concurrency = concurrency;
		this.subscriptions = {};
		this.subscribedSymbol = Symbol();
		this.inbound = new Subject();
		this.stream = this.inbound
			.filter(({
				namespace,
				event
			}) => event && namespace)
			.mergeMap(({
				namespace,
				extendContextValue,
				rootValue,
				event
			}) => {
				const subscriptions = _.get(this.subscriptions, `${namespace}.${event}`, {});

				return Observable.pairs(subscriptions)
					.mergeMap(([
						hash, {
							executor,
							subscribers
						}
					]) => {
						return executor(rootValue, extendContextValue)
							.map(({
								args,
								contextValue,
								operationName,
								result,
								rootName,
								variableValues
							}) => ({
								args,
								contextValue,
								event,
								hash,
								namespace,
								operationName,
								result,
								rootName,
								rootValue,
								subscribers,
								variableValues
							}));
					}, null, this.concurrency)
			})
			.share();
	}

	run(namespace, event, rootValue = {}, extendContextValue = {}) {
		this.inbound.next({
			event,
			namespace,
			rootValue,
			extendContextValue
		});
	}

	subscribe(namespace, subscriber, requestString, variableValues = {}, contextValue = {}) {
		if (!namespace || !subscriber || !requestString) {
			return;
		}

		if (!_.isObject(subscriber)) {
			throw new GraphQLError('Subscriber must be an object.');
		}

		if (!_.isPlainObject(contextValue)) {
			throw new GraphQLError('contextValue should be a plain object.');
		}

		const executor = lazyExecutor(this.schema, requestString, [
			subscriptionHasSingleRootField
		], this.customExecutor);

		const documentASTData = this.getASTData(this.schema, executor.documentAST, variableValues);
		const {
			args,
			events,
			kind,
			operationName,
			rootName
		} = documentASTData[0];

		const hash = md5(`${requestString}${JSON.stringify(args)}${JSON.stringify(contextValue)}`);

		return _.map(events, event => {
			let subscription = _.get(this.subscriptions, `${namespace}.${event}.${hash}`);

			if (subscription) {
				subscription.subscribers.add(subscriber);
			} else {
				subscription = {
					executor: (rootValue, extendContextValue) => {
						if (extendContextValue) {
							contextValue = _.extend(contextValue, extendContextValue);
						}

						return executor(
								rootValue,
								contextValue,
								variableValues,
								operationName
							)
							.map(result => ({
								args,
								contextValue,
								operationName,
								result,
								rootName,
								variableValues
							}));
					},
					subscribers: new Set([subscriber])
				};

				_.set(this.subscriptions, `${namespace}.${event}.${hash}`, subscription);
			}

			// update subscribed in subscriber
			_.update(subscriber, this.subscribedSymbol, value => {
				const key = `${namespace}.${event}.${hash}`;

				if (!value) {
					value = new Set();
				}

				return value.add(key);
			});

			return `${namespace}.${event}.${hash}`;
		});
	}

	unsubscribe(subscriber, hash = null) {
		if (!subscriber) {
			return;
		}

		if (!_.isObject(subscriber)) {
			throw new GraphQLError('Subscriber must be an object.');
		}

		const subscriberSubscriptions = _.get(subscriber, this.subscribedSymbol);

		if (!subscriberSubscriptions) {
			return;
		}

		subscriberSubscriptions.forEach(path => {
			if (hash && !_.includes(path, hash)) {
				return;
			}

			subscriberSubscriptions.delete(path);

			const {
				subscribers
			} = _.get(this.subscriptions, path);

			subscribers.delete(subscriber);

			if (!subscribers.size) {
				_.unset(this.subscriptions, path);
			}
		});

		return true;
	}

	getASTData(schema, documentAST, variableValues = {}) {
		return documentAST.definitions
			.reduce((reduction, definition) => {
				if (definition.kind === 'OperationDefinition') {
					const rootFields = definition.selectionSet.selections;
					const subcription = schema.getSubscriptionType();

					if (!subcription) {
						return reduction;
					}

					const operationName = definition.name ? definition.name.value : null;
					const fields = subcription
						.getFields();

					reduction = rootFields.map(rootField => {
						const {
							alias,
							name
						} = rootField;

						const rootAlias = alias ? alias.value : null;
						const rootName = name.value;
						const args = fields[rootName] ? getArgumentValues(fields[rootName], rootField, variableValues) : {};
						const events = _.get(this.events, rootName, []);

						return {
							args,
							events: _.filter(_.isArray(events) ? events : [events], _.isString),
							operationName,
							rootAlias,
							rootName
						};
					});
				}

				return reduction;
			}, null);
	}
}
