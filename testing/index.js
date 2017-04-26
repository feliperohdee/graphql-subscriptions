const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLInt
} = require('graphql');

const event = 'event';
const namespace = 'namespace';

const events = {
    onUser: [
        0,
        'event',
        false,
        'anotherEvent',
        null
    ],
    onUserWithSingleEvent: 'event'
};

const requestStrings = [
    `subscription changeUser($name: String!, $age: Int, $city: String) {
        onUser(name: $name, age: $age, city: $city) {
            name
            city
            age
        }
    }`,
    `subscription ($name: String!, $age: Int, $city: String) {
        onUser(name: $name, age: $age, city: $city) {
            name
            city
            age
        }
    }`,
    `subscription ($name: String!, $age: Int, $city: String) {
        onUserWithSingleEvent(name: $name, age: $age, city: $city) {
            name
            city
            age
        }
    }`,
    `subscription ($name: String!, $age: Int, $city: String) {
        onUserWithoutEvents(name: $name, age: $age, city: $city) {
            name
            city
            age
        }
    }`
];

const UserType = new GraphQLObjectType({
    name: 'UserType',
    fields: {
        age: {
            type: GraphQLInt
        },
        city: {
            type: GraphQLString
        },
        name: {
            type: GraphQLString
        }
    }
});

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
            onUser: {
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
            },
            onUserWithSingleEvent: {
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
            },
            onUserWithoutEvents: {
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

const noSubscriptionSchema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'QueryType',
        fields: {
            user: {
                type: UserType
            }
        }
    })
});

module.exports = {
    event,
    events,
    namespace,
    requestStrings,
    schema,
    noSubscriptionSchema
};
