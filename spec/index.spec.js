const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const lazyExecutor = require('smallorange-graphql-lazy-executor');
const {
    Observable
} = require('rxjs');
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
const type = 'type';
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

describe('index.js', () => {
    let graphqlSubscriptions;

    beforeEach(() => {
        graphqlSubscriptions = new GraphqlSubscriptions(schema);
    });

    describe('constructor', () => {
        it('should throw if no schema', () => {
            expect(() => new GraphqlSubscriptions()).to.throw('No GraphQL schema provided');
        });

        it('should feed schema', () => {
            expect(graphqlSubscriptions.schema).to.be.defined;
        });

        it('should feed default concurrency', () => {
            expect(graphqlSubscriptions.concurrency).to.equal(Number.MAX_SAFE_INTEGER);
        });

        it('should feed custom concurrency', () => {
            graphqlSubscriptions = new GraphqlSubscriptions(schema, 4);
            expect(graphqlSubscriptions.concurrency).to.equal(4);
        });

        it('should feed stream', () => {
            expect(graphqlSubscriptions.stream).to.be.defined;
        });

        describe('stream', () => {
            it('should do nothing if no type', done => {
                const result = [];

                graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe(namespace, type, queries[1], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                graphqlSubscriptions.run();
            });

            it('should do nothing if no namespace', done => {
                const result = [];

                graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe(namespace, type, queries[1], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                graphqlSubscriptions.run(type);
            });

            it('should do nothing if type not found', done => {
                const result = [];

                graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe(namespace, type, queries[1], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                graphqlSubscriptions.run(type + 1, namespace);
            });

            it('should do nothing if namespace not found', done => {
                const result = [];

                graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe(namespace, type, queries[1], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                graphqlSubscriptions.run(namespace, type + 1);
            });

            it('should handle query error', done => {
                graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe(namespace, type, queries[1]);

                graphqlSubscriptions.stream
                    .subscribe(null, err => {
                        expect(err.message).to.equal('Variable "$name" of required type "String!" was not provided.');
                        done();
                    });

                graphqlSubscriptions.run(namespace, type);
            });

            it('should run queries', done => {
                const result = [];

                graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe(namespace, type, queries[1], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe(namespace + 1, type, queries[1], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe(namespace, type + 1, queries[1], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.stream
                    .take(3)
                    .toArray()
                    .subscribe(response => {
                        expect(response).to.deep.equal([{
                            hash: 'changeUser.user.7b6ef33adb28f92c45fe049c0abe5bb4',
                            namespace: 'namespace',
                            query: {
                                data: {
                                    user: {
                                        age: 20,
                                        city: null,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            root: {
                                age: 20
                            },
                            type: 'type'
                        }, {
                            hash: 'changeUser.user.d06d13d3d599313bf5d454f98f80b930',
                            namespace: 'namespace',
                            query: {
                                data: {
                                    user: {
                                        age: 20,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            root: {
                                age: 20
                            },
                            type: 'type'
                        }, {
                            hash: 'changeUser.user.d06d13d3d599313bf5d454f98f80b930',
                            namespace: 'namespace1',
                            query: {
                                data: {
                                    user: {
                                        age: 20,
                                        name: 'Rohde'
                                    }
                                }
                            },
                            root: {
                                age: 20
                            },
                            type: 'type'
                        }]);
                    }, null, done);

                graphqlSubscriptions.run(namespace, type, {
                    age: 20
                });

                graphqlSubscriptions.run(namespace + 1, type, {
                    age: 20
                });
            });
        });
    });

    describe('run', () => {
        beforeEach(() => {
            sinon.spy(graphqlSubscriptions.inbound, 'next');
        });

        afterEach(() => {
            graphqlSubscriptions.inbound.next.restore();
        });

        it('should call inbound.next with default root', () => {
            graphqlSubscriptions.run(namespace, type);
            expect(graphqlSubscriptions.inbound.next).to.have.been.calledWith({
                type,
                namespace,
                root: {},
                context: {}
            });
        });

        it('should call inbound.next with custom root', () => {
            graphqlSubscriptions.run(namespace, type, {
                root: 'root'
            });

            expect(graphqlSubscriptions.inbound.next).to.have.been.calledWith({
                type,
                namespace,
                root: {
                    root: 'root'
                },
                context: {}
            });
        });
    });

    describe('subscribe', () => {
        beforeEach(() => {
            sinon.spy(graphqlSubscriptions, 'extractQueryData');
        });

        afterEach(() => {
            graphqlSubscriptions.extractQueryData.restore();
        });

        it('should do nothing if no namespace', () => {
            expect(graphqlSubscriptions.subscribe()).to.be.undefined;
            expect(graphqlSubscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should do nothing if no type', () => {
            expect(graphqlSubscriptions.subscribe(namespace)).to.be.undefined;
            expect(graphqlSubscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should do nothing if no query', () => {
            expect(graphqlSubscriptions.subscribe(namespace, type)).to.be.undefined;
            expect(graphqlSubscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should throw if no operationName', () => {
            expect(() => graphqlSubscriptions.subscribe(namespace, type, `subscription {user{name}}`)).to.throw('GraphQLError: Small Orange subscriptions must have an operationName');
        });

        it('should throw if multiple roots', () => {
            expect(() => graphqlSubscriptions.subscribe(namespace, type, `subscription changeUser{user{name} user{name}}`)).to.throw('GraphQLError: Subscription "changeUser" must have only one field.');
        });

        it('should throw if fragments', () => {
            expect(() => graphqlSubscriptions.subscribe(namespace, type, `
                subscription changeUser {
                    ... userInfo
                }

                fragment userInfo on SubscriptionType {
                    user {
                        name
                    }
                }
            `)).to.throw('GraphQLError: Small Orange subscriptions do not support fragments on the root field');
        });

        it('should return hash based on query and variables', () => {
            const sub1 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            const sub2 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            const sub3 = graphqlSubscriptions.subscribe(namespace, type, queries[1], {
                age: 20
            });

            const sub4 = graphqlSubscriptions.subscribe(namespace, type, queries[1], {
                age: 21
            });

            expect(sub1).to.equal('changeUser.user.5d82f7a66a54c0633449fe47496db1cc');
            expect(sub2).to.equal('changeUser.user.5d82f7a66a54c0633449fe47496db1cc');
            expect(sub3).to.equal('changeUser.user.7b3d5c168820bf5102901095ba80aa81');
            expect(sub4).to.equal('changeUser.user.5d5bd2d3822a1f2c8dad38fb94340d0a');
            expect(sub1).to.equal(sub2);
            expect(sub2).not.to.equal(sub3);
            expect(sub3).not.to.equal(sub4);
        });

        it('should create subscriptionsByNamespace', () => {
            const sub1 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace)).to.be.a('Map');
            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).get(sub1)).to.be.a('function');
        });

        it('should group subscriptionsByNamespace with same namespaces', () => {
            const sub1 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            const sub2 = graphqlSubscriptions.subscribe(namespace + 1, type, queries[0], {
                age: 21
            });

            const sub3 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 22
            });

            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).get(sub1)).to.be.a('function');
            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace + 1).get(type).get(sub2)).to.be.a('function');
            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).get(sub3)).to.be.a('function');
            expect(graphqlSubscriptions.subscriptionsByNamespace.size).to.equal(2);
        });

        it('should group subscriptionsByNamespace with same types', () => {
            const sub1 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            const sub2 = graphqlSubscriptions.subscribe(namespace, type + 1, queries[0], {
                age: 21
            });

            const sub3 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 22
            });

            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).get(sub1)).to.be.a('function');
            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type + 1).get(sub2)).to.be.a('function');
            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).get(sub3)).to.be.a('function');
            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).size()).to.equal(2);
        });

        it('should group same queries with same variables', () => {
            const sub1 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            const sub2 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            const sub3 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).get(sub1)).to.equal(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).get(sub3));
            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).size).to.equal(1);
        });

        it('should not group different queries', () => {
            const sub1 = graphqlSubscriptions.subscribe(namespace, type, queries[0], {
                age: 20
            });

            const sub2 = graphqlSubscriptions.subscribe(namespace, type, queries[1], {
                age: 20
            });

            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).size).to.equal(2);
        });
    });

    describe('unsubscribe', () => {
        let sub1;
        let sub2;
        let sub3;
        let sub4;

        beforeEach(() => {
            sub1 = graphqlSubscriptions.subscribe(namespace, type, queries[0]);
            sub2 = graphqlSubscriptions.subscribe(namespace, type, queries[1]);
            sub3 = graphqlSubscriptions.subscribe(namespace, type + 1, queries[0]);
            sub4 = graphqlSubscriptions.subscribe(namespace + 1, type, queries[1]);
            sinon.spy(graphqlSubscriptions.subscriptionsByNamespace, 'delete');
        });

        afterEach(() => {
            graphqlSubscriptions.subscriptionsByNamespace.delete.restore();
        });

        it('should do nothing if no type', () => {
            expect(graphqlSubscriptions.unsubscribe()).to.be.undefined;
            expect(graphqlSubscriptions.subscriptionsByNamespace.delete).not.to.have.been.called;
        });

        it('should do nothing if no namespace', () => {
            expect(graphqlSubscriptions.unsubscribe(type)).to.be.undefined;
            expect(graphqlSubscriptions.subscriptionsByNamespace.delete).not.to.have.been.called;
        });

        it('should do nothing if no hash', () => {
            expect(graphqlSubscriptions.unsubscribe(namespace, type)).to.be.undefined;
            expect(graphqlSubscriptions.subscriptionsByNamespace.delete).not.to.have.been.called;
        });

        it('should do nothing if no subscriptions', () => {
            graphqlSubscriptions.unsubscribe('inexistent', namespace, sub1);
            expect(graphqlSubscriptions.subscriptionsByNamespace.delete).not.to.have.been.called;
        });

        it('should unsubscribe sub1', () => {
            graphqlSubscriptions.unsubscribe(namespace, type, sub1);

            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).get(type).has(sub1)).to.be.false;
        });

        it('should remove type when there is no subscriptions', () => {
            graphqlSubscriptions.unsubscribe(namespace, type + 1, sub3);

            expect(graphqlSubscriptions.subscriptionsByNamespace.get(namespace).has(type + 1)).to.be.false;
        });

        it('should remove namespace when there is no subscriptions', () => {
            graphqlSubscriptions.unsubscribe(namespace, type, sub1);
            graphqlSubscriptions.unsubscribe(namespace, type, sub2);
            graphqlSubscriptions.unsubscribe(namespace, type + 1, sub3);

            expect(graphqlSubscriptions.subscriptionsByNamespace.has(namespace)).to.be.false;
            expect(graphqlSubscriptions.subscriptionsByNamespace.has(namespace + 1)).to.be.true;
        });
    });

    describe('extractQueryData', () => {
        it('should extract query data', () => {
            const executor = lazyExecutor(schema, queries[0]);

            expect(graphqlSubscriptions.extractQueryData(schema, executor.parsedQuery, {
                name: 'Rohde',
                age: 20,
                city: 'San Francisco',
                unknownVariable: null
            })).to.deep.equal([{
                args: {
                    name: 'Rohde',
                    age: 20,
                    city: 'San Francisco'
                },
                operationName: 'changeUser',
                rootAlias: null,
                rootName: 'user'
            }]);
        });

        it('should return null if no subscription type', () => {
            const executor = lazyExecutor(noSubscriptionSchema, queries[0]);

            expect(graphqlSubscriptions.extractQueryData(noSubscriptionSchema, executor.parsedQuery, {
                name: 'Rohde',
                age: 20,
                city: 'San Francisco',
                unknownVariable: null
            })).to.be.null;
        });
    });
});
