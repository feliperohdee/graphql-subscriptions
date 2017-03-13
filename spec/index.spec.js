const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLInt
} = require('graphql');

const GraphqlSubscriptions = require('../');

chai.use(sinonChai);

const callback = sinon.stub();
const expect = chai.expect;

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

describe('index.js', () => {
    let graphqlSubscriptions;

    beforeEach(() => {
        graphqlSubscriptions = new GraphqlSubscriptions(schema);
    });

    it('a', () => {
        graphqlSubscriptions.subscribe('aaa', 'myNamespace', `subscription {
            user(name: "Rohde", age: 20, city: "San Francisco") {
                name
                city
                age
            }
        }`);

        graphqlSubscriptions.subscribe('aaa', 'myNamespace', `subscription {
            user(name: "Rohde", age: 20, city: "San Francisco") {
                city
                age
            }
        }`);

        graphqlSubscriptions.run('aaa', 'myNamespace')
            // .map(({
            //     response
            // }) => response.data)
            .map(response => JSON.stringify(response, null, 2))
            .subscribe(console.log);
    });
});
