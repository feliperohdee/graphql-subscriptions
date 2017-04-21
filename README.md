[![CircleCI](https://circleci.com/gh/feliperohdee/smallorange-graphql-subscriptions.svg?style=svg)](https://circleci.com/gh/feliperohdee/smallorange-graphql-subscriptions)

# Small Orange GraphQL Subscriptions Manager

## Wht it does

This is a simple GraphQl subscriptions manager, it takes care to group similar queries which belongs to same namespace, type and variables, runs with maximum concurrency (thank u rxjs again), and dispatch data via stream.

## Wht is doesn't

It doesn't take care subscribe to your pub/sub mechanism, you should do it by yourself and call run when some event happens, this way, you have freedom to choose the best implementation type for your app. If u're using Redis, you shouldn't create a channel for each event type, instead, you cant just pass an object along with this info, redis is very sensitive with many channels, so, it avoids CPU and memory overhead at Redis machine ;), if you don't know how to do this, you should study more.

It doesn't take care to broadcast messages to right subscribers, it just broadcast, at this way, you can plug in your custom ACL implementation to keep with a single point of truthness.

## Important

Subscribers are objects that you intend to send messages afterwards, this lib takes care to manage internal subscriptions state, but once one subscriber is removed (eg. a WebSocket client's close event) you should call unsubscribe(subscriber) manually to remove remove subscribed queries for there;

## API
	### Subscriptions
		stream: Observable<{
			args: object,
			context: object,
			event: string,
			hash: string,
			namespace: string,
			operationName: string,
			query: object,
			root: object,
			rootName: string,
			subscribers: Set<object>,
			variables: object
		}>;
		constructor(schema: GraphQLSchema, concurrency: Number = Number.MAX_SAFE_INTEGER);
		run(namespace: string, event: string, root?: object = {}, extendContext?: object = {}): void;
		subscribe(subscriber: object, variables?: object = {}, context?: object = {}): string (subscription hash);
		unsubscribe(subscriber: object, hash?: string): void;

## Sample

		const Subscriptions = require('smallorange-graphql-subscriptions');
		const {
			Redis
		} = require('smallorange-redis-client');

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
		                // declare namespace and events whose should trigger this subscription
		                events: {
		                    myNamespace: [
		                        'userUpdate',
		                        'userDelete'
		                    ]
		                },
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
		
		const redis = new Redis();
		const subscriptions = new Subscriptions(schema, 10); // 10 is the concurrency
		
		const query = `subscription($name: String!, $age: Int, $city: String) {
		        user(name: $name, age: $age, city: $city) {
		            name
		            city
		            age
		        }
		    }`;
		
		const pseudoWebSocketClient = {
			send(data){
				// send
			}
		};
		
		const subscriptionHash = subscriptions.subscribe(pseudoWebSocketClient, query);

		redis.onChannel('updateStream', ({
			namespace, //'myNamespace'
			event, //'updateUser'
			data // {age: 20}
		}) => {
			graphqlSubscriptions.run(namespace, event, data);
		});

		// you can can just subscribe direct on stream

		subscriptions.stream
		    .subscribe(({
		    		operationName,
		    		query,
		    		root,
		    		subscribers,
		    		event
		    	}) => {
		    		subscribers.forEach(subscriber => subscriber.send({
		    			operationName,
		    			query,
		    			root,
		    			event
		    		}));
    		});

    		// is gonna send to all subscribers
			//
			// {
			//	   operationName: 'userUpdate',
			//     query: {
			//         data: {
			//             user: {
			//                 age: 20,
			//                 city: null,
			//                 name: null
			//             }
			//         }
			//     },
			//     root: {
			//         age: 20
			//     },
			//     event: 'event'
			// }
