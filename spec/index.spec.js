const _ = require('lodash');
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
            expect(graphqlSubscriptions.schema).to.be.an('object');
        });

        it('should feed default concurrency', () => {
            expect(graphqlSubscriptions.concurrency).to.equal(Number.MAX_SAFE_INTEGER);
        });

        it('should feed custom concurrency', () => {
            graphqlSubscriptions = new GraphqlSubscriptions(schema, 4);
            expect(graphqlSubscriptions.concurrency).to.equal(4);
        });

        it('should feed stream', () => {
            expect(graphqlSubscriptions.stream).to.be.an('object');
        });

        describe('stream', () => {
            it('should do nothing if no type', done => {
                const result = [];

                graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe({}, namespace, type, queries[1], {
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

                graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe({}, namespace, type, queries[1], {
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

                graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe({}, namespace, type, queries[1], {
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

                graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe({}, namespace, type, queries[1], {
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
                graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe({}, namespace, type, queries[1]);

                graphqlSubscriptions.stream
                    .subscribe(null, err => {
                        expect(err.message).to.equal('Variable "$name" of required type "String!" was not provided.');
                        done();
                    });

                graphqlSubscriptions.run(namespace, type);
            });

            it('should handle no queries', done => {
                const result = [];

                graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                graphqlSubscriptions.subscribe({}, namespace, type, queries[1]);

                graphqlSubscriptions.stream
                    .timeoutWith(10, Observable.empty())
                    .subscribe(result.push.bind(result), null, () => {
                        expect(result).to.deep.equal([]);
                        done();
                    });

                graphqlSubscriptions.run(namespace, type + 1);
            });

            it('should run queries', done => {
                const ref1 = {};
                const ref2 = {};
                const ref3 = {};
                const ref4 = {};

                const sub1 = graphqlSubscriptions.subscribe(ref1, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                const sub2 = graphqlSubscriptions.subscribe(ref2, namespace, type, queries[1], {
                    name: 'Rohde'
                });

                const sub3 = graphqlSubscriptions.subscribe(ref3, namespace + 1, type, queries[1], {
                    name: 'Rohde'
                });

                const sub4 = graphqlSubscriptions.subscribe(ref4, namespace, type + 1, queries[1], {
                    name: 'Rohde'
                });

                const sub1Refs = _.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}.subscribers`);
                const sub2Refs = _.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub2}.subscribers`);
                const sub3Refs = _.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub3}.subscribers`);
                const sub4Refs = _.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub4}.subscribers`);

                graphqlSubscriptions.stream
                    .take(3)
                    .toArray()
                    .subscribe(response => {
                        expect(response).to.deep.equal([{
                            args: {
                                age: undefined,
                                city: undefined,
                                name: 'Rohde',
                            },
                            hash: 'eea94b2335eb866301de6bb89d564cea',
                            namespace: 'namespace',
                            operationName: 'changeUser',
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
                            rootName: 'user',
                            subscribers: sub1Refs,
                            type: 'type'
                        }, {
                            args: {
                                age: undefined,
                                city: undefined,
                                name: 'Rohde',
                            },
                            hash: '9c7aef8b73b41818d7b10c9c685cd82c',
                            namespace: 'namespace',
                            operationName: 'changeUser',
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
                            rootName: 'user',
                            subscribers: sub2Refs,
                            type: 'type'
                        }, {
                            args: {
                                age: undefined,
                                city: undefined,
                                name: 'Rohde',
                            },
                            hash: '9c7aef8b73b41818d7b10c9c685cd82c',
                            namespace: 'namespace1',
                            operationName: 'changeUser',
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
                            rootName: 'user',
                            subscribers: sub3Refs,
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

        it('should call inbound.next with default root and context', () => {
            graphqlSubscriptions.run(namespace, type);
            expect(graphqlSubscriptions.inbound.next).to.have.been.calledWith({
                type,
                namespace,
                root: {},
                context: {}
            });
        });

        it('should call inbound.next with custom root ans context', () => {
            graphqlSubscriptions.run(namespace, type, {
                root: 'root'
            }, {
                context: 'context'
            });

            expect(graphqlSubscriptions.inbound.next).to.have.been.calledWith({
                type,
                namespace,
                root: {
                    root: 'root'
                },
                context: {
                    context: 'context'
                }
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

        it('should do nothing if no subscriber', () => {
            expect(graphqlSubscriptions.subscribe()).to.be.undefined;
            expect(graphqlSubscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should do nothing if no namespace', () => {
            expect(graphqlSubscriptions.subscribe({})).to.be.undefined;
            expect(graphqlSubscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should do nothing if no type', () => {
            expect(graphqlSubscriptions.subscribe({}, namespace)).to.be.undefined;
            expect(graphqlSubscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should do nothing if no query', () => {
            expect(graphqlSubscriptions.subscribe({}, namespace, type)).to.be.undefined;
            expect(graphqlSubscriptions.extractQueryData).not.to.have.been.called;
        });

        it('should throw if subscriber not object', () => {
            expect(() => graphqlSubscriptions.subscribe('string', namespace, type, `subscription {user{name}}`)).to.throw('Subscriber must be an object');
        });

        it('should throw if no operationName', () => {
            expect(() => graphqlSubscriptions.subscribe({}, namespace, type, `subscription {user{name}}`)).to.throw('GraphQLError: Small Orange subscriptions must have an operationName');
        });

        it('should throw if multiple roots', () => {
            expect(() => graphqlSubscriptions.subscribe({}, namespace, type, `subscription changeUser{user{name} user{name}}`)).to.throw('GraphQLError: Subscription "changeUser" must have only one field.');
        });

        it('should throw if fragments', () => {
            expect(() => graphqlSubscriptions.subscribe({}, namespace, type, `
                subscription changeUser {
                    ...userInfo
                }

                fragment userInfo on SubscriptionType {
                    user {
                        name
                    }
                }
            `)).to.throw('GraphQLError: Small Orange subscriptions do not support fragments on the root field');
        });

        it('should return hash based on query and variables', () => {
            const sub1 = graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            const sub2 = graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            const sub3 = graphqlSubscriptions.subscribe({}, namespace, type, queries[1], {
                age: 20
            });

            const sub4 = graphqlSubscriptions.subscribe({}, namespace, type, queries[1], {
                age: 21
            });

            expect(sub1).to.equal('ee108784308025e4f58051b7d7347319');
            expect(sub2).to.equal('ee108784308025e4f58051b7d7347319');
            expect(sub3).to.equal('c483a253b7fc2dba1452b11e6bce3077');
            expect(sub4).to.equal('9c7b68de7cb7c3cdd66b86327ad3fc60');
            expect(sub1).to.equal(sub2);
            expect(sub2).not.to.equal(sub3);
            expect(sub3).not.to.equal(sub4);
        });

        it('should create subscriptions', () => {
            const sub1 = graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}.executor`)).to.be.a('function');
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}.subscribers`)).to.be.a('Set');
        });

        it('should add subscribers', () => {
            const subscribe1 = ref => graphqlSubscriptions.subscribe(ref, namespace, type, queries[0]);
            const subscribe2 = ref => graphqlSubscriptions.subscribe(ref, namespace, type, queries[1]);

            const ref1 = {};
            const sub1 = subscribe1(ref1);

            const ref2 = {};
            const sub2 = subscribe1(ref2);
            const sub2_1 = subscribe2(ref2);

            const ref3 = {};
            const sub3 = subscribe2(ref3);

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}.subscribers`).size).to.equal(2);
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub2}.subscribers`).size).to.equal(2);
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub3}.subscribers`).size).to.equal(2);

            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).has(`${namespace}.${type}.${sub1}`)).to.be.true;
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(1);
            expect(_.get(ref2, graphqlSubscriptions.subscribedSymbol).has(`${namespace}.${type}.${sub2}`)).to.be.true;
            expect(_.get(ref2, graphqlSubscriptions.subscribedSymbol).has(`${namespace}.${type}.${sub2_1}`)).to.be.true;
            expect(_.get(ref2, graphqlSubscriptions.subscribedSymbol).size).to.equal(2);
            expect(_.get(ref3, graphqlSubscriptions.subscribedSymbol).has(`${namespace}.${type}.${sub3}`)).to.be.true;
            expect(_.get(ref3, graphqlSubscriptions.subscribedSymbol).size).to.equal(1);
        });

        it('should reuse shallow identic queries', () => {
            const sub1 = graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            const sub2 = graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.equal(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub2}`));
            expect(_.size(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}`))).to.equal(1);
        });

        it('should not reuse shallow different queries', () => {
            const sub1 = graphqlSubscriptions.subscribe({}, namespace, type, queries[0], {
                age: 20
            });

            const sub2 = graphqlSubscriptions.subscribe({}, namespace, type, queries[1], {
                age: 20
            });

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).not.to.equal(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub2}`));
            expect(_.size(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}`))).to.equal(2);
        });
    });

    describe('unsubscribe', () => {
        const subscribe1 = ref => graphqlSubscriptions.subscribe(ref, namespace, type, queries[0]);
        const subscribe2 = ref => graphqlSubscriptions.subscribe(ref, namespace, type, queries[1]);
        let ref1;
        let sub1;
        let ref2;
        let sub2;
        let sub2_1;

        beforeEach(() => {
            ref1 = {};
            sub1 = subscribe1(ref1);
            ref2 = {};
            sub2 = subscribe1(ref2);
            sub2_1 = subscribe2(ref2);
        });

        it('should do nothing if no subscriber', () => {
            expect(graphqlSubscriptions.unsubscribe()).to.be.undefined;
        });

        it('should throw if subscriber not object', () => {
            expect(() => graphqlSubscriptions.unsubscribe('string')).to.throw('Subscriber must be an object');
        });

        it('should do nothing if no subscriber subscriptions', () => {
            expect(graphqlSubscriptions.unsubscribe({})).to.be.undefined;
        });

        it('should unsubscribe ref1 and return true', () => {
            expect(graphqlSubscriptions.unsubscribe(ref1)).to.be.true;
        });

        it('should unsubscribe ref1 and dont remove subscribe1 from subscriptions', () => {
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(1);

            graphqlSubscriptions.unsubscribe(ref1);

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(0);
        });

        it('should unsubscribe ref1 and ref2 and remove subscribe1 from subscriptions', () => {
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(1);
            expect(_.get(ref2, graphqlSubscriptions.subscribedSymbol).size).to.equal(2);

            graphqlSubscriptions.unsubscribe(ref1);
            graphqlSubscriptions.unsubscribe(ref2);

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.undefined;
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(0);
            expect(_.get(ref2, graphqlSubscriptions.subscribedSymbol).size).to.equal(0);
        });

        it('should unsubscribe ref1 only by namespace', () => {
            sub1 = graphqlSubscriptions.subscribe(ref1, namespace + 1, type, queries[0]);
            sub2 = graphqlSubscriptions.subscribe(ref1, namespace + 1, type, queries[1]);

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace + 1}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(3);

            graphqlSubscriptions.unsubscribe(ref1, namespace + 1);          

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace + 1}.${type}.${sub1}`)).to.be.undefined;
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(1);
        });

        it('should unsubscribe ref1 only by namespace and type', () => {
            sub1 = graphqlSubscriptions.subscribe(ref1, namespace + 1, type + 1, queries[0]);
            sub2 = graphqlSubscriptions.subscribe(ref1, namespace + 1, type + 1, queries[1]);

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace + 1}.${type + 1}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(3);

            graphqlSubscriptions.unsubscribe(ref1, namespace + 1, type + 1);          

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace + 1}.${type + 1}.${sub1}`)).to.be.undefined;
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(1);
        });

        it('should unsubscribe ref1 only by namespace, type and hash', () => {
            sub1 = graphqlSubscriptions.subscribe(ref1, namespace + 1, type + 1, queries[0]);
            sub2 = graphqlSubscriptions.subscribe(ref1, namespace + 1, type + 1, queries[1]);

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace + 1}.${type + 1}.${sub1}`)).to.be.an('object');
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(3);

            graphqlSubscriptions.unsubscribe(ref1, namespace + 1, type + 1, sub1);

            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace}.${type}.${sub1}`)).to.be.an('object');
            expect(_.get(graphqlSubscriptions.subscriptions, `${namespace + 1}.${type + 1}.${sub1}`)).to.be.undefined;
            expect(_.get(ref1, graphqlSubscriptions.subscribedSymbol).size).to.equal(2);
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
