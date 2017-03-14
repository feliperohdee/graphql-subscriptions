[![CircleCI](https://circleci.com/gh/feliperohdee/smallorange-graphql-subscriptions.svg?style=svg)](https://circleci.com/gh/feliperohdee/smallorange-graphql-subscriptions)

# Small Orange GraphQL Subscriptions Manager

## Wht it does

This is a simple GraphQl subscriptions manager, it takes care to group similar queries which belongs to same type, namespace and same variables, runs with maximum concurrency (thank u rxjs again), and dispatch data via stream.

## Wht is doesn't

It doesn't take care subscribe to your pub/sub mechanism, you should do it by yourself and call run when some event happens, this way, you have freedom to choose the best implementation type for your app. If u're using Redis, you shouldn't create a channel for each event type, instead, you cant just pass an object along with this info, redis is very sensitive with many channels, so, it avoids CPU and memory overhead at Redis machine ;), if you don't know how to do this, you should study more.

It doesn't take care to broadcast messages to right subscribers, it just broadcast, at this way, you can plug in your custom ACL implementation to keep with a single point of truthness, if you don't have one you can use our beloved https://github.com/feliperohdee/smallorange-acl and be happy.

## API
		stream: Observable<{
			hash: string,
			namespace: string,
			query: object,
			root: object,
			type: string
		}>;
		constructor(schema: GraphQLSchema, concurrency: Number = Number.MAX_SAFE_INTEGER);
		run(type: string, namespace: string, root: object = {}): void;
		subscribe(type: string, namespace: string, variables: object = {}, context: object = {}): string (subscription hash);
		subscribe(type: string, namespace: string, hash: string): void;

## Sample

		const GraphqlSubscriptions = require('smallorange-graphql-subscriptions');
		const schema = new GraphQLSchema({
		    query: new GraphQLObjectType({
		        name: 'QueryType',
		        fields: {
		            user: {
		                type: UserType
		            }
		        }
		    }),
		    subscription: new GraphQLObjectType({
		        name: 'SubscriptionType',
		        fields: {
		            user: {
		                type: UserType,
		                args: {
		                    age: {
		                        type: GraphQLInt
		                    },
		                    city: {
		                        type: GraphQLString
		                    },
		                    name: {
		                        type: GraphQLString
		                    }
		                },
		                resolve: (root, args) => {
		                    return Object.assign({}, root, args);
		                }
		            }
		        }
		    })
		});

		const subscriptions = new GraphqlSubscriptions(schema, 10); // 10 is max concurrency
		const query = `subscription($name: String!, $age: Int, $city: String) {
		        user(name: $name, age: $age, city: $city) {
		            name
		            city
		            age
		        }
		    }`;

		const subscriptionId = subscriptions.subscribe('addComment', 'myNamespace', query);

		graphqlSubscriptions.stream
			.take(1)
		    .toArray()
		    .subscribe(console.log);

		   graphqlSubscriptions.run(type, namespace, {
		        age: 20
		    });

		// is gonna print
		//
		// [{
		//     hash: '1b3ba0c92a4934816488a5a7046a6e43',
		//     namespace: 'namespace',
		//     query: {
		//         data: {
		//             user: {
		//                 age: 20,
		//                 city: null,
		//                 name: 'Rohde'
		//             }
		//         }
		//     },
		//     root: {
		//         age: 20
		//     },
		//     type: 'type'
		// }]

		subscriptions.unsubscribe('addComment', 'myNamespace', subscriptionId);


