const MapMap = require('map-map-2');
const lazyExecutor = require('smallorange-graphql-lazy-executor');
const md5 = require('md5');
const {
	Observable
} = require('rxjs');
const {
	valueFromAST
} = require('graphql');

module.exports = class Subscriptions {
	constructor(schema, concurrency = 9) {
		this.schema = schema;
		this.concurrency = concurrency;
		this.subscriptions = new Map();
	}

	subscribe(type, namespace, query, context = {}, variables = {}) {
		if (!type || !namespace || !query) {
			return;
		}

		const executor = lazyExecutor(this.schema, query, {}, variables);
		const data = this.extractQueryData(executor.parsedQuery);
		const hash = md5(`${query}${JSON.stringify(data)}`);
		let subscriptionType = this.subscriptions.get(type);

		if (!subscriptionType) {
			subscriptionType = new MapMap();
			this.subscriptions.set(type, subscriptionType);
		}

		if (!subscriptionType.has(namespace, hash)) {
			subscriptionType.set(namespace, hash, root => {
				return executor(root, context, variables);
			});
		}

		return hash;
	}

	unsubscribe(type, namespace, hash) {
		if (!type || !namespace || !hash) {
			return;
		}

		const subscriptionType = this.subscriptions.get(type);

		if (!subscriptionType) {
			return;
		}

		subscriptionType.delete(namespace, hash);

		if (!subscriptionType.size()) {
			this.subscriptions.delete(type)
		}
	}

	run(type, namespace, root = {}) {
		if (!type || !namespace) {
			return;
		}

		const subscriptionType = this.subscriptions.get(type);

		if (!subscriptionType) {
			return;
		}

		const queries = subscriptionType.get(namespace) || [];

		return Observable.from(queries)
			.mergeMap(([
				key,
				query
			]) => {
				return query(root)
					.map(response => ({
						key,
						response,
						root
					}));
			}, null, this.concurrency);
	}

	extractQueryData(parsedQuery, variables) {
		return parsedQuery.definitions.reduce((reduction, definition) => {
			if (definition.kind === 'OperationDefinition') {
				const rootFields = definition.selectionSet.selections;
				const fields = this.schema.getSubscriptionType()
					.getFields();

				return rootFields.map(rootField => {
					const {
						alias,
						name
					} = rootField;

					const subscriptionAlias = alias ? alias.value : null;
					const subscriptionName = name.value;
					const args = rootField.arguments.reduce((reduction, arg) => {
						const [
							argDefinition
						] = fields[subscriptionName].args.filter(argDef => argDef.name === arg.name.value);

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
