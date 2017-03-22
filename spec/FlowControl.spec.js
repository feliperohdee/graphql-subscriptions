const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const lazyExecutor = require('smallorange-graphql-lazy-executor');

const {
    Subscriptions,
    FlowControl
} = require('../');
const {
    type,
    namespace,
    queries,
    schema,
    noSubscriptionSchema
} = require('../testing');

chai.use(sinonChai);

const expect = chai.expect;
const filters = {
    [type]: (response, subscriber) => {
        const {
            root
        } = response;

        const {
            auth
        } = subscriber;

        const byRole = {
            public: () => auth.namespace === root.namespace && root.canReceive.has(auth.id)
        };

        return byRole[auth.role]();
    }
};

const operations = {
    [type]: (response, push) => {
        // improve time complexity
        response.root.canReceive = new Set(response.root.canReceive);

        push(response, filters[type]);
    }
};

describe('FlowControl.js', () => {
    let callback;
    let onError;
    let subscriptions;
    let flowControl;

    beforeEach(() => {
        callback = sinon.stub();
        onError = sinon.stub();
        subscriptions = new Subscriptions(schema);
        flowControl = new FlowControl(subscriptions, operations, callback, onError);
    });

    describe('contructor', () => {
        it('should throw if subscriptions not instanceof Subscriptions', () => {
            expect(() => new FlowControl({})).to.throw('subscriptions must be instance of Subscriptions');
        });

        it('should throw if operations not an object', () => {
            expect(() => new FlowControl(subscriptions, 'string')).to.throw('operations must be an object');
        });

        it('should throw if callback not a function', () => {
            expect(() => new FlowControl(subscriptions, operations, {})).to.throw('callback must be a function');
        });

        it('should throw if onError not a function', () => {
            expect(() => new FlowControl(subscriptions, operations, callback, {})).to.throw('onError must be a function');
        });

        it('should have operations', () => {
            expect(flowControl.operations).to.have.all.keys([
                type
            ]);
        });

        it('should have subscription', () => {
            expect(flowControl.subscription).to.be.an('object');
        });

        describe('stream', () => {
            let ref1 = {
                auth: {
                    id: 'id-1',
                    namespace,
                    role: 'public'
                }
            };

            let ref2 = {
                auth: {
                    id: 'id-2',
                    namespace,
                    role: 'public'
                }
            };

            let ref3 = {
                auth: {
                    id: 'id-3',
                    namespace,
                    role: 'public'
                }
            };

            beforeEach(() => {
                subscriptions.subscribe(ref1, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe(ref2, namespace, type, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.subscribe(ref3, namespace, type, queries[0], {
                    name: 'Rohde'
                });
            });

            it('should do nothing if no operation type', done => {
                subscriptions.subscribe({}, namespace, type + 1, queries[0], {
                    name: 'Rohde'
                });

                subscriptions.run(namespace, type + 1, {});

                _.defer(() => {
                    expect(callback).not.to.have.been.called;

                    done();
                });
            });

            it('should deliver to just ref1 and ref3', done => {
                subscriptions.run(namespace, type, {
                    namespace,
                    canReceive: ['id-1', 'id-3']
                });

                _.defer(() => {
                    expect(callback).to.have.been.calledTwice;
                    expect(callback.firstCall).to.have.been.calledWith(sinon.match.any, ref1);
                    expect(callback.secondCall).to.have.been.calledWith(sinon.match.any, ref3);

                    done();
                });
            });

            it('should deliver to all', done => {
                subscriptions.run(namespace, type, {
                    namespace,
                    canReceive: ['id-1', 'id-2', 'id-3']
                });

                _.defer(() => {
                    expect(callback).to.have.been.calledThrice;
                    expect(callback.firstCall).to.have.been.calledWith(sinon.match.any, ref1);
                    expect(callback.secondCall).to.have.been.calledWith(sinon.match.any, ref2);
                    expect(callback.thirdCall).to.have.been.calledWith(sinon.match.any, ref3);

                    done();
                });
            });

            it('should not deliver', done => {
                subscriptions.run(namespace, type, {
                    namespace: namespace + 1,
                    canReceive: ['id-1', 'id-2', 'id-3']
                });

                _.defer(() => {
                    expect(callback).not.to.have.been.called;

                    done();
                });
            });

            describe('something bad', () => {
                beforeEach(() => {
                    sinon.stub(operations, type)
                        .onFirstCall()
                        .throws(new Error('some error'))
                        .onSecondCall()
                        .returns(true);
                });

                afterEach(() => {
                    operations[type].restore();
                });

                it('should call onError', done => {
                    subscriptions.run(namespace, type, {
                        namespace: namespace,
                        canReceive: ['id-1', 'id-2', 'id-3']
                    });

                    _.defer(() => {
                        expect(onError).to.have.been.calledWith(new Error('some error'));

                        done();
                    });
                });

                it('should resubscribe to stream', done => {
                    subscriptions.run(namespace, type, {
                        namespace: namespace,
                        canReceive: ['id-1', 'id-2', 'id-3']
                    });

                    _.defer(() => {
                        subscriptions.run(namespace, type, {
                            namespace: namespace,
                            canReceive: ['id-1', 'id-2', 'id-3']
                        });

                        _.defer(() => {
                            expect(operations[type]).to.have.been.calledTwice

                            done();
                        });
                    });
                });
            });
        });
    });

    describe('push', () => {
        it('should throw if subscribers not an array or Set', () => {
            expect(() => flowControl.push({})).to.throw('subscribers must be an Array or Set');
        });

        it('should not call callback if filter is rejected', () => {
            const root = {
                namespace
            };

            const subscribers = [{
                auth: {
                    id: 'id-0',
                    namespace: 'anotherNamespace'
                }
            }];

            flowControl.push({
                root,
                subscribers
            }, () => null);

            expect(callback).not.to.have.been.called;
        });

        it('should call callback if filter is accepted', () => {
            const root = {
                namespace
            };

            const subscribers = [{
                auth: {
                    id: 'id-0',
                    namespace: 'anotherNamespace'
                }
            }];

            flowControl.push({
                root,
                subscribers
            }, () => true);

            expect(callback).to.have.been.calledWith({
                root,
                subscribers
            });
        });

        it('should call callback if no filter provided', () => {
            const root = {
                namespace
            };

            const subscribers = [{
                auth: {
                    id: 'id-0',
                    namespace: 'anotherNamespace'
                }
            }];

            flowControl.push({
                root,
                subscribers
            });

            expect(callback).to.have.been.calledWith({
                root,
                subscribers
            });
        });
    });
});
