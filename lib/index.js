const _ = require('lodash');
const md5 = require('md5');
const {
	Observable,
	Subject
} = require('rxjs');
const {
	GraphQLError,
	buildSchema,
	execute,
	parse,
	specifiedRules,
	validate
} = require('graphql');
const {
	getArgumentValues
} = require('graphql/execution/values');

const {
	subscriptionHasSingleRootField
} = require('./customValidators');

module.exports = class Subscriptions {
	constructor(schema, events = {}, executor = null, concurrency = Number.MAX_SAFE_INTEGER) {
		if (!schema) {
			throw new Error('No GraphQL schema provided.');
		}

		this.schema = _.isString(schema) ? buildSchema(schema) : schema;
		this.events = events;
		this.executor = this.setExecutor(executor);
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
				context,
				root,
				event
			}) => {
				const queries = _.get(this.subscriptions, `${namespace}.${event}`, {});

				return Observable.pairs(queries)
					.mergeMap(([
						hash, {
							executor,
							subscribers
						}
					]) => {
						return executor(root, context)
							.map(({
								args,
								context,
								operationName,
								query,
								rootName,
								variables
							}) => ({
								args,
								context,
								event,
								hash,
								namespace,
								operationName,
								query,
								root,
								rootName,
								subscribers,
								variables
							}));
					}, null, this.concurrency)
			})
			.share();
	}

	setExecutor(executor = null) {
		if (!executor || !_.isFunction(executor)) {
			try {
				return (...args) => Observable.fromPromise(execute.apply(null, args))
					.do(response => {
						if (response.errors) {
							throw new Error(response.errors.join());
						}
					});
			} catch (err) {
				return Observable.throw(err);
			}
		}

		return executor;
	}

	run(namespace, event, root = {}, context = {}) {
		this.inbound.next({
			event,
			namespace,
			root,
			context
		});
	}

	subscribe(subscriber, query, variables = {}, context = {}) {
		if (!subscriber || !query) {
			return;
		}

		if (!_.isObject(subscriber)) {
			throw new GraphQLError('Subscriber must be an object.');
		}

		if (!_.isPlainObject(context)) {
			throw new GraphQLError('context should be a plain object.');
		}

		const parsedQuery = parse(query);
		const errors = validate(
			this.schema,
			parsedQuery,
			specifiedRules.concat(subscriptionHasSingleRootField)
		);

		if (errors.length) {
			throw new GraphQLError(errors);
		}

		const data = this.getQueryData(this.schema, parsedQuery, variables);

		const {
			args,
			events,
			kind,
			operationName,
			rootName
		} = data[0];

		const hash = md5(`${query}${JSON.stringify(args)}${JSON.stringify(context)}`);

		return _.flatMap(events, (events, namespace) => {
			if (!_.isArray(events)) {
				events = [events];
			}

			return _.map(events, event => {
				let subscription = _.get(this.subscriptions, `${namespace}.${event}.${hash}`);

				if (subscription) {
					subscription.subscribers.add(subscriber);
				} else {
					subscription = {
						executor: (root, extendContext) => {
							if (extendContext) {
								context = _.extend(context, extendContext);
							}

							return this.executor(
									this.schema,
									parsedQuery,
									root,
									context,
									variables,
									operationName
								)
								.map(query => ({
									args,
									context,
									operationName,
									query,
									rootName,
									variables
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

	getQueryData(schema, parsedQuery, variables = {}) {
		return parsedQuery.definitions
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
						const args = fields[rootName] ? getArgumentValues(fields[rootName], rootField, variables) : {};
						const events = _.get(this.events, rootName, {});

						return {
							args,
							events,
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
