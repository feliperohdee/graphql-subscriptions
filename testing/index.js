const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLInt
} = require('graphql');

const event = 'event';
const namespace = 'namespace';
const queries = [
    `subscription changeUser($name: String!, $age: Int, $city: String) {
        user(name: $name, age: $age, city: $city) {
            name
            city
            age
        }
    }`,
    `subscription changeUser($name: String!, $age: Int, $city: String) {
        user(name: $name, age: $age, city: $city) {
            name
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
    namespace,
    queries,
    schema,
    noSubscriptionSchema
};
