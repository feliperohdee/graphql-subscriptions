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
		this.subscriptionsByNamespace = new Map();

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
				const subscriptionsByType = this.subscriptionsByNamespace.get(namespace);
				const queries = subscriptionsByType ? subscriptionsByType.get(type) : null;

				return Observable.from(queries || [])
					.mergeMap(([
							hash,
							executor
						]) => executor(root, context)
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

	run(namespace, type, root = {}, context = {}) {
		this.inbound.next({
			type,
			namespace,
			root,
			context
		});
	}

	subscribe(namespace, type, query, variables = {}) {
		if (!namespace || !type || !query) {
			return;
		}

		let subscriptionsByType = this.subscriptionsByNamespace.get(namespace);

		const executor = lazyExecutor(this.schema, query, [
			subscriptionHasSingleRootField
		]);

		const [
			data
		] = this.extractQueryData(this.schema, executor.parsedQuery, variables);

		const {
			operationName,
			rootName
		} = data;

		const hash = `${operationName}.${rootName}.${md5(`${query}${JSON.stringify(data)}`)}`;

		if (!subscriptionsByType) {
			subscriptionsByType = new MapMap();
			this.subscriptionsByNamespace.set(namespace, subscriptionsByType);
		}

		if (!subscriptionsByType.has(type, hash)) {
			subscriptionsByType.set(type, hash, (root, context) => executor(root, context, variables, operationName));
		}

		return hash;
	}

	unsubscribe(namespace, type, hash) {
		if (!namespace || !type || !hash) {
			return;
		}

		const subscriptionsByType = this.subscriptionsByNamespace.get(namespace);

		if (!subscriptionsByType) {
			return;
		}

		subscriptionsByType.delete(type, hash);

		if (!subscriptionsByType.size()) {
			this.subscriptionsByNamespace.delete(namespace);
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
