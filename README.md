[![CircleCI](https://circleci.com/gh/feliperohdee/smallorange-graphql-subscriptions.svg?style=svg)](https://circleci.com/gh/feliperohdee/smallorange-graphql-subscriptions)

# Small Orange GraphQL Subscriptions Manager

## Wht it does

This is a simple GraphQl subscriptions manager, it takes care to group similar subscriptions which belongs to same namespace, type and variables, runs with maximum concurrency (thank u rxjs again), and dispatch data via stream.

## Wht is doesn't

It doesn't take care subscribe to your pub/sub mechanism, you should do it by yourself and call run when some event happens, this way, you have freedom to choose the best implementation type for your app. If u're using Redis, you shouldn't create a channel for each event type, instead, you cant just pass an object along with this info, redis is very sensitive with many channels, so, it avoids CPU and memory overhead at Redis machine ;), if you don't know how to do this, you should study more.

It doesn't take care to broadcast messages to right subscribers, it just broadcast, at this way, you can plug in your custom ACL implementation to keep with a single point of truthness.

## Important

Subscribers are objects that you intend to send messages afterwards, this lib takes care to manage internal subscriptions state, but once one subscriber is removed (eg. a WebSocket client's close event) you should call unsubscribe(subscriber) manually to remove remove subscription request for there;

## API
	### Subscriptions
		stream: Observable<{
			args: object,
			contextValue: object,
			event: string,
			hash: string,
			namespace: string,
			operationName: string,
			result: object,
			rootName: string,
			rootValue: object,
			subscribers: Set<object>,
			variableValues: object
		}>;
		
		constructor(
			schema: GraphQLSchema, 
			events: object = {}, 
			customExecutor: function = (/* args like http://graphql.org/graphql-js/execution/#execute*/) => Observable, 
			concurrency: Number = Number.MAX_SAFE_INTEGER
		);
		
		run(
			namespace: string, 
			event: string, 
			rootValue?: object = {}, 
			extendContextValue?: object = {}
		): void;
		
		subscribe(
			namespace: string, 
			subscriber: object, 
			requestString: string, 
			variableValues?: object = {}, 
			contextValue?: object = {}
		): Array<string> (subscription hashes);
		
		unsubscribe(
			subscriber: object, 
			hash?: string
		): void;

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

		// declare root names and events whose should trigger this subscription
        const events = {
        	// root name
        	user: [
        		// events
                'user.update',
                'user.delete'
            ]
        };
		
		const redis = new Redis();

		// 3rd argument is a custom executor, it should follow the same default graphQL-js execute signature (http://graphql.org/graphql-js/execution/#execute) but might return an Observable, in our case, we use a remote executor into an AWS lambda, if you provide null, it will use default graphQL-js execute function
		// 4th agument is max concurrency
		const subscriptions = new Subscriptions(schema, events, null, 10);
		
		const requestString = `subscription($name: String!, $age: Int, $city: String) {
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
		
		const subscriptionHash = subscriptions.subscribe('myNamespace', pseudoWebSocketClient, requestString);

		redis.onChannel('updateStream', ({
			namespace, //'myNamespace'
			event, //'user.update'
			data // {age: 20}
		}) => {
			graphqlSubscriptions.run(namespace, event, data);
		});

		// you can can just subscribe direct on stream

		subscriptions.stream
		    .subscribe(({
		    		operationName,
		    		result,
		    		root,
		    		subscribers,
		    		event
		    	}) => {
		    		subscribers.forEach(subscriber => subscriber.send({
		    			operationName,
		    			result,
		    			root,
		    			event
		    		}));
    		});

    		// is gonna send to all subscribers
			//
			// {
			//	   operationName: 'userUpdate',
			//     result: {
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
