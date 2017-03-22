const _ = require('lodash');
const Subscriptions = require('./Subscriptions');

module.exports = class FlowControl {
	constructor(subscriptions, operations, callback, onError = () => null) {
		if (!(subscriptions instanceof Subscriptions)) {
			throw new Error('subscriptions must be instance of Subscriptions');
		}

		if (!_.isObject(operations)) {
			throw new Error('operations must be an object');
		}

		if (!_.isFunction(callback)) {
			throw new Error('callback must be a function');
		}

		if (!_.isFunction(onError)) {
			throw new Error('onError must be a function');
		}

		this.operations = operations;
		this.callback = callback;

		this.subscription = subscriptions.stream
			.do(response => {
				const {
					type
				} = response;

				if (!this.operations[type]) {
					return;
				}

				this.operations[type](response, this.push.bind(this));
			})
			.retryWhen(err => {
				return err
					.do(err => onError(err))
			})
			.publish()
			.connect();
	}

	push(response, filter = () => true) {
		const {
			subscribers
		} = response;

		if (!subscribers || !subscribers.forEach) {
			throw new Error('subscribers must be an Array or Set');
		}

		subscribers.forEach(subscriber => {
			if (!filter(response, subscriber)) {
				return;
			}

			this.callback(response, subscriber);
		});
	}
}
