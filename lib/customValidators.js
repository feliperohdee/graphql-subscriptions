const {
    GraphQLError,
} = require('graphql');

exports.subscriptionHasSingleRootField = context => {
    return {
        OperationDefinition: node => {
            const operationName = node.name ? node.name.value : '';
            let numFields = 0;

            node.selectionSet.selections
                .forEach(selection => {
                    if (selection.kind === 'Field') {
                        numFields++;
                    } else {
                        context.reportError(new GraphQLError('Subscriptions do not support fragments on the root field.', [
                            node
                        ]));
                    }
                });

            if (numFields > 1) {
                let err = `Subscription "${operationName}" must have only one field.`;
                
                if (!operationName) {
                    err = `Subscription must have only one field.`;
                }

                context.reportError(new GraphQLError(err, [
                    node
                ]));
            }

            return false;
        }
    };
}
