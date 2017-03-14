const MapMap = require('map-map-2');
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
		if(!schema){
			throw new Error('No GraphQL schema provided');
		}

		this.schema = schema;
		this.concurrency = concurrency;
		this.subscriptionsByType = new Map();

		this.inbound = new Subject();
		this.stream = this.inbound
			.filter(({
				namespace,
				type
			}) => type && namespace)
			.mergeMap(({
				namespace,
				root,
				type
			}) => {
				const subscriptions = this.subscriptionsByType.get(type);
				const queries = subscriptions ? subscriptions.get(namespace) : null;

				return Observable.from(queries || [])
					.mergeMap(([
							hash,
							executor
						]) => executor(root)
						.map(query => ({
							hash,
							namespace,
							query,
							root,
							type
						})), null, this.concurrency)
			})
			.share();
	}

	run(type, namespace, root = {}) {
		this.inbound.next({
			type,
			namespace,
			root
		});
	}

	subscribe(type, namespace, query, variables = {}, context = {}) {
		if (!type || !namespace || !query) {
			return;
		}

		let subscriptions = this.subscriptionsByType.get(type);

		const executor = lazyExecutor(this.schema, query, [
			subscriptionHasSingleRootField
		]);

		const [
			data
		] = this.extractQueryData(this.schema, executor.parsedQuery, variables);

		const hash = md5(`${query}${JSON.stringify(data)}`);

		if (!subscriptions) {
			subscriptions = new MapMap();
			this.subscriptionsByType.set(type, subscriptions);
		}

		if (!subscriptions.has(namespace, hash)) {
			subscriptions.set(namespace, hash, root => executor(root, context, variables));
		}

		return hash;
	}

	unsubscribe(type, namespace, hash) {
		if (!type || !namespace || !hash) {
			return;
		}

		const subscriptions = this.subscriptionsByType.get(type);

		if (!subscriptions) {
			return;
		}

		subscriptions.delete(namespace, hash);

		if (!subscriptions.size()) {
			this.subscriptionsByType.delete(type)
		}
	}

	extractQueryData(schema, parsedQuery, variables = {}) {
		return parsedQuery.definitions
			.reduce((reduction, definition) => {
				if (definition.kind === 'OperationDefinition') {
					const rootFields = definition.selectionSet.selections;
					const subcription = schema.getSubscriptionType();

					if(!subcription){
						return reduction;
					}

					const fields = subcription
						.getFields();

					return rootFields.map(rootField => {
						const {
							alias,
							name
						} = rootField;

						const subscriptionAlias = alias ? alias.value : null;
						const subscriptionName = name.value;
						const args = rootField.arguments
							.reduce((reduction, arg) => {
								const [
									argDefinition
								] = fields[subscriptionName].args
									.filter(argDef => argDef.name === arg.name.value);

								reduction[argDefinition.name] = valueFromAST(arg.value, argDefinition.type, variables);

								return reduction;
							}, {});

						return {
							subscriptionAlias,
							subscriptionName,
							args
						};
					});
				}
			}, null);
	}
}
