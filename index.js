const _ = require('lodash');
const lazyExecutor = require('smallorange-graphql-lazy-executor');
const md5 = require('md5');
const {
	Observable,
	Subject
} = require('rxjs');
const {
	valueFromAST
} = require('graphql');

const {
	subscriptionHasSingleRootField
} = require('./customValidators');

module.exports = class Subscriptions {
	constructor(schema, concurrency = Number.MAX_SAFE_INTEGER) {
		if (!schema) {
			throw new Error('No GraphQL schema provided');
		}

		this.schema = schema;
		this.concurrency = concurrency;
		this.subscriptions = {};
		this.subscribedSymbol = Symbol();

		this.inbound = new Subject();
		this.stream = this.inbound
			.filter(({
				namespace,
				type
			}) => type && namespace)
			.mergeMap(({
				namespace,
				context,
				root,
				type
			}) => {
				const queries = _.get(this.subscriptions, `${namespace}.${type}`, {});

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
								operationName,
								query,
								rootName
							}) => ({
								args,
								hash,
								namespace,
								operationName,
								query,
								root,
								rootName,
								subscribers,
								type
							}));
					}, null, this.concurrency)
			})
			.share();
	}

	run(namespace, type, root = {}, context = {}) {
		this.inbound.next({
			type,
			namespace,
			root,
			context
		});
	}

	subscribe(subscriber, namespace, type, query, variables = {}) {
		if (!subscriber || !namespace || !type || !query) {
			return;
		}

		if (!_.isObject(subscriber)) {
			throw new Error('Subscriber must be an object');
		}

		const executor = lazyExecutor(this.schema, query, [
			subscriptionHasSingleRootField
		]);

		const [
			data
		] = this.extractQueryData(this.schema, executor.parsedQuery, variables);

		const {
			args,
			operationName,
			rootName
		} = data;

		const hash = md5(`${query}${JSON.stringify(args)}`);

		let subscription = _.get(this.subscriptions, `${namespace}.${type}.${hash}`);

		if (subscription) {
			subscription.subscribers.add(subscriber);
		} else {
			subscription = {
				executor: (root, context) => executor(root, context, variables, operationName)
					.map(query => ({
						args,
						operationName,
						query,
						rootName
					})),
				subscribers: new Set([subscriber])
			};

			_.set(this.subscriptions, `${namespace}.${type}.${hash}`, subscription);
		}

		// update subscribed in subscriber
		_.update(subscriber, this.subscribedSymbol, value => {
			const key = `${namespace}.${type}.${hash}`;

			if (!value) {
				value = new Set();
			}

			return value.add(key);
		});

		return hash;
	}

	unsubscribe(subscriber, namespace = null, type = null, hash = null) {
		if (!subscriber) {
			return;
		}

		if (!_.isObject(subscriber)) {
			throw new Error('Subscriber must be an object');
		}
		
		const filterRemove = _.compact([namespace, type, hash]).join('.');
		const subscriberSubscriptions = _.get(subscriber, this.subscribedSymbol);

		if (!subscriberSubscriptions) {
			return;
		}

		subscriberSubscriptions.forEach(path => {
			if(filterRemove && !_.includes(path, filterRemove)){
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

	extractQueryData(schema, parsedQuery, variables = {}) {
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

					return rootFields.map(rootField => {
						const {
							alias,
							name
						} = rootField;

						const rootAlias = alias ? alias.value : null;
						const rootName = name.value;
						const args = rootField.arguments
							.reduce((reduction, arg) => {
								const [
									argDefinition
								] = fields[rootName].args
									.filter(argDef => argDef.name === arg.name.value);

								reduction[argDefinition.name] = valueFromAST(arg.value, argDefinition.type, variables);

								return reduction;
							}, {});

						return {
							operationName,
							rootAlias,
							rootName,
							args
						};
					});
				}
			}, null);
	}
}
