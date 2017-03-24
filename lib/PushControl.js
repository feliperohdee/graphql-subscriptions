const _ = require('lodash');
const Subscriptions = require('./Subscriptions');

module.exports = class PushControl {
	constructor(subscriptions, actions, defaultCallback = null) {
		if (!(subscriptions instanceof Subscriptions)) {
			throw new Error('subscriptions must be instance of Subscriptions');
		}

		if (!_.isObject(actions)) {
			throw new Error('actions must be an object');
		}

		this.actions = actions;
		this.defaultCallback = defaultCallback;
		this.stream = subscriptions.stream
			.do(response => {
				const {
					type
				} = response;

				if (!this.actions[type]) {
					return;
				}

				this.actions[type](response, this.push.bind(this));
			});
	}

	push(response, filter = () => true, callback = null) {
		const {
			subscribers
		} = response;

		if (!subscribers || !subscribers.forEach) {
			throw new Error('subscribers must be an Array or Set');
		}

		if (!_.isFunction(callback)) {
			callback = this.defaultCallback ? this.defaultCallback.bind(this.defaultCallback) : null;
		}

		if (callback) {
			subscribers.forEach(subscriber => {
				if (!filter(response, subscriber)) {
					return;
				}

				callback(response, subscriber);
			});
		}
	}

	subscribe(next, error, complete) {
		return this.stream
			.subscribe(next, error, complete);
	}
}
